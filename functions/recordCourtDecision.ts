import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * COURT DECISION RECORDER
 * Records court/treasurer decisions and manages next steps
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
      decision_type, // 'approved', 'denied', 'more_info_needed', 'pending'
      decision_date,
      decision_notes,
      approved_amount,
      check_number,
      expected_payment_date
    } = await req.json();

    if (!case_id || !decision_type) {
      return Response.json({ 
        status: 'error',
        details: 'case_id and decision_type required' 
      }, { status: 400 });
    }

    // Fetch case
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    const updates = {
      internal_notes: (caseData.internal_notes || '') + 
        `\n\nDecision: ${decision_type.toUpperCase()} on ${decision_date || new Date().toLocaleDateString()}` +
        (decision_notes ? `\nNotes: ${decision_notes}` : '')
    };

    // Handle based on decision type
    if (decision_type === 'approved') {
      updates.stage = 'approved';
      updates.status = 'approved';
      updates.payment_amount = approved_amount || caseData.surplus_amount;
      
      if (check_number) {
        updates.internal_notes += `\nCheck #: ${check_number}`;
      }

      // Create payment tracking todo
      await base44.entities.Todo.create({
        case_id,
        title: 'Monitor Payment Receipt',
        description: `Expected payment: $${(approved_amount || caseData.surplus_amount)?.toLocaleString()}${check_number ? ` (Check #${check_number})` : ''}`,
        priority: 'high',
        due_date: expected_payment_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        auto_generated: true
      });

      // Notify homeowner
      if (caseData.owner_email) {
        await base44.integrations.Core.SendEmail({
          to: caseData.owner_email,
          subject: 'Good News: Your Surplus Claim Has Been Approved!',
          body: `Dear ${caseData.owner_name},

Great news! Your surplus funds claim has been approved by the ${caseData.county} County.

Approved Amount: $${(approved_amount || caseData.surplus_amount)?.toLocaleString()}
${check_number ? `Check Number: ${check_number}` : ''}
${expected_payment_date ? `Expected Payment: ${new Date(expected_payment_date).toLocaleDateString()}` : ''}

We will notify you as soon as we receive the payment.

Best regards,
TENNO Recovery Team`
        });
      }

    } else if (decision_type === 'denied') {
      updates.stage = 'closed';
      updates.status = 'closed';
      
      // Create follow-up todo
      await base44.entities.Todo.create({
        case_id,
        title: 'Review Denial Reason and Appeal Options',
        description: decision_notes || 'Claim was denied - review reason and determine if appeal is warranted',
        priority: 'high',
        due_date: new Date().toISOString().split('T')[0],
        auto_generated: true
      });

    } else if (decision_type === 'more_info_needed') {
      updates.status = 'pending';
      
      // Create action item
      await base44.entities.Todo.create({
        case_id,
        title: 'Provide Additional Information to Court',
        description: decision_notes || 'Court requested additional information',
        priority: 'urgent',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        auto_generated: true
      });
    }

    // Update case
    await base44.entities.Case.update(case_id, updates);

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'court_decision_recorded',
      description: `Decision: ${decision_type}${approved_amount ? ` - $${approved_amount.toLocaleString()}` : ''}`,
      performed_by: user.email,
      metadata: { decision_type, decision_date, approved_amount, check_number }
    });

    // Create event
    await base44.entities.HomeownerTaskEvent.create({
      case_id,
      event_type: decision_type === 'approved' ? 'step_completed' : 'step_blocked',
      step_key: 'decision',
      performed_by: user.email,
      details: { decision_type, decision_date, approved_amount }
    });

    return Response.json({
      status: 'success',
      decision_type,
      next_steps: decision_type === 'approved' ? 'Monitor for payment' : 
                  decision_type === 'denied' ? 'Review appeal options' :
                  'Provide additional information'
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});