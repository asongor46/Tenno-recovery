import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Fill email template with case data and generate Outlook/mailto links
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { template_id, case_id, portal_link, access_code, custom_data = {} } = await req.json();

    if (!template_id || !case_id) {
      return Response.json({ 
        error: 'template_id and case_id required'
      }, { status: 400 });
    }

    // Fetch case
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        error: 'Case not found'
      }, { status: 404 });
    }

    // Fetch settings for agent info
    const settings = await fetchCompanySettings(base44);

    // Get template (from EMAIL_TEMPLATES const defined below)
    const template = EMAIL_TEMPLATES[template_id];
    
    if (!template) {
      return Response.json({ 
        error: 'Template not found'
      }, { status: 404 });
    }

    // Calculate derived values
    const feePercent = caseData.fee_percent || 20;
    const surplusAmount = caseData.surplus_amount || 0;
    const feeAmount = Math.round(surplusAmount * feePercent / 100);
    const netAmount = surplusAmount - feeAmount;
    const firstName = caseData.owner_name?.split(' ')[0] || 'there';

    // Build replacement data
    const replacements = {
      // Client info
      first_name: firstName,
      full_name: caseData.owner_name,
      owner_name: caseData.owner_name,
      owner_email: caseData.owner_email,
      owner_phone: caseData.owner_phone || '',
      
      // Property info
      property_address: caseData.property_address,
      county: caseData.county,
      state: caseData.state,
      
      // Financial info
      surplus_amount: formatCurrency(surplusAmount),
      surplus_amount_raw: surplusAmount,
      fee_percent: feePercent,
      fee_amount: formatCurrency(feeAmount),
      net_amount: formatCurrency(netAmount),
      
      // Portal info
      portal_link: portal_link || caseData.portal_link || '[PORTAL_LINK]',
      access_code: access_code || caseData.portal_access_code || '[ACCESS_CODE]',
      
      // Agent info
      agent_name: settings.agent_name,
      agent_phone: settings.agent_phone,
      agent_email: settings.agent_email,
      company_name: settings.company_name,
      
      // Dates
      current_date: formatDate(new Date()),
      agreement_date: formatDate(new Date()),
      
      // Custom overrides
      ...custom_data
    };

    // Fill subject
    const subject = replaceTemplateVars(template.subject, replacements);
    
    // Fill body (plain text version)
    const bodyText = replaceTemplateVars(template.body_text, replacements);
    
    // Fill body (HTML version)
    const bodyHtml = template.body_html 
      ? replaceTemplateVars(template.body_html, replacements)
      : generateHtmlFromText(bodyText, replacements, template);

    // Generate Outlook link
    const outlookLink = buildOutlookDeeplink(caseData.owner_email, subject, bodyText);
    
    // Generate mailto link
    const mailtoLink = buildMailtoLink(caseData.owner_email, subject, bodyText);

    return Response.json({
      success: true,
      to: caseData.owner_email,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      outlook_link: outlookLink,
      mailto_link: mailtoLink,
      template_name: template.name,
      category: template.category,
      replacements // Return for debugging
    });

  } catch (error) {
    console.log('[fillEmailTemplate] ERROR:', error?.message);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});

