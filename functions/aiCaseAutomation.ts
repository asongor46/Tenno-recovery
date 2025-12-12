import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AI Case Management Automation
 * Auto-links related cases, suggests next steps, generates correspondence
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      case_id, 
      action_type = "suggest_next_steps" // "link_related_cases" | "suggest_next_steps" | "generate_correspondence"
    } = await req.json();

    if (!case_id) {
      return Response.json({ 
        status: 'error',
        details: 'case_id required' 
      }, { status: 400 });
    }

    // Fetch case data
    const cases = await base44.asServiceRole.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    let result = {};

    // === 1. AUTO-LINK RELATED CASES ===
    if (action_type === "link_related_cases" || action_type === "all") {
      const relatedCases = await findRelatedCases(caseData, base44);
      result.related_cases = relatedCases;

      // Create activity log for each link
      for (const related of relatedCases) {
        if (related.confidence === "high") {
          await base44.asServiceRole.entities.ActivityLog.create({
            case_id,
            action: "related_case_identified",
            description: `AI identified related case: ${related.case_number} (${related.match_reason})`,
            performed_by: user.email,
            metadata: { related_case_id: related.case_id, confidence: related.confidence }
          });
        }
      }
    }

    // === 2. SUGGEST NEXT STEPS ===
    if (action_type === "suggest_next_steps" || action_type === "all") {
      const nextSteps = await suggestNextSteps(caseData, base44);
      result.next_steps = nextSteps;

      // Create high-priority todos for critical actions
      for (const step of nextSteps.filter(s => s.priority === "urgent" || s.priority === "high")) {
        await base44.asServiceRole.entities.Todo.create({
          case_id,
          title: step.action,
          description: step.reason,
          priority: step.priority === "urgent" ? "urgent" : "high",
          due_date: step.due_date,
          auto_generated: true,
        });
      }
    }

    // === 3. GENERATE CORRESPONDENCE ===
    if (action_type === "generate_correspondence" || action_type === "all") {
      const correspondence = await generateCorrespondence(caseData, base44, req);
      result.correspondence = correspondence;
    }

    // PHASE 3 ENHANCEMENT: Auto-generate forms if needed
    let formsGenerated = null;
    if (action_type === 'all' || action_type === 'generate_forms') {
      if (caseData.county && caseData.state && caseData.stage === 'packet_ready') {
        const counties = await base44.asServiceRole.entities.County.filter({
          name: caseData.county,
          state: caseData.state
        });
        
        if (counties[0]) {
          const formTemplates = await base44.asServiceRole.entities.CountyFormTemplate.filter({
            county_id: counties[0].id,
            is_active: true
          });
          
          if (formTemplates.length > 0) {
            try {
              const { data: packetResult } = await base44.functions.invoke('generateFilledPacket', {
                case_id: case_id
              });
              formsGenerated = packetResult;
              
              await base44.asServiceRole.entities.ActivityLog.create({
                case_id,
                action: 'AI Auto-Generated Forms',
                description: `AI automation generated ${packetResult.forms_generated} county forms`,
                performed_by: 'system'
              });
            } catch (err) {
              console.error('Failed to auto-generate forms:', err);
            }
          }
        }
      }
    }

    result.forms_generated = formsGenerated;

    // Log overall automation activity
    await base44.asServiceRole.entities.ActivityLog.create({
      case_id,
      action: "ai_case_automation",
      description: `AI automation completed: ${action_type}`,
      performed_by: user.email,
      metadata: { action_type, result }
    });

    return Response.json({
      status: 'success',
      case_id,
      action_type,
      result,
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
 * Find related cases based on owner, property, or other identifying information
 */
async function findRelatedCases(caseData, base44) {
  const allCases = await base44.asServiceRole.entities.Case.list();
  
  const ownerName = caseData.owner_name?.toLowerCase() || "";
  const propertyAddress = caseData.property_address?.toLowerCase() || "";
  const county = caseData.county?.toLowerCase() || "";
  
  const related = [];

  for (const c of allCases) {
    if (c.id === caseData.id) continue; // Skip self

    let matchReason = "";
    let confidence = "low";

    // Exact owner name match
    if (c.owner_name?.toLowerCase() === ownerName) {
      matchReason = "Exact owner name match";
      confidence = "high";
    }
    // Similar owner name (fuzzy match)
    else if (c.owner_name?.toLowerCase().includes(ownerName.split(' ')[0]) || 
             ownerName.includes(c.owner_name?.toLowerCase().split(' ')[0])) {
      matchReason = "Similar owner name";
      confidence = "medium";
    }
    // Same property address
    else if (propertyAddress && c.property_address?.toLowerCase() === propertyAddress) {
      matchReason = "Same property address";
      confidence = "high";
    }
    // Same parcel number
    else if (caseData.parcel_number && c.parcel_number === caseData.parcel_number) {
      matchReason = "Same parcel number";
      confidence = "high";
    }
    // Same owner email
    else if (caseData.owner_email && c.owner_email === caseData.owner_email) {
      matchReason = "Same owner email";
      confidence = "high";
    }
    // Same owner phone
    else if (caseData.owner_phone && c.owner_phone === caseData.owner_phone) {
      matchReason = "Same owner phone";
      confidence = "medium";
    }

    if (matchReason) {
      related.push({
        case_id: c.id,
        case_number: c.case_number,
        owner_name: c.owner_name,
        county: c.county,
        surplus_amount: c.surplus_amount,
        status: c.status,
        stage: c.stage,
        match_reason: matchReason,
        confidence,
      });
    }
  }

  return related.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
  });
}

