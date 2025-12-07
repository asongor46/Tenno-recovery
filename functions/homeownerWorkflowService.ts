// =====================================================
// HOMEOWNER WORKFLOW SERVICE
// =====================================================
// Manages the homeowner journey step-by-step
// Initializes, advances, blocks, and tracks workflow progress

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ADDED: Workflow step definitions
const WORKFLOW_STEPS = [
  { key: 'agreement', label: 'Sign Agreement', order: 1, required: true },
  { key: 'id_upload', label: 'Upload ID', order: 2, required: true },
  { key: 'intake', label: 'Complete Intake', order: 3, required: true },
  { key: 'notary', label: 'Notarization', order: 4, required: true },
  { key: 'review', label: 'Review & Confirm', order: 5, required: true },
  { key: 'packet_generated', label: 'Packet Generated', order: 6, required: false },
  { key: 'filed', label: 'Filed with County', order: 7, required: false },
  { key: 'decision', label: 'County Decision', order: 8, required: false },
  { key: 'paid', label: 'Payment Received', order: 9, required: false },
];

// ADDED: Initialize workflow for a case
async function initializeWorkflow(caseId, base44) {
  const existingSteps = await base44.asServiceRole.entities.HomeownerStep.filter({
    case_id: caseId,
  });

  // Don't re-initialize if steps already exist
  if (existingSteps.length > 0) {
    return { status: 'already_initialized', steps: existingSteps };
  }

  // Create all steps
  const createdSteps = [];
  for (const stepDef of WORKFLOW_STEPS) {
    const step = await base44.asServiceRole.entities.HomeownerStep.create({
      case_id: caseId,
      step_key: stepDef.key,
      status: 'not_started',
      required: stepDef.required,
      order: stepDef.order,
    });
    createdSteps.push(step);
  }

  // Log event
  await base44.asServiceRole.entities.HomeownerTaskEvent.create({
    case_id: caseId,
    event_type: 'portal_invited',
    details: { steps_initialized: WORKFLOW_STEPS.length },
  });

  return { status: 'initialized', steps: createdSteps };
}

// ADDED: Get current active step
async function getCurrentStep(caseId, base44) {
  const steps = await base44.asServiceRole.entities.HomeownerStep.filter(
    { case_id: caseId },
    'order'
  );

  // Find first incomplete step
  const currentStep = steps.find(
    (s) => s.status !== 'completed' && s.required
  );

  return currentStep || steps[steps.length - 1]; // Return last step if all complete
}

// ADDED: Advance to next step
async function advanceStep(caseId, stepKey, completedBy, base44) {
  const steps = await base44.asServiceRole.entities.HomeownerStep.filter({
    case_id: caseId,
    step_key: stepKey,
  });

  const step = steps[0];
  if (!step) {
    throw new Error(`Step ${stepKey} not found for case ${caseId}`);
  }

  // Mark as completed
  await base44.asServiceRole.entities.HomeownerStep.update(step.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    completed_by: completedBy,
  });

  // Log event
  await base44.asServiceRole.entities.HomeownerTaskEvent.create({
    case_id: caseId,
    event_type: 'step_completed',
    step_key: stepKey,
    performed_by: completedBy,
    details: { completed_at: new Date().toISOString() },
  });

  // Check if we should advance case stage
  await updateCaseStage(caseId, base44);

  return { status: 'advanced', step_key: stepKey };
}

// ADDED: Block a step with reason
async function blockStep(caseId, stepKey, reason, base44) {
  const steps = await base44.asServiceRole.entities.HomeownerStep.filter({
    case_id: caseId,
    step_key: stepKey,
  });

  const step = steps[0];
  if (!step) {
    throw new Error(`Step ${stepKey} not found for case ${caseId}`);
  }

  // Mark as blocked
  await base44.asServiceRole.entities.HomeownerStep.update(step.id, {
    status: 'blocked',
    blocking_reason: reason,
  });

  // Log event
  await base44.asServiceRole.entities.HomeownerTaskEvent.create({
    case_id: caseId,
    event_type: 'step_blocked',
    step_key: stepKey,
    details: { reason },
  });

  return { status: 'blocked', step_key: stepKey, reason };
}

