// [NEW - AI Engine Main Function]
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const input = await req.json();
    const startTime = Date.now();
    
    const { message, userType, userId, caseId, sessionId, conversationId } = input;
    
    // Validate input
    if (!message || !userType || !sessionId) {
      return Response.json({
        success: false,
        error: 'Missing required fields: message, userType, sessionId'
      });
    }
    
    // 1. PREPROCESS MESSAGE
    const processed = preprocessMessage(message);
    
    // 2. LOAD INTENTS
    const intents = await base44.asServiceRole.entities.AIIntent.filter({ is_active: true });
    
    // 3. CLASSIFY INTENT
    const classification = classifyIntent(processed.processed, userType, intents);
    
    // 4. BUILD CONTEXT
    let context = {
      userType,
      userId,
      sessionId,
      message: processed,
      classification
    };
    
    // Try to extract case ID from message
    let effectiveCaseId = caseId;
    if (!effectiveCaseId && processed.entities.caseNumbers.length > 0) {
      const caseNum = processed.entities.caseNumbers[0];
      const cases = await base44.asServiceRole.entities.Case.filter({ case_number: caseNum });
      if (cases.length > 0) effectiveCaseId = cases[0].id;
    }
    
    // Build case context
    if (effectiveCaseId) {
      context.case = await buildCaseContext(base44, effectiveCaseId);
      if (context.case?.county) {
        context.county = await buildCountyContext(base44, context.case.county, context.case.state);
      }
      context.timeline = await buildTimeline(base44, effectiveCaseId);
    }
    
    // Load app settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    context.appSettings = {};
    settings.forEach(s => { context.appSettings[s.setting_key] = s.setting_value; });
    
    // 5. CHECK IF INTENT REQUIRES CASE
    const intent = classification.intent;
    if (intent?.requires_case && !context.case) {
      return Response.json({
        success: true,
        response: {
          text: "I'd be happy to help with that! Could you tell me which case you're asking about?\n\n• Your case number (like CV2024-001234)\n• Your property address\n• Or just describe your situation",
          intent: classification.intent_id,
          confidence: classification.confidence,
          suggestedActions: [],
          followUpPrompts: [],
          escalate: false,
          conversationId
        }
      });
    }
    
    // 6. GENERATE RESPONSE
    const response = await generateResponse(base44, classification.intent_id, context, userType);
    
    // 7. SAFETY CHECK
    const safetyResult = checkSafety(response.text, classification);
    if (safetyResult.escalate) {
      response.escalate = true;
      response.escalationReason = safetyResult.reason;
    }
    
    // 8. LOG CONVERSATION
    const conversationRecord = await logConversation(base44, {
      conversationId,
      sessionId,
      userType,
      userId,
      caseId: effectiveCaseId,
      userMessage: message,
      assistantResponse: response.text,
      intent: classification.intent_id,
      confidence: classification.confidence,
      escalated: response.escalate || false
    });
    
    // 9. RETURN
    return Response.json({
      success: true,
      response: {
        text: response.text,
        intent: classification.intent_id,
        confidence: classification.confidence,
        suggestedActions: response.suggestedActions,
        followUpPrompts: response.followUpPrompts,
        escalate: response.escalate || false,
        conversationId: conversationRecord.conversation_id
      },
      debug: {
        intentScores: classification.allScores?.slice(0, 3),
        processingTime: Date.now() - startTime
      }
    });
    
  } catch (error) {
    console.error('[AI] Error:', error);
    return Response.json({
      success: false,
      error: 'An error occurred processing your message.',
      debug: { errorMessage: error.message }
    }, { status: 500 });
  }
});

