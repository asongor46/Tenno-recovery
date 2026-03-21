import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date().toISOString();
  const claims = await base44.asServiceRole.entities.ClaimRequest.filter({ status: "claimed" });

  let expiredCount = 0;
  for (const claim of claims) {
    if (!claim.contact_deadline) continue;
    if (claim.contacted_at) continue;
    if (claim.contact_deadline < now) {
      await base44.asServiceRole.entities.ClaimRequest.update(claim.id, {
        status: "new",
        claimed_by_agent_id: null,
        claimed_at: null,
        contact_deadline: null,
      });
      expiredCount++;
    }
  }

  console.log(`Expired ${expiredCount} uncontacted claims.`);
  return Response.json({ success: true, expired: expiredCount });
});