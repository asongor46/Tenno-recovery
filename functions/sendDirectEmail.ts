import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send email directly via Base44 Core.SendEmail
 * Sends to any email address — no user check needed
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

    // Send email directly — no user check needed
    await base44.integrations.Core.SendEmail({
      to: to,
      subject: subject,
      body: body_html || body_text
    });

    // Log activity if case_id provided
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
    }

    return Response.json({
      success: true,
      method: 'direct',
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.log('[sendDirectEmail] ERROR:', error?.message);
    return Response.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
});