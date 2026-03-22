import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function StripeEmbeddedCheckout({ plan, onClose }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    // Block checkout inside iframes (only works on published app)
    if (window.self !== window.top) {
      setError("Checkout is only available from the published app. Please open the app directly.");
      return;
    }

    async function startCheckout() {
      try {
        const res = await base44.functions.invoke("createCheckoutSession", { plan });
        if (res.data?.paymentLink) {
          window.location.href = res.data.paymentLink;
        } else {
          setError(res.data?.error || "Could not start checkout");
        }
      } catch (err) {
        setError(err.message);
      }
    }
    startCheckout();
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

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400 mx-auto mb-4"></div>
        <p className="text-slate-300 text-sm">Redirecting to secure checkout...</p>
      </div>
    </div>
  );
}