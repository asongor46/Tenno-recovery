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

  // ADDED: Verification stats
  const verifiedCases = cases.filter(c => c.verification_status === "green").length;
  const identityIssues = cases.filter(c => 
    c.owner_confidence === "low" || c.owner_confidence === "unknown"
  ).length;

  const recentCases = cases.slice(0, 10);

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

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cases Table - Takes 2 columns */}
        <div className="lg:col-span-2">
          <CasesTable cases={recentCases} isLoading={casesLoading} />
        </div>

        {/* Side Panels */}
        <div className="space-y-6">
          {/* ADDED: AI Suggestions Panel */}
          <AISuggestionsPanel />
          <AlertsPanel alerts={alerts} isLoading={alertsLoading} />
          <TodoPanel todos={todos} isLoading={todosLoading} />
        </div>
      </div>
    </div>
  );
}