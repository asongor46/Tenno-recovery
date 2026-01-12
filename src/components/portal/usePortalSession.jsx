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
    // Check both localStorage and sessionStorage
    let token = localStorage.getItem("portal_session_token");
    let userEmail = localStorage.getItem("portal_user_email");
    
    if (!token) {
      token = sessionStorage.getItem("portal_session_token");
      userEmail = sessionStorage.getItem("portal_user_email");
    }

    console.log("🔍 usePortalSession - Token found:", token ? "YES" : "NO");
    console.log("🔍 usePortalSession - User email:", userEmail);

    if (!token) {
      console.log("❌ No token found, setting unauthenticated");
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      console.log("🔍 Verifying token with portalAuth...");
      
      const { data } = await base44.functions.invoke("portalAuth", {
        action: "verify",
        session_token: token
      });

      console.log("📦 portalAuth response:", data);

      if (data.success) {
        console.log("✅ Verification successful!");
        setIsAuthenticated(true);
        setUser(data.user);
        setSessionToken(token);
      } else {
        console.log("❌ Verification failed:", data.error);
        clearSession();
      }
    } catch (error) {
      console.error("❌ portalAuth error:", error);
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