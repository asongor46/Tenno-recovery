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

  if (planStatus === "suspended") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center gap-2">
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-red-400 text-sm">Your account has been suspended by the administrator. Please contact support at <a href="mailto:tennoassetrecovery@gmail.com" className="underline">tennoassetrecovery@gmail.com</a> to restore access.</span>
      </div>
    );
  }

  if (planStatus === "past_due") {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Your payment is past due. Please update your billing info to avoid service interruption.</span>
        </div>
        <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 flex-shrink-0" onClick={openPortal} disabled={loading}>
          {loading ? "..." : "Update Billing"}
        </Button>
      </div>
    );
  }

  if (planStatus === "cancelled") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-red-400 text-sm">
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