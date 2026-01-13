import React from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Reusable LoadingState component
 */
export default function LoadingState({ message = "Loading...", fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
      <p className="text-slate-600">{message}</p>
    </Card>
  );
}