// [HELPERS] Preprocessing
function preprocessMessage(message) {
  let processed = message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/what's/g, 'what is')
    .replace(/where's/g, 'where is')
    .replace(/how's/g, 'how is')
    .replace(/i'm/g, 'i am')
    .replace(/can't/g, 'cannot')
    .replace(/don't/g, 'do not');
  
  const entities = {
    caseNumbers: message.match(/CV\d{4}[-]?\d{4,}/gi) || [],
    amounts: message.match(/\$[\d,]+/g) || []
  };
  
  return {
    original: message,
    processed,
    entities,
    words: processed.split(' ').filter(w => w.length > 0)
  };
}

// [HELPERS] Intent Classification
function classifyIntent(message, userType, intents) {
  const words = message.split(/\s+/);
  const scores = [];
  
  for (const intent of intents) {
    if (intent.category !== userType && intent.category !== 'both') continue;
    
    let score = 0;
    
    // Keyword matching (40%)
    if (intent.keywords?.length > 0) {
      let matches = 0;
      for (const kw of intent.keywords) {
        if (words.includes(kw.toLowerCase()) || message.includes(kw.toLowerCase())) {
          matches++;
        }
      }
      score += (matches / intent.keywords.length) * 0.4;
    }
    
    // Phrase matching (40%)
    if (intent.phrases?.length > 0) {
      let matches = 0;
      for (const phrase of intent.phrases) {
        if (message.includes(phrase.toLowerCase())) {
          matches++;
        }
      }
      score += (matches > 0 ? Math.min(1, matches * 0.5) : 0) * 0.4;
    }
    
    // Pattern matching (20%)
    if (intent.patterns?.length > 0) {
      let matches = 0;
      for (const pattern of intent.patterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(message)) matches++;
        } catch {}
      }
      score += (matches > 0 ? 1 : 0) * 0.2;
    }
    
    // Priority boost
    score += (intent.priority || 50) / 1000;
    score = Math.min(1, score);
    
    scores.push({
      intent_id: intent.intent_id,
      intent,
      score,
      meetsThreshold: score >= (intent.min_confidence || 0.3)
    });
  }
  
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  
  if (!best || !best.meetsThreshold) {
    return {
      intent_id: 'unknown_intent',
      confidence: best?.score || 0,
      allScores: scores,
      matched: false
    };
  }
  
  return {
    intent_id: best.intent_id,
    intent: best.intent,
    confidence: best.score,
    allScores: scores,
    matched: true
  };
}

// [HELPERS] Context Builders
async function buildCaseContext(base44, caseId) {
  const cases = await base44.asServiceRole.entities.Case.filter({ id: caseId });
  if (cases.length === 0) return null;
  
  const c = cases[0];
  const progress = calculateProgress(c);
  const nextStep = getNextStep(c);
  const feeAmount = (c.surplus_amount || 0) * ((c.fee_percent || 25) / 100);
  
  return {
    ...c,
    progress_percent: progress,
    progress_bar: generateProgressBar(progress),
    next_step: nextStep,
    status_label: getStatusLabel(c.stage),
    status_description: getStatusDescription(c.stage),
    fee_amount: feeAmount.toFixed(2),
    client_amount: ((c.surplus_amount || 0) - feeAmount).toFixed(2),
    surplus_formatted: formatCurrency(c.surplus_amount),
    fee_formatted: formatCurrency(feeAmount),
    owner_first_name: c.owner_name?.split(' ')[0] || 'there',
    is_hot_text: c.is_hot ? '🔥 YES' : 'No',
    verified_badge: c.verification_status === 'green' ? '(VERIFIED ✓)' : '',
    checklist: buildChecklist(c)
  };
}

async function buildCountyContext(base44, countyName, state) {
  const counties = await base44.asServiceRole.entities.County.filter({ name: countyName, state });
  if (counties.length === 0) return null;
  
  const county = counties[0];
  return {
    ...county,
    allows_rep: county.allows_filing_on_behalf ? '✓ YES' : '✗ NO',
    notary_required_badge: county.requires_notarized_authorization ? '⚠ Required' : '✓ Not Required'
  };
}

async function buildTimeline(base44, caseId) {
  const activities = await base44.asServiceRole.entities.ActivityLog.filter(
    { case_id: caseId },
    '-created_date',
    10
  );
  
  return activities.map(a => ({
    formatted: `• ${formatDate(a.created_date)} - ${a.action}`
  }));
}

// [HELPERS] Response Generation
async function generateResponse(base44, intentId, context, userType) {
  const responses = await base44.asServiceRole.entities.AIResponse.filter({
    intent_id: intentId,
    is_active: true
  });
  
  const validResponses = responses.filter(r => r.persona === userType || r.persona === 'both');
  
  if (validResponses.length === 0) {
    return generateFallbackResponse(userType);
  }
  
  const selectedResponse = validResponses.sort((a, b) => (b.priority || 50) - (a.priority || 50))[0];
  
  const filledResponse = injectVariables(selectedResponse.response_template, context);
  const actions = processActions(selectedResponse.suggested_actions, context);
  
  return {
    text: filledResponse,
    tone: selectedResponse.tone,
    suggestedActions: actions,
    followUpPrompts: selectedResponse.follow_up_prompts || [],
    responseId: selectedResponse.response_id
  };
}

function injectVariables(template, context) {
  if (!template) return '';
  
  let result = template;
  const variablePattern = /\{([^}]+)\}/g;
  const matches = template.match(variablePattern) || [];
  
  for (const match of matches) {
    const varName = match.slice(1, -1);
    const value = getVariableValue(varName, context);
    result = result.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  
  result = result.replace(/\{[^}]+\}/g, '').replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

function getVariableValue(varName, context) {
  const c = context.case || {};
  const county = context.county || {};
  
  // Direct lookups
  if (c[varName] !== undefined) return formatValue(c[varName], varName);
  if (county[varName] !== undefined) return formatValue(county[varName], varName);
  
  // Computed values
  const computed = {
    checklist: formatChecklist(c.checklist || buildChecklist(c)),
    timeline_summary: context.timeline ? context.timeline.map(t => t.formatted).join('\n') : 'No activity yet',
    status_explanation: getStatusDescription(c.stage),
    next_step_section: buildNextStepSection(c),
    action_needed_box: buildActionNeededBox(c),
    personalized_greeting: c.owner_name ? `Welcome back, ${c.owner_name.split(' ')[0]}!` : 'Hello!',
    county: county.name || '',
    clerk_phone: county.clerk_phone || '(Contact county)',
    company_name: context.appSettings?.company_name || 'Tenno Asset Recovery',
    fee_percent: c.fee_percent || 25,
    client_percent: 100 - (c.fee_percent || 25),
    case_specific_note: c.surplus_amount ? `For your case: ${formatCurrency(c.surplus_amount)} in surplus from ${c.county} County.` : ''
  };
  
  return computed[varName] || '';
}

function formatValue(val, varName) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' && varName.includes('amount')) return formatCurrency(val);
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

function processActions(actions, context) {
  if (!actions) return [];
  return actions.map(a => ({
    label: injectVariables(a.label || '', context),
    action: a.action,
    route: a.route ? injectVariables(a.route, context) : null,
    primary: a.primary || false
  }));
}

// [HELPERS] Progress & Status
function calculateProgress(c) {
  const stages = {
    imported: 5, agreement_signed: 30, info_completed: 50, notary_completed: 65,
    packet_ready: 70, filed: 80, approved: 95, paid: 100, closed: 100
  };
  return stages[c.stage] || 0;
}

function generateProgressBar(percent) {
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  return '━'.repeat(filled) + '●' + '━'.repeat(Math.max(0, empty - 1)) + ` ${percent}%`;
}

function getStatusLabel(stage) {
  const labels = {
    imported: 'New Case', agreement_signed: 'Agreement Signed',
    info_completed: 'Info Received', notary_completed: 'Documents Ready',
    packet_ready: 'Ready to File', filed: 'Filed - Waiting', 
    approved: 'Approved!', paid: 'Payment Received', closed: 'Completed'
  };
  return labels[stage] || 'In Progress';
}

function getStatusDescription(stage) {
  const desc = {
    imported: 'We\'re reviewing this case.',
    agreement_signed: 'Thank you for signing! We\'re collecting documents.',
    filed: 'Your claim has been filed. Waiting period in progress.',
    approved: 'Great news! Court approved your claim.',
    closed: 'Case complete. Thank you!'
  };
  return desc[stage] || 'Your case is being processed.';
}

function getNextStep(c) {
  if (c.agreement_status !== 'signed') return { action: 'Sign agreement', urgent: true };
  if (!c.owner_dob || !c.owner_ssn_last_four) return { action: 'Confirm information', urgent: true };
  if (!c.id_front_url || !c.id_back_url) return { action: 'Upload ID', urgent: true };
  if (c.notary_required && !c.notary_packet_uploaded) return { action: 'Upload notarized auth', urgent: true };
  if (c.stage === 'filed') return { action: 'Waiting period', urgent: false };
  return { action: 'Processing', urgent: false };
}

function buildChecklist(c) {
  return [
    { label: 'Sign agreement', completed: c.agreement_status === 'signed' },
    { label: 'Upload ID', completed: !!(c.id_front_url && c.id_back_url) },
    { label: 'Notary (if required)', completed: !c.notary_required || c.notary_packet_uploaded, skip: !c.notary_required },
    { label: 'Filed', completed: ['filed','approved','paid','closed'].includes(c.stage) },
    { label: 'Approved', completed: ['approved','paid','closed'].includes(c.stage) },
    { label: 'Paid', completed: c.stage === 'closed' }
  ].filter(i => !i.skip);
}

function formatChecklist(items) {
  return items.map(i => `${i.completed ? '✅' : '⬜'} ${i.label}`).join('\n');
}

function buildNextStepSection(c) {
  const next = getNextStep(c);
  if (!next.urgent) return `**Status:** ${next.action}. No action needed from you right now.`;
  return `**➡️ Your next step: ${next.action}**`;
}

function buildActionNeededBox(c) {
  const next = getNextStep(c);
  if (!next.urgent) return `✅ **No action needed**\n\n${next.action}`;
  return `⚠️ **ACTION NEEDED: ${next.action}**`;
}

// [HELPERS] Utils
function formatCurrency(amt) {
  if (!amt) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amt);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// [HELPERS] Safety & Logging
function checkSafety(text, classification) {
  const result = { escalate: false, reason: null };
  
  if (classification.intent?.escalate_if_unsure && classification.confidence < 0.5) {
    result.escalate = true;
    result.reason = 'Low confidence';
  }
  
  if (classification.intent_id === 'unknown_intent' && classification.confidence < 0.2) {
    result.escalate = true;
    result.reason = 'Could not understand';
  }
  
  return result;
}

async function logConversation(base44, params) {
  const now = new Date().toISOString();
  const userMsg = { role: 'user', content: params.userMessage, timestamp: now };
  const aiMsg = { role: 'assistant', content: params.assistantResponse, intent: params.intent, confidence: params.confidence, timestamp: now };
  
  if (params.conversationId) {
    const convs = await base44.asServiceRole.entities.AIConversation.filter({ conversation_id: params.conversationId });
    if (convs.length > 0) {
      const conv = convs[0];
      const msgs = conv.messages || [];
      msgs.push(userMsg, aiMsg);
      await base44.asServiceRole.entities.AIConversation.update(conv.id, {
        messages: msgs,
        last_message_at: now,
        message_count: msgs.length,
        escalated: params.escalated || conv.escalated
      });
      return { conversation_id: params.conversationId };
    }
  }
  
  const newId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  await base44.asServiceRole.entities.AIConversation.create({
    conversation_id: newId,
    user_type: params.userType,
    user_id: params.userId,
    case_id: params.caseId,
    session_id: params.sessionId,
    messages: [userMsg, aiMsg],
    started_at: now,
    last_message_at: now,
    message_count: 2,
    escalated: params.escalated || false
  });
  
  return { conversation_id: newId };
}

function generateFallbackResponse(userType) {
  const caps = userType === 'client' 
    ? '• Check case status\n• Understand the process\n• Get help with next steps\n• Learn about documents'
    : '• Get case briefings\n• Generate scripts\n• Check filing readiness\n• View priority queue';
  
  return {
    text: `I'm not quite sure I understood that.\n\n**I can assist with:**\n${caps}\n\nCould you rephrase your question?`,
    tone: 'friendly',
    suggestedActions: [],
    followUpPrompts: [],
    responseId: 'fallback'
  };
}