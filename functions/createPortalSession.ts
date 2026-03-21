import Stripe from "npm:stripe@14.21.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await base44.asServiceRole.entities.AgentProfile.filter({ email: user.email });
    const profile = profiles[0];

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: "No Stripe customer found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = body.returnUrl || `${req.headers.get("origin") || "https://app.base44.com"}/Settings`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    console.log(`Created portal session for ${user.email}`);
    return Response.json({ url: portalSession.url });
  } catch (err) {
    console.error("Error creating portal session:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});