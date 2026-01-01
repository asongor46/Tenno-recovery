import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Briefcase,
  Flame,
  Clock,
  FileCheck,
  PackageCheck,
  DollarSign,
  Target, // ADDED for verification KPI
  AlertTriangle, // ADDED for identity issues KPI
  Sparkles, // ADDED: For AI panel
  Lightbulb, // ADDED: For AI suggestions
} from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import CasesTable from "@/components/dashboard/CasesTable";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import TodoPanel from "@/components/dashboard/TodoPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: () => base44.entities.Case.list("-updated_date", 100),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // [ENHANCED - Tier 2] Smart alerts with computed cases needing attention
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      // Fetch stored alerts
      const storedAlerts = await base44.entities.Alert.filter({ is_resolved: false }, "-created_date", 10);
      
      // Compute dynamic alerts from case state
      const allCases = await base44.entities.Case.list("-updated_date", 100);
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
    refetchInterval: 60000, // Refresh every minute
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

  // ADDED: Verification stats
  const verifiedCases = cases.filter(c => c.verification_status === "green").length;
  const identityIssues = cases.filter(c => 
    c.owner_confidence === "low" || c.owner_confidence === "unknown"
  ).length;

  const recentCases = cases.slice(0, 10);

  // Calculate chart data
  const stageData = [
    { name: 'Imported', value: cases.filter(c => c.stage === 'imported').length },
    { name: 'Agreement', value: cases.filter(c => c.stage === 'agreement_signed').length },
    { name: 'Info Complete', value: cases.filter(c => c.stage === 'info_completed').length },
    { name: 'Notary', value: cases.filter(c => c.stage === 'notary_completed').length },
    { name: 'Packet Ready', value: cases.filter(c => c.stage === 'packet_ready').length },
    { name: 'Filed', value: cases.filter(c => c.stage === 'filed').length },
    { name: 'Paid', value: cases.filter(c => c.stage === 'paid').length },
  ].filter(s => s.value > 0);

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  // Revenue over time (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date;
  });

  const revenueData = last30Days.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const paidCases = cases.filter(c => 
      c.stage === 'paid' && 
      c.paid_at && 
      c.paid_at.startsWith(dateStr)
    );
    const revenue = paidCases.reduce((sum, c) => 
      sum + ((c.surplus_amount || 0) * ((c.fee_percentage || 20) / 100)), 0
    );
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.round(revenue)
    };
  }).filter((_, i) => i % 5 === 0); // Show every 5th day

  // ADDED: AI Suggestions Panel Component
  function AISuggestionsPanel() {
    const [suggestions, setSuggestions] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    const loadSuggestions = async () => {
      setLoading(true);
      try {
        // Get top 3 cases needing attention
        const priorityCases = cases
          .filter(c => c.status === "active" && !c.verification_status)
          .slice(0, 3);

        const allSuggestions = [];
        for (const c of priorityCases) {
          const { data } = await base44.functions.invoke("aiCaseAutomation", {
            case_id: c.id,
            action_type: "suggest_next_steps"
          });
          if (data.result?.next_steps) {
            allSuggestions.push({
              case_id: c.id,
              case_number: c.case_number,
              owner_name: c.owner_name,
              steps: data.result.next_steps.slice(0, 2) // Top 2 steps per case
            });
          }
        }
        setSuggestions(allSuggestions);
      } catch (error) {
        console.error("Failed to load AI suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    React.useEffect(() => {
      if (cases.length > 0 && suggestions.length === 0) {
        loadSuggestions();
      }
    }, [cases]);

    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI Suggestions
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadSuggestions}
            disabled={loading}
            className="text-xs"
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-4">Analyzing cases...</p>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No suggestions yet</p>
          ) : (
            <div className="space-y-3">
              {suggestions.slice(0, 2).map((sug) => (
                <div key={sug.case_id} className="bg-white p-3 rounded-lg border border-purple-100">
                  <p className="text-xs font-semibold text-purple-900 mb-1">{sug.case_number}</p>
                  {sug.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 mt-2">
                      <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700">{step.action}</p>
                        <Badge 
                          variant="outline" 
                          className={`mt-1 text-xs ${
                            step.priority === "urgent" ? "border-red-300 text-red-700" :
                            step.priority === "high" ? "border-orange-300 text-orange-700" :
                            "border-slate-300 text-slate-600"
                          }`}
                        >
                          {step.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1">Welcome back. Here's your overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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
        {/* ADDED: Verified Cases KPI */}
        <KPICard
          title="Verified Cases"
          value={verifiedCases}
          icon={Target}
          href="Cases"
          color="purple"
          delay={0.1}
        />
        <KPICard
          title="Awaiting Notary"
          value={awaitingNotary}
          icon={FileCheck}
          href="Cases?notary_status=pending"
          color="blue"
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
        {/* ADDED: Identity Issues KPI */}
        <KPICard
          title="Identity Issues"
          value={identityIssues}
          icon={AlertTriangle}
          href="Cases"
          color="rose"
          delay={0.25}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pipeline Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Cases Table - Takes 2 columns */}
        <div className="lg:col-span-2">
          <CasesTable cases={recentCases} isLoading={casesLoading} />
        </div>

        {/* Side Panels */}
        <div className="space-y-4 sm:space-y-6">
          {/* ADDED: AI Suggestions Panel */}
          <AISuggestionsPanel />
          <AlertsPanel alerts={alerts} isLoading={alertsLoading} />
          <TodoPanel todos={todos} isLoading={todosLoading} />
        </div>
      </div>
    </div>
  );
}