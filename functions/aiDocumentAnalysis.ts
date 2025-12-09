import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AI Document Analysis Engine
 * Automatically extracts data, performs sentiment analysis, and identifies discrepancies
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, analysis_type = "full" } = await req.json();

    if (!document_id) {
      return Response.json({ 
        status: 'error',
        details: 'document_id required' 
      }, { status: 400 });
    }

    // Step 1: Fetch document and related case
    const documents = await base44.asServiceRole.entities.Document.filter({ id: document_id });
    const document = documents[0];
    
    if (!document) {
      return Response.json({ 
        status: 'error',
        details: 'Document not found' 
      }, { status: 404 });
    }

    const cases = await base44.asServiceRole.entities.Case.filter({ id: document.case_id });
    const caseData = cases[0];

    // Step 2: Fetch document content (if it's a PDF/image, use file URL)
    let documentContent = document.ocr_text || "";
    
    if (!documentContent && document.file_url) {
      // If no OCR text cached, we'd need to extract it from file_url
      // For now, we'll use the file URL directly with LLM
    }

    // Step 3: Build AI analysis prompt based on document category
    const analysisPrompt = buildAnalysisPrompt(document, caseData, analysis_type);

    // Step 4: Invoke LLM for analysis
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: document.file_url ? [document.file_url] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          extracted_data: {
            type: "object",
            properties: {
              dates: { type: "array", items: { type: "string" } },
              names: { type: "array", items: { type: "string" } },
              amounts: { type: "array", items: { type: "number" } },
              addresses: { type: "array", items: { type: "string" } },
              case_numbers: { type: "array", items: { type: "string" } },
              property_details: { type: "object", description: "Property-specific information" },
            }
          },
          sentiment_analysis: {
            type: "object",
            properties: {
              overall_sentiment: { type: "string", enum: ["positive", "neutral", "negative", "urgent"] },
              tone: { type: "string", enum: ["professional", "friendly", "aggressive", "formal", "informal"] },
              urgency_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
              cooperation_likelihood: { type: "string", enum: ["high", "medium", "low", "unknown"] },
              key_concerns: { type: "array", items: { type: "string" } },
            }
          },
          discrepancies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                expected_value: { type: "string" },
                found_value: { type: "string" },
                severity: { type: "string", enum: ["critical", "warning", "info"] },
                description: { type: "string" },
              }
            }
          },
          missing_information: {
            type: "array",
            items: { type: "string" },
            description: "List of critical missing data points"
          },
          confidence_score: {
            type: "number",
            description: "0-100 score for extraction accuracy"
          },
          summary: {
            type: "string",
            description: "Brief summary of document analysis"
          },
          recommended_actions: {
            type: "array",
            items: { type: "string" },
            description: "Actions case manager should take"
          }
        }
      }
    });

    // Step 5: Update document with extracted data and analysis
    await base44.asServiceRole.entities.Document.update(document_id, {
      extracted_data: aiResult.extracted_data,
      extraction_status: "completed",
      metadata: {
        ...document.metadata,
        ai_analysis: {
          sentiment: aiResult.sentiment_analysis,
          discrepancies: aiResult.discrepancies,
          missing_info: aiResult.missing_information,
          confidence: aiResult.confidence_score,
          analyzed_at: new Date().toISOString(),
          analyzed_by: user.email,
        }
      }
    });

    // Step 6: If critical discrepancies found, create alert
    const criticalDiscrepancies = aiResult.discrepancies.filter(d => d.severity === "critical");
    
    if (criticalDiscrepancies.length > 0) {
      await base44.asServiceRole.entities.Alert.create({
        case_id: document.case_id,
        type: "failed_integrity",
        title: "Document Discrepancy Detected",
        message: `AI found ${criticalDiscrepancies.length} critical discrepancy(ies) in ${document.name}`,
        severity: "critical",
        is_read: false,
        is_resolved: false,
      });
    }

    // Step 7: If correspondence, update case with sentiment
    if (document.category === "correspondence" && aiResult.sentiment_analysis) {
      await base44.asServiceRole.entities.Case.update(document.case_id, {
        metadata: {
          ...caseData.metadata,
          last_correspondence_sentiment: aiResult.sentiment_analysis.overall_sentiment,
          cooperation_likelihood: aiResult.sentiment_analysis.cooperation_likelihood,
        }
      });
    }

    // Step 8: Auto-populate case fields with extracted data
    const caseUpdates = {};
    
    if (aiResult.extracted_data.names?.length > 0 && !caseData.owner_name) {
      caseUpdates.owner_name = aiResult.extracted_data.names[0];
    }
    
    if (aiResult.extracted_data.amounts?.length > 0 && !caseData.surplus_amount) {
      caseUpdates.surplus_amount = aiResult.extracted_data.amounts[0];
    }
    
    if (aiResult.extracted_data.addresses?.length > 0 && !caseData.property_address) {
      caseUpdates.property_address = aiResult.extracted_data.addresses[0];
    }
    
    if (Object.keys(caseUpdates).length > 0) {
      await base44.asServiceRole.entities.Case.update(document.case_id, caseUpdates);
    }

    // Step 9: Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      case_id: document.case_id,
      action: "ai_document_analysis",
      description: `AI analyzed ${document.name}: ${aiResult.summary}`,
      performed_by: user.email,
      metadata: {
        document_id,
        confidence_score: aiResult.confidence_score,
        discrepancies_found: aiResult.discrepancies.length,
      }
    });

    return Response.json({
      status: 'success',
      document_id,
      analysis: {
        extracted_data: aiResult.extracted_data,
        sentiment: aiResult.sentiment_analysis,
        discrepancies: aiResult.discrepancies,
        missing_information: aiResult.missing_information,
        confidence_score: aiResult.confidence_score,
        summary: aiResult.summary,
        recommended_actions: aiResult.recommended_actions,
      },
      case_updates: caseUpdates,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

function buildAnalysisPrompt(document, caseData, analysisType) {
  const basePrompt = `You are an AI assistant analyzing a legal document for a surplus recovery case.

**Document Information:**
- Name: ${document.name}
- Category: ${document.category}
- Uploaded by: ${document.uploaded_by}

**Case Context:**
- Case Number: ${caseData?.case_number || 'Unknown'}
- Owner: ${caseData?.owner_name || 'Unknown'}
- Property Address: ${caseData?.property_address || 'Unknown'}
- County: ${caseData?.county || 'Unknown'}, ${caseData?.state || 'Unknown'}
- Surplus Amount: $${caseData?.surplus_amount?.toLocaleString() || 'Unknown'}

**Your Analysis Tasks:**

1. **Data Extraction** - Extract and structure all key information:
   - All dates (sale dates, filing dates, deadline dates)
   - All names (owners, attorneys, plaintiffs, defendants)
   - All monetary amounts (sale prices, surplus, judgments)
   - All addresses (property, mailing)
   - Case/parcel numbers

2. **Sentiment Analysis** (for correspondence/notes):
   - Determine overall sentiment: positive, neutral, negative, urgent
   - Assess tone: professional, friendly, aggressive, formal, informal
   - Evaluate urgency level: low, medium, high, critical
   - Predict cooperation likelihood: high, medium, low, unknown
   - Identify key concerns or objections raised

3. **Discrepancy Detection** - Compare extracted data with case record:
   - Check if owner names match
   - Verify property addresses
   - Validate amounts (surplus, sale, judgment)
   - Flag inconsistencies with severity (critical, warning, info)

4. **Missing Information** - Identify critical missing data:
   - Required signatures
   - Missing dates or deadlines
   - Incomplete contact information
   - Absent supporting documentation

5. **Summary & Actions** - Provide:
   - Brief 2-3 sentence summary of document
   - List of recommended actions for case manager
   - Confidence score (0-100) for extraction accuracy

**Special Instructions by Category:**
`;

  const categoryInstructions = {
    correspondence: "Focus heavily on sentiment analysis. Identify owner's attitude, concerns, willingness to cooperate. Flag if urgent response needed.",
    claim_form: "Extract all required claim data. Verify signatures, dates, notarization. Check completeness.",
    deed: "Extract property details, legal description, owner names, recording information.",
    notice: "Identify deadlines, required actions, notice dates. Flag urgency.",
    surplus_list: "Extract all surplus cases, amounts, property details. Compare with existing case data.",
    agreement: "Verify signature presence, date, terms. Check if notarization required and present.",
  };

  return basePrompt + (categoryInstructions[document.category] || "Perform comprehensive analysis of all available data.");
}