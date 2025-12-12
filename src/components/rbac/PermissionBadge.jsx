import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Crown } from "lucide-react";

const roleConfig = {
  admin: {
    label: "Admin",
    icon: Crown,
    className: "bg-purple-100 text-purple-700 border-purple-200"
  },
  user: {
    label: "User",
    icon: User,
    className: "bg-blue-100 text-blue-700 border-blue-200"
  }
};

/**
 * Display role badge with icon
 */
export default function PermissionBadge({ role }) {
  const config = roleConfig[role] || roleConfig.user;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}