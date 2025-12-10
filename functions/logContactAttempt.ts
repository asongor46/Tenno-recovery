import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CONTACT ATTEMPT LOGGER
 * Logs all contact attempts with homeowners
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
      person_id,
      contact_method, 
      value_used,
      attempt_type,
      result, 
      notes,
      template_id
    } = await req.json();

    if (!case_id || !contact_method || !result) {
      return Response.json({ 
        status: 'error',
        details: 'case_id, contact_method, and result required' 
      }, { status: 400 });
    }

    // Create contact attempt record
    const attempt = await base44.entities.ContactAttempt.create({
      case_id,
      person_id,
      contact_method,
      value_used,
      attempt_type,
      result,
      notes,
      performed_by: user.email
    });

    // Update case activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'contact_attempt',
      description: `${attempt_type || contact_method} - ${result.replace(/_/g, ' ')}`,
      performed_by: user.email,
      metadata: { 
        attempt_id: attempt.id,
        contact_method,
        result,
        template_id
      }
    });

    // Auto-create follow-up todos based on result
    if (result === 'callback_requested') {
      await base44.entities.Todo.create({
        case_id,
        title: 'Return Call - Owner Requested Callback',
        description: `Call back ${value_used}. Notes: ${notes || 'None'}`,
        priority: 'high',
        due_date: getNextBusinessDay(),
        auto_generated: true
      });
    }

    if (result === 'owner_interested') {
      await base44.entities.Todo.create({
        case_id,
        title: 'Send Portal Link - Owner Interested',
        priority: 'high',
        due_date: new Date().toISOString().split('T')[0],
        auto_generated: true
      });
    }

    return Response.json({
      status: 'success',
      attempt_id: attempt.id
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

function getNextBusinessDay() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  
  // Skip weekend
  if (date.getDay() === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
  if (date.getDay() === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday
  
  return date.toISOString().split('T')[0];
}