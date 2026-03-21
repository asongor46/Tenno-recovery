import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Simple in-memory rate limiter (resets on cold start — acceptable for Deno)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const key = `${ip}:${Math.floor(now / hour)}`;
  const count = rateLimitMap.get(key) || 0;
  if (count >= 5) return { allowed: false, remaining: 0 };
  rateLimitMap.set(key, count + 1);
  return { allowed: true, remaining: 4 - count };
}

function blurName(fullName) {
  if (!fullName) return "Unknown";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0] + ".";
  const first = parts[0][0] + ".";
  const last = parts[parts.length - 1];
  return `${first} ${last}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return Response.json({ error: "Search limit reached. Try again in an hour.", rate_limit_remaining: 0 }, { status: 429, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const body = await req.json().catch(() => ({}));
  const { search_name, search_state } = body;

  if (!search_name || search_name.trim().length < 2) {
    return Response.json({ error: "Please enter at least 2 characters." }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const base44 = createClientFromRequest(req);

  const allLeads = await base44.asServiceRole.entities.Lead.list("-uploaded_at", 1000);

  const nameLower = search_name.trim().toLowerCase();
  let matches = allLeads.filter((lead) => {
    if (lead.fund_status === "claimed") return false;
    if (!lead.owner_name?.toLowerCase().includes(nameLower)) return false;
    if (search_state && lead.state !== search_state.toUpperCase()) return false;
    return true;
  }).slice(0, 10);

  const blurred = matches.map((lead) => ({
    lead_id: lead.id,
    owner_name_blurred: blurName(lead.owner_name),
    surplus_amount: lead.surplus_amount,
    county: lead.county,
    state: lead.state,
    surplus_type: lead.surplus_type,
    sale_year: lead.sale_date ? new Date(lead.sale_date).getFullYear() : null,
  }));

  return Response.json(
    { results: blurred, count: blurred.length, rate_limit_remaining: rateCheck.remaining },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
});