import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "Loading...", fullScreen = false, size = "default" }) {
  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-8 h-8",
    large: "w-12 h-12",
  };

  const spinnerSize = sizeClasses[size] || sizeClasses.default;

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className={`${spinnerSize} text-emerald-600 animate-spin mx-auto mb-4`} />
          {message && <p className="text-slate-600 text-sm">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className={`${spinnerSize} text-emerald-600 animate-spin mx-auto mb-3`} />
        {message && <p className="text-slate-600 text-sm">{message}</p>}
      </div>
    </div>
  );
}