// Email Templates (matches utils/emailTemplates.js)
const EMAIL_TEMPLATES = {
  portal_invitation: {
    id: 'portal_invitation',
    name: 'Portal Invitation - Initial',
    category: 'portal',
    subject: '{{first_name}}, claim your {{surplus_amount}} in surplus funds',
    body_text: `Hi {{first_name}},

Great news! We've confirmed that {{surplus_amount}} in surplus funds from your property at {{property_address}} is waiting to be claimed.

Your secure claim portal is ready. Here's how to access it:

PORTAL LINK: {{portal_link}}
ACCESS CODE: {{access_code}}

What you'll do in the portal:
✓ Review and sign the service agreement (digital signature - no notary needed for this)
✓ Upload a photo of your ID
✓ Confirm your information

This takes about 5-10 minutes.

YOUR ESTIMATED PAYOUT:
Surplus Amount: {{surplus_amount}}
Service Fee ({{fee_percent}}%): {{fee_amount}}
You Keep: {{net_amount}}

Remember: No upfront cost. We only get paid when you get paid.

Questions? Just reply to this email or call me at {{agent_phone}}.

Best,
{{agent_name}}
TENNO Recovery`,
    body_html: null
  },
  
  portal_invitation_after_call: {
    id: 'portal_invitation_after_call',
    name: 'Portal Invitation - After Phone Call',
    category: 'portal',
    subject: 'Your surplus claim portal is ready - {{surplus_amount}} waiting',
    body_text: `Hi {{first_name}},

Great speaking with you! As promised, here's your secure claim portal:

PORTAL LINK: {{portal_link}}
ACCESS CODE: {{access_code}}

Quick recap of what we discussed:
• You have {{surplus_amount}} in surplus funds from {{property_address}}
• Our fee is {{fee_percent}}% - you keep {{net_amount}}
• No upfront cost - we only get paid when you do

Next steps in the portal:
1. Review and sign the service agreement
2. Upload a photo of your ID
3. Confirm your information

The whole process takes about 5-10 minutes.

I'm here if you have any questions!

{{agent_name}}
{{agent_phone}}`,
    body_html: null
  },
  
  cold_outreach_initial: {
    id: 'cold_outreach_initial',
    name: 'Cold Outreach - Initial Contact',
    category: 'outreach',
    subject: '{{first_name}}, you may have {{surplus_amount}} waiting',
    body_text: `Hi {{first_name}},

I'm reaching out because you may be owed {{surplus_amount}} in surplus funds from the tax sale of your property at {{property_address}}.

These funds are currently being held by {{county}} County and legally belong to you.

I specialize in helping property owners recover these funds. Here's how it works:
• No upfront cost - I only get paid if you get paid
• I handle all the paperwork and county filing
• You keep the majority of the funds

The deadline to claim is approaching, so time is important.

Would you be open to a quick 5-minute call to discuss? You can reach me at {{agent_phone}} or simply reply to this email.

Best regards,
{{agent_name}}
TENNO Recovery
{{agent_phone}}`,
    body_html: null
  },
  
  cold_outreach_follow_up: {
    id: 'cold_outreach_follow_up',
    name: 'Cold Outreach - Follow Up',
    category: 'outreach',
    subject: 'Re: Your {{surplus_amount}} surplus funds from {{county}} County',
    body_text: `Hi {{first_name}},

I wanted to follow up on my previous message about the {{surplus_amount}} in surplus funds owed to you from {{property_address}}.

I know this might sound too good to be true, but I assure you it's legitimate. After a tax sale, any amount paid above what was owed belongs to the former property owner - that's you.

These funds are sitting with {{county}} County right now, and they won't come looking for you. If left unclaimed, the county eventually keeps them.

I'm happy to:
• Verify the exact amount available
• Explain the process in detail
• Answer any questions you have

No obligation. Just reply or call me at {{agent_phone}}.

{{agent_name}}
TENNO Recovery`,
    body_html: null
  },
  
  agreement_signed: {
    id: 'agreement_signed',
    name: 'Confirmation - Agreement Signed',
    category: 'status',
    subject: 'Agreement signed ✓ - Next step: Upload your ID',
    body_text: `Hi {{first_name}},

Your service agreement has been signed and recorded. Thank you!

Agreement Summary:
• Property: {{property_address}}
• Surplus Amount: {{surplus_amount}}
• Service Fee: {{fee_percent}}%
• Your Net (estimated): {{net_amount}}

NEXT STEP: Upload your ID
Return to your portal to upload photos of your ID (front and back). This takes about 2 minutes.

{{portal_link}}

{{agent_name}}
{{agent_phone}}`,
    body_html: null
  }
};

/**
 * Replace {{variable}} with values
 */
function replaceTemplateVars(text, replacements) {
  if (!text) return '';
  
  let result = text;
  
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, value || '');
  }
  
  return result;
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '$0';
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Format date
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Generate HTML from text for professional portal emails
 */
