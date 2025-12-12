import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/**
 * Standardized empty state component
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  className = ""
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-slate-500 max-w-md mb-6">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}