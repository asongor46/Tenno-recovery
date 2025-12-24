import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function formatCurrency(n) {
  if (n == null || isNaN(n)) return '';
  try { return `$${Number(n).toLocaleString()}`; } catch { return `$${n}`; }
}

function formatDate(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return d || ''; }
}

function replacePlaceholders(tpl, map) {
  if (!tpl) return '';
  return tpl.replace(/\$\{([^}]+)\}/g, (_, key) => {
    const k = String(key).trim();
    const val = map[k];
    return (val === undefined || val === null) ? '' : String(val);
  });
}

function buildOutlookLink(to, subject, body) {
  const base = 'https://outlook.office.com/mail/deeplink/compose';
  const qs = new URLSearchParams({
    to: to || '',
    subject: subject || '',
    body: body || ''
  });
  return `${base}?${qs.toString()}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { template_id, case_id } = await req.json();
    if (!template_id || !case_id) {
      return Response.json({ error: 'template_id and case_id are required' }, { status: 400 });
    }

    const templates = await base44.entities.EmailTemplate.filter({ id: template_id });
    const template = templates[0];
    if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

    const cases = await base44.entities.Case.filter({ id: case_id });
    const c = cases[0];

    // Load app settings as key/value
    const settingsArr = await base44.entities.AppSettings.filter({});
    const settings = {};
    for (const s of settingsArr) settings[s.setting_key] = s.setting_value;
    if (!c) return Response.json({ error: 'Case not found' }, { status: 404 });

    // Prepare data map
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com';
    const token = c.portal_token;
    const portalLink = c.portal_link || (token ? `${appUrl}/PortalWelcome?token=${token}` : '');

    const map = {
      owner_name: c.owner_name || 'Homeowner',
      owner_email: c.owner_email || '',
      property_address: c.property_address || '',
      surplus_amount: formatCurrency(c.surplus_amount),
      county_name: c.county || '',
      sale_date: c.sale_date ? formatDate(c.sale_date) : '',
      portal_link: portalLink,
      case_number: c.case_number || '',
      // Settings-driven placeholders
      agent_name: settings.agent_name || '',
      agent_phone: settings.agent_phone || '',
      agent_email: settings.agent_email || '',
      company_name: settings.company_name || '',
      company_address: settings.company_address || '',
      website_url: settings.website_url || ''
    };

    const subject = replacePlaceholders(template.subject_template, map);
    const body = replacePlaceholders(template.body_template, map);
    const recipient = c.owner_email || '';

    const outlook_link = buildOutlookLink(recipient, subject, body);

    return Response.json({
      recipient,
      subject,
      body,
      outlook_link
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});