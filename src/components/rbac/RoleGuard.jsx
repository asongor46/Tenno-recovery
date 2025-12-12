import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Role-based access control guard component
 * Wraps content that should only be accessible to specific roles
 */
export default function RoleGuard({ 
  allowedRoles = [], 
  children, 
  fallback = null,
  requireAll = false 
}) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6 text-center">
          <Lock className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <p className="text-amber-900 font-medium mb-2">Authentication Required</p>
          <p className="text-amber-700 text-sm mb-4">Please log in to access this content</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>
            Log In
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check if user has required role
  const userRole = user.role || "user";
  const hasAccess = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (!hasAccess) {
    return fallback || (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <p className="text-red-900 font-medium mb-2">Access Denied</p>
          <p className="text-red-700 text-sm mb-4">
            You don't have permission to access this content
          </p>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const userRole = user?.role || "user";

  return {
    user,
    role: userRole,
    isAdmin: userRole === "admin",
    isUser: userRole === "user",
    hasRole: (role) => userRole === role,
    hasAnyRole: (roles) => roles.includes(userRole),
    can: (permission) => {
      // Define permission mappings
      const permissions = {
        admin: [
          "manage_users",
          "view_all_cases",
          "edit_all_cases",
          "delete_cases",
          "manage_counties",
          "manage_templates",
          "view_automation_log",
          "manage_settings"
        ],
        user: [
          "view_own_cases",
          "edit_own_cases",
          "create_cases",
          "view_counties",
          "use_templates"
        ]
      };

      return permissions[userRole]?.includes(permission) || false;
    }
  };
}