import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Briefcase,
  Flame,
  FileCheck,
  PackageCheck,
  Target,
} from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import TodoPanel from "@/components/dashboard/TodoPanel";
import LeadFeed from "@/components/dashboard/LeadFeed";
import WarmLeadsPanel from "@/components/dashboard/WarmLeadsPanel";
import LoadingState from "@/components/shared/LoadingState";

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: profile } = useQuery({
    queryKey: ["agentProfile", user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.AgentProfile.filter({ email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: () => base44.entities.Case.list("-updated_date", 100),
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 60000, // Auto-refresh every 60 seconds (reduced frequency)
    refetchOnWindowFocus: false, // Don't refetch on tab switch
  });

  // [ENHANCED - Tier 2] Smart alerts with computed cases needing attention
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts", cases.length],
    queryFn: async () => {
      // Fetch stored alerts
      const storedAlerts = await base44.entities.Alert.filter({ is_resolved: false }, "-created_date", 10);
      
      // Compute dynamic alerts from already-loaded case state (no extra API call)
      const allCases = cases;
      const computedAlerts = [];

      allCases.forEach(c => {
        // Homeowner completed all steps
        if (c.agreement_status === "signed" && c.id_front_url && c.id_back_url && 
            c.notary_packet_uploaded && c.stage !== "packet_ready") {
          computedAlerts.push({
            id: `computed-ready-${c.id}`,
            case_id: c.id,
            type: "action_required",
            title: `${c.case_number} - ${c.owner_name}`,
            message: "✅ Homeowner completed all steps → Ready to generate filing packet",
            severity: "info",
            is_read: false,
            is_resolved: false
          });
        }

        // Waiting period ending soon
        if (c.waiting_period_end) {
          const daysUntilEnd = Math.ceil((new Date(c.waiting_period_end) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilEnd === 0) {
            computedAlerts.push({
              id: `computed-waiting-${c.id}`,
              case_id: c.id,
              type: "action_required",
              title: `${c.case_number} - Waiting Period Ends TODAY`,
              message: "→ File proposed order",
              severity: "warning",
              is_read: false,
              is_resolved: false
            });
          } else if (daysUntilEnd > 0 && daysUntilEnd <= 3) {
            computedAlerts.push({
              id: `computed-waiting-${c.id}`,
              case_id: c.id,
              type: "action_required",
              title: `${c.case_number} - Waiting period ends in ${daysUntilEnd} days`,
              message: "→ Prepare proposed order",
              severity: "info",
              is_read: false,
              is_resolved: false
            });
          }
        }

        // Notary needs review
        if (c.notary_packet_uploaded && c.notary_verified === "pending") {
          computedAlerts.push({
            id: `computed-notary-${c.id}`,
            case_id: c.id,
            type: "action_required",
            title: `${c.case_number} - Notary document needs review`,
            message: "→ Verify notarization",
            severity: "warning",
            is_read: false,
            is_resolved: false
          });
        }

        // Stale cases (no contact in 7+ days, in outreach stage)
        if (c.portal_sent_at) {
          const daysSinceSent = Math.floor((new Date() - new Date(c.portal_sent_at)) / (1000 * 60 * 60 * 24));
          if (daysSinceSent >= 7 && !c.portal_code_used && c.stage === "imported") {
            computedAlerts.push({
              id: `computed-stale-${c.id}`,
              case_id: c.id,
              type: "action_required",
              title: `${c.case_number} - Portal invite not used (${daysSinceSent} days)`,
              message: "→ Follow up with homeowner",
              severity: "warning",
              is_read: false,
              is_resolved: false
            });
          }
        }
      });

      // Merge stored and computed, limit to 10 most important
      return [...computedAlerts, ...storedAlerts].slice(0, 10);
    },
    enabled: cases.length > 0,
    staleTime: 60000,
    refetchInterval: 120000, // Refresh every 2 minutes (reduced frequency)
    refetchOnWindowFocus: false,
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: () => base44.entities.Todo.filter({ is_completed: false }, "-created_date", 10),
  });

  // Calculate KPIs
  const activeCases = cases.filter(c => !c.is_archived && c.stage !== 'closed' && c.stage !== 'paid').length;
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

  const verifiedCases = cases.filter(c => c.verification_status === "green").length;

  if (casesLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-400 mt-1">Welcome back. Here's your overview.</p>
      </div>

      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPICard title="Active Cases" value={activeCases} icon={Briefcase} href="Cases?status=active" color="emerald" delay={0} />
        <KPICard title="Hot Cases" value={hotCases} icon={Flame} href="Cases" color="orange" delay={0.05} />
        <KPICard title="Verified Cases" value={verifiedCases} icon={Target} href="Cases" color="purple" delay={0.1} />
        <KPICard title="Awaiting Notary" value={awaitingNotary} icon={FileCheck} href="Cases?notary_status=pending" color="blue" delay={0.15} />
        <KPICard title="Packets Ready" value={packetsReady} icon={PackageCheck} href="Cases?stage=packet_ready" color="amber" delay={0.2} />
      </div>

      {/* 2. Today's Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <AlertsPanel alerts={alerts} isLoading={alertsLoading} />
        <TodoPanel todos={todos} isLoading={todosLoading} />
      </div>

      {/* 3. Warm Leads */}
      <WarmLeadsPanel user={user} profile={profile} />

      {/* 4. Lead Feed */}
      <LeadFeed user={user} profile={profile} />
    </div>
  );
}