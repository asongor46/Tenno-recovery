import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, XCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import LoadingState from "@/components/shared/LoadingState";

const severityConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    iconColor: "text-red-400",
  },
  critical: {
    icon: XCircle,
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    iconColor: "text-red-400",
  },
};

// [ENHANCED - Tier 2] Dashboard Alerts with smart notifications
export default function AlertsPanel({ alerts, isLoading }) {
  const queryClient = useQueryClient();

  const handleResolve = async (alertId) => {
    await base44.entities.Alert.update(alertId, { is_resolved: true, is_read: true });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
    queryClient.invalidateQueries({ queryKey: ["unreadAlerts"] });
  };

  const handleQuickAction = async (alert) => {
    // Navigate to case if case_id exists
    if (alert.case_id) {
      window.location.href = createPageUrl(`CaseDetail?id=${alert.case_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Alerts</h2>
        <LoadingState message="Loading alerts..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-slate-800 rounded-2xl border border-slate-700 p-6"
    >
      <h2 className="text-lg font-semibold text-white mb-4">Alerts</h2>

      {alerts?.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-slate-500 text-sm">No active alerts</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {alerts?.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`flex flex-col gap-2 p-3 rounded-xl ${config.bg} border ${config.border} hover:shadow-sm transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white">{alert.title}</p>
                    {alert.message && (
                      <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                    )}
                    {alert.case_id && (
                      <p className="text-xs text-slate-500 mt-1">
                        Case #{alert.case_id.substring(0, 8)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  {alert.case_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(alert)}
                      className="h-7 text-xs"
                    >
                      Open Case
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolve(alert.id)}
                    className="text-slate-400 hover:text-slate-200 h-7 px-2 text-xs ml-auto"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}