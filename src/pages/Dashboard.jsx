import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Briefcase,
  Flame,
  Clock,
  FileCheck,
  PackageCheck,
  DollarSign
} from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import CasesTable from "@/components/dashboard/CasesTable";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import TodoPanel from "@/components/dashboard/TodoPanel";

export default function Dashboard() {
  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: () => base44.entities.Case.list("-updated_date", 100),
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.filter({ is_resolved: false }, "-created_date", 10),
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: () => base44.entities.Todo.filter({ is_completed: false }, "-created_date", 10),
  });

  // Calculate KPIs
  const activeCases = cases.filter(c => c.status === "active").length;
  const hotCases = cases.filter(c => c.is_hot || c.surplus_amount >= 30000).length;
  const awaitingHomeowner = cases.filter(c => 
    ["imported", "agreement_signed"].includes(c.stage)
  ).length;
  const awaitingNotary = cases.filter(c => 
    c.stage === "info_completed" && c.notary_status === "pending"
  ).length;
  const packetsReady = cases.filter(c => c.stage === "packet_ready").length;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const paidCases = cases.filter(c => 
    c.stage === "paid" && c.paid_at && new Date(c.paid_at) > thirtyDaysAgo
  ).length;

  const recentCases = cases.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's your overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Active Cases"
          value={activeCases}
          icon={Briefcase}
          href="Cases?status=active"
          color="emerald"
          delay={0}
        />
        <KPICard
          title="Hot Cases"
          value={hotCases}
          icon={Flame}
          href="HotCases"
          color="orange"
          delay={0.05}
        />
        <KPICard
          title="Awaiting Owner"
          value={awaitingHomeowner}
          icon={Clock}
          href="Cases?stage=imported"
          color="blue"
          delay={0.1}
        />
        <KPICard
          title="Awaiting Notary"
          value={awaitingNotary}
          icon={FileCheck}
          href="Cases?notary_status=pending"
          color="purple"
          delay={0.15}
        />
        <KPICard
          title="Packets Ready"
          value={packetsReady}
          icon={PackageCheck}
          href="Cases?stage=packet_ready"
          color="amber"
          delay={0.2}
        />
        <KPICard
          title="Paid (30 days)"
          value={paidCases}
          icon={DollarSign}
          href="Cases?stage=paid"
          color="rose"
          delay={0.25}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cases Table - Takes 2 columns */}
        <div className="lg:col-span-2">
          <CasesTable cases={recentCases} isLoading={casesLoading} />
        </div>

        {/* Side Panels */}
        <div className="space-y-6">
          <AlertsPanel alerts={alerts} isLoading={alertsLoading} />
          <TodoPanel todos={todos} isLoading={todosLoading} />
        </div>
      </div>
    </div>
  );
}