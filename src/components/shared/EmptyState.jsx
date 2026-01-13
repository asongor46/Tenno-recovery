import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Reusable EmptyState component
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
    <Card className={`p-12 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} variant="outline">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}