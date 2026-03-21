import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";

export default function ProUpgradeModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    // Check if running in iframe (Base44 preview)
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app. Please open the app in a new tab.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("createCheckoutSession", {
        plan: "pro",
        successUrl: window.location.origin + "/Dashboard?checkout=success",
        cancelUrl: window.location.origin + "/Settings",
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      alert("Failed to start upgrade. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-5 h-5 text-amber-500" />
            Pro Feature
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-slate-600">
            This is a <strong>Pro feature</strong>. Upgrade to Pro ($97/month) to unlock:
          </p>
          <ul className="text-sm text-slate-500 space-y-1.5 pl-4 list-disc">
            <li>Homeowner self-serve portal</li>
            <li>AI imports (PDF, screenshot, URL)</li>
            <li>Packet Builder</li>
            <li>Form Library & File Manager</li>
            <li>Advanced email templates</li>
          </ul>
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleUpgrade}
              disabled={loading}
            >
              <Crown className="w-4 h-4 mr-2" />
              {loading ? "Redirecting..." : "Upgrade to Pro — $97/mo"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}