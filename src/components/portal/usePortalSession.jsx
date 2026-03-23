import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

/**
 * Unified portal session management hook
 * Handles authentication, session storage, and logout for client portal
 */
export function usePortalSession() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    verifySession();
  }, []);

  const verifySession = async () => {
    let token = localStorage.getItem("portal_session_token");
    let userEmail = localStorage.getItem("portal_user_email");
    
    if (!token) {
      token = sessionStorage.getItem("portal_session_token");
      userEmail = sessionStorage.getItem("portal_user_email");
    }

    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // Check expiry client-side first
    const sessionExpires = localStorage.getItem("portal_session_expires") || sessionStorage.getItem("portal_session_expires");
    if (sessionExpires && new Date(sessionExpires) < new Date()) {
      clearSession();
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await base44.functions.invoke("portalAuth", {
        action: "verify",
        session_token: token
      });

      if (data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
        setSessionToken(token);
      } else {
        clearSession();
      }
    } catch (error) {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    localStorage.removeItem("portal_session_token");
    localStorage.removeItem("portal_user_email");
    localStorage.removeItem("portal_session_expires");
    sessionStorage.removeItem("portal_session_token");
    sessionStorage.removeItem("portal_user_email");
    sessionStorage.removeItem("portal_session_expires");
    setIsAuthenticated(false);
    setUser(null);
    setSessionToken(null);
  };

  const logout = () => {
    clearSession();
    window.location.href = createPageUrl("PortalLogin");
  };

  const refreshSession = async () => {
    await verifySession();
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    sessionToken,
    logout,
    refreshSession,
  };
}