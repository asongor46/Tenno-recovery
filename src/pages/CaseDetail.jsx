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
import OutreachPanel from "@/components/case/OutreachPanel";

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

  const queryClient = useQueryClient();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => base44.entities.Case.filter({ id: caseId }),
    enabled: !!caseId,
    select: (data) => data[0],
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
    queryKey: ["caseCounty", caseId],
    queryFn: async () => {
      if (!caseData?.county) return null;
      const counties = await base44.entities.County.filter({ 
        name: caseData.county,
        state: caseData.state 
      });
      return counties[0];
    },
    enabled: !!caseData?.county,
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Case not found</p>
        <Link to={createPageUrl("Cases")}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cases
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link to={createPageUrl("Cases")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{caseData.owner_name}</h1>
              {caseData.is_hot && (
                <Badge className="bg-orange-100 text-orange-700 border-0">
                  <Flame className="w-3 h-3 mr-1" /> Hot Case
                </Badge>
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

        <div className="flex items-center gap-2">
          {/* ADDED: Import RunVerificationButton component at top */}
          <RunVerificationButton caseId={caseId} />
          {/* ADDED: AI Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <Sparkles className="w-4 h-4 text-purple-600" />
                AI Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={async () => {
                  const { data } = await base44.functions.invoke("aiCaseAutomation", {
                    case_id: caseId,
                    action_type: "link_related_cases"
                  });
                  alert(`Found ${data.result.related_cases?.length || 0} related case(s)`);
                  queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
                }}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Find Related Cases
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={async () => {
                  const { data } = await base44.functions.invoke("aiCaseAutomation", {
                    case_id: caseId,
                    action_type: "suggest_next_steps"
                  });
                  alert(`Generated ${data.result.next_steps?.length || 0} suggested action(s)`);
                  queryClient.invalidateQueries({ queryKey: ["todos", caseId] });
                  queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
                }}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Suggest Next Steps
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={async () => {
                  const { data } = await base44.functions.invoke("aiCaseAutomation", {
                    case_id: caseId,
                    action_type: "generate_correspondence"
                  });
                  alert(`Generated correspondence:\n\nSubject: ${data.result.correspondence?.email_subject}\n\n${data.result.correspondence?.email_body?.substring(0, 200)}...`);
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Generate Correspondence
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={async () => {
                  const { data } = await base44.functions.invoke("aiCaseAutomation", {
                    case_id: caseId,
                    action_type: "all"
                  });
                  alert(`AI Automation Complete!\n\n- Related Cases: ${data.result.related_cases?.length || 0}\n- Next Steps: ${data.result.next_steps?.length || 0}\n- Correspondence Generated: Yes`);
                  queryClient.invalidateQueries();
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Run All AI Automations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline"
            onClick={async () => {
              const { data } = await base44.functions.invoke("generatePortalLink", {
                case_id: caseId,
                send_email: true
              });
              if (data.status === 'success') {
                alert("Portal link sent!");
                queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
              }
            }}
          >
            <Send className="w-4 h-4 mr-2" /> Send Portal Link
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
              <DropdownMenuItem>Edit Case</DropdownMenuItem>
              <DropdownMenuItem>Regenerate Packet</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Archive Case</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="overview" className="gap-2">
            <User className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="homeowner" className="gap-2">
            <User className="w-4 h-4" /> Homeowner Info
          </TabsTrigger>
          {/* ADDED People Finder tab */}
          <TabsTrigger value="peoplefinder" className="gap-2">
            <Users className="w-4 h-4" /> People Finder
          </TabsTrigger>
          <TabsTrigger value="notary" className="gap-2">
            <Shield className="w-4 h-4" /> Notary
          </TabsTrigger>
          <TabsTrigger value="packet" className="gap-2">
            <Package className="w-4 h-4" /> Packet
          </TabsTrigger>
          {/* ADDED Verification tab */}
          <TabsTrigger value="verification" className="gap-2">
            <Target className="w-4 h-4" /> Verification
          </TabsTrigger>
          <TabsTrigger value="county" className="gap-2">
            <MapPin className="w-4 h-4" /> County Profile
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" /> Activity Log
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
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

          {/* Pipeline Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="flex justify-between">
                  {stages.map((stage, index) => {
                    const isComplete = index <= getCurrentStageIndex();
                    const isCurrent = index === getCurrentStageIndex();
                    return (
                      <div key={stage} className="flex flex-col items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isComplete ? stageConfig[stage].color : "bg-slate-200"
                        }`}>
                          {isComplete ? (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <p className={`text-xs mt-2 text-center ${isCurrent ? "font-semibold text-slate-900" : "text-slate-500"}`}>
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

        {/* Documents Tab */}
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
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Homeowner Info Tab */}
        <TabsContent value="homeowner" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Homeowner Information</CardTitle>
              <Button variant="outline" size="sm">
                <Send className="w-4 h-4 mr-2" /> Resend Portal Link
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

              {/* Portal Access */}
              <div className="mt-8 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Portal Access</p>
                    <p className="text-sm text-slate-500">
                      Last accessed: {caseData.portal_last_accessed 
                        ? format(new Date(caseData.portal_last_accessed), "MMM d, yyyy h:mm a")
                        : "Never"
                      }
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" /> View Portal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
            <div>
              <OutreachPanel caseId={caseId} caseData={caseData} />
            </div>
          </div>
        </TabsContent>

        {/* ADDED People Finder Tab */}
        <TabsContent value="peoplefinder" className="space-y-4">
          <PeopleFinderTab caseId={caseId} caseData={caseData} />
        </TabsContent>

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

        {/* Packet Tab */}
        <TabsContent value="packet" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Filing Packet</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                </Button>
                {caseData.packet_url && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {caseData.packet_url ? (
                <div>
                  <div className="bg-slate-100 rounded-xl p-8 text-center">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="font-medium">Packet Generated</p>
                    <p className="text-sm text-slate-500">
                      {caseData.packet_generated_at 
                        ? format(new Date(caseData.packet_generated_at), "MMM d, yyyy h:mm a")
                        : ""
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Packet not yet generated</p>
                  <p className="text-sm text-slate-400 mt-1">Complete all required steps first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADDED Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <VerificationTab caseId={caseId} caseData={caseData} />
        </TabsContent>

        {/* County Profile Tab */}
        <TabsContent value="county" className="space-y-4">
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
    </div>
  );
}