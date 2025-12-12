import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * HOMEOWNER WORKFLOW SERVICE
 * Step 7: Automated workflow management
 * - Initialize steps for new cases
 * - Check eligibility for next steps
 * - Auto-advance when conditions met
 * - Send reminders for pending actions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, case_id, step_key } = await req.json();

    if (!action || !case_id) {
      return Response.json({ 
        status: 'error',
        details: 'action and case_id required' 
      }, { status: 400 });
    }

    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    let result;
    
    switch (action) {
      case 'initialize':
        result = await initializeWorkflow(base44, caseData);
        break;
      case 'get_progress':
        result = await getProgress(base44, caseData);
        break;
      case 'check_advancement':
        result = await checkAdvancement(base44, caseData);
        break;
      case 'advance_step':
        result = await advanceStep(base44, caseData, step_key);
        break;
      case 'send_reminders':
        result = await sendReminders(base44, caseData);
        break;
      default:
        return Response.json({ 
          status: 'error',
          details: 'Invalid action' 
        }, { status: 400 });
    }

    return Response.json({
      status: 'success',
      result
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

async function initializeWorkflow(base44, caseData) {
  // Define standard workflow steps
  const standardSteps = [
    { step_key: 'agreement', order: 1, required: true },
    { step_key: 'id_upload', order: 2, required: true },
    { step_key: 'intake', order: 3, required: true },
    { step_key: 'notary', order: 4, required: true },
    { step_key: 'review', order: 5, required: true },
    { step_key: 'packet_generated', order: 6, required: true },
    { step_key: 'filed', order: 7, required: true },
    { step_key: 'decision', order: 8, required: true },
    { step_key: 'paid', order: 9, required: true }
  ];

  // Check if already initialized
  const existing = await base44.entities.HomeownerStep.filter({ case_id: caseData.id });
  if (existing.length > 0) {
    return { message: 'Already initialized', steps: existing.length };
  }

  // Create steps
  for (const step of standardSteps) {
    const status = determineInitialStatus(step.step_key, caseData);
    
    await base44.entities.HomeownerStep.create({
      case_id: caseData.id,
      step_key: step.step_key,
      status,
      required: step.required,
      order: step.order
    });
  }

  return { message: 'Workflow initialized', steps: standardSteps.length };
}

async function getProgress(base44, caseData) {
  const steps = await base44.entities.HomeownerStep.filter({ case_id: caseData.id }, 'order');
  
  const total = steps.filter(s => s.required).length;
  const completed = steps.filter(s => s.status === 'completed' && s.required).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    steps,
    total,
    completed,
    percentage,
    current_step: steps.find(s => s.status === 'in_progress' || (s.status === 'not_started' && s.required))
  };
}

async function checkAdvancement(base44, caseData) {
  const steps = await base44.entities.HomeownerStep.filter({ case_id: caseData.id }, 'order');
  const advancements = [];

  for (const step of steps) {
    if (step.status === 'completed') continue;

    const canAdvance = checkStepEligibility(step.step_key, caseData);
    
    if (canAdvance.ready && step.status !== 'completed') {
      // Auto-advance
      await base44.entities.HomeownerStep.update(step.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: 'system'
      });

      await base44.entities.HomeownerTaskEvent.create({
        case_id: caseData.id,
        event_type: 'step_completed',
        step_key: step.step_key,
        performed_by: 'system'
      });

      advancements.push(step.step_key);
    }
  }

  return {
    advancements,
    count: advancements.length
  };
}

async function advanceStep(base44, caseData, step_key) {
  const steps = await base44.entities.HomeownerStep.filter({ 
    case_id: caseData.id, 
    step_key 
  });
  
  if (steps.length === 0) {
    throw new Error('Step not found');
  }

  const step = steps[0];
  
  await base44.entities.HomeownerStep.update(step.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    completed_by: 'homeowner'
  });

  await base44.entities.HomeownerTaskEvent.create({
    case_id: caseData.id,
    event_type: 'step_completed',
    step_key,
    performed_by: 'homeowner'
  });

  return { message: 'Step advanced', step_key };
}

