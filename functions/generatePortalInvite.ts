import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * [NEW FUNCTION] PORTAL INVITE GENERATOR
 * Generates secure 8-character access codes with rich email templates and Outlook deeplinks
 * Replaces generatePortalLink with improved security and UX
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();
    console.log(`[generatePortalInvite] Start for case_id=${case_id}`);

    if (!case_id) {
      return Response.json({ 
        success: false,
        error: 'case_id required'
      }, { status: 400 });
    }

    // Fetch case
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      console.log(`[generatePortalInvite] ERROR: Case not found`);
      return Response.json({ 
        success: false,
        error: 'Case not found'
      }, { status: 404 });
    }

    // Validate email
    if (!caseData.owner_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caseData.owner_email)) {
      console.log(`[generatePortalInvite] ERROR: Invalid/missing owner_email`);
      return Response.json({ 
        success: false,
        error: 'Invalid or missing owner_email'
      }, { status: 400 });
    }

    // [CRYPTO-SECURE CODE GENERATION]
    const accessCode = generateSecureAccessCode();
    console.log(`[generatePortalInvite] Secure access code generated: ${accessCode}`);

    // Get portal URL
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com';
    const portalUrl = `${appUrl}/PortalLogin`;

    // Update case with access code
    await base44.entities.Case.update(case_id, {
      portal_access_code: accessCode,
      portal_code_generated_at: new Date().toISOString(),
      portal_code_used: false,
      portal_code_used_at: null,
      portal_link: portalUrl,
      portal_sent_at: caseData.portal_sent_at || new Date().toISOString(),
      portal_last_resent_at: caseData.portal_sent_at ? new Date().toISOString() : null,
    });

    // Log activity
    try {
      await base44.entities.ActivityLog.create({
        case_id,
        action: 'portal_invite_generated',
        description: `Portal invite generated for ${caseData.owner_email} with access code`,
        performed_by: user.email,
        metadata: { access_code: accessCode }
      });
    } catch (e) {
      console.log('Activity log failed:', e.message);
    }

    // Always send via Base44 SendEmail
    let emailSent = false;
    const emailSubject = 'TENNO Asset Recovery – Your Portal Access Code';
    const emailBody = `Hello ${caseData.owner_name},

We are assisting you with the recovery of surplus funds related to your property.

To access your secure case portal, please use the following access code:

ACCESS CODE: ${accessCode}

Visit this link to log in:
${portalUrl}

Enter your email (${caseData.owner_email}) and the access code above to set up your account.

If you have any questions, you may reply directly to this email.

— TENNO Recovery
tennoassetrecovery@gmail.com`;

    try {
      await base44.integrations.Core.SendEmail({
        to: caseData.owner_email,
        subject: emailSubject,
        body: emailBody
      });
      emailSent = true;
      console.log(`[generatePortalInvite] Email sent to ${caseData.owner_email}`);
    } catch (emailError) {
      console.log('[generatePortalInvite] Email send failed:', emailError.message);
    }

    return Response.json({
      success: true,
      email_sent: emailSent,
      access_code: accessCode,
      portal_link: portalUrl,
      portal_url: portalUrl,
      owner_email: caseData.owner_email,
      owner_name: caseData.owner_name,
      email_content: { subject: emailSubject, body: emailBody }
    });

  } catch (error) {
    console.log('[generatePortalInvite] ERROR:', error?.message);
    return Response.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

/**
 * [CRYPTO-SECURE] Generate 8-character access code using Web Crypto API
 * Characters: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (excludes O/0/I/1 for clarity)
 */
function generateSecureAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}