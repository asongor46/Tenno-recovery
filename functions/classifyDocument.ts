import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, filename, upload_context } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Classify the document using AI
    const classification = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a document classifier for a surplus funds recovery platform.
      
Analyze this document and classify it into ONE of these categories:

1. SURPLUS_LIST - Contains multiple cases with owner names, amounts, property addresses
   (Could be: county surplus list, tax sale results, foreclosure auction results)

2. CLAIM_FORM - A blank or fillable form for filing surplus claims
   (Look for: form fields, signature lines, notary sections, county letterhead)

3. FILING_INSTRUCTIONS - Text explaining how to file claims in a specific county
   (Look for: step-by-step instructions, deadlines, contact info, requirements)

4. PROPERTY_RECORD - Deed, tax bill, title document, lien record
   (Look for: parcel numbers, legal descriptions, ownership history)

5. CASE_DOCUMENT - Single case supporting document (notice, letter, assignment)

6. COUNTY_INFO - General county information (contact sheet, fee schedule, office hours)

7. UNKNOWN - Cannot determine

Also extract:
- County name (if visible)
- State (if determinable)
- Document date (if visible)
- Confidence level (0.0-1.0)
- Key indicators that led to your classification`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { 
            type: "string", 
            enum: ["SURPLUS_LIST", "CLAIM_FORM", "FILING_INSTRUCTIONS", 
                   "PROPERTY_RECORD", "CASE_DOCUMENT", "COUNTY_INFO", "UNKNOWN"]
          },
          county: { type: "string" },
          state: { type: "string" },
          document_date: { type: "string" },
          confidence: { type: "number" },
          indicators: { type: "array", items: { type: "string" } },
          sub_type: { type: "string" },
          contains_multiple_records: { type: "boolean" },
          estimated_record_count: { type: "number" },
          detected_form_name: { type: "string" },
          has_notary_section: { type: "boolean" },
          is_fillable_pdf: { type: "boolean" }
        },
        required: ["document_type", "confidence"]
      }
    });

    // Log classification for learning
    const classificationRecord = await base44.asServiceRole.entities.DocumentClassification.create({
      file_url,
      filename: filename || 'unknown',
      classification: classification.document_type,
      confidence: classification.confidence,
      county: classification.county,
      state: classification.state,
      document_date: classification.document_date,
      indicators: classification.indicators,
      sub_type: classification.sub_type,
      contains_multiple_records: classification.contains_multiple_records || false,
      estimated_record_count: classification.estimated_record_count,
      human_verified: false
    });

    return Response.json({
      success: true,
      classification: classification.document_type,
      confidence: classification.confidence,
      details: classification,
      classification_id: classificationRecord.id,
      next_action: getNextAction(classification.document_type)
    });

  } catch (error) {
    console.error('Classification error:', error);
    return Response.json({ 
      error: 'Classification failed', 
      details: error.message 
    }, { status: 500 });
  }
});

function getNextAction(documentType) {
  const actions = {
    'SURPLUS_LIST': 'extract_cases',
    'CLAIM_FORM': 'analyze_form',
    'FILING_INSTRUCTIONS': 'extract_county_intel',
    'PROPERTY_RECORD': 'enrich_case',
    'CASE_DOCUMENT': 'attach_to_case',
    'COUNTY_INFO': 'update_county',
    'UNKNOWN': 'manual_review'
  };
  
  return actions[documentType] || 'manual_review';
}