// ADDED: Unblock a step
async function unblockStep(caseId, stepKey, base44) {
  const steps = await base44.asServiceRole.entities.HomeownerStep.filter({
    case_id: caseId,
    step_key: stepKey,
  });

  const step = steps[0];
  if (!step) {
    throw new Error(`Step ${stepKey} not found for case ${caseId}`);
  }

  // Mark as in progress
  await base44.asServiceRole.entities.HomeownerStep.update(step.id, {
    status: 'in_progress',
    blocking_reason: null,
  });

  return { status: 'unblocked', step_key: stepKey };
}

// ADDED: Update case stage based on workflow progress
async function updateCaseStage(caseId, base44) {
  const steps = await base44.asServiceRole.entities.HomeownerStep.filter({
    case_id: caseId,
  });

  const completedSteps = steps.filter((s) => s.status === 'completed');

  let newStage = 'imported';

  if (completedSteps.some((s) => s.step_key === 'agreement')) {
    newStage = 'agreement_signed';
  }
  if (completedSteps.some((s) => s.step_key === 'intake')) {
    newStage = 'info_completed';
  }
  if (completedSteps.some((s) => s.step_key === 'notary')) {
    newStage = 'notary_completed';
  }
  if (completedSteps.some((s) => s.step_key === 'review')) {
    newStage = 'packet_ready';
  }
  if (completedSteps.some((s) => s.step_key === 'filed')) {
    newStage = 'filed';
  }
  if (completedSteps.some((s) => s.step_key === 'decision')) {
    newStage = 'approved';
  }
  if (completedSteps.some((s) => s.step_key === 'paid')) {
    newStage = 'paid';
  }

  // Update case
  await base44.asServiceRole.entities.Case.update(caseId, {
    stage: newStage,
  });

  return newStage;
}

// ADDED: Get workflow progress summary
async function getWorkflowProgress(caseId, base44) {
  const steps = await base44.asServiceRole.entities.HomeownerStep.filter(
    { case_id: caseId },
    'order'
  );

  const total = steps.length;
  const completed = steps.filter((s) => s.status === 'completed').length;
  const blocked = steps.filter((s) => s.status === 'blocked').length;
  const inProgress = steps.filter((s) => s.status === 'in_progress').length;

  return {
    total,
    completed,
    blocked,
    in_progress: inProgress,
    not_started: total - completed - blocked - inProgress,
    percentage: Math.round((completed / total) * 100),
    steps,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, case_id, step_key, completed_by, reason } = await req.json();

    if (!case_id) {
      return Response.json(
        { error: 'Missing required field: case_id' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'initialize':
        result = await initializeWorkflow(case_id, base44);
        break;

      case 'get_current':
        result = await getCurrentStep(case_id, base44);
        break;

      case 'advance':
        if (!step_key) {
          return Response.json(
            { error: 'Missing step_key for advance action' },
            { status: 400 }
          );
        }
        result = await advanceStep(case_id, step_key, completed_by || user.email, base44);
        break;

      case 'block':
        if (!step_key || !reason) {
          return Response.json(
            { error: 'Missing step_key or reason for block action' },
            { status: 400 }
          );
        }
        result = await blockStep(case_id, step_key, reason, base44);
        break;

      case 'unblock':
        if (!step_key) {
          return Response.json(
            { error: 'Missing step_key for unblock action' },
            { status: 400 }
          );
        }
        result = await unblockStep(case_id, step_key, base44);
        break;

      case 'get_progress':
        result = await getWorkflowProgress(case_id, base44);
        break;

      default:
        return Response.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return Response.json({
      status: 'success',
      action,
      case_id,
      result,
    });
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
});