import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Briefcase, DollarSign, TrendingUp, UserCheck } from "lucide-react";
import AdminLeadManagement from "@/components/admin/AdminLeadManagement";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import SlideshowManager from "@/components/admin/SlideshowManager";
import AdminFormLibrary from "@/components/admin/AdminFormLibrary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STAGE_COLORS = {
  imported: "#64748b",
  agreement_signed: "#3b82f6",
  info_completed: "#8b5cf6",
  notary_completed: "#f59e0b",
  packet_ready: "#f97316",
  filed: "#06b6d4",
  approved: "#10b981",
  paid: "#22c55e",
  closed: "#6b7280",
};

export default function AdminDashboard() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["adminAllAgents"],
    queryFn: () => base44.entities.AgentProfile.list(),
    enabled: user?.role === "admin",
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["adminAllCases"],
    queryFn: () => base44.entities.Case.list(),
    enabled: user?.role === "admin",
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        Access denied.
      </div>
    );
  }

  // MRR calc — uses plan_status field (not legacy status)
  const activeAgents = agents.filter((a) => a.plan_status === "active");
  const starterCount = activeAgents.filter((a) => !a.plan || a.plan === "starter").length;
  const proCount = activeAgents.filter((a) => a.plan === "pro").length;
  const mrr = starterCount * 50 + proCount * 97;

  const pastDueCount = agents.filter((a) => a.plan_status === "past_due").length;
  const cancelledCount = agents.filter((a) => a.plan_status === "cancelled").length;
  const suspendedCount = agents.filter((a) => a.plan_status === "suspended").length;

  // New signups this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = agents.filter((a) => new Date(a.created_date) > oneWeekAgo).length;

  // Cases by stage
  const stageCounts = {};
  cases.forEach((c) => {
    const s = c.stage || "imported";
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });
  const stageChartData = Object.entries(stageCounts).map(([stage, count]) => ({
    stage: stage.replace(/_/g, " "),
    count,
    fill: STAGE_COLORS[stage] || "#64748b",
  }));

  const kpis = [
    { label: "Active Agents", value: activeAgents.length, icon: Users, color: "text-blue-400" },
    { label: "Starter × $50", value: starterCount, icon: UserCheck, color: "text-slate-400" },
    { label: "Pro × $97", value: proCount, icon: UserCheck, color: "text-amber-400" },
    { label: "Monthly MRR", value: `$${mrr.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
    { label: "Past Due", value: pastDueCount, icon: TrendingUp, color: pastDueCount > 0 ? "text-amber-400" : "text-slate-400" },
    { label: "Suspended", value: suspendedCount, icon: TrendingUp, color: suspendedCount > 0 ? "text-red-400" : "text-slate-400" },
    { label: "Cancelled", value: cancelledCount, icon: TrendingUp, color: cancelledCount > 0 ? "text-red-400" : "text-slate-400" },
    { label: "Total Cases", value: cases.length, icon: Briefcase, color: "text-purple-400" },
    { label: "New Signups (7d)", value: newThisWeek, icon: TrendingUp, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Platform-wide overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-slate-800 border-slate-700">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{k.label}</span>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cases by Stage */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Cases by Stage (All Agents)</CardTitle>
          </CardHeader>
          <CardContent>
            {stageChartData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No cases yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageChartData} layout="vertical">
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fill: "#94a3b8", fontSize: 11 }} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stageChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agent List Summary */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Recent Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAgents.slice(0, 8).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                <div>
                  <p className="text-sm text-white font-medium">{agent.full_name || agent.email}</p>
                  <p className="text-xs text-slate-500">{agent.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={agent.plan === "pro" ? "bg-amber-400/10 text-amber-400 border-0" : "bg-slate-700 text-slate-300 border-0"}>
                    {agent.plan || "starter"}
                  </Badge>
                </div>
              </div>
            ))}
            {activeAgents.length > 8 && (
              <Link to={createPageUrl("UserManagement")} className="block text-center text-xs text-emerald-400 hover:underline pt-2">
                View all {activeAgents.length} active agents →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Detailed Analytics</h2>
        <AdminAnalytics />
      </div>

      {/* Slideshow Management */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Manage Feature Slideshow</h2>
        <SlideshowManager />
      </div>

      {/* Form Library Management */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Form Library</h2>
        <AdminFormLibrary />
      </div>

      {/* Lead Management */}
      <AdminLeadManagement />
    </div>
  );
}