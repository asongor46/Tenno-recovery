import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  const body = await req.json().catch(() => ({}));
  const { email, search_name, search_state } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  }
  if (!search_name || search_name.trim().length < 2) {
    return Response.json({ error: "Search name is required." }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const base44 = createClientFromRequest(req);

  // Check duplicate in last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const existing = await base44.asServiceRole.entities.NotifyRequest.filter({ email, search_name });
  const recentDupe = existing.find((r) => r.created_date >= ninetyDaysAgo);
  if (recentDupe) {
    return Response.json({ success: true, message: "We will notify you if surplus funds are found." }, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  await base44.asServiceRole.entities.NotifyRequest.create({
    email,
    search_name: search_name.trim(),
    search_state: search_state || null,
    notified: false,
  });

  return Response.json(
    { success: true, message: "We will notify you if surplus funds are found." },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
});