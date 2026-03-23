import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  FileText,
  Upload,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Edit2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CountyForm from "@/components/counties/CountyForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStandardToast } from "@/components/shared/useStandardToast";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";

const filingMethodColors = {
  mail: "bg-blue-500/10 text-blue-400",
  efile: "bg-purple-500/10 text-purple-400",
  in_person: "bg-amber-500/10 text-amber-400",
};

const notaryTypeLabels = {
  wet: "Wet Ink Only",
  ron: "Remote Online Notary (RON)",
  either: "Either Type Accepted",
};

export default function CountyDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const countyId = urlParams.get("id");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const { data: county, isLoading } = useQuery({
    queryKey: ["county", countyId],
    queryFn: () => base44.entities.County.filter({ id: countyId }),
    enabled: !!countyId,
    select: (data) => data[0],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // First upload the file to get a URL
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Then process it
      const { data } = await base44.functions.invoke("uploadCountyPacket", {
        county_id: countyId,
        file_url
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["county", countyId] });
      setShowUploadDialog(false);
      setUploadFile(null);
      toast.success(`${data.forms_created || 0} forms uploaded successfully`);
    },
    onError: (error) => {
      toast.error("Upload failed: " + (error.response?.data?.details || error.message));
    }
  });

  const handleUpload = () => {
    if (!uploadFile) {
      toast.warning("Please select a file");
      return;
    }
    uploadMutation.mutate(uploadFile);
  };

  if (isLoading) {
    return <LoadingState message="Loading county details..." />;
  }

  if (!county) {
    return (
      <EmptyState
        icon={Building2}
        title="County not found"
        description="The county you're looking for doesn't exist"
        action={() => window.location.href = createPageUrl("Counties")}
        actionLabel="Back to Counties"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link to={createPageUrl("Counties")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{county.name} County</h1>
                <p className="text-slate-500">{county.state}</p>
              </div>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={() => setShowEditDialog(true)}>
          <Edit2 className="w-4 h-4 mr-2" /> Edit County
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Clerk Email</p>
                    <p className="font-medium">{county.clerk_email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Clerk Phone</p>
                    <p className="font-medium">{county.clerk_phone || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Filing Address</p>
                  <p className="font-medium whitespace-pre-line">{county.filing_address || "—"}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {county.surplus_website && (
                  <a
                    href={county.surplus_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors"
                  >
                    <Globe className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Surplus Website</p>
                      <p className="text-xs text-slate-400 truncate">{county.surplus_website}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                )}
                {county.efile_portal && (
                  <a
                    href={county.efile_portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors"
                  >
                    <Globe className="w-5 h-5 text-purple-400" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">E-File Portal</p>
                      <p className="text-xs text-slate-400 truncate">{county.efile_portal}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Filing Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2 p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-medium" title="Can an agent file the surplus claim directly with the county, or must the property owner file in person?">Agent Files Directly</span>
                    {county.rep_allowed || county.allows_filing_on_behalf ? (
                      <Badge className="bg-green-500/10 text-green-400 gap-1">
                        <CheckCircle className="w-3 h-3" /> Yes — Agent can file
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-400 gap-1">
                        <XCircle className="w-3 h-3" /> Owner files personally
                      </Badge>
                    )}
                  </div>
                  {!county.rep_allowed && !county.allows_filing_on_behalf && (
                    <p className="text-xs text-slate-400">Note: This county requires the property owner to file the claim personally. Your role is to prepare all documents, guide the owner through the process, and ensure all requirements are met. You still earn your fee per the agreement.</p>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <span className="font-medium" title="Does the county accept an assignment agreement where the owner transfers their right to surplus to the agent?">Assignment of Rights</span>
                  {county.assignment_required ? (
                    <Badge className="bg-amber-500/10 text-amber-400 gap-1">
                      <CheckCircle className="w-3 h-3" /> Required
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-700 text-slate-400 gap-1">
                      <XCircle className="w-3 h-3" /> Not Required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <span className="font-medium">Notary Required</span>
                  {county.notary_required ? (
                    <Badge className="bg-amber-500/10 text-amber-400 gap-1">
                      <CheckCircle className="w-3 h-3" /> Required
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-700 text-slate-400 gap-1">
                      <XCircle className="w-3 h-3" /> Not Required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <span className="font-medium">Notary Type</span>
                  <span className="text-slate-600">{notaryTypeLabels[county.notary_type] || "—"}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Filing Method</span>
                  <Badge className={`${filingMethodColors[county.filing_method]} capitalize`}>
                    {county.filing_method?.replace(/_/g, " ") || "—"}
                  </Badge>
                </div>
              </div>

              {county.processing_timeline && (
                <div className="mt-6 p-4 bg-blue-500/10 rounded-xl">
                  <p className="text-sm text-blue-400 font-medium">Processing Timeline</p>
                  <p className="text-blue-300 mt-1">{county.processing_timeline}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Special Notes */}
          {county.special_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Special Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-line">{county.special_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Form Library */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormItem 
                label="Claim Form" 
                url={county.claim_form_url}
              />
              <FormItem 
                label="Affidavit Template" 
                url={county.affidavit_url}
              />
              <FormItem 
                label="Assignment Template" 
                url={county.assignment_url}
              />
              <FormItem 
                label="Instructions" 
                url={county.instruction_url}
              />
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowUploadDialog(true)}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit County</DialogTitle>
          </DialogHeader>
          <CountyForm 
            county={county}
            onSuccess={() => {
              setShowEditDialog(false);
              queryClient.invalidateQueries({ queryKey: ["county", countyId] });
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload County Form Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Select PDF or ZIP file</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.zip"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                Upload a single PDF or ZIP containing multiple county forms
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadFile(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!uploadFile || uploadMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormItem({ label, url }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <FileText className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </a>
      ) : (
        <span className="text-xs text-slate-400">Not uploaded</span>
      )}
    </div>
  );
}