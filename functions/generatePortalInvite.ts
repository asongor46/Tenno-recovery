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

    // Fetch company settings for email template
    const settings = await fetchCompanySettings(base44);

    // [CRYPTO-SECURE CODE GENERATION]
    const accessCode = generateSecureAccessCode();
    console.log(`[generatePortalInvite] Secure access code generated: ${accessCode}`);

    // Get portal URL
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com';
    const portalUrl = `${appUrl}/PortalRegister`;

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

    // Build rich email template
    const emailSubject = 'Your Surplus Recovery Portal Access - Action Required';
    const emailBody = buildRichEmailTemplate(caseData, accessCode, portalUrl, settings);

    // Generate Outlook deeplink
    const outlookLink = buildOutlookDeeplink(caseData.owner_email, emailSubject, emailBody);
    
    // Generate mailto fallback
    const mailtoLink = buildMailtoLink(caseData.owner_email, emailSubject, emailBody);

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

    return Response.json({
      success: true,
      access_code: accessCode,
      owner_email: caseData.owner_email,
      owner_name: caseData.owner_name,
      portal_url: portalUrl,
      email_subject: emailSubject,
      email_body: emailBody,
      outlook_link: outlookLink,
      mailto_link: mailtoLink,
      case_data: {
        case_number: caseData.case_number,
        county: caseData.county,
        state: caseData.state,
        surplus_amount: caseData.surplus_amount,
        fee_percent: caseData.fee_percent || 20,
        property_address: caseData.property_address
      }
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

/**
 * Fetch company settings from AppSettings entity
 */
async function fetchCompanySettings(base44) {
  const defaults = {
    company_name: 'TENNO Asset Recovery',
    company_phone: '(phone)',
    company_email: 'tennoassetrecovery@gmail.com'
  };

  try {
    const settings = await base44.entities.AppSettings.list();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    return {
      company_name: settingsMap.agent_name || settingsMap.company_name || defaults.company_name,
      company_phone: settingsMap.agent_phone || settingsMap.company_phone || defaults.company_phone,
      company_email: settingsMap.agent_email || settingsMap.company_email || defaults.company_email
    };
  } catch (e) {
    console.log('[generatePortalInvite] Failed to fetch settings, using defaults:', e.message);
    return defaults;
  }
}

/**
 * Build rich email template with merged case and company data
 */
function buildRichEmailTemplate(caseData, accessCode, portalUrl, settings) {
  return `Dear ${caseData.owner_name},

Thank you for speaking with us about the surplus funds from your property at ${caseData.property_address || 'your property'} in ${caseData.county} County, ${caseData.state}.

You may be entitled to $${caseData.surplus_amount?.toLocaleString() || '0'} in surplus funds from the recent sale.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET STARTED NOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Visit our secure portal:
${portalUrl}

Your Login Credentials:
• Email: ${caseData.owner_email}
• Access Code: ${accessCode}

⚠️ This is a ONE-TIME code. You will create your own password on first login.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU'LL NEED TO DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Sign our fee agreement (${caseData.fee_percent || 20}% contingency - no upfront cost)
2. Confirm your contact information
3. Upload a copy of your ID
4. Complete notarization (if required by your county)

We handle all the paperwork and filing with the court. You only pay if we successfully recover funds for you.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTIONS?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reply to this email or call us at ${settings.company_phone}

${settings.company_name}
${settings.company_email}`;
}

/**
 * Build Outlook deeplink for one-click email composition
 */
function buildOutlookDeeplink(to, subject, body) {
  const params = new URLSearchParams({
    to,
    subject,
    body
  });
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

/**
 * Build mailto link as fallback for non-Outlook users
 */
function buildMailtoLink(to, subject, body) {
  // Manual encoding to preserve newlines and readability
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
}