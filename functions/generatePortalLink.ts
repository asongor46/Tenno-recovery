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
    const portalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com'}/PortalWelcome?token=${token}`;
    
    // Update case with new token and mark old one as inactive
    const updateData = {
      portal_token: token,
      portal_link: portalUrl,
      portal_token_active: true
    };
    
    // Set timestamps based on whether this is first send or resend
    if (!caseData.portal_sent_at) {
      updateData.portal_sent_at = new Date().toISOString();
    } else {
      updateData.portal_last_resent_at = new Date().toISOString();
    }
    
    await base44.asServiceRole.entities.Case.update(case_id, updateData);

    // Generate email content (do NOT send via Base44)
    const emailSubject = 'TENNO Asset Recovery – Secure Access to Your Surplus Funds Case';
    const emailBody = generateEmailBody(caseData, portalUrl);

    // Determine if this is initial send or resend
    const isResend = caseData.portal_token ? true : false;
    const action = isResend ? 'portal_link_generated_resend' : 'portal_link_generated';

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action,
      description: `Portal link ${isResend ? 'regenerated' : 'generated'} for ${caseData.owner_email} - ready to send via email client`,
      performed_by: user.email,
      metadata: { 
        portal_url: portalUrl, 
        recipient: caseData.owner_email,
        send_from: 'tennoassetrecovery@gmail.com'
      }
    });

    // Log homeowner event
    await base44.entities.HomeownerTaskEvent.create({
      case_id,
      event_type: 'portal_invited',
      performed_by: user.email,
      details: { method: 'email_client' }
    });

    return Response.json({
      status: 'success',
      portal_url: portalUrl,
      token,
      email_content: {
        to: caseData.owner_email,
        subject: emailSubject,
        body: emailBody
      }
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

function generateEmailBody(caseData, portalUrl) {
  return `Hello ${caseData.owner_name},

We are assisting you with the recovery of surplus funds related to your property.

Please use the secure link below to review your case, upload documents, and complete required steps:

${portalUrl}

This link is private and secure. If you have any questions, you may reply directly to this email.

— TENNO Asset Recovery
tennoassetrecovery@gmail.com`;
}