function generateHtmlFromText(text, data, template) {
  if (template.category === 'portal') {
    return generatePortalEmailHTML(data);
  } else if (template.category === 'outreach') {
    return generateOutreachEmailHTML(data);
  } else {
    return `<html><body style="font-family: sans-serif; line-height: 1.6;">${text.split('\n').map(line => `<p>${line}</p>`).join('')}</body></html>`;
  }
}

/**
 * Generate professional portal email HTML
 */
function generatePortalEmailHTML(data) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 40px 30px 40px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">TENNO Recovery</h1><p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Surplus Funds Recovery Specialists</p></td></tr><tr><td style="background-color: #ecfdf5; padding: 24px 40px; text-align: center; border-bottom: 1px solid #d1fae5;"><p style="margin: 0 0 4px 0; color: #065f46; font-size: 14px; font-weight: 500;">YOUR SURPLUS FUNDS</p><p style="margin: 0; color: #047857; font-size: 42px; font-weight: 700;">${data.surplus_amount}</p></td></tr><tr><td style="padding: 40px;"><p style="margin: 0 0 20px 0; font-size: 18px; color: #1f2937;">Hi ${data.first_name},</p><p style="margin: 0 0 20px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">Great news! We've confirmed that <strong>${data.surplus_amount}</strong> in surplus funds from your property at <strong>${data.property_address}</strong> is waiting to be claimed.</p><p style="margin: 0 0 30px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">Your secure claim portal is ready.</p><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border: 2px solid #bfdbfe; border-radius: 8px; margin-bottom: 30px;"><tr><td style="padding: 24px; text-align: center;"><p style="margin: 0 0 8px 0; color: #1e40af; font-size: 12px; font-weight: 600; letter-spacing: 1px;">YOUR ACCESS CODE</p><p style="margin: 0 0 16px 0; color: #1e3a8a; font-size: 32px; font-weight: 700; font-family: monospace; letter-spacing: 4px;">${data.access_code}</p><a href="${data.portal_link}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600;">Access My Claim Portal →</a></td></tr></table><p style="margin: 0; font-size: 14px; color: #6b7280;">💰 <strong>No upfront cost.</strong> We only get paid when you get paid.</p></td></tr><tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;"><p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af; text-align: center;">TENNO Recovery, LLC | Surplus Funds Recovery Specialists</p></td></tr></table></td></tr></table></body></html>`;
}

/**
 * Generate simple outreach email HTML
 */
function generateOutreachEmailHTML(data) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333;"><p>Hi ${data.first_name},</p><p>I'm reaching out because you may be owed <strong>${data.surplus_amount}</strong> in surplus funds from the tax sale of your property at ${data.property_address}.</p><p>These funds are currently being held by ${data.county} County and legally belong to you.</p><p>I specialize in helping property owners recover these funds. Here's how it works:</p><ul><li>No upfront cost - I only get paid if you get paid</li><li>I handle all the paperwork and county filing</li><li>You keep the majority of the funds</li></ul><p>The deadline to claim is approaching, so time is important.</p><p>Would you be open to a quick 5-minute call to discuss? You can reach me at ${data.agent_phone} or simply reply to this email.</p><p>Best regards,<br><strong>${data.agent_name}</strong><br>TENNO Recovery<br>${data.agent_phone}</p></body></html>`;
}

/**
 * Fetch company/agent settings
 */
async function fetchCompanySettings(base44) {
  const defaults = {
    company_name: 'TENNO Recovery',
    agent_name: 'TENNO Recovery Team',
    agent_phone: '(555) 123-4567',
    agent_email: 'support@tennorecovery.com'
  };

  try {
    const settings = await base44.entities.AppSettings.list();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    return {
      company_name: settingsMap.company_name || defaults.company_name,
      agent_name: settingsMap.agent_name || defaults.agent_name,
      agent_phone: settingsMap.agent_phone || defaults.agent_phone,
      agent_email: settingsMap.agent_email || defaults.agent_email
    };
  } catch (e) {
    console.log('Failed to fetch settings, using defaults');
    return defaults;
  }
}

/**
 * Build Outlook deeplink
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
 * Build mailto link
 */
function buildMailtoLink(to, subject, body) {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
}