import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PHASE 4 - Workflow Automation from Contact Results
 * Automatically updates case status/stage based on contact attempt outcomes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, contact_result } = await req.json();
    
    if (!case_id || !contact_result) {
      return Response.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    // Load case
    const cases = await base44.asServiceRole.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const updates = {};
    const actions = [];

    // Automation rules based on contact result
    switch (contact_result) {
      case 'spoke_to_owner':
      case 'owner_interested':
        // Owner is engaged - move to agreement stage if still in imported
        if (caseData.stage === 'imported') {
          updates.stage = 'info_completed';
          updates.status = 'active';
          actions.push('Advanced to info collection stage');
        }
        
        // Create TODO for follow-up
        await base44.asServiceRole.entities.Todo.create({
          case_id,
          title: 'Send agreement to owner',
          description: 'Owner expressed interest - send portal invitation',
          priority: 'high',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          auto_generated: true,
        });
        actions.push('Created follow-up TODO');
        break;

      case 'owner_declined':
        // Owner declined - mark as closed
        updates.status = 'closed';
        actions.push('Case marked as closed - owner declined');
        
        await base44.asServiceRole.entities.ActivityLog.create({
          case_id,
          action: 'case_closed',
          description: 'Case closed - owner declined services',
          performed_by: user.email,
        });
        break;

      case 'callback_requested':
        // Create TODO for callback
        await base44.asServiceRole.entities.Todo.create({
          case_id,
          title: 'Call back owner',
          description: 'Owner requested callback',
          priority: 'high',
          due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          auto_generated: true,
        });
        actions.push('Created callback TODO');
        break;

      case 'wrong_number':
      case 'disconnected':
        // Mark owner_confidence as low if contact failed
        if (caseData.owner_confidence !== 'low') {
          updates.owner_confidence = 'low';
          actions.push('Reduced owner confidence to low');
        }
        
        // Create alert
        await base44.asServiceRole.entities.Alert.create({
          case_id,
          type: 'action_required',
          title: 'Contact information invalid',
          message: 'Contact attempt failed - need to verify owner information',
          severity: 'warning',
        });
        actions.push('Created alert for invalid contact');
        break;

      case 'left_voicemail':
        // Create TODO for follow-up in 2 days
        await base44.asServiceRole.entities.Todo.create({
          case_id,
          title: 'Follow up on voicemail',
          description: 'Voicemail left - follow up if no response',
          priority: 'medium',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          auto_generated: true,
        });
        actions.push('Created follow-up TODO for voicemail');
        break;

      case 'spoke_to_relative':
        // Create TODO to reach owner
        await base44.asServiceRole.entities.Todo.create({
          case_id,
          title: 'Reach actual owner',
          description: 'Spoke to relative - need to contact owner directly',
          priority: 'medium',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          auto_generated: true,
        });
        actions.push('Created TODO to reach actual owner');
        break;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Case.update(case_id, updates);
    }

    return Response.json({
      status: 'success',
      actions_taken: actions,
      updates_applied: updates,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
});