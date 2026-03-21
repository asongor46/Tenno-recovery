import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle } from "lucide-react";

export default function SubscriptionBanner({ planStatus }) {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    if (window.self !== window.top) {
      alert("Billing portal is only available from the published app.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("createPortalSession", {
        returnUrl: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      alert("Unable to open billing portal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (planStatus === "active" || !planStatus) return null;

  if (planStatus === "past_due") {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Your payment is past due. Please update your billing info to avoid service interruption.</span>
        </div>
        <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 flex-shrink-0" onClick={openPortal} disabled={loading}>
          {loading ? "..." : "Update Billing"}
        </Button>
      </div>
    );
  }

  if (planStatus === "cancelled") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-red-700 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>Your subscription has been cancelled. You are in read-only mode.</span>
        </div>
        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0" onClick={openPortal} disabled={loading}>
          {loading ? "..." : "Resubscribe"}
        </Button>
      </div>
    );
  }

  return null;
}