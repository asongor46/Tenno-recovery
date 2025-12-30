import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FileText,
  MapPin,
  DollarSign,
  LogOut,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import PortalAuthGuard from "@/components/portal/PortalAuthGuard";

function PortalDashboardContent() {
  const userEmail = sessionStorage.getItem("portal_user_email") || localStorage.getItem("portal_user_email");

  // Fetch all cases for this user
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["portal-cases", userEmail],
    queryFn: async () => {
      const allCases = await base44.entities.Case.filter({ owner_email: userEmail });
      return allCases;
    },
    enabled: !!userEmail,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="TENNO RECOVERY" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Welcome, {cases[0]?.owner_name || "Client"}
                </h1>
                <p className="text-sm text-slate-500">{userEmail}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
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
          <h2 className="text-2xl font-bold text-slate-900">Your Surplus Recovery Cases</h2>
          <p className="text-slate-600 mt-1">
            {cases.length} {cases.length === 1 ? 'case' : 'cases'} in progress
          </p>
        </div>

        {/* No cases message */}
        {cases.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No cases found for your account.</p>
                <p className="text-sm text-slate-500 mt-1">
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
              <Card className={action?.urgent ? "border-2 border-orange-300" : ""}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Case Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-slate-600" />
                          <h3 className="font-mono font-semibold text-lg">
                            Case #{caseData.case_number}
                          </h3>
                        </div>
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{caseData.property_address || "Address not available"}</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {caseData.county} County, {caseData.state}
                        </p>
                      </div>
                      <Badge className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-3 py-3 border-y">
                      <div>
                        <p className="text-xs text-slate-500">Estimated Surplus</p>
                        <p className="text-lg font-bold text-slate-900">
                          ${caseData.surplus_amount?.toLocaleString() || "0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Your Fee ({caseData.fee_percent}%)</p>
                        <p className="text-lg font-semibold text-slate-600">
                          ${parseFloat(feeAmount).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Your Recovery</p>
                        <p className="text-lg font-bold text-emerald-600">
                          ~${parseFloat(recoveryAmount).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 font-medium">{statusInfo.label}</span>
                        <span className="font-semibold">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Action Needed */}
                    {action && (
                      <div className={`p-3 rounded-lg ${action.urgent ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
                        <div className="flex items-start gap-2">
                          {action.urgent ? (
                            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`font-medium ${action.urgent ? 'text-orange-900' : 'text-blue-900'}`}>
                              {action.urgent ? 'Action Needed:' : 'Status:'} {action.message}
                            </p>
                            {action.waitingDate && (
                              <p className="text-sm text-slate-600 mt-1">
                                Expected: {new Date(action.waitingDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action complete message */}
                    {!action && progress < 100 && (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <p className="text-emerald-900 font-medium">
                            ✓ No action needed - we're handling this
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to={createPageUrl(`CaseDetail?id=${caseData.id}`)}>
                          View Case Details
                        </Link>
                      </Button>
                      {action?.link && (
                        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" asChild>
                          <Link to={createPageUrl(`${action.link}?case_id=${caseData.id}`)}>
                            {action.action} <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Help Section */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Questions or Need Help?</p>
                <p className="text-sm text-slate-600 mt-1">
                  Contact us at (555) 123-4567 or reply to any email from us.
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Email: <a href="mailto:tennoassetrecovery@gmail.com" className="text-blue-600 hover:underline">
                    tennoassetrecovery@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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

// Helper: Calculate progress percentage
function calculateProgress(caseData) {
  const stageProgress = {
    'imported': 5,
    'agreement_signed': 20,
    'info_completed': 35,
    'notary_completed': 65,
    'packet_ready': 70,
    'filed': 80,
    'approved': 90,
    'paid': 100,
    'closed': 100
  };
  
  return stageProgress[caseData.stage] || 0;
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