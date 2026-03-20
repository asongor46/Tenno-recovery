import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    console.log(`[generatePortalLink] Start for case_id=${case_id}`);

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
    console.log(`[generatePortalLink] Case found? ${!!caseData}`);
    
    if (!caseData) {
      diagnostics.step = 'fetch_case';
      diagnostics.errors.push('Case not found');
      console.log(`[generatePortalLink] ERROR: Case not found for id=${case_id}`);
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
      console.log(`[generatePortalLink] ERROR: Invalid/missing owner_email: ${caseData.owner_email}`);
      return Response.json({ 
        status: 'error',
        success: false,
        details: 'Invalid or missing owner_email',
        diagnostics 
      }, { status: 400 });
    }

    // Idempotency: reuse existing code if unused and < 72 hours old
    diagnostics.step = 'check_existing_code';
    let accessCode;
    if (
      caseData.portal_access_code &&
      caseData.portal_code_used === false &&
      caseData.portal_code_generated_at &&
      (Date.now() - new Date(caseData.portal_code_generated_at).getTime()) < 72 * 60 * 60 * 1000
    ) {
      accessCode = caseData.portal_access_code;
      console.log(`[generatePortalLink] Reusing existing valid code for case_id=${case_id}`);
      diagnostics.step = 'reused_existing_code';
    } else {
      // Generate access code (8 characters)
      diagnostics.step = 'generate_access_code';
      accessCode = generateAccessCode();
    }
    console.log(`[generatePortalLink] Access code generated: ${accessCode}`);
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com';
    if (!Deno.env.get('BASE44_APP_URL')) {
      console.log('[generatePortalLink] WARNING: BASE44_APP_URL not set, using fallback URL');
    }
    const portalUrl = `${appUrl}/PortalLogin`;
    console.log(`[generatePortalLink] Portal URL: ${portalUrl}`);

    // Update case with access code (only update timestamps if generating fresh)
    diagnostics.step = 'update_case';
    await base44.entities.Case.update(case_id, {
      portal_access_code: accessCode,
      portal_code_generated_at: caseData.portal_code_used === false && caseData.portal_access_code === accessCode
        ? caseData.portal_code_generated_at
        : new Date().toISOString(),
      portal_code_used: false,
      portal_link: portalUrl,
      portal_sent_at: caseData.portal_sent_at || new Date().toISOString(),
      portal_last_resent_at: caseData.portal_sent_at ? new Date().toISOString() : null,
    });

    // Build email content
    diagnostics.step = 'build_email';
    const emailSubject = 'TENNO Asset Recovery – Your Access Code for Surplus Funds Case';
    const emailBody = generateEmailBody(caseData, portalUrl, accessCode);

    // Always attempt to send via Base44 SendEmail
    let emailSent = false;
    try {
      await base44.integrations.Core.SendEmail({
        to: caseData.owner_email,
        subject: emailSubject,
        body: emailBody
      });
      emailSent = true;
      console.log(`[generatePortalLink] Email sent to ${caseData.owner_email}`);
    } catch (emailError) {
      console.log('[generatePortalLink] Email send failed:', emailError.message);
    }

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
      email_sent: emailSent,
      portal_url: portalUrl,
      access_code: accessCode,
      email_content: {
        to: caseData.owner_email,
        subject: emailSubject,
        body: emailBody
      },
      data: {
        portalUrl,
        accessCode,
        emailSubject,
        emailBody,
        recipientEmail: caseData.owner_email,
        recipientName: caseData.owner_name
      },
      diagnostics
    });

  } catch (error) {
    console.log('[generatePortalLink] ERROR:', error?.message);
    return Response.json({ 
      status: 'error',
      success: false,
      error: error.message,
      details: error.message,
      diagnostics: { errors: [error.message], stack: error.stack },
    }, { status: 500 });
  }
});

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateEmailBody(caseData, portalUrl, accessCode) {
  return `Hello ${caseData.owner_name},

We are assisting you with the recovery of surplus funds related to your property.

To access your secure case portal, please use the following access code:

ACCESS CODE: ${accessCode}

Visit this link to create your account:
${portalUrl}

Enter your email (${caseData.owner_email}) and the access code above to set up your password.

If you have any questions, you may reply directly to this email.

— TENNO Asset Recovery
tennoassetrecovery@gmail.com`;
}