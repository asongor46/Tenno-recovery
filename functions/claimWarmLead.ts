import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Verify Pro plan
  const profiles = await base44.asServiceRole.entities.AgentProfile.filter({ email: user.email });
  const profile = profiles[0];
  if (!profile || (profile.plan !== "pro" && user.role !== "admin")) {
    return Response.json({ error: "Pro plan required to claim warm leads." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { claim_request_id } = body;
  if (!claim_request_id) return Response.json({ error: "claim_request_id required." }, { status: 400 });

  // Fetch claim request
  const allClaims = await base44.asServiceRole.entities.ClaimRequest.list("-created_date", 500);
  const claim = allClaims.find((c) => c.id === claim_request_id);
  if (!claim) return Response.json({ error: "Claim request not found." }, { status: 404 });
  if (claim.status !== "new") return Response.json({ error: "This lead has already been claimed." }, { status: 409 });

  const now = new Date();
  const contactDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

  // Lock the claim
  await base44.asServiceRole.entities.ClaimRequest.update(claim.id, {
    status: "claimed",
    claimed_by_agent_id: user.id || user.email,
    claimed_at: now.toISOString(),
    contact_deadline: contactDeadline,
  });

  const ld = claim.matched_lead_data || {};
  const caseNumber = `WL-${claim.id.slice(-6).toUpperCase()}`;

  // Create case
  const newCase = await base44.entities.Case.create({
    case_number: caseNumber,
    owner_name: claim.homeowner_name,
    owner_email: claim.homeowner_email,
    owner_phone: claim.homeowner_phone,
    county: ld.county || "",
    state: ld.state || "",
    surplus_amount: ld.surplus_amount || 0,
    surplus_type: ld.surplus_type || "tax_sale",
    source_type: "warm_lead",
    source_lead_id: claim.lead_id,
    stage: "imported",
    fee_percent: profile.default_fee_percent || 20,
    internal_notes: `Warm lead claimed. Contact by ${new Date(contactDeadline).toLocaleString()}.`,
  });

  console.log(`Warm lead ${claim.id} claimed by ${user.email}. Case: ${newCase.id}`);

  return Response.json({
    success: true,
    case_id: newCase.id,
    contact_deadline: contactDeadline,
    message: "Contact within 72 hours.",
  });
});