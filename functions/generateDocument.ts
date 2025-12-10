import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DOCUMENT GENERATION ENGINE
 * Generates claim forms, affidavits, and other documents from templates
 * Supports PDF form filling and text-based template merging
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, document_type, template_id, custom_fields } = await req.json();

    if (!case_id || !document_type) {
      return Response.json({ 
        status: 'error',
        details: 'case_id and document_type required' 
      }, { status: 400 });
    }

    // Fetch case data
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    // Fetch county data
    let countyData = null;
    if (caseData.county) {
      const counties = await base44.entities.County.filter({ 
        name: caseData.county,
        state: caseData.state
      });
      countyData = counties[0];
    }

    // Build merge data from case and county
    const mergeData = buildMergeData(caseData, countyData, custom_fields);

    // Find appropriate template
    let template = null;
    if (template_id) {
      const templates = await base44.entities.FormTemplate.filter({ id: template_id });
      template = templates[0];
    } else {
      // Auto-select template based on document type and county
      const templates = await base44.entities.FormTemplate.filter({ 
        form_type: document_type,
        is_active: true
      });
      
      // Prioritize county-specific templates
      template = templates.find(t => t.county_id === countyData?.id) || templates[0];
    }

    if (!template) {
      return Response.json({ 
        status: 'error',
        details: `No template found for document type: ${document_type}` 
      }, { status: 404 });
    }

    // Generate document using AI
    const documentContent = await generateDocumentContent(
      template,
      mergeData,
      document_type,
      base44
    );

    // Create Document record
    const document = await base44.entities.Document.create({
      case_id,
      name: `${getDocumentTypeName(document_type)} - ${caseData.case_number}`,
      category: document_type,
      file_url: null, // Will be set after PDF generation
      uploaded_by: user.email,
      metadata: {
        generated: true,
        template_id: template.id,
        template_version: template.version,
        generated_at: new Date().toISOString()
      }
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'document_generated',
      description: `Generated ${getDocumentTypeName(document_type)}`,
      performed_by: user.email,
      metadata: { document_id: document.id, template_id: template.id }
    });

    return Response.json({
      status: 'success',
      document_id: document.id,
      content: documentContent,
      template_used: template.name
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

/**
 * Build merge data object from case and county information
 */
function buildMergeData(caseData, countyData, customFields = {}) {
  const today = new Date();
  
  return {
    // Case fields
    CASE_NUMBER: caseData.case_number || '',
    OWNER_NAME: caseData.owner_name || '',
    OWNER_ADDRESS: caseData.owner_address || '',
    OWNER_EMAIL: caseData.owner_email || '',
    OWNER_PHONE: caseData.owner_phone || '',
    PROPERTY_ADDRESS: caseData.property_address || '',
    PARCEL_NUMBER: caseData.parcel_number || '',
    SURPLUS_AMOUNT: formatCurrency(caseData.surplus_amount),
    SURPLUS_AMOUNT_WORDS: numberToWords(caseData.surplus_amount),
    SALE_DATE: formatDate(caseData.sale_date),
    SALE_AMOUNT: formatCurrency(caseData.sale_amount),
    JUDGMENT_AMOUNT: formatCurrency(caseData.judgment_amount),
    
    // County fields
    COUNTY_NAME: caseData.county || '',
    STATE: caseData.state || '',
    CLERK_NAME: countyData?.clerk_name || '',
    CLERK_ADDRESS: countyData?.filing_address || '',
    CLERK_EMAIL: countyData?.clerk_email || '',
    CLERK_PHONE: countyData?.clerk_phone || '',
    
    // Date fields
    TODAY_DATE: formatDate(today),
    TODAY_FULL: formatDateFull(today),
    CURRENT_YEAR: today.getFullYear().toString(),
    
    // Claimant fields (our company)
    CLAIMANT_NAME: 'TENNO Recovery LLC',
    CLAIMANT_ADDRESS: '123 Recovery Drive, Suite 100, Philadelphia, PA 19103',
    CLAIMANT_PHONE: '(215) 555-0100',
    CLAIMANT_EMAIL: 'claims@tennorecovery.com',
    
    // Custom fields override
    ...customFields
  };
}

/**
 * Generate document content using AI
 */
async function generateDocumentContent(template, mergeData, docType, base44) {
  const prompt = `You are generating a legal document for a surplus funds claim.

Document Type: ${docType}
Template: ${template.name}

Fill in the following template with the provided data. Replace all placeholders in the format {{FIELD_NAME}} with actual values.

MERGE DATA:
${JSON.stringify(mergeData, null, 2)}

TEMPLATE:
${template.template_text || 'Standard template not available - generate appropriate content'}

INSTRUCTIONS:
1. Replace all {{FIELD_NAME}} placeholders with actual values from merge data
2. If a placeholder value is missing or empty, use "[TO BE COMPLETED]"
3. Maintain professional legal formatting
4. Include all required sections for this document type
5. Return ONLY the filled document text, no explanations

Generate the complete document:`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        document_text: { type: "string" },
        missing_fields: { 
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["document_text"]
    }
  });

  return result.document_text;
}

/**
 * Helper functions
 */
function formatCurrency(amount) {
  if (!amount) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function formatDateFull(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function numberToWords(num) {
  if (!num) return 'zero';
  // Simplified - would use a proper library in production
  return `${Math.floor(num)} dollars`;
}

function getDocumentTypeName(type) {
  const names = {
    claim_form: 'Claim Form',
    affidavit: 'Affidavit',
    w9: 'W-9 Form',
    rep_authorization: 'Representative Authorization',
    assignment: 'Assignment of Rights',
    cover_sheet: 'Cover Sheet',
    notary_page: 'Notary Page',
    other: 'Document'
  };
  return names[type] || type;
}