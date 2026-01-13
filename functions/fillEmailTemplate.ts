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

    const { template_id, case_id } = await req.json();

    if (!template_id || !case_id) {
      return Response.json({ 
        error: 'template_id and case_id required'
      }, { status: 400 });
    }

    // Fetch template
    const templates = await base44.entities.EmailTemplate.filter({ id: template_id });
    const template = templates[0];
    
    if (!template) {
      return Response.json({ 
        error: 'Template not found'
      }, { status: 404 });
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

    // Get portal link if needed
    let portalLink = caseData.portal_link || '';
    let accessCode = caseData.portal_access_code || '';
    
    // If template is Portal category and no access code exists, generate one
    if (template.category === 'Portal' && !accessCode) {
      try {
        const { data } = await base44.functions.invoke('generatePortalInvite', { case_id });
        portalLink = data.portal_url;
        accessCode = data.access_code;
      } catch (e) {
        console.log('Failed to generate portal invite:', e.message);
      }
    }

    // Calculate net amount
    const feePercent = caseData.fee_percent || 20;
    const surplusAmount = caseData.surplus_amount || 0;
    const netAmount = Math.round(surplusAmount * (1 - feePercent / 100));

    // Merge fields
    const mergeData = {
      owner_name: caseData.owner_name || 'Homeowner',
      owner_email: caseData.owner_email || '',
      property_address: caseData.property_address || 'your property',
      county: caseData.county || '',
      state: caseData.state || '',
      surplus_amount: (surplusAmount || 0).toLocaleString(),
      fee_percent: feePercent,
      net_amount: netAmount.toLocaleString(),
      case_number: caseData.case_number || '',
      portal_link: portalLink,
      access_code: accessCode,
      agent_name: settings.agent_name,
      agent_phone: settings.agent_phone,
      agent_email: settings.agent_email,
      company_name: settings.company_name
    };

    // Fill template
    let subject = fillTemplate(template.subject_template, mergeData);
    let body = fillTemplate(template.body_template, mergeData);

    // Generate Outlook link
    const outlookLink = buildOutlookDeeplink(caseData.owner_email, subject, body);
    
    // Generate mailto link
    const mailtoLink = buildMailtoLink(caseData.owner_email, subject, body);

    return Response.json({
      success: true,
      subject,
      body,
      recipient: caseData.owner_email,
      outlook_link: outlookLink,
      mailto_link: mailtoLink,
      template_name: template.name,
      category: template.category
    });

  } catch (error) {
    console.log('[fillEmailTemplate] ERROR:', error?.message);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});

/**
 * Fill template with merge data
 */
function fillTemplate(template, data) {
  let filled = template;
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    filled = filled.replace(regex, value || '');
  }
  
  return filled;
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