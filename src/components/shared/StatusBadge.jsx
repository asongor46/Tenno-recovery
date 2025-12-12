import React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Standardized status badge component
 */
export default function StatusBadge({ status, variant = "default" }) {
  const statusConfig = {
    active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
    filed: { label: "Filed", className: "bg-blue-100 text-blue-700" },
    approved: { label: "Approved", className: "bg-green-100 text-green-700" },
    paid: { label: "Paid", className: "bg-teal-100 text-teal-700" },
    closed: { label: "Closed", className: "bg-slate-100 text-slate-600" },
    archived: { label: "Archived", className: "bg-slate-200 text-slate-500" },
    success: { label: "Success", className: "bg-green-100 text-green-700" },
    error: { label: "Error", className: "bg-red-100 text-red-700" },
    warning: { label: "Warning", className: "bg-amber-100 text-amber-700" },
    info: { label: "Info", className: "bg-blue-100 text-blue-700" },
  };

  const config = statusConfig[status] || statusConfig.info;

  return (
    <Badge variant="outline" className={`${config.className} border-0`}>
      {config.label}
    </Badge>
  );
}