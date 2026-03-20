import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PAYMENT RECORDER
 * Records payment receipt and closes case
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
      payment_amount,
      payment_date,
      payment_method, // 'check', 'wire', 'ach'
      check_number,
      notes
    } = await req.json();

    if (!case_id || !payment_amount) {
      return Response.json({ 
        status: 'error',
        details: 'case_id and payment_amount required' 
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

    const paidAt = payment_date || new Date().toISOString();

    // Update case
    await base44.entities.Case.update(case_id, {
      stage: 'paid',
      paid_at: paidAt,
      payment_amount,
      internal_notes: (caseData.internal_notes || '') + 
        `\n\nPayment received: $${payment_amount.toLocaleString()} on ${new Date(paidAt).toLocaleDateString()}` +
        (payment_method ? `\nMethod: ${payment_method}` : '') +
        (check_number ? `\nCheck #: ${check_number}` : '') +
        (notes ? `\nNotes: ${notes}` : '')
    });

    // Create final notification todo
    await base44.entities.Todo.create({
      case_id,
      title: 'Notify Homeowner of Payment Receipt',
      description: `Send payment confirmation to ${caseData.owner_name}`,
      priority: 'high',
      due_date: new Date().toISOString().split('T')[0],
      auto_generated: true,
      is_completed: false
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'payment_received',
      description: `Payment received: $${payment_amount.toLocaleString()}${payment_method ? ` via ${payment_method}` : ''}`,
      performed_by: user.email,
      metadata: { payment_amount, payment_date: paidAt, payment_method, check_number }
    });

    // Create event
    await base44.entities.HomeownerTaskEvent.create({
      case_id,
      event_type: 'step_completed',
      step_key: 'paid',
      performed_by: user.email,
      details: { payment_amount, payment_date: paidAt }
    });

    // Send notification if email exists
    if (caseData.owner_email) {
      await base44.integrations.Core.SendEmail({
        to: caseData.owner_email,
        subject: 'Payment Received - Surplus Funds Claim Complete',
        body: `Dear ${caseData.owner_name},

Excellent news! We have received the payment for your surplus funds claim.

Payment Amount: $${payment_amount.toLocaleString()}
Received Date: ${new Date(paidAt).toLocaleDateString()}
Case Number: ${caseData.case_number}
County: ${caseData.county}, ${caseData.state}

Your portion of the funds will be processed according to our agreement. Thank you for trusting us with your claim.

Best regards,
TENNO Recovery Team`
      });
    }

    return Response.json({
      status: 'success',
      paid_at: paidAt,
      payment_amount
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});