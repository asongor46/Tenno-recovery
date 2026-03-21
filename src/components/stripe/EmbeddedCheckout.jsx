import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";

export default function StripeEmbeddedCheckout({ plan, onClose }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchClientSecret() {
      try {
        const res = await base44.functions.invoke("createCheckoutSession", { plan });
        if (res.data?.clientSecret && res.data?.publishableKey) {
          setStripePromise(loadStripe(res.data.publishableKey));
          setClientSecret(res.data.clientSecret);
        } else {
          setError(res.data?.error || "Could not start checkout");
        }
      } catch (err) {
        setError(err.message);
      }
    }
    fetchClientSecret();
  }, [plan]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={onClose} className="text-slate-300 hover:text-white underline">Close</button>
        </div>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl relative my-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}