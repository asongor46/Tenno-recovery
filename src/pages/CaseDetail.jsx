import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Flame,
  Send,
  Download,
  Edit2,
  MoreHorizontal,
  User,
  FileText,
  Shield,
  Package,
  Activity,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Upload,
  Trash2,
  Eye,
  RefreshCw,
  Users,
  Target,
  Sparkles,
  Link as LinkIcon,
  Lightbulb,
  MapPin,
  FileCheck,
  Mail,
  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// ADDED: Import new tab components
import PeopleFinderTab from "@/components/case/PeopleFinderTab";
import VerificationTab from "@/components/case/VerificationTab";
import RunVerificationButton from "@/components/case/RunVerificationButton";
import CountyProfileView from "@/components/county/CountyProfileView";
import DocumentGeneratorPanel from "@/components/case/DocumentGeneratorPanel";
import PDFViewerDialog from "@/components/pdf/PDFViewerDialog";
// import CaseTimeline from "@/components/case/CaseTimeline";
import OutreachPanel from "@/components/case/OutreachPanel";
import EditCaseDialog from "@/components/case/EditCaseDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStandardToast } from "@/components/shared/useStandardToast";
import FilingWorkflowPanel from "@/components/case/FilingWorkflowPanel";
import OrderTreasurerPanel from "@/components/case/OrderTreasurerPanel";
import AgreementPanel from "@/components/case/AgreementPanel";
import AgentAssistPanel from "@/components/case/AgentAssistPanel";
import PacketReadinessPanel from "@/components/case/PacketReadinessPanel";
import { usePortalLink } from "@/components/shared/usePortalLink";
import SendEmailPanel from "@/components/case/SendEmailPanel";
import PreCallAssistPanel from "@/components/case/PreCallAssistPanel";
import CallScriptModal from "@/components/case/CallScriptModal";
import AutoFilingPacketGenerator from "@/components/case/AutoFilingPacketGenerator";
import ContactLogger from "@/components/case/ContactLogger";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";
import { CASE_STAGES, STAGE_LABELS, STAGE_COLORS } from "@/components/shared/caseConstants";

const stageConfig = {
  imported: { label: "Imported", color: "bg-slate-500" },
  agreement_signed: { label: "Agreement Signed", color: "bg-blue-500" },
  info_completed: { label: "Info Completed", color: "bg-indigo-500" },
  notary_completed: { label: "Notary Completed", color: "bg-purple-500" },
  packet_ready: { label: "Packet Ready", color: "bg-amber-500" },
  filed: { label: "Filed", color: "bg-emerald-500" },
  approved: { label: "Approved", color: "bg-green-500" },
  paid: { label: "Paid", color: "bg-teal-500" },
  closed: { label: "Closed", color: "bg-slate-400" },
};

const stages = ["imported", "agreement_signed", "info_completed", "notary_completed", "packet_ready", "filed", "approved", "paid", "closed"];

export default function CaseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get("id");
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [viewingPdf, setViewingPdf] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  // [NEW - Tier 2]
  const [showCallScript, setShowCallScript] = useState(false);

  const queryClient = useQueryClient();
  const toast = useStandardToast();
  const { generateAndSend, isLoading: sendingPortal, fallbackData, clearFallback } = usePortalLink();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => base44.entities.Case.filter({ id: caseId }),
    enabled: !!caseId,
    select: (data) => data[0],
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", caseId],
    queryFn: () => base44.entities.Document.filter({ case_id: caseId }),
    enabled: !!caseId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", caseId],
    queryFn: () => base44.entities.ActivityLog.filter({ case_id: caseId }, "-created_date"),
    enabled: !!caseId,
  });

  const { data: county } = useQuery({
    queryKey: ["caseCounty", caseData?.county, caseData?.state],
    queryFn: async () => {
      if (!caseData?.county) return null;
      const counties = await base44.entities.County.filter({ 
        name: caseData.county,
        state: caseData.state 
      });
      return counties[0] || null;
    },
    enabled: !!caseData?.county && !!caseData?.state,
    staleTime: 300000, // Cache county profiles for 5 minutes
    cacheTime: 600000,
  });

  // [MODIFIED - Portal Invite] Fetch PortalUser for last login
  const { data: portalUser } = useQuery({
    queryKey: ["portalUser", caseData?.owner_email],
    queryFn: async () => {
      if (!caseData?.owner_email) return null;
      const users = await base44.entities.PortalUser.filter({ email: caseData.owner_email });
      return users[0] || null;
    },
    enabled: !!caseData?.owner_email,
  });

  const updateCase = useMutation({
    mutationFn: (data) => base44.entities.Case.update(caseId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case", caseId] }),
  });

  React.useEffect(() => {
    if (caseData?.internal_notes) {
      setNotes(caseData.internal_notes);
    }
  }, [caseData?.internal_notes]);

  const saveNotes = () => {
    updateCase.mutate({ internal_notes: notes });
  };

  const getCurrentStageIndex = () => {
    return stages.indexOf(caseData?.stage || "imported");
  };

  if (isLoading) {
    return <LoadingState message="Loading case details..." />;
  }

  if (!caseData) {
    return (
      <EmptyState
        icon={FileText}
        title="Case not found"
        description="The case you're looking for doesn't exist or has been deleted"
        action={() => window.location.href = createPageUrl("Cases")}
        actionLabel="Back to Cases"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-2 sm:gap-4">
          <Link to={createPageUrl("Cases")}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{caseData.owner_name}</h1>
              {caseData.is_hot && (
                <Badge className="bg-orange-100 text-orange-700 border-0">
                  <Flame className="w-3 h-3 mr-1" /> Hot Case
                </Badge>
              )}
              {/* Surplus type badge */}
              {caseData.surplus_type === "tax_sale" && (
                <Badge className="bg-green-100 text-green-700 border-0">🏛 Tax Sale</Badge>
              )}
              {caseData.surplus_type === "sheriff_sale" && (
                <Badge className="bg-blue-100 text-blue-700 border-0">⚖️ Sheriff Sale</Badge>
              )}
              {/* ADDED: Verification status badge */}
              {caseData.verification_status && caseData.verification_status !== "pending" && (
                <Badge className={`border-0 ${
                  caseData.verification_status === "green" ? "bg-emerald-100 text-emerald-700" :
                  caseData.verification_status === "yellow" ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {caseData.verification_status === "green" ? "✓ Verified" :
                   caseData.verification_status === "yellow" ? "⚠ Review" :
                   "✗ Issues"}
                </Badge>
              )}
              {/* ADDED: Owner confidence indicator */}
              {caseData.owner_confidence && caseData.owner_confidence !== "unknown" && (
                <Badge variant="outline" className={
                  caseData.owner_confidence === "high" ? "border-emerald-500 text-emerald-700" :
                  caseData.owner_confidence === "medium" ? "border-amber-500 text-amber-700" :
                  "border-slate-400 text-slate-600"
                }>
                  Owner: {caseData.owner_confidence}
                </Badge>
              )}
            </div>
            <p className="text-slate-500 mt-1">
              {caseData.case_number} • {caseData.county}, {caseData.state}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ADDED: Import RunVerificationButton component at top */}
          <RunVerificationButton caseId={caseId} />

          <Button 
            variant="outline"
            onClick={async () => {
              if (!caseData?.owner_email) {
                toast.error("Please add owner email first");
                return;
              }
              try {
                const { data } = await base44.functions.invoke("generatePortalLink", {
                  case_id: caseId
                });
                if (data.success || data.status === 'success') {
                  queryClient.invalidateQueries({ queryKey: ["case", caseId] });
                  queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
                  if (data.email_sent) {
                    toast.success("Portal link emailed to homeowner");
                  } else {
                    const email = data.email_content || {};
                    const mailto = `mailto:${encodeURIComponent(email.to || '')}?subject=${encodeURIComponent(email.subject || '')}&body=${encodeURIComponent(email.body || '')}`;
                    window.location.href = mailto;
                    toast.success("Opening email client...");
                  }
                } else {
                  toast.error(data.details || "Failed to generate portal link");
                }
              } catch (err) {
                toast.error("Error: " + err.message);
              }
            }}
          >
            <Send className="w-4 h-4 mr-2" /> Send Portal Invite
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>Edit Case</DropdownMenuItem>
              <DropdownMenuItem>Regenerate Packet</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Archive Case</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border flex-wrap h-auto">
          <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
            <User className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="homeowner" className="gap-2">
            <User className="w-4 h-4" /> Homeowner Info
          </TabsTrigger>
          {/* People Finder merged into Homeowner tab */}
          <TabsTrigger value="notary" className="gap-2">
            <Shield className="w-4 h-4" /> Notary
          </TabsTrigger>
          {/* Packet merged into Documents tab */}
          <TabsTrigger value="filing" className="gap-2">
            <FileCheck className="w-4 h-4" /> Filing & Court
          </TabsTrigger>
          {/* ADDED Verification tab */}
          <TabsTrigger value="verification" className="gap-2">
            <Target className="w-4 h-4" /> Verification
          </TabsTrigger>
          <TabsTrigger value="county" className="gap-2">
            <MapPin className="w-4 h-4" /> County Profile
          </TabsTrigger>
          <TabsTrigger value="communications" className="gap-2">
            <Mail className="w-4 h-4" /> Communications
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" /> Activity Log
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* [NEW - Tier 2] Pre-Call Assistant Panel */}
            <div className="lg:col-span-2">
              <PreCallAssistPanel 
                caseData={caseData} 
                county={county}
                onOpenScript={() => setShowCallScript(true)}
              />
            </div>

            {/* Agent Assist Panel - Moved to right column */}
            <div>
              <AgentAssistPanel caseData={caseData} />
            </div>

            {/* Case Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Case Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-slate-500">Case Number</p>
                    <p className="font-semibold mt-1">{caseData.case_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Surplus Type</p>
                    <div className="mt-1">
                      {caseData.surplus_type === "tax_sale" && <Badge className="bg-green-100 text-green-700 border-0">🏛 Tax Sale</Badge>}
                      {caseData.surplus_type === "sheriff_sale" && <Badge className="bg-blue-100 text-blue-700 border-0">⚖️ Sheriff Sale</Badge>}
                      {!caseData.surplus_type && <span className="text-slate-400 text-sm">Not set</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">County</p>
                    <p className="font-semibold mt-1">{caseData.county}, {caseData.state}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Property Address</p>
                    <p className="font-semibold mt-1">{caseData.property_address || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Surplus Amount</p>
                    <p className="font-bold text-xl text-emerald-600 mt-1">
                      ${caseData.surplus_amount?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Sale Date</p>
                    <p className="font-semibold mt-1">
                      {caseData.sale_date ? format(new Date(caseData.sale_date), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Sale Amount</p>
                    <p className="font-semibold mt-1">
                      {caseData.sale_amount ? `$${caseData.sale_amount.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Judgment Amount</p>
                    <p className="font-semibold mt-1">
                      {caseData.judgment_amount ? `$${caseData.judgment_amount.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <p className="font-semibold mt-1 capitalize">{caseData.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Logger */}
            <ContactLogger caseId={caseId} caseData={caseData} />

            {/* Internal Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this case..."
                  rows={6}
                  className="resize-none"
                />
                <Button
                  onClick={saveNotes}
                  disabled={updateCase.isPending}
                  className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Save Notes
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Missing Data Warnings */}
          {(!caseData.owner_email || !caseData.owner_phone || !caseData.surplus_amount) && (
            <div className="flex flex-wrap gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-xs font-semibold text-amber-700 w-full">⚠ Missing Data:</span>
              {!caseData.owner_email && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">No Email</Badge>}
              {!caseData.owner_phone && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">No Phone</Badge>}
              {!caseData.surplus_amount && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">No Surplus Amount</Badge>}
              {!caseData.property_address && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">No Property Address</Badge>}
            </div>
          )}

          {/* Pipeline Timeline — clickable */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pipeline Progress
                <span className="text-xs font-normal text-slate-500">(click a stage to advance)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="flex justify-between">
                  {stages.map((stage, index) => {
                    const isComplete = index <= getCurrentStageIndex();
                    const isCurrent = index === getCurrentStageIndex();
                    return (
                      <div
                        key={stage}
                        className="flex flex-col items-center flex-1 cursor-pointer group"
                        onClick={() => {
                          if (index !== getCurrentStageIndex()) {
                            updateCase.mutate({ stage });
                          }
                        }}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                          isComplete ? stageConfig[stage].color : "bg-slate-200"
                        }`}>
                          {isComplete ? (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <p className={`text-xs mt-2 text-center ${isCurrent ? "font-semibold text-slate-900" : "text-slate-500 group-hover:text-slate-700"}`}>
                          {stageConfig[stage].label}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {/* Progress bar */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-10">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${(getCurrentStageIndex() / (stages.length - 1)) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents & Packet Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button size="sm">
                <Upload className="w-4 h-4 mr-2" /> Upload
              </Button>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="divide-y">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-slate-500 capitalize">{doc.category.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.is_primary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setViewingPdf({ url: doc.file_url, title: doc.name });
                            setShowPdfViewer(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <a href={doc.file_url} download>
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500"
                          onClick={async () => {
                            if (window.confirm("Delete this document?")) {
                              try {
                                await base44.entities.Document.delete(doc.id);
                                queryClient.invalidateQueries({ queryKey: ["documents", caseId] });
                                toast.success("Document deleted");
                              } catch (error) {
                                console.error("Error deleting document:", error);
                                toast.error("Failed to delete document");
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="space-y-6">
            <PacketReadinessPanel caseData={caseData} countyData={county} />
            {/* [NEW - Tier 3] Auto Filing Packet Generator */}
            <AutoFilingPacketGenerator caseData={caseData} countyData={county} />
          </div>
        </TabsContent>

        {/* Contacts & People (merged) */}
        <TabsContent value="homeowner" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* ADDED: Agreement Panel */}
              <AgreementPanel caseId={caseId} caseData={caseData} />

              {/* [MODIFIED - Portal Invite] */}
            <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Homeowner Information</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!caseData?.owner_email) {
                    toast.error("Please add owner email first");
                    return;
                  }
                  try {
                    const { data } = await base44.functions.invoke("generatePortalLink", {
                      case_id: caseId
                    });
                    if (data.success || data.status === 'success') {
                      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
                      if (data.email_sent) {
                        toast.success("Portal link emailed to homeowner");
                      } else {
                        const email = data.email_content || {};
                        const mailto = `mailto:${encodeURIComponent(email.to || '')}?subject=${encodeURIComponent(email.subject || '')}&body=${encodeURIComponent(email.body || '')}`;
                        window.location.href = mailto;
                        toast.success("Opening email client...");
                      }
                    }
                  } catch (err) {
                    toast.error("Error: " + err.message);
                  }
                }}
              >
                <Send className="w-4 h-4 mr-2" /> Resend Portal Invite
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500">Full Name</p>
                  <p className="font-semibold mt-1">{caseData.owner_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-semibold mt-1">{caseData.owner_email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-semibold mt-1">{caseData.owner_phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Mailing Address</p>
                  <p className="font-semibold mt-1">{caseData.owner_address || "—"}</p>
                </div>
              </div>

              {/* ID Photos */}
              <div className="mt-8">
                <h3 className="font-semibold mb-4">ID Documents</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-2">ID Front</p>
                    {caseData.id_front_url ? (
                      <img src={caseData.id_front_url} alt="ID Front" className="rounded-lg w-full" />
                    ) : (
                      <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        Not uploaded
                      </div>
                    )}
                  </div>
                  <div className="border rounded-xl p-4">
                    <p className="text-sm text-slate-500 mb-2">ID Back</p>
                    {caseData.id_back_url ? (
                      <img src={caseData.id_back_url} alt="ID Back" className="rounded-lg w-full" />
                    ) : (
                      <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        Not uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* [MODIFIED - Portal Invite] Portal Access */}
              <div className="mt-8 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">Portal Access</p>
                  {caseData.portal_access_code && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (window.confirm("Regenerate access code? The old code will no longer work.")) {
                          try {
                            const { data } = await base44.functions.invoke("generatePortalLink", {
                              case_id: caseId
                            });
                            if (data.success || data.status === 'success') {
                              queryClient.invalidateQueries({ queryKey: ["case", caseId] });
                              if (data.email_sent) {
                                toast.success("New code generated, portal link emailed");
                              } else {
                                const email = data.email_content || {};
                                const mailto = `mailto:${encodeURIComponent(email.to || '')}?subject=${encodeURIComponent(email.subject || '')}&body=${encodeURIComponent(email.body || '')}`;
                                window.location.href = mailto;
                                toast.success("New code generated, opening email...");
                              }
                            }
                          } catch (err) {
                            toast.error("Error: " + err.message);
                          }
                        }
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                    </Button>
                  )}
                </div>
                
                {caseData.portal_access_code ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="text-sm text-slate-500">Access Code:</span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-lg tracking-wider">
                          {caseData.portal_access_code}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(caseData.portal_access_code);
                            toast.success("Code copied!");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Status:</span>
                      <Badge className={caseData.portal_code_used 
                        ? "bg-green-100 text-green-700 border-0" 
                        : "bg-amber-100 text-amber-700 border-0"
                      }>
                        {caseData.portal_code_used ? "✓ Used" : "⏳ Unused"}
                      </Badge>
                    </div>
                    {caseData.portal_code_used_at && (
                      <p className="text-xs text-slate-500">
                        Code used: {format(new Date(caseData.portal_code_used_at), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                    {caseData.portal_code_generated_at && (
                      <p className="text-xs text-slate-500">
                        Generated: {format(new Date(caseData.portal_code_generated_at), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                    {portalUser?.last_login_at && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm text-emerald-600 font-medium">
                          ✓ Account active • Last login: {format(new Date(portalUser.last_login_at), "MMM d, yyyy h:mm a")}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Total logins: {portalUser.login_count || 0}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No access code generated yet. Click "Send Portal Invite" to create one.
                  </p>
                )}</div>
            </CardContent>
          </Card>
            </div>
            <div>
              <OutreachPanel caseId={caseId} caseData={caseData} />
            </div>
          </div>
          <PeopleFinderTab caseId={caseId} caseData={caseData} />
        </TabsContent>

        {/* People Finder now shown inside Homeowner tab below */}

        {/* Notary Tab */}
        <TabsContent value="notary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notary Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500">Notary Type</p>
                  <p className="font-semibold mt-1 capitalize">{caseData.notary_type || "Pending Selection"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={`mt-1 ${
                    caseData.notary_status === "approved" ? "bg-green-100 text-green-700" :
                    caseData.notary_status === "validated" ? "bg-blue-100 text-blue-700" :
                    caseData.notary_status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {caseData.notary_status?.replace(/_/g, " ") || "Pending"}
                  </Badge>
                </div>
              </div>

              {caseData.notary_type === "in_person" && (
                <div className="mt-8">
                  <h3 className="font-semibold mb-4">In-Person Notary</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-slate-500">Uploaded Photo</p>
                      {caseData.notary_photo_url ? (
                        <img src={caseData.notary_photo_url} alt="Notary" className="mt-2 rounded-lg max-h-48 object-contain" />
                      ) : (
                        <div className="mt-2 h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          Not uploaded
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-500">Notary Name</p>
                        <p className="font-semibold mt-1">{caseData.notary_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Commission #</p>
                        <p className="font-semibold mt-1">{caseData.notary_commission || "—"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Expiration</p>
                        <p className="font-semibold mt-1">
                          {caseData.notary_expiration 
                            ? format(new Date(caseData.notary_expiration), "MMM d, yyyy")
                            : "—"
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Notary Date</p>
                        <p className="font-semibold mt-1">
                          {caseData.notary_date 
                            ? format(new Date(caseData.notary_date), "MMM d, yyyy")
                            : "—"
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" /> Request Re-Upload
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Notary Page
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        {/* Filing & Court Tab */}
        <TabsContent value="filing" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <FilingWorkflowPanel caseId={caseId} caseData={caseData} />
            {/* ADDED: Order & Treasurer Panel */}
            {caseData.filing_status === 'order_phase' || caseData.filing_status === 'treasurer_phase' || caseData.filing_status === 'completed' ? (
              <OrderTreasurerPanel caseId={caseId} caseData={caseData} />
            ) : null}
          </div>
        </TabsContent>

        {/* ADDED Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <VerificationTab caseId={caseId} caseData={caseData} />
        </TabsContent>



        {/* County Profile Tab */}
        <TabsContent value="county" className="space-y-4">
          {!caseData?.county || !caseData?.state || !county ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-slate-500">
                    {!caseData?.county || !caseData?.state 
                      ? "County information not available for this case" 
                      : "Loading county profile..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>County Filing Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CountyProfileView county={county} />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <DocumentGeneratorPanel caseId={caseId} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SendEmailPanel caseId={caseId} caseData={caseData} />
            </div>
            <div>
              <OutreachPanel caseId={caseId} caseData={caseData} />
            </div>
          </div>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No activity recorded yet
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 pb-4 border-b last:border-0">
                        <p className="font-medium">{activity.action}</p>
                        {activity.description && (
                          <p className="text-sm text-slate-500 mt-0.5">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {format(new Date(activity.created_date), "MMM d, yyyy h:mm a")}
                          {activity.performed_by && (
                            <>
                              <span>•</span>
                              <span>{activity.performed_by}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PDF Viewer Dialog */}
      <PDFViewerDialog
        open={showPdfViewer}
        onClose={() => {
          setShowPdfViewer(false);
          setViewingPdf(null);
        }}
        pdfUrl={viewingPdf?.url}
        title={viewingPdf?.title || "Document Viewer"}
      />

      {/* Edit Case Dialog */}
      {caseData && (
        <EditCaseDialog
          caseData={caseData}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}

      {/* [NEW - Tier 2] Call Script Modal */}
      <CallScriptModal
        open={showCallScript}
        onClose={() => setShowCallScript(false)}
        caseData={caseData}
        county={county}
      />


      </div>
      );
      }