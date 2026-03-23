import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Users, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";

export default function PreCallAssistPanel({ caseData, county, onOpenScript }) {
  const checklist = [
    {
      label: "Case verified",
      completed: caseData?.verification_status === "green",
      status: caseData?.verification_status || "pending"
    },
    {
      label: "Surplus amount confirmed",
      completed: !!caseData?.surplus_amount,
      status: caseData?.surplus_amount ? "pass" : "missing"
    },
    {
      label: "Owner identity confidence",
      completed: caseData?.owner_confidence === "high",
      status: caseData?.owner_confidence || "unknown",
      showValue: true
    },
    {
      label: "County allows representation",
      completed: county?.allows_filing_on_behalf !== false,
      status: county?.allows_filing_on_behalf !== false ? "pass" : "blocked"
    }
  ];

  const riskFlags = caseData?.risk_flags || [];
  const repAllowed = county?.allows_filing_on_behalf !== false;

  return (
    <Card className="border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          Pre-Call Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Case Summary */}
        <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
          <p className="text-sm font-semibold text-white">
            {caseData?.owner_name || "No owner name"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {caseData?.property_address || "No property address"}
          </p>
          <p className="text-sm font-bold text-emerald-400 mt-2">
            Surplus: ${caseData?.surplus_amount?.toLocaleString() || "0"}
          </p>
        </div>

        {/* Pre-Call Checklist */}
        <div>
          <p className="text-sm font-semibold text-slate-100 mb-2">Before You Call:</p>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-slate-300">{item.label}</span>
                </div>
                {item.showValue && (
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                    {item.status}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Actions */}
        <div>
          <p className="text-sm font-semibold text-slate-100 mb-2">Suggested Actions:</p>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onOpenScript}
            >
              <Phone className="w-4 h-4 mr-2" /> View Call Script
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => {
                setTimeout(() => {
                  const tabs = document.querySelectorAll('button[role="tab"]');
                  const clientTab = Array.from(tabs).find(t => 
                    t.getAttribute('value') === 'client' || 
                    t.textContent?.includes('Client Info')
                  );
                  if (clientTab) clientTab.click();
                }, 100);
              }}
            >
              <Users className="w-4 h-4 mr-2" /> Find More Contacts
            </Button>
          </div>
        </div>

        {/* County Notes */}
        {county && (
          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              County Notes ({county.name}):
            </p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-1">
                {repAllowed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                )}
                <span className={repAllowed ? "text-emerald-400" : "text-amber-400"}>
                  {repAllowed ? "Agent can file directly" : "Owner must file personally"}
                </span>
              </li>
              {county.requires_notarized_authorization && (
                <li className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400">Requires notarized authorization</span>
                </li>
              )}
              {county.claim_deadline_days && (
                <li className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-blue-400" />
                  <span className="text-slate-300">{county.claim_deadline_days}-day claim deadline</span>
                </li>
              )}
              {county.processing_timeline && (
                <li className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-400">Timeline: {county.processing_timeline}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs font-semibold text-red-400 mb-2">⚠️ Risk Flags:</p>
            <div className="space-y-1">
              {riskFlags.map((flag, i) => (
                <p key={i} className="text-xs text-red-400">
                  • {flag.replace(/_/g, " ")}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}