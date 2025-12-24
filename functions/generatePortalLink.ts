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
    const diagnostics = { step: 'parsed_request', case_id, timestamp: new Date().toISOString(), errors: [] };

    if (!case_id) {
      diagnostics.step = 'validate_input';
      diagnostics.errors.push('case_id required');
      return Response.json({ 
        status: 'error',
        success: false,
        details: 'case_id required',
        diagnostics
      }, { status: 400 });
    }

    // Fetch case
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      diagnostics.step = 'fetch_case';
      diagnostics.errors.push('Case not found');
      return Response.json({ 
        status: 'error',
        success: false,
        details: 'Case not found',
        diagnostics
      }, { status: 404 });
    }

    // Validate email
    diagnostics.step = 'validate_email';
    if (!caseData.owner_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caseData.owner_email)) {
      diagnostics.errors.push(`Invalid or missing email: ${caseData.owner_email || 'null'}`);
      return Response.json({ 
        status: 'error',
        success: false,
        details: 'Invalid or missing owner_email',
        diagnostics 
      }, { status: 400 });
    }

    // Always generate a new token (invalidates previous on resend)
    diagnostics.step = 'generate_token';
    const token = generateUniqueToken();
    const portalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com'}/PortalWelcome?token=${token}`;

    // Update case with new token
    diagnostics.step = 'update_case';
    await base44.entities.Case.update(case_id, {
      portal_token: token,
      portal_link: portalUrl,
      portal_token_active: true,
      portal_sent_at: caseData.portal_sent_at || new Date().toISOString(),
      portal_last_resent_at: caseData.portal_sent_at ? new Date().toISOString() : null
    });

    // Generate email content (do NOT send via Base44)
    diagnostics.step = 'build_email';
    const emailSubject = 'TENNO Asset Recovery – Secure Access to Your Surplus Funds Case';
    const emailBody = generateEmailBody(caseData, portalUrl);

    // Log activity (non-blocking)
    try {
      await base44.entities.ActivityLog.create({
        case_id,
        action: caseData.portal_sent_at ? 'portal_link_generated_resend' : 'portal_link_generated',
        description: `Portal link ${caseData.portal_sent_at ? 'regenerated' : 'generated'} for ${caseData.owner_email}`,
        performed_by: user.email,
        metadata: { portal_url: portalUrl }
      });
    } catch (e) {
      console.log('Activity log failed:', e.message);
    }

    return Response.json({
      status: 'success',
      success: true,
      portal_url: portalUrl,
      token,
      email_content: {
        to: caseData.owner_email,
        subject: emailSubject,
        body: emailBody
      },
      data: {
        portalUrl,
        emailSubject,
        emailBody,
        recipientEmail: caseData.owner_email,
        recipientName: caseData.owner_name
      },
      diagnostics
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      success: false,
      details: error.message,
      diagnostics: { errors: [error.message], stack: error.stack },
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