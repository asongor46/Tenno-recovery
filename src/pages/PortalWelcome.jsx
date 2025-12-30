import React, { useEffect } from "react";
import { createPageUrl } from "@/utils";

export default function PortalWelcome() {
  // Redirect to registration page (access code flow)
  useEffect(() => {
    window.location.href = createPageUrl("PortalRegister");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  );
}