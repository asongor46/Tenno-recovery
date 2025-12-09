import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";

/**
 * PHASE 4+ ENHANCEMENT: Kanban-style Pipeline View
 * Visual representation of case flow through stages
 */

const PIPELINE_STAGES = [
  { key: "imported", label: "NEW LEADS", desc: "Not skip-traced yet", color: "slate" },
  { key: "skip_traced", label: "SKIP TRACE DONE", desc: "Ready to contact", color: "blue" },
  { key: "contacted", label: "CONTACTED", desc: "No response yet", color: "purple" },
  { key: "info_completed", label: "ENGAGED", desc: "Info collected", color: "indigo" },
  { key: "agreement_signed", label: "AGREEMENT SENT", desc: "Awaiting signature", color: "amber" },
  { key: "notary_completed", label: "NOTARIZED", desc: "Ready to file", color: "emerald" },
  { key: "filed", label: "FILED", desc: "Packet mailed", color: "green" },
  { key: "approved", label: "COUNTY PROCESSING", desc: "Waiting for decision", color: "cyan" },
  { key: "paid", label: "PAID", desc: "Invoice sent/paid", color: "teal" },
  { key: "closed", label: "CLOSED", desc: "Complete", color: "slate" },
];

const colorClasses = {
  slate: "bg-slate-100 border-slate-300 text-slate-900",
  blue: "bg-blue-50 border-blue-300 text-blue-900",
  purple: "bg-purple-50 border-purple-300 text-purple-900",
  indigo: "bg-indigo-50 border-indigo-300 text-indigo-900",
  amber: "bg-amber-50 border-amber-300 text-amber-900",
  emerald: "bg-emerald-50 border-emerald-300 text-emerald-900",
  green: "bg-green-50 border-green-300 text-green-900",
  cyan: "bg-cyan-50 border-cyan-300 text-cyan-900",
  teal: "bg-teal-50 border-teal-300 text-teal-900",
};

export default function CasePipelineKanban({ cases }) {
  // Group cases by stage
  const casesByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = cases.filter(c => c.stage === stage.key);
    return acc;
  }, {});

  // Calculate warnings (no update in 10+ days)
  const getWarnings = (stageCases) => {
    const staleThreshold = 10 * 24 * 60 * 60 * 1000; // 10 days
    return stageCases.filter(c => 
      new Date() - new Date(c.updated_date) > staleThreshold
    ).length;
  };

  return (
    <div className="w-full">
      <ScrollArea className="w-full pb-4">
        <div className="flex gap-4 min-w-max px-1">
          {PIPELINE_STAGES.map((stage) => {
            const stageCases = casesByStage[stage.key] || [];
            const warnings = getWarnings(stageCases);
            const totalValue = stageCases.reduce((sum, c) => sum + (c.surplus_amount || 0), 0);

            return (
              <Card 
                key={stage.key}
                className={`flex-shrink-0 w-80 border-2 ${colorClasses[stage.color]}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <div>
                      <div>{stage.label}</div>
                      <div className="text-xs font-normal opacity-70 mt-0.5">{stage.desc}</div>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {stageCases.length}
                    </Badge>
                  </CardTitle>
                  
                  {/* Stage metrics */}
                  <div className="flex items-center gap-3 text-xs mt-2">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-semibold">${(totalValue / 1000).toFixed(0)}k</span>
                    </div>
                    {warnings > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{warnings} stale</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {stageCases.length === 0 ? (
                        <div className="text-center py-8 text-sm opacity-60">
                          No cases in this stage
                        </div>
                      ) : (
                        stageCases.map((caseItem) => {
                          const isStale = new Date() - new Date(caseItem.updated_date) > 10 * 24 * 60 * 60 * 1000;
                          
                          return (
                            <Link 
                              key={caseItem.id} 
                              to={createPageUrl(`CaseDetail?id=${caseItem.id}`)}
                              className="block"
                            >
                              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isStale ? 'border-red-300 border-2' : ''}`}>
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm truncate">
                                        {caseItem.owner_name}
                                      </div>
                                      <div className="text-xs text-slate-600 truncate">
                                        {caseItem.county}, {caseItem.state}
                                      </div>
                                    </div>
                                    {caseItem.is_hot && (
                                      <Badge className="ml-2 bg-orange-100 text-orange-700 text-xs border-0">
                                        HOT
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-emerald-700">
                                      ${caseItem.surplus_amount?.toLocaleString() || "0"}
                                    </span>
                                    <span className="text-slate-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(caseItem.updated_date || Date.now()), "MMM d")}
                                    </span>
                                  </div>

                                  {isStale && (
                                    <div className="mt-2 text-xs text-red-600 font-medium">
                                      ⚠ No update in 10+ days
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}