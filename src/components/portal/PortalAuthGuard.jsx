import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

/**
 * Portal Authentication Guard
 * Wraps portal pages to ensure user is logged in
 */
export default function PortalAuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const session_token = localStorage.getItem("portal_session");
      
      if (!session_token) {
        window.location.href = createPageUrl("PortalLogin");
        return;
      }

      try {
        const { data } = await base44.functions.invoke("portalAuth", {
          action: "verify",
          session_token
        });

        if (data.success) {
          localStorage.setItem("portal_user", JSON.stringify(data.user));
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("portal_session");
          localStorage.removeItem("portal_user");
          window.location.href = createPageUrl("PortalLogin");
        }
      } catch (error) {
        localStorage.removeItem("portal_session");
        localStorage.removeItem("portal_user");
        window.location.href = createPageUrl("PortalLogin");
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
}