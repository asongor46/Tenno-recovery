import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send email directly via Base44 Core.SendEmail (for existing Base44 users)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, to, subject, body_html, body_text } = await req.json();

    if (!to || !subject) {
      return Response.json({ 
        error: 'to and subject required'
      }, { status: 400 });
    }

    // Check if recipient is a Base44 user
    const isBase44User = await checkIfBase44User(base44, to);
    
    if (!isBase44User) {
      return Response.json({
        success: false,
        should_use_mailto: true,
        reason: 'Recipient is not a Base44 user'
      });
    }

    // Send via Base44 Core.SendEmail
    await base44.integrations.Core.SendEmail({
      to: to,
      subject: subject,
      body: body_html || body_text
    });

    // Log activity
    if (case_id) {
      try {
        await base44.entities.ActivityLog.create({
          case_id,
          action: 'email_sent',
          description: `Email sent to ${to}: "${subject}"`,
          is_client_visible: false,
          performed_by: user.email
        });
      } catch (e) {
        console.log('Activity log failed:', e.message);
      }

      // Update case
      try {
        await base44.entities.Case.update(case_id, {
          portal_sent_at: new Date().toISOString()
        });
      } catch (e) {
        console.log('Case update failed:', e.message);
      }
    }

    return Response.json({
      success: true,
      method: 'direct',
      message: 'Email sent successfully via Base44'
    });

  } catch (error) {
    console.log('[sendDirectEmail] ERROR:', error?.message);
    return Response.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

/**
 * Check if email belongs to a Base44 user
 */
async function checkIfBase44User(base44, email) {
  try {
    const users = await base44.asServiceRole.entities.User.filter({
      email: email
    });
    return users && users.length > 0;
  } catch (e) {
    // If we can't check, assume not a user (safer for cold outreach)
    console.log('User check failed:', e.message);
    return false;
  }
}