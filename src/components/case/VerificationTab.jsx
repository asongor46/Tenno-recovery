import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Shield,
  DollarSign,
  FileCheck,
  Info,
} from "lucide-react";
import RunVerificationButton from "./RunVerificationButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const verificationColors = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  pending: "bg-slate-500",
};

const verificationIcons = {
  green: CheckCircle,
  yellow: AlertTriangle,
  red: XCircle,
  pending: Info,
};

const verificationLabels = {
  green: "VERIFIED",
  yellow: "NEEDS REVIEW",
  red: "ISSUES FOUND",
  pending: "PENDING",
};

export default function VerificationTab({ caseId, caseData }) {
  const { data: county } = useQuery({
    queryKey: ["county-for-verification", caseData?.county],
    queryFn: async () => {
      const counties = await base44.entities.County.filter({ 
        name: caseData.county, 
        state: caseData.state 
      });
      return counties[0];
    },
    enabled: !!caseData?.county,
  });

  const checks = {
    integrity: calculateIntegrityCheck(caseData),
    owner: calculateOwnerCheck(caseData),
    surplus: calculateSurplusCheck(caseData),
    filing: calculateFilingCheck(caseData, county),
    notary: calculateNotaryCheck(caseData, county),
  };

  const overallStatus = caseData?.verification_status || "pending";
  const complexityScore = caseData?.complexity_score || 0;
  const OverallIcon = verificationIcons[overallStatus];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <RunVerificationButton caseId={caseId} />
      </div>

      <Card className={`border-2 ${
        overallStatus === "green" ? "border-emerald-500 bg-emerald-500/10" :
        overallStatus === "yellow" ? "border-amber-500 bg-amber-500/10" :
        overallStatus === "red" ? "border-red-500 bg-red-500/10" :
        "border-slate-600 bg-slate-800/50"
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 ${verificationColors[overallStatus]} rounded-full flex items-center justify-center`}>
                <OverallIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Verification Status</p>
                <p className="text-2xl font-bold text-white">
                  {verificationLabels[overallStatus]}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {caseData?.verification_summary || 
                   (overallStatus === "pending" ? "Verification not run yet. Click 'Run Verification' to check case status." : "No summary available")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Complexity</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={complexityScore} className="w-24 h-2" />
                <span className="font-semibold text-slate-100">{complexityScore}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <VerificationCard title="Case Integrity" icon={Shield} check={checks.integrity} />
        <VerificationCard title="Owner Verification" icon={Target} check={checks.owner} />
        <VerificationCard title="Surplus Status" icon={DollarSign} check={checks.surplus} />
        <VerificationCard title="Filing Permissions" icon={FileCheck} check={checks.filing} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {caseData?.verification_details && (
            <div className="space-y-3 text-sm">
              {Object.entries(caseData.verification_details).map(([key, value]) => (
                <div key={key} className="flex justify-between p-2 border-b border-slate-700 last:border-0">
                  <span className="text-slate-400 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="font-medium text-slate-100">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Next Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getRecommendedActions(caseData, checks).map((action, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  action.priority === "high" ? "bg-red-500" :
                  action.priority === "medium" ? "bg-amber-500" :
                  "bg-blue-500"
                }`}>
                  <span className="text-white font-semibold text-xs">{i + 1}</span>
                </div>
                <p className="flex-1 text-sm text-slate-300">{action.text}</p>
                {action.actionButton && (
                  <Button size="sm" variant="outline">
                    {action.actionButton}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationCard({ title, icon: Icon, check }) {
  const statusColors = {
    pass: "text-emerald-400 bg-emerald-500/10",
    warning: "text-amber-400 bg-amber-500/10",
    fail: "text-red-400 bg-red-500/10",
    unknown: "text-slate-400 bg-slate-800/50",
  };

  const statusIcons = {
    pass: CheckCircle,
    warning: AlertTriangle,
    fail: XCircle,
    unknown: Info,
  };

  const StatusIcon = statusIcons[check.status];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColors[check.status]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1 text-slate-100">{title}</p>
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`w-4 h-4 ${
                check.status === "pass" ? "text-emerald-400" : 
                check.status === "warning" ? "text-amber-400" : 
                check.status === "fail" ? "text-red-400" : "text-slate-400"
              }`} />
              <span className="text-sm font-medium capitalize text-slate-300">{check.status}</span>
            </div>
            {check.notes && <p className="text-xs text-slate-400">{check.notes}</p>}
            {check.issues && check.issues.length > 0 && (
              <ul className="text-xs text-slate-500 mt-2 space-y-1">
                {check.issues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function calculateIntegrityCheck(caseData) {
  const issues = [];
  if (!caseData.surplus_amount || caseData.surplus_amount <= 0) {
    issues.push("Surplus amount not calculated yet");
  }
  if (caseData.sale_amount && caseData.judgment_amount && caseData.sale_amount <= caseData.judgment_amount) {
    issues.push("Sale amount does not exceed judgment");
  }
  if (!caseData.sale_date) issues.push("Missing sale date");
  return {
    status: issues.length === 0 ? "pass" : issues.length <= 1 ? "warning" : "unknown",
    notes: issues.length === 0 ? "All basic data present" : "Basic data incomplete or unverified",
    issues,
  };
}

function calculateOwnerCheck(caseData) {
  const confidence = caseData.owner_confidence || "unknown";
  const issues = [];
  if (confidence === "unknown") {
    issues.push("Owner not resolved yet - run owner resolver");
  } else if (confidence === "low") {
    issues.push("Owner identity uncertain - needs manual verification");
  }
  if (!caseData.owner_phone && !caseData.owner_email) {
    issues.push("No contact information available");
  }
  return {
    status: confidence === "high" ? "pass" : confidence === "medium" ? "warning" : "unknown",
    notes: confidence === "high" ? "Owner identity confirmed" : 
           confidence === "medium" ? "Owner partially verified" :
           "Owner not resolved yet",
    issues,
  };
}

function calculateSurplusCheck(caseData) {
  const issues = [];
  if (!caseData.surplus_amount || caseData.surplus_amount <= 0) {
    issues.push("Surplus not calculated yet - run surplus calculator");
  }
  return {
    status: caseData.surplus_amount > 0 ? "pass" : "unknown",
    notes: caseData.surplus_amount > 0 ? 
           `Surplus confirmed: $${caseData.surplus_amount.toLocaleString()}` : 
           "Surplus not calculated yet",
    issues,
  };
}

function calculateFilingCheck(caseData, county) {
  const issues = [];
  if (!county) {
    return { status: "unknown", notes: "County rules not loaded", issues: ["County information missing"] };
  }
  if (!county.rep_allowed) issues.push("County does not allow representative filing");
  if (county.assignment_required) issues.push("Assignment document required");
  return {
    status: issues.length === 0 ? "pass" : "warning",
    notes: county.rep_allowed ? "Representative filing allowed" : null,
    issues,
  };
}

function calculateNotaryCheck(caseData, county) {
  if (!county?.notary_required) {
    return { status: "pass", notes: "Notary not required", issues: [] };
  }
  const issues = [];
  if (caseData.notary_status === "pending") issues.push("Notarization pending");
  return {
    status: caseData.notary_status === "approved" ? "pass" : 
            caseData.notary_status === "validated" ? "warning" : "unknown",
    notes: county.notary_type === "either" ? "Wet or RON accepted" : 
           county.notary_type === "ron" ? "RON required" : "Wet ink required",
    issues,
  };
}

function getRecommendedActions(caseData, checks) {
  const actions = [];
  if (checks.owner.status === "unknown") {
    actions.push({ text: "Run owner resolver to identify property owner", priority: "high", actionButton: "Resolve Owner" });
  } else if (checks.owner.status !== "pass") {
    actions.push({ text: "Run People Finder to verify owner identity and find contact info", priority: "high", actionButton: "Run Search" });
  }
  if (checks.surplus.status === "unknown") {
    actions.push({ text: "Calculate surplus amount from county sale records", priority: "high", actionButton: "Calculate" });
  }
  if (!caseData.owner_phone && !caseData.owner_email && checks.owner.status !== "unknown") {
    actions.push({ text: "Obtain contact information for owner", priority: "high" });
  }
  if (checks.notary.status === "unknown" && checks.notary.issues.length > 0) {
    actions.push({ text: "Send portal link to client for notarization", priority: "medium", actionButton: "Send Link" });
  }
  if (checks.filing.status === "warning") {
    actions.push({ text: "Review county filing requirements", priority: "medium" });
  }
  if (actions.length === 0) {
    actions.push({ text: "All verifications passed - ready to proceed with filing", priority: "low" });
  }
  return actions;
}