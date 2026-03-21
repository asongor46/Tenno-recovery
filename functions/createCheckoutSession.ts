import Stripe from "npm:stripe@14.21.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const PRICE_IDS = {
  starter: "price_1TDFvZLH99WPSqLvCsERmQuw",
  pro: "price_1TDFvZLH99WPSqLv1r2wIkLg",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, successUrl, cancelUrl } = await req.json();

    if (!PRICE_IDS[plan]) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Check if existing Stripe customer
    const profiles = await base44.asServiceRole.entities.AgentProfile.filter({ email: user.email });
    const profile = profiles[0];
    const existingCustomerId = profile?.stripe_customer_id;

    const appUrl = Deno.env.get("BASE44_APP_URL") || req.headers.get("origin") || "https://tenno-recovery.base44.app";

    const sessionParams = {
      mode: "subscription",
      ui_mode: "embedded",
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      return_url: `${appUrl}/Dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      customer_email: existingCustomerId ? undefined : user.email,
      customer: existingCustomerId || undefined,
      subscription_data: {
        metadata: {
          base44_user_email: user.email,
          plan,
        },
      },
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        base44_user_email: user.email,
        plan,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Created embedded checkout session for ${user.email}, plan=${plan}, session=${session.id}`);
    return Response.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
    });
  } catch (err) {
    console.error("Error creating checkout session:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});