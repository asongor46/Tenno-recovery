import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PORTAL LINK GENERATOR
 * Generates unique portal access links for homeowners
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, send_email = true, send_sms = false } = await req.json();

    if (!case_id) {
      return Response.json({ 
        status: 'error',
        details: 'case_id required' 
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

    // Check if email exists
    if (!caseData.owner_email) {
      return Response.json({ 
        status: 'error',
        details: 'No email address on file for this case' 
      }, { status: 400 });
    }

    // Always generate a new token (invalidates previous on resend)
    const token = generateUniqueToken();
    await base44.entities.Case.update(case_id, { portal_token: token });

    // Build portal URL (you'll need to replace with actual domain)
    const portalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com'}/PortalWelcome?token=${token}`;

    // Always send email if email exists
    const notifications = [];

    console.log('=== EMAIL SEND DEBUG ===');
    console.log('Case owner_email:', caseData.owner_email);
    console.log('Portal URL:', portalUrl);

    if (caseData.owner_email) {
      const emailResult = await sendPortalEmail(caseData, portalUrl, base44);
      console.log('Email result:', JSON.stringify(emailResult, null, 2));
      notifications.push({ type: 'email', status: emailResult.status, details: emailResult });
    } else {
      console.log('NO EMAIL ADDRESS FOUND');
    }

    if (send_sms && caseData.owner_phone) {
      const smsResult = await sendPortalSMS(caseData, portalUrl, base44);
      notifications.push({ type: 'sms', status: smsResult.status });
    }

    // Determine if this is initial send or resend
    const isResend = caseData.portal_token ? true : false;
    const action = isResend ? 'portal_link_resent' : 'portal_link_sent';
    
    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action,
      description: `Portal link ${isResend ? 'resent' : 'sent'} to ${caseData.owner_email}`,
      performed_by: user.email,
      metadata: { 
        portal_url: portalUrl, 
        recipient: caseData.owner_email,
        reply_to: 'tennoassetrecovery@gmail.com',
        delivery: notifications[0]?.status || 'unknown',
        notifications 
      }
    });

    // Log homeowner event
    await base44.entities.HomeownerTaskEvent.create({
      case_id,
      event_type: 'portal_invited',
      performed_by: user.email,
      details: { sent_via: notifications.map(n => n.type) }
    });

    return Response.json({
      status: 'success',
      portal_url: portalUrl,
      token,
      notifications
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

function generateUniqueToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function sendPortalEmail(caseData, portalUrl, base44) {
  try {
    const emailBody = `Hello ${caseData.owner_name},

We are reaching out regarding unclaimed surplus funds associated with a property connected to your name.

To keep everything secure and simple, we've created a private portal where you can:

• Review your case details
• Upload any required documents
• Review and sign the service agreement
• Track progress as we handle the filing process

👉 Access your secure case portal here:
${portalUrl}

There is no upfront cost to you. Our fee is only collected if funds are successfully recovered.

For questions, comments, or concerns, please email us at tennoassetrecovery@gmail.com

Best regards,
TENNO Recovery
Surplus Funds Recovery Services
📧 tennoassetrecovery@gmail.com

---
This message contains a secure access link intended only for the recipient.
If you did not request this or believe it was sent in error, you may safely ignore it.`;

    console.log('=== SENDING EMAIL ===');
    console.log('To:', caseData.owner_email);
    console.log('From:', 'TENNO Recovery');
    console.log('Subject:', 'TENNO Recovery – Secure Access to Your Surplus Funds Case');
    console.log('Body length:', emailBody.length);
    
    const result = await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'TENNO Recovery',
      to: caseData.owner_email,
      subject: 'TENNO Recovery – Secure Access to Your Surplus Funds Case',
      body: emailBody
    });

    console.log('=== EMAIL SENT SUCCESSFULLY ===');
    console.log('Result:', JSON.stringify(result, null, 2));
    return { status: 'sent', result, email: caseData.owner_email };
  } catch (error) {
    console.error('=== EMAIL SEND FAILED ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return { status: 'failed', error: error.message, email: caseData.owner_email };
  }
}

async function sendPortalSMS(caseData, portalUrl, base44) {
  // SMS would require Twilio integration - placeholder for now
  return { status: 'not_configured', message: 'SMS integration not configured' };
}