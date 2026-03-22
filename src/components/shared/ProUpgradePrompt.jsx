import React from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

/**
 * ProUpgradePrompt — shown to Starter agents when they try to access a Pro feature.
 * Props:
 *   feature: string — name of the locked feature
 *   onDismiss: fn (optional) — called when "Maybe Later" is clicked
 */
export default function ProUpgradePrompt({ feature = "This feature", onDismiss }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-slate-700/60 rounded-2xl flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-slate-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        🔒 {feature} is a Pro Feature
      </h2>
      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
        Upgrade to Pro ($97/month) to unlock:
        <br />
        AI imports · Client portal · Packet builder · Form library · Advanced templates
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-semibold"
          onClick={() => window.location.href = createPageUrl("Settings")}
        >
          Upgrade to Pro <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
        {onDismiss && (
          <Button
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={onDismiss}
          >
            Maybe Later
          </Button>
        )}
      </div>
    </div>
  );
}