async function sendReminders(base44, caseData) {
  const steps = await base44.entities.HomeownerStep.filter({ case_id: caseData.id }, 'order');
  const pendingSteps = steps.filter(s => s.status === 'not_started' || s.status === 'in_progress');

  if (pendingSteps.length === 0 || !caseData.owner_email) {
    return { sent: false, reason: 'No pending steps or no email' };
  }

  const nextStep = pendingSteps[0];
  const stepLabels = {
    agreement: 'Sign Agreement',
    id_upload: 'Upload ID',
    intake: 'Complete Intake Form',
    notary: 'Complete Notarization',
    review: 'Review Documents'
  };

  await base44.integrations.Core.SendEmail({
    to: caseData.owner_email,
    subject: `Action Needed: ${stepLabels[nextStep.step_key]}`,
    body: `Dear ${caseData.owner_name},

Your surplus recovery case requires your attention.

Next Step: ${stepLabels[nextStep.step_key]}

Please log into your portal to complete this step:
[Portal Link]

Case Number: ${caseData.case_number}
Surplus Amount: $${caseData.surplus_amount?.toLocaleString()}

If you have questions, reply to this email or contact support.

Best regards,
TENNO RECOVERY`
  });

  await base44.entities.HomeownerTaskEvent.create({
    case_id: caseData.id,
    event_type: 'reminder_sent',
    step_key: nextStep.step_key,
    performed_by: 'system'
  });

  return { 
    sent: true, 
    step_key: nextStep.step_key,
    email: caseData.owner_email
  };
}

function determineInitialStatus(stepKey, caseData) {
  switch (stepKey) {
    case 'agreement':
      return caseData.agreement_status === 'signed' ? 'completed' : 'not_started';
    case 'id_upload':
      return (caseData.id_front_url && caseData.id_back_url) ? 'completed' : 'not_started';
    case 'intake':
      return caseData.stage === 'info_completed' ? 'completed' : 'not_started';
    case 'notary':
      return caseData.notary_status === 'approved' ? 'completed' : 'not_started';
    case 'packet_generated':
      return caseData.stage === 'packet_ready' ? 'completed' : 'not_started';
    case 'filed':
      return caseData.stage === 'filed' ? 'completed' : 'not_started';
    case 'paid':
      return caseData.stage === 'paid' ? 'completed' : 'not_started';
    default:
      return 'not_started';
  }
}

function checkStepEligibility(stepKey, caseData) {
  switch (stepKey) {
    case 'agreement':
      return { 
        ready: caseData.agreement_status === 'signed',
        reason: caseData.agreement_status === 'signed' ? null : 'Agreement not signed'
      };
    case 'id_upload':
      return { 
        ready: !!(caseData.id_front_url && caseData.id_back_url),
        reason: (caseData.id_front_url && caseData.id_back_url) ? null : 'ID documents missing'
      };
    case 'intake':
      return { 
        ready: !!(caseData.owner_email && caseData.owner_phone && caseData.owner_address),
        reason: (caseData.owner_email && caseData.owner_phone) ? null : 'Contact info missing'
      };
    case 'notary':
      return { 
        ready: caseData.notary_status === 'approved' || caseData.notary_status === 'uploaded',
        reason: caseData.notary_status === 'approved' ? null : 'Notary not completed'
      };
    case 'packet_generated':
      return { 
        ready: !!caseData.packet_url,
        reason: caseData.packet_url ? null : 'Packet not generated'
      };
    case 'filed':
      return { 
        ready: caseData.filing_status === 'filed',
        reason: caseData.filing_status === 'filed' ? null : 'Not yet filed'
      };
    case 'paid':
      return { 
        ready: caseData.stage === 'paid',
        reason: caseData.stage === 'paid' ? null : 'Payment not received'
      };
    default:
      return { ready: false, reason: 'Unknown step' };
  }
}