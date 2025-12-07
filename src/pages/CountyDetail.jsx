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

const filingMethodColors = {
  mail: "bg-blue-100 text-blue-700",
  efile: "bg-purple-100 text-purple-700",
  in_person: "bg-amber-100 text-amber-700",
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

  const queryClient = useQueryClient();

  const { data: county, isLoading } = useQuery({
    queryKey: ["county", countyId],
    queryFn: () => base44.entities.County.filter({ id: countyId }),
    enabled: !!countyId,
    select: (data) => data[0],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!county) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">County not found</p>
        <Link to={createPageUrl("Counties")}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Counties
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
                <h1 className="text-2xl font-bold text-slate-900">{county.name} County</h1>
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
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Clerk Email</p>
                    <p className="font-medium">{county.clerk_email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Clerk Phone</p>
                    <p className="font-medium">{county.clerk_phone || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-slate-500" />
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
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Globe className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Surplus Website</p>
                      <p className="text-xs text-slate-500 truncate">{county.surplus_website}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                )}
                {county.efile_portal && (
                  <a
                    href={county.efile_portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Globe className="w-5 h-5 text-purple-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">E-File Portal</p>
                      <p className="text-xs text-slate-500 truncate">{county.efile_portal}</p>
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
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-medium">Representative Filing</span>
                  {county.rep_allowed ? (
                    <Badge className="bg-green-100 text-green-700 gap-1">
                      <CheckCircle className="w-3 h-3" /> Allowed
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 gap-1">
                      <XCircle className="w-3 h-3" /> Not Allowed
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-medium">Assignment Required</span>
                  {county.assignment_required ? (
                    <Badge className="bg-amber-100 text-amber-700 gap-1">
                      <CheckCircle className="w-3 h-3" /> Required
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 gap-1">
                      <XCircle className="w-3 h-3" /> Not Required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-medium">Notary Required</span>
                  {county.notary_required ? (
                    <Badge className="bg-amber-100 text-amber-700 gap-1">
                      <CheckCircle className="w-3 h-3" /> Required
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 gap-1">
                      <XCircle className="w-3 h-3" /> Not Required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="font-medium">Notary Type</span>
                  <span className="text-slate-600">{notaryTypeLabels[county.notary_type] || "—"}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Filing Method</span>
                  <Badge className={`${filingMethodColors[county.filing_method]} capitalize`}>
                    {county.filing_method?.replace(/_/g, " ") || "—"}
                  </Badge>
                </div>
              </div>

              {county.processing_timeline && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600 font-medium">Processing Timeline</p>
                  <p className="text-blue-800 mt-1">{county.processing_timeline}</p>
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
                <Button variant="outline" className="w-full">
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
    </div>
  );
}

function FormItem({ label, url }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
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