/**
 * Suggest next steps based on case status and AI analysis
 */
async function suggestNextSteps(caseData, base44) {
  const documents = await base44.asServiceRole.entities.Document.filter({ case_id: caseData.id });
  const todos = await base44.asServiceRole.entities.Todo.filter({ case_id: caseData.id, is_completed: false });
  const activities = await base44.asServiceRole.entities.ActivityLog.filter({ case_id: caseData.id }, "-created_date", 10);

  const analysisPrompt = `You are an AI case manager for surplus recovery cases. Analyze the current case and suggest 3-5 next steps.

**Case Details:**
- Status: ${caseData.status}
- Stage: ${caseData.stage}
- Owner: ${caseData.owner_name}
- Surplus Amount: $${caseData.surplus_amount?.toLocaleString() || '0'}
- Sale Date: ${caseData.sale_date || 'Unknown'}
- Verification Status: ${caseData.verification_status || 'pending'}
- Owner Confidence: ${caseData.owner_confidence || 'unknown'}

**Documents Uploaded:** ${documents.length} documents
- Categories: ${[...new Set(documents.map(d => d.category))].join(', ')}

**Open Todos:** ${todos.length} tasks

**Recent Activity:**
${activities.slice(0, 5).map(a => `- ${a.action}: ${a.description}`).join('\n')}

**Suggest Next Steps:**
For each step, provide:
1. Action - Clear, specific action to take
2. Reason - Why this action is needed now
3. Priority - urgent, high, medium, or low
4. Due Date - When this should be completed (YYYY-MM-DD)
5. Estimated Duration - How long this will take (e.g., "15 minutes", "2 hours")

Consider:
- Missing documents or information
- Upcoming deadlines
- Owner engagement status
- Current pipeline stage
- Verification status`;

  const aiResult = await base44.integrations.Core.InvokeLLM({
    prompt: analysisPrompt,
    response_json_schema: {
      type: "object",
      properties: {
        next_steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string" },
              reason: { type: "string" },
              priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
              due_date: { type: "string" },
              estimated_duration: { type: "string" },
            }
          }
        },
        overall_assessment: { type: "string" },
        blocking_issues: { type: "array", items: { type: "string" } },
      }
    }
  });

  return aiResult.next_steps;
}

/**
 * Generate automated correspondence based on case events
 */
async function generateCorrespondence(caseData, base44, req) {
  const { correspondence_type = "initial_outreach", custom_context = "" } = await req.json();

  const templates = {
    initial_outreach: "initial contact letter to owner about surplus funds",
    follow_up: "polite follow-up letter after no response",
    document_request: "requesting missing documents from owner",
    notary_reminder: "reminding owner to complete notarization",
    approval_notification: "congratulations on case approval",
    payment_notification: "informing owner payment has been processed",
  };

  const promptContext = templates[correspondence_type] || custom_context;

  const generatePrompt = `Generate professional correspondence for a surplus recovery case.

**Case Context:**
- Owner: ${caseData.owner_name}
- Property Address: ${caseData.property_address || 'Property in ' + caseData.county}
- Surplus Amount: $${caseData.surplus_amount?.toLocaleString() || '0'}
- Case Number: ${caseData.case_number}
- County: ${caseData.county}, ${caseData.state}

**Type of Correspondence:** ${promptContext}

Generate:
1. Email Subject Line
2. Email Body (professional, clear, friendly tone)
3. SMS/Text Version (brief, under 160 chars)
4. Letter Version (formal, mail-ready)

Use merge tags where appropriate: {{owner_name}}, {{case_number}}, {{surplus_amount}}, {{property_address}}

Keep tone professional but warm. Focus on helping the owner claim their funds.`;

  const aiResult = await base44.integrations.Core.InvokeLLM({
    prompt: generatePrompt,
    response_json_schema: {
      type: "object",
      properties: {
        email_subject: { type: "string" },
        email_body: { type: "string" },
        sms_version: { type: "string" },
        letter_version: { type: "string" },
      }
    }
  });

  // Save as template for future use
  await base44.asServiceRole.entities.Template.create({
    name: `AI Generated - ${correspondence_type} - ${caseData.case_number}`,
    category: "email",
    subject: aiResult.email_subject,
    body: aiResult.email_body,
    is_active: true,
  });

  return aiResult;
}