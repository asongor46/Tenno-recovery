import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const body = await req.json().catch(() => ({}));
  const { lead_id, homeowner_name, homeowner_phone, homeowner_email, consent_given, search_name, search_state } = body;

  if (!lead_id || !homeowner_name || !homeowner_phone || !homeowner_email) {
    return Response.json({ error: "All fields are required." }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  }
  if (!consent_given) {
    return Response.json({ error: "You must provide consent to continue." }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(homeowner_email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const base44 = createClientFromRequest(req);

  // Fetch lead (verify exists + active)
  const allLeads = await base44.asServiceRole.entities.Lead.list("-uploaded_at", 1000);
  const lead = allLeads.find((l) => l.id === lead_id);
  if (!lead || lead.fund_status === "claimed") {
    return Response.json({ error: "This lead is no longer available." }, { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  // Check duplicate: same email + lead_id in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const existing = await base44.asServiceRole.entities.ClaimRequest.filter({ homeowner_email, lead_id });
  const recentDupe = existing.find((r) => r.created_date >= thirtyDaysAgo);
  if (recentDupe) {
    return Response.json({ error: "You have already submitted a request for this lead. We will contact you soon." }, { status: 409, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  await base44.asServiceRole.entities.ClaimRequest.create({
    lead_id,
    homeowner_name,
    homeowner_phone,
    homeowner_email,
    search_name: search_name || homeowner_name,
    search_state: search_state || lead.state,
    matched_lead_data: {
      surplus_amount: lead.surplus_amount,
      county: lead.county,
      state: lead.state,
      surplus_type: lead.surplus_type,
    },
    status: "new",
    consent_given: true,
    ip_address: ip,
  });

  return Response.json(
    { success: true, message: "A recovery specialist will contact you within 48 hours." },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
});