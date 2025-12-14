import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  ChevronRight,
  FileText,
  User,
  Shield,
  Home,
  DollarSign,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
// ADDED: Import new portal components
import DocumentsSection from "@/components/portal/DocumentsSection";
import MessagingWidget from "@/components/portal/MessagingWidget";
import FAQSection from "@/components/portal/FAQSection";
import ActivityFeed from "@/components/portal/ActivityFeed";
import HomeownerChatbot from "@/components/portal/HomeownerChatbot";

const stepIcons = {
  agreement: FileText,
  id_upload: User,
  intake: FileText,
  notary: Shield,
  review: CheckCircle2,
  packet_generated: FileText,
  filed: Home,
  decision: Clock,
  paid: DollarSign,
};

const stepLabels = {
  agreement: "Sign Agreement",
  id_upload: "Upload ID",
  intake: "Complete Intake",
  notary: "Notarization",
  review: "Review & Confirm",
  packet_generated: "Packet Generated",
  filed: "Filed with County",
  decision: "County Decision",
  paid: "Payment Received",
};

export default function PortalDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const queryClient = useQueryClient();

  // Load case data
  const { data: caseData, isLoading } = useQuery({
    queryKey: ["portal-case", token],
    queryFn: async () => {
      const cases = await base44.entities.Case.filter({ portal_token: token });
      return cases[0];
    },
    enabled: !!token,
  });

  // Load workflow steps
  const { data: workflowData } = useQuery({
    queryKey: ["workflow-progress", caseData?.id],
    queryFn: async () => {
      const { data } = await base44.functions.invoke("homeownerWorkflowService", {
        action: "get_progress",
        case_id: caseData.id,
      });
      return data.result;
    },
    enabled: !!caseData?.id,
  });

  // Initialize workflow if needed
  useEffect(() => {
    if (caseData?.id && workflowData && workflowData.total === 0) {
      base44.functions.invoke("homeownerWorkflowService", {
        action: "initialize",
        case_id: caseData.id,
      }).then(() => {
        queryClient.invalidateQueries(["workflow-progress", caseData.id]);
      });
    }
  }, [caseData?.id, workflowData]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Invalid access link. Please check your email for the correct link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Case not found. Please contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = workflowData?.steps || [];
  const currentStep = steps.find((s) => s.status !== "completed" && s.required) || steps[0];
  const progress = workflowData?.percentage || 0;

  // Check if case is closed (read-only mode)
  const isClosed = caseData?.stage === "closed" || caseData?.status === "closed";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Your Surplus Recovery</h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1">{caseData.county}, {caseData.state}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-slate-500">Case #</p>
              <p className="font-mono text-sm sm:text-base font-semibold break-all">{caseData.case_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Case Closed Notice */}
        {isClosed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-900">Your case is complete!</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      You may download records or archive when ready. This portal will remain accessible.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="border-emerald-300">
                        Download Records
                      </Button>
                      <Button variant="outline" size="sm" className="border-emerald-300">
                        Request Invoice Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="text-slate-600">Overall Completion</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 sm:h-3" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                  <div className="text-center p-2 sm:p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600">{workflowData?.completed || 0}</p>
                    <p className="text-xs sm:text-sm text-slate-600">Completed</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-amber-50 rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-amber-600">{workflowData?.total - (workflowData?.completed || 0)}</p>
                    <p className="text-xs sm:text-sm text-slate-600">Remaining</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Case Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Case Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Property Address</p>
                <p className="text-sm sm:text-base font-semibold break-words">{caseData.property_address || "—"}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Surplus Amount</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                  ${caseData.surplus_amount?.toLocaleString() || "0"}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Your Email</p>
                <p className="text-sm font-semibold flex items-center gap-2 break-all">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="break-all">{caseData.owner_email || "Not provided"}</span>
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Contact</p>
                <p className="text-sm font-semibold flex items-center gap-2 break-all">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="break-all">tennoassetrecovery@gmail.com</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ADDED: Documents & Invoices Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DocumentsSection caseId={caseData.id} />
        </motion.div>

        {/* ADDED: Real-Time Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ActivityFeed caseId={caseData.id} />
        </motion.div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const StepIcon = stepIcons[step.step_key];
            const isActive = currentStep?.step_key === step.step_key;
            const isCompleted = step.status === "completed";
            const isBlocked = step.status === "blocked";

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`${isActive ? "border-2 border-emerald-500 shadow-lg" : ""}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? "bg-emerald-500"
                              : isBlocked
                              ? "bg-red-500"
                              : isActive
                              ? "bg-blue-500"
                              : "bg-slate-200"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          ) : isBlocked ? (
                            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          ) : (
                            <StepIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? "text-white" : "text-slate-400"}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm sm:text-base font-semibold ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                            {stepLabels[step.step_key]}
                          </p>
                          {isBlocked && step.blocking_reason && (
                            <p className="text-xs sm:text-sm text-red-600 mt-1 break-words">{step.blocking_reason}</p>
                          )}
                          {isCompleted && step.completed_at && (
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                              Completed {new Date(step.completed_at).toLocaleDateString()}
                            </p>
                          )}
                          {isActive && (
                            <Badge className="mt-1 bg-blue-100 text-blue-700 border-0 text-xs">
                              Current Step
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isActive && !isCompleted && !isBlocked && !isClosed && (
                        <Link to={createPageUrl(getStepPageUrl(step.step_key, token))} className="w-full sm:w-auto">
                          <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto text-sm">
                            Continue <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ADDED: Secure Messaging Widget - Disabled if closed */}
        {!isClosed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <MessagingWidget caseId={caseData.id} clientName={caseData.owner_name} />
          </motion.div>
        )}

        {/* ADDED: FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <FAQSection />
        </motion.div>

        {/* Help Section - KEPT AS IS */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Need Help?</p>
                <p className="text-sm text-slate-600 mt-1">
                  If you have any questions or need assistance, please contact our support team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Homeowner Chatbot */}
      <HomeownerChatbot caseId={caseData.id} caseData={caseData} />
    </div>
  );
}

function getStepPageUrl(stepKey, token) {
  const pageMap = {
    agreement: `PortalAgreement?token=${token}`,
    id_upload: `PortalIDUpload?token=${token}`,
    intake: `PortalIntake?token=${token}`,
    notary: `PortalNotary?token=${token}`,
    review: `PortalDashboard?token=${token}`,
  };
  return pageMap[stepKey] || `PortalDashboard?token=${token}`;
}