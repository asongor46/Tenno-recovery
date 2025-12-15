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

    // Generate unique token if not exists
    let token = caseData.portal_token;
    if (!token) {
      token = generateUniqueToken();
      await base44.entities.Case.update(case_id, { portal_token: token });
    }

    // Build portal URL (you'll need to replace with actual domain)
    const portalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com'}/PortalWelcome?token=${token}`;

    // Always send email if email exists
    const notifications = [];
    
    if (caseData.owner_email) {
      const emailResult = await sendPortalEmail(caseData, portalUrl, base44);
      notifications.push({ type: 'email', status: emailResult.status });
    }

    if (send_sms && caseData.owner_phone) {
      const smsResult = await sendPortalSMS(caseData, portalUrl, base44);
      notifications.push({ type: 'sms', status: smsResult.status });
    }

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'portal_link_generated',
      description: `Portal link generated and sent via ${notifications.map(n => n.type).join(', ')}`,
      performed_by: user.email,
      metadata: { portal_url: portalUrl, notifications }
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
    await base44.integrations.Core.SendEmail({
      to: caseData.owner_email,
      subject: `Your Surplus Funds Claim - ${caseData.case_number}`,
      body: `Dear ${caseData.owner_name},

We have good news! There are surplus funds from the sale of your property at ${caseData.property_address || 'your former property'}.

Surplus Amount: $${caseData.surplus_amount?.toLocaleString() || '0'}

To claim these funds, please complete your secure online portal:

${portalUrl}

This process will take approximately 10-15 minutes and includes:
1. Reviewing and signing the recovery agreement
2. Uploading your ID
3. Completing your information
4. Notarizing your claim form

If you have any questions, please reply to this email.

Best regards,
TENNO Recovery Team`
    });

    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', error: error.message };
  }
}

async function sendPortalSMS(caseData, portalUrl, base44) {
  // SMS would require Twilio integration - placeholder for now
  return { status: 'not_configured', message: 'SMS integration not configured' };
}