import Stripe from "npm:stripe@14.21.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: err.message }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const STARTER_PRICE_ID = "price_1TDFvZLH99WPSqLvCsERmQuw";
  const PRO_PRICE_ID = "price_1TDFvZLH99WPSqLv1r2wIkLg";

  function getPlanFromPriceId(priceId) {
    if (priceId === PRO_PRICE_ID) return "pro";
    if (priceId === STARTER_PRICE_ID) return "starter";
    return "starter";
  }

  async function findProfile(customerEmail, customerId) {
    try {
      if (customerEmail) {
        const byEmail = await base44.asServiceRole.entities.AgentProfile.filter({ email: customerEmail });
        if (byEmail.length > 0) return byEmail[0];
      }
      if (customerId) {
        const byCustomer = await base44.asServiceRole.entities.AgentProfile.filter({ stripe_customer_id: customerId });
        if (byCustomer.length > 0) return byCustomer[0];
      }
    } catch (err) {
      console.error("Error finding profile:", err.message);
    }
    return null;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const customerEmail = session.customer_details?.email || session.customer_email;

        // Get subscription to determine plan
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);

        const profile = await findProfile(customerEmail, customerId);
        if (profile) {
          await base44.asServiceRole.entities.AgentProfile.update(profile.id, {
            plan,
            plan_status: "active",
            status: "approved",  // Payment confirmed — approve the agent
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          });
          console.log(`checkout.session.completed: updated profile ${profile.email} → plan=${plan}, status=approved`);
        } else {
          console.warn(`checkout.session.completed: no profile found for email=${customerEmail}, customer=${customerId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);
        const status = subscription.status; // active, past_due, canceled, etc.

        const planStatus = status === "active" ? "active"
          : status === "past_due" ? "past_due"
          : status === "canceled" ? "cancelled"
          : status === "trialing" ? "trialing"
          : "active";

        const profile = await findProfile(null, customerId);
        if (profile) {
          await base44.asServiceRole.entities.AgentProfile.update(profile.id, {
            plan,
            plan_status: planStatus,
            stripe_subscription_id: subscription.id,
            billing_cycle_end: new Date(subscription.current_period_end * 1000).toISOString().split("T")[0],
          });
          console.log(`subscription.updated: ${profile.email} → plan=${plan}, status=${planStatus}`);
        } else {
          console.warn(`subscription.updated: no profile for customer=${customerId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const profile = await findProfile(null, customerId);
        if (profile) {
          await base44.asServiceRole.entities.AgentProfile.update(profile.id, {
            plan_status: "cancelled",
          });
          console.log(`subscription.deleted: ${profile.email} → cancelled`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const profile = await findProfile(null, customerId);
        if (profile) {
          await base44.asServiceRole.entities.AgentProfile.update(profile.id, {
            plan_status: "active",
          });
          console.log(`payment_succeeded: ${profile.email} → active`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const profile = await findProfile(null, customerId);
        if (profile) {
          await base44.asServiceRole.entities.AgentProfile.update(profile.id, {
            plan_status: "past_due",
          });
          console.log(`payment_failed: ${profile.email} → past_due`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Error processing webhook event:", err.message);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }

  return Response.json({ received: true });
});