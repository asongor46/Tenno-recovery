import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 },
  labelStyle: { color: "#f1f5f9" },
};

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-700/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-white">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4">{children}</div>}
    </div>
  );
}

function StatGrid({ items }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(({ label, value, color = "text-white" }) => (
        <div key={label} className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const { data: agents = [] } = useQuery({
    queryKey: ["analyticsAgents"],
    queryFn: () => base44.entities.AgentProfile.list(),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["analyticsCases"],
    queryFn: () => base44.entities.Case.list(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["analyticsLeads"],
    queryFn: () => base44.entities.Lead.list("-uploaded_at", 1000),
  });

  const { data: claimRequests = [] } = useQuery({
    queryKey: ["analyticsClaimRequests"],
    queryFn: () => base44.entities.ClaimRequest.list(),
  });

  // ── Revenue Analytics ──────────────────────────────────────────
  const activeAgents = agents.filter(a => a.plan_status === "active");
  const starterCount = activeAgents.filter(a => !a.plan || a.plan === "starter").length;
  const proCount = activeAgents.filter(a => a.plan === "pro").length;
  const mrr = starterCount * 50 + proCount * 97;

  // MRR trend (last 6 months — approximate based on created_date)
  const mrrTrend = Array.from({ length: 6 }, (_, i) => {
    const monthStart = startOfMonth(subMonths(new Date(), 5 - i));
    const monthEnd = endOfMonth(subMonths(new Date(), 5 - i));
    const activeByMonth = agents.filter(a => {
      const created = new Date(a.created_date);
      return created <= monthEnd && a.plan_status === "active";
    });
    const s = activeByMonth.filter(a => !a.plan || a.plan === "starter").length;
    const p = activeByMonth.filter(a => a.plan === "pro").length;
    return {
      month: format(monthStart, "MMM"),
      mrr: s * 50 + p * 97,
    };
  });

  const thirtyDaysAgo = subDays(new Date(), 30);
  const churnCount = agents.filter(a =>
    a.plan_status === "cancelled" && a.updated_date && new Date(a.updated_date) > thirtyDaysAgo
  ).length;

  const upgradeCount = agents.filter(a => a.plan === "pro" && a.plan_status === "active").length;

  // ── Lead Analytics ─────────────────────────────────────────────
  const convertedLeads = leads.filter(l => (l.times_imported || 0) > 0).length;
  const conversionRate = leads.length ? ((convertedLeads / leads.length) * 100).toFixed(1) : 0;

  const leadsByState = Object.entries(
    leads.reduce((acc, l) => { if (l.state) acc[l.state] = (acc[l.state] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([state, count]) => ({ state, count }));

  const sevenDaysAgo = subDays(new Date(), 7);
  const claimLast7 = claimRequests.filter(c => new Date(c.created_date) > sevenDaysAgo).length;
  const claimLast30 = claimRequests.filter(c => new Date(c.created_date) > thirtyDaysAgo).length;

  const claimByStatus = ["new", "claimed", "contacted", "expired", "completed"].map(status => ({
    status,
    count: claimRequests.filter(c => c.status === status).length,
  })).filter(d => d.count > 0);

  // ── Agent Activity ─────────────────────────────────────────────
  const casesPerAgent = agents.map(a => ({
    name: a.full_name || a.email?.split("@")[0] || "Unknown",
    count: cases.filter(c => c.agent_id === a.id).length,
  })).sort((a, b) => b.count - a.count).slice(0, 10);

  const avgCasesPerAgent = agents.length
    ? (cases.length / Math.max(agents.length, 1)).toFixed(1)
    : 0;

  const inactiveAgents = agents.filter(a =>
    cases.filter(c => c.agent_id === a.id).length === 0
  ).length;

  // ── Portal Analytics ───────────────────────────────────────────
  const portalLinksSent = cases.filter(c => c.portal_link).length;
  const agreementsSigned = cases.filter(c => c.agreement_status === "signed").length;
  const completionRate = portalLinksSent
    ? ((agreementsSigned / portalLinksSent) * 100).toFixed(1)
    : 0;

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-3">
      {/* Section A: Revenue */}
      <Section title="📈 Revenue Analytics" defaultOpen>
        <StatGrid items={[
          { label: "Active MRR", value: `$${mrr.toLocaleString()}`, color: "text-emerald-400" },
          { label: "Starter Agents", value: starterCount, color: "text-slate-300" },
          { label: "Pro Agents", value: proCount, color: "text-amber-400" },
          { label: "Churn (30d)", value: churnCount, color: churnCount > 0 ? "text-red-400" : "text-slate-300" },
        ]} />
        <div>
          <p className="text-xs text-slate-400 mb-2">MRR Trend (6 months)</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={mrrTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={v => [`$${v}`, "MRR"]} />
              <Line type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Section B: Lead Analytics */}
      <Section title="🎯 Lead Analytics">
        <StatGrid items={[
          { label: "Total Leads", value: leads.length, color: "text-blue-400" },
          { label: "Converted", value: `${convertedLeads} (${conversionRate}%)`, color: "text-emerald-400" },
          { label: "Public Searches (7d)", value: claimLast7, color: "text-cyan-400" },
          { label: "Public Searches (30d)", value: claimLast30, color: "text-cyan-400" },
        ]} />
        {leadsByState.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Leads by State (Top 10)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leadsByState} layout="vertical">
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis type="category" dataKey="state" tick={{ fill: "#94a3b8", fontSize: 11 }} width={30} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {claimByStatus.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Claim Requests by Status</p>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={claimByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={60} label={({ status, count }) => `${status}: ${count}`} labelLine={false}>
                    {claimByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Section>

      {/* Section C: Agent Activity */}
      <Section title="👥 Agent Activity">
        <StatGrid items={[
          { label: "Total Agents", value: agents.length, color: "text-purple-400" },
          { label: "Avg Cases/Agent", value: avgCasesPerAgent, color: "text-white" },
          { label: "Total Cases", value: cases.length, color: "text-white" },
          { label: "Inactive Agents (0 cases)", value: inactiveAgents, color: inactiveAgents > 0 ? "text-yellow-400" : "text-slate-300" },
        ]} />
        {casesPerAgent.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Most Active Agents (by case count)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={casesPerAgent} layout="vertical">
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} width={100} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Section D: Portal Analytics */}
      <Section title="🔗 Portal Analytics">
        <StatGrid items={[
          { label: "Portal Links Sent", value: portalLinksSent, color: "text-blue-400" },
          { label: "Agreements Signed", value: agreementsSigned, color: "text-emerald-400" },
          { label: "Completion Rate", value: `${completionRate}%`, color: parseFloat(completionRate) > 50 ? "text-emerald-400" : "text-yellow-400" },
          { label: "Pending Signature", value: portalLinksSent - agreementsSigned, color: "text-slate-300" },
        ]} />
      </Section>
    </div>
  );
}