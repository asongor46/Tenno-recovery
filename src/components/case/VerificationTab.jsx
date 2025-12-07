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
  TrendingUp,
  Info,
  RefreshCw, // ADDED
} from "lucide-react";
import RunVerificationButton from "./RunVerificationButton"; // ADDED
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const verificationColors = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  pending: "bg-slate-300",
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

  // Calculate verification checks
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
      {/* ADDED: Run Verification Button at top */}
      <div className="flex justify-end">
        <RunVerificationButton caseId={caseId} />
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${
        overallStatus === "green" ? "border-emerald-500 bg-emerald-50" :
        overallStatus === "yellow" ? "border-amber-500 bg-amber-50" :
        overallStatus === "red" ? "border-red-500 bg-red-50" :
        "border-slate-300 bg-slate-50"
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 ${verificationColors[overallStatus]} rounded-full flex items-center justify-center`}>
                <OverallIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Verification Status</p>
                <p className="text-2xl font-bold text-slate-900">
                  {verificationLabels[overallStatus]}
                </p>
                {caseData?.verification_summary && (
                  <p className="text-sm text-slate-600 mt-1">{caseData.verification_summary}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Complexity</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={complexityScore} className="w-24 h-2" />
                <span className="font-semibold">{complexityScore}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Checks Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <VerificationCard
          title="Case Integrity"
          icon={Shield}
          check={checks.integrity}
        />
        <VerificationCard
          title="Owner Verification"
          icon={Target}
          check={checks.owner}
        />
        <VerificationCard
          title="Surplus Status"
          icon={DollarSign}
          check={checks.surplus}
        />
        <VerificationCard
          title="Filing Permissions"
          icon={FileCheck}
          check={checks.filing}
        />
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {caseData?.verification_details && (
            <div className="space-y-3 text-sm">
              {Object.entries(caseData.verification_details).map(([key, value]) => (
                <div key={key} className="flex justify-between p-2 border-b last:border-0">
                  <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Next Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getRecommendedActions(caseData, checks).map((action, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  action.priority === "high" ? "bg-red-500" :
                  action.priority === "medium" ? "bg-amber-500" :
                  "bg-blue-500"
                }`}>
                  <span className="text-white font-semibold text-xs">{i + 1}</span>
                </div>
                <p className="flex-1 text-sm">{action.text}</p>
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
    pass: "text-emerald-600 bg-emerald-50",
    warning: "text-amber-600 bg-amber-50",
    fail: "text-red-600 bg-red-50",
    unknown: "text-slate-500 bg-slate-50",
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
            <p className="font-semibold text-sm mb-1">{title}</p>
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`w-4 h-4 ${check.status === "pass" ? "text-emerald-600" : check.status === "warning" ? "text-amber-600" : check.status === "fail" ? "text-red-600" : "text-slate-500"}`} />
              <span className="text-sm font-medium capitalize">{check.status}</span>
            </div>
            {check.notes && (
              <p className="text-xs text-slate-600">{check.notes}</p>
            )}
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

// Helper functions for calculating checks
function calculateIntegrityCheck(caseData) {
  const issues = [];
  
  if (!caseData.surplus_amount || caseData.surplus_amount <= 0) {
    issues.push("No surplus amount recorded");
  }
  
  if (caseData.sale_amount && caseData.judgment_amount && 
      caseData.sale_amount <= caseData.judgment_amount) {
    issues.push("Sale amount does not exceed judgment");
  }

  if (!caseData.sale_date) {
    issues.push("Missing sale date");
  }

  return {
    status: issues.length === 0 ? "pass" : issues.length <= 1 ? "warning" : "fail",
    notes: issues.length === 0 ? "All basic data present" : null,
    issues,
  };
}

function calculateOwnerCheck(caseData) {
  const confidence = caseData.owner_confidence || "unknown";
  const issues = [];

  if (confidence === "low" || confidence === "unknown") {
    issues.push("Owner identity not verified");
  }

  if (!caseData.owner_phone && !caseData.owner_email) {
    issues.push("No contact information");
  }

  return {
    status: confidence === "high" ? "pass" : confidence === "medium" ? "warning" : "fail",
    notes: confidence === "high" ? "Owner identity confirmed" : null,
    issues,
  };
}

function calculateSurplusCheck(caseData) {
  // Simple check for now
  return {
    status: caseData.surplus_amount > 0 ? "pass" : "unknown",
    notes: caseData.surplus_amount > 0 ? "Surplus amount recorded" : "Surplus status not verified",
    issues: [],
  };
}

function calculateFilingCheck(caseData, county) {
  const issues = [];
  
  if (!county) {
    return {
      status: "unknown",
      notes: "County rules not loaded",
      issues: ["County information missing"],
    };
  }

  if (!county.rep_allowed) {
    issues.push("County does not allow representative filing");
  }

  if (county.assignment_required) {
    issues.push("Assignment document required");
  }

  return {
    status: issues.length === 0 ? "pass" : "warning",
    notes: county.rep_allowed ? "Representative filing allowed" : null,
    issues,
  };
}

function calculateNotaryCheck(caseData, county) {
  if (!county?.notary_required) {
    return {
      status: "pass",
      notes: "Notary not required",
      issues: [],
    };
  }

  const issues = [];
  
  if (caseData.notary_status === "pending") {
    issues.push("Notarization pending");
  }

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

  if (checks.owner.status !== "pass") {
    actions.push({
      text: "Run People Finder to verify owner identity",
      priority: "high",
      actionButton: "Run Search",
    });
  }

  if (!caseData.owner_phone && !caseData.owner_email) {
    actions.push({
      text: "Obtain contact information for owner",
      priority: "high",
    });
  }

  if (checks.notary.status === "unknown" && checks.notary.issues.length > 0) {
    actions.push({
      text: "Send portal link to homeowner for notarization",
      priority: "medium",
      actionButton: "Send Link",
    });
  }

  if (checks.filing.status === "warning") {
    actions.push({
      text: "Review county filing requirements",
      priority: "medium",
    });
  }

  if (actions.length === 0) {
    actions.push({
      text: "Case looks good - proceed with filing",
      priority: "low",
    });
  }

  return actions;
}