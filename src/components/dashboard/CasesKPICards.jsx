import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Flame,
} from "lucide-react";

/**
 * PHASE 4+ ENHANCEMENT: KPI Cards for Dashboard Overview
 * Shows high-level metrics at a glance
 */

export default function CasesKPICards({ cases }) {
  // Calculate KPIs
  const totalCases = cases.length;
  const activeCases = cases.filter(c => c.status === "active").length;
  const hotCases = cases.filter(c => c.is_hot).length;
  const totalSurplus = cases.reduce((sum, c) => sum + (c.surplus_amount || 0), 0);
  const filedCases = cases.filter(c => c.stage === "filed" || c.stage === "approved").length;
  const paidCases = cases.filter(c => c.status === "paid").length;
  
  const needsAttention = cases.filter(c => {
    const daysSinceUpdate = (Date.now() - new Date(c.updated_date)) / (1000 * 60 * 60 * 24);
    return c.status === "active" && daysSinceUpdate > 7;
  }).length;

  const kpis = [
    {
      label: "Total Pipeline Value",
      value: `$${(totalSurplus / 1000).toFixed(0)}k`,
      subtext: `${totalCases} total cases`,
      icon: DollarSign,
      color: "emerald",
    },
    {
      label: "Active Cases",
      value: activeCases,
      subtext: `${hotCases} hot cases`,
      icon: TrendingUp,
      color: "blue",
    },
    {
      label: "In Process",
      value: filedCases,
      subtext: "Filed & awaiting decision",
      icon: Clock,
      color: "amber",
    },
    {
      label: "Paid/Closed",
      value: paidCases,
      subtext: "Successful completions",
      icon: CheckCircle,
      color: "green",
    },
    {
      label: "Needs Attention",
      value: needsAttention,
      subtext: "No update in 7+ days",
      icon: AlertTriangle,
      color: needsAttention > 0 ? "red" : "slate",
    },
    {
      label: "Hot Cases",
      value: hotCases,
      subtext: "$30k+ surplus",
      icon: Flame,
      color: "orange",
    },
  ];

  const colorClasses = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
    slate: "bg-slate-400",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-10 h-10 rounded-full ${colorClasses[kpi.color]} bg-opacity-10 flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 text-${kpi.color}-600`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {kpi.value}
            </div>
            <div className="text-xs font-medium text-slate-600 mb-1">
              {kpi.label}
            </div>
            <div className="text-xs text-slate-500">
              {kpi.subtext}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}