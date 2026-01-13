import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
// [ENHANCED - Tier 2]
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FileText,
  MapPin,
  DollarSign,
  LogOut,
  Clock,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import PortalAuthGuard from "@/components/portal/PortalAuthGuard";
import ClientAIAssistant from "@/components/portal/ClientAIAssistant";

function PortalDashboardContent() {
  const userEmail = sessionStorage.getItem("portal_user_email") || localStorage.getItem("portal_user_email");

  // [ENHANCED - Tier 2] Fetch cases and activities
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["portal-cases", userEmail],
    queryFn: async () => {
      const allCases = await base44.entities.Case.filter({ owner_email: userEmail });
      return allCases;
    },
    enabled: !!userEmail,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["portalActivities", cases.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!cases || cases.length === 0) return [];
      // Fetch all activity logs and filter client-visible ones in memory
      const allActivities = await base44.entities.ActivityLog.list("-created_date", 50);
      const caseIds = cases.map(c => c.id);
      return allActivities
        .filter(a => caseIds.includes(a.case_id) && a.is_client_visible)
        .slice(0, 10);
    },
    enabled: cases.length > 0,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("portal_session_token");
    localStorage.removeItem("portal_user_email");
    localStorage.removeItem("portal_session_expires");
    window.location.href = createPageUrl("PortalLogin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // [ENHANCED - Tier 2] Dark theme for portal
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="TENNO RECOVERY" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Welcome, {cases[0]?.owner_name || "Client"}
                </h1>
                <p className="text-sm text-slate-400">{userEmail}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Title */}
        <div>
          <h2 className="text-2xl font-bold text-white">Your Surplus Recovery Cases</h2>
          <p className="text-slate-300 mt-1">
            {cases.length} {cases.length === 1 ? 'case' : 'cases'} in progress
          </p>
        </div>

        {/* No cases message */}
        {cases.length === 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-300">No cases found for your account.</p>
                <p className="text-sm text-slate-400 mt-1">
                  Contact tennoassetrecovery@gmail.com if you believe this is an error.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Case Cards */}
        {cases.map((caseData, index) => {
          const progress = calculateProgress(caseData);
          const action = getActionNeeded(caseData);
          const statusInfo = getStatusInfo(caseData);
          const feeAmount = (caseData.surplus_amount * (caseData.fee_percent / 100)).toFixed(0);
          const recoveryAmount = (caseData.surplus_amount - feeAmount).toFixed(0);

          return (
            <motion.div
              key={caseData.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`bg-slate-800 border-slate-700 ${action?.urgent ? "border-2 border-orange-400" : ""}`}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Case Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <h3 className="font-mono font-semibold text-lg text-white">
                            Case #{caseData.case_number}
                          </h3>
                        </div>
                        <div className="flex items-start gap-2 text-slate-300">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{caseData.property_address || "Address not available"}</span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          {caseData.county} County, {caseData.state}
                        </p>
                      </div>
                      <Badge className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-700">
                      <div>
                        <p className="text-xs text-slate-400">Estimated Surplus</p>
                        <p className="text-lg font-bold text-white">
                          ${caseData.surplus_amount?.toLocaleString() || "0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Your Fee ({caseData.fee_percent}%)</p>
                        <p className="text-lg font-semibold text-slate-300">
                          ${parseFloat(feeAmount).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Your Recovery</p>
                        <p className="text-lg font-bold text-emerald-400">
                          ~${parseFloat(recoveryAmount).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-300 font-medium">{statusInfo.label}</span>
                        <span className="font-semibold text-emerald-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* [ENHANCED - Tier 2] What to Do Next Panel */}
                    {(() => {
                      const nextAction = getNextActionEnhanced(caseData);
                      return nextAction.urgent ? (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <p className="text-sm font-semibold text-emerald-400 mb-1">
                            🤖 {nextAction.title}
                          </p>
                          <p className="text-xs text-slate-300 mb-3">
                            {nextAction.description}
                          </p>
                          {nextAction.action && (
                            <Button
                              size="sm"
                              className="w-full bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => {
                                window.location.href = createPageUrl(nextAction.route);
                              }}
                            >
                              {nextAction.action} →
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                          <p className="text-sm font-medium text-slate-300">
                            {nextAction.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {nextAction.description}
                          </p>
                        </div>
                      );
                    })()}

                    {/* [NEW - Tier 2] Checklist */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Your Checklist:</p>
                      {getChecklistEnhanced(caseData).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-slate-600 rounded" />
                          )}
                          <span className={item.completed ? "text-slate-500 line-through" : "text-slate-300"}>
                            {item.label}
                          </span>
                          {item.completed && item.date && (
                            <span className="text-slate-500 ml-auto">
                              {format(new Date(item.date), "MMM d")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Buttons */}
                    {getNextActionEnhanced(caseData).action && (
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          window.location.href = createPageUrl(getNextActionEnhanced(caseData).route);
                        }}
                      >
                        {getNextActionEnhanced(caseData).action} <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* [NEW - Tier 2] Timeline */}
        {activities.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 pb-3 border-b border-slate-700 last:border-0">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{activity.action}</p>
                      {activity.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{activity.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(activity.created_date), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Questions or Need Help?</p>
                <p className="text-sm text-slate-300 mt-1">
                  Contact us at (555) 123-4567 or reply to any email from us.
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  Email: <a href="mailto:tennoassetrecovery@gmail.com" className="text-blue-400 hover:text-blue-300 hover:underline">
                    tennoassetrecovery@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* [NEW - Tier 3] AI Assistant */}
      <ClientAIAssistant caseId={cases[0]?.id} userEmail={userEmail} />
    </div>
  );
}

export default function PortalDashboard() {
  return (
    <PortalAuthGuard>
      <PortalDashboardContent />
    </PortalAuthGuard>
  );
}

// [ENHANCED - Tier 2] Helper functions
function calculateProgress(caseData) {
  const stageProgress = {
    'imported': 5,
    'intake': 10,
    'outreach': 15,
    'portal_sent': 20,
    'agreement_signed': 30,
    'info_completed': 50,
    'notary_completed': 65,
    'packet_ready': 70,
    'filed': 80,
    'waiting_period': 85,
    'order_phase': 90,
    'approved': 95,
    'payment_received': 98,
    'closed': 100
  };
  
  return stageProgress[caseData.stage] || 0;
}

// [NEW - Tier 2] Enhanced next action logic
function getNextActionEnhanced(caseData) {
  if (caseData.agreement_status !== 'signed') {
    return {
      title: "Sign Your Agreement",
      description: "Please review and sign the fee agreement to get started.",
      action: "Sign Agreement",
      route: `PortalAgreement?token=${caseData.portal_token}`,
      urgent: true
    };
  }
  
  if (!caseData.owner_dob || !caseData.owner_ssn_last_four || !caseData.id_front_url || !caseData.id_back_url) {
    return {
      title: "Complete Your Information",
      description: "We need a few more details and ID photos to proceed.",
      action: "Complete Info",
      route: `PortalInfo?token=${caseData.portal_token}`,
      urgent: true
    };
  }
  
  if (caseData.notary_required && !caseData.notary_packet_uploaded) {
    return {
      title: "Upload Notarized Authorization",
      description: "Download, sign with a notary, and upload the authorization form.",
      action: "Complete Notary",
      route: `PortalNotary?token=${caseData.portal_token}`,
      urgent: true
    };
  }
  
  if (['filed', 'waiting_period'].includes(caseData.stage)) {
    const daysRemaining = caseData.waiting_period_end 
      ? Math.ceil((new Date(caseData.waiting_period_end) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      title: "Claim Filed - Waiting Period",
      description: daysRemaining > 0 
        ? `Waiting period ends in ${daysRemaining} days (${new Date(caseData.waiting_period_end).toLocaleDateString()})`
        : "Waiting for court processing",
      action: null,
      urgent: false
    };
  }
  
  if (caseData.stage === 'approved') {
    return {
      title: "Claim Approved! 🎉",
      description: "Your claim was approved by the court. Payment is being processed.",
      action: null,
      urgent: false
    };
  }

  if (caseData.stage === 'payment_received' || caseData.stage === 'paid') {
    return {
      title: "Payment Received",
      description: "We've received the payment and are processing your distribution.",
      action: null,
      urgent: false
    };
  }

  if (caseData.stage === 'closed') {
    return {
      title: "Case Complete ✓",
      description: "Your surplus recovery is complete. Thank you!",
      action: null,
      urgent: false
    };
  }
  
  return {
    title: "Processing",
    description: "We're working on your case. No action needed from you right now.",
    action: null,
    urgent: false
  };
}

// [NEW - Tier 2] Checklist helper
function getChecklistEnhanced(caseData) {
  return [
    {
      label: "Sign fee agreement",
      completed: caseData.agreement_status === 'signed',
      date: caseData.agreement_signed_at
    },
    {
      label: "Confirm information & upload ID",
      completed: !!caseData.owner_dob && !!caseData.owner_ssn_last_four && !!caseData.id_front_url && !!caseData.id_back_url,
      date: caseData.info_submitted_at || caseData.id_uploaded_at
    },
    {
      label: "Upload notarized authorization",
      completed: caseData.notary_packet_uploaded,
      date: null,
      skip: !caseData.notary_required
    },
    {
      label: "Claim filed with county",
      completed: ['filed','waiting_period','order_phase','approved','payment_received','paid','closed'].includes(caseData.stage),
      date: caseData.filed_at
    },
    {
      label: "Court approval",
      completed: ['approved','payment_received','paid','closed'].includes(caseData.stage),
      date: caseData.order_signed_date
    },
    {
      label: "Payment sent to you",
      completed: caseData.stage === 'closed',
      date: caseData.paid_at
    }
  ].filter(item => !item.skip);
}

// Helper: Get action needed for case
function getActionNeeded(caseData) {
  // Agreement not signed
  if (caseData.agreement_status !== 'signed') {
    return {
      message: 'Sign your fee agreement',
      action: 'Sign Agreement',
      link: 'PortalAgreement',
      urgent: true
    };
  }
  
  // ID documents missing
  if (!caseData.id_front_url || !caseData.id_back_url) {
    return {
      message: 'Upload your ID documents',
      action: 'Upload ID',
      link: 'PortalIDUpload',
      urgent: true
    };
  }
  
  // Notary pending
  if (caseData.notary_required && caseData.notary_status === 'pending') {
    return {
      message: 'Upload notarized documents',
      action: 'Upload Notary',
      link: 'PortalNotary',
      urgent: true
    };
  }
  
  // Waiting period
  if (caseData.filing_status === 'awaiting_period' && caseData.waiting_period_end) {
    return {
      message: 'Waiting period in progress',
      waitingDate: caseData.waiting_period_end,
      urgent: false
    };
  }
  
  // No action needed
  return null;
}

// Helper: Get status display info
function getStatusInfo(caseData) {
  if (caseData.agreement_status !== 'signed') {
    return {
      label: 'AGREEMENT NEEDED',
      className: 'bg-red-100 text-red-700 border-0'
    };
  }
  
  if (!caseData.id_front_url || !caseData.id_back_url) {
    return {
      label: 'ID NEEDED',
      className: 'bg-orange-100 text-orange-700 border-0'
    };
  }
  
  if (caseData.notary_required && caseData.notary_status === 'pending') {
    return {
      label: 'NOTARY NEEDED',
      className: 'bg-amber-100 text-amber-700 border-0'
    };
  }
  
  if (caseData.filing_status === 'filed') {
    return {
      label: 'FILED',
      className: 'bg-indigo-100 text-indigo-700 border-0'
    };
  }
  
  if (caseData.filing_status === 'awaiting_period') {
    return {
      label: 'WAITING PERIOD',
      className: 'bg-slate-100 text-slate-700 border-0'
    };
  }
  
  if (caseData.status === 'approved') {
    return {
      label: 'APPROVED',
      className: 'bg-emerald-100 text-emerald-700 border-0'
    };
  }
  
  if (caseData.status === 'paid' || caseData.stage === 'paid') {
    return {
      label: 'PAID',
      className: 'bg-green-100 text-green-700 border-0'
    };
  }
  
  if (caseData.status === 'closed' || caseData.stage === 'closed') {
    return {
      label: 'CLOSED',
      className: 'bg-green-100 text-green-700 border-0'
    };
  }
  
  return {
    label: 'IN PROGRESS',
    className: 'bg-blue-100 text-blue-700 border-0'
  };
}