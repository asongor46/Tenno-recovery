import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, XCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const severityConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "text-amber-500",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-500",
  },
  critical: {
    icon: XCircle,
    bg: "bg-red-100",
    border: "border-red-300",
    iconColor: "text-red-600",
  },
};

export default function AlertsPanel({ alerts, isLoading }) {
  const queryClient = useQueryClient();

  const handleResolve = async (alertId) => {
    await base44.entities.Alert.update(alertId, { is_resolved: true, is_read: true });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
    queryClient.invalidateQueries({ queryKey: ["unreadAlerts"] });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Alerts</h2>
        <div className="text-center text-slate-500 py-4">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-white rounded-2xl border border-slate-100 p-6"
    >
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Alerts</h2>

      {alerts?.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-emerald-600" />
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
                className={`flex items-start gap-3 p-3 rounded-xl ${config.bg} border ${config.border}`}
              >
                <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900">{alert.title}</p>
                  {alert.message && (
                    <p className="text-xs text-slate-600 mt-0.5">{alert.message}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolve(alert.id)}
                  className="text-slate-500 hover:text-slate-700 h-7 px-2"
                >
                  Resolve
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}