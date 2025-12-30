import React from "react";
import { usePortalSession } from "@/components/portal/usePortalSession";
import { createPageUrl } from "@/utils";

/**
 * Portal Authentication Guard
 * Wraps portal pages to ensure user is logged in
 */
export default function PortalAuthGuard({ children }) {
  const { isAuthenticated, isLoading } = usePortalSession();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = createPageUrl("PortalLogin");
    return null;
  }

  return children;
}