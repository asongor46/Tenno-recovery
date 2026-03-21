import Stripe from "npm:stripe@14.21.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

// Stripe payment links for direct checkout
const PAYMENT_LINKS = {
  starter: "https://buy.stripe.com/bJe14n0MEaic9GNdTndAk01",
  pro: "https://buy.stripe.com/eVq5kD66Y3TOg5baHbdAk00",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!PAYMENT_LINKS[plan]) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get payment link
    const paymentLink = PAYMENT_LINKS[plan];
    
    // Store plan preference on user profile for webhook tracking
    const profiles = await base44.asServiceRole.entities.AgentProfile.filter({ email: user.email });
    const profile = profiles[0];
    
    if (profile && !profile.stripe_customer_id) {
      await base44.asServiceRole.entities.AgentProfile.update(profile.id, {
        plan: plan,
      });
    }

    console.log(`Returning payment link for ${user.email}, plan=${plan}`);
    return Response.json({
      paymentLink: paymentLink,
      plan: plan,
    });
  } catch (err) {
    console.error("Error creating checkout session:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});