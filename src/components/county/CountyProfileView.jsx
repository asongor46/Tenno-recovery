import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2, XCircle, Mail, Phone, MapPin, Globe, FileText,
  AlertCircle, Clock, Shield, Download, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function CountyProfileView({ county }) {
  const { data: countyForms = [] } = useQuery({
    queryKey: ["countyFormTemplates", county?.id],
    queryFn: async () => {
      if (!county?.id) return [];
      try {
        return await base44.entities.CountyFormTemplate.filter({ county_id: county.id, is_active: true }, 'order');
      } catch (error) {
        return [];
      }
    },
    enabled: !!county?.id,
  });

  if (!county) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-white">
          {county.name} County, {county.state}
        </h2>
        {county.special_notes && (
          <div className="flex items-start gap-2 mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">{county.special_notes}</p>
          </div>
        )}
      </div>

      {/* Clerk Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Clerk Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Clerk Name</p>
              <p className="font-semibold text-slate-100">{county.clerk_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Filing Address</p>
              <p className="font-semibold text-slate-100">{county.filing_address || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-semibold text-slate-100">{county.clerk_email || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-semibold text-slate-100">{county.clerk_phone || "—"}</p>
            </div>
          </div>

          {(county.surplus_website || county.efile_portal) && (
            <div className="pt-3 border-t border-slate-700 space-y-2">
              {county.surplus_website && (
                <a href={county.surplus_website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:underline">
                  <Globe className="w-4 h-4" /> Surplus Info Website
                </a>
              )}
              {county.efile_portal && (
                <a href={county.efile_portal} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:underline">
                  <Globe className="w-4 h-4" /> E-Filing Portal
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filing Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Filing Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Agent Files Directly</span>
                {county.rep_allowed || county.allows_filing_on_behalf ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              {!county.rep_allowed && !county.allows_filing_on_behalf && (
                <p className="text-xs text-amber-400">Owner must file personally — you prepare documents</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Assignment Required</span>
                {county.assignment_required ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Notarization Required</span>
                {county.notary_required ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-600" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Filing Method</p>
                <Badge className="mt-1 capitalize">{county.filing_method || "mail"}</Badge>
              </div>
              {county.notary_required && (
                <>
                  <div>
                    <p className="text-sm text-slate-500">Accepted Notary Type</p>
                    <Badge variant="outline" className="mt-1 capitalize border-slate-600 text-slate-300">
                      {county.notary_type || "either"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Notary Format</p>
                    <Badge variant="outline" className="mt-1 capitalize border-slate-600 text-slate-300">
                      {county.notary_format || "either"}
                    </Badge>
                  </div>
                  {county.requires_separate_notary_page && (
                    <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/30">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Notary must be on separate page</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline & Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timeline & Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {county.claim_deadline_days && (
            <div>
              <p className="text-sm text-slate-500">Claim Filing Deadline</p>
              <p className="font-semibold text-lg text-red-400">
                {county.claim_deadline_days} days from sale date
              </p>
            </div>
          )}
          {county.processing_timeline && (
            <div>
              <p className="text-sm text-slate-500">Typical Processing Time</p>
              <p className="font-semibold text-slate-100">{county.processing_timeline}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates & Forms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            County Templates & Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {countyForms.length > 0 && (
              <div className="mb-4 pb-4 border-b border-slate-700">
                <p className="text-sm font-medium text-slate-400 mb-2">County Form Packet</p>
                {countyForms.map((form) => (
                  <div key={form.id}
                    className="flex items-center justify-between p-3 border border-slate-700 rounded-lg hover:bg-slate-800/50 mb-2">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-medium text-sm text-slate-100">{form.form_name}</span>
                        <p className="text-xs text-slate-500 capitalize">{form.form_type?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {form.requires_notary && (
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">Notary</Badge>
                      )}
                      <a href={form.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {county.claim_form_url && (
              <a href={county.claim_form_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-slate-700 rounded-lg hover:bg-slate-800/50">
                <span className="font-medium text-slate-100">Claim Form</span>
                <Download className="w-4 h-4 text-slate-400" />
              </a>
            )}
            {county.affidavit_url && (
              <a href={county.affidavit_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-slate-700 rounded-lg hover:bg-slate-800/50">
                <span className="font-medium text-slate-100">Affidavit Template</span>
                <Download className="w-4 h-4 text-slate-400" />
              </a>
            )}
            {county.assignment_url && (
              <a href={county.assignment_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-slate-700 rounded-lg hover:bg-slate-800/50">
                <span className="font-medium text-slate-100">Assignment Form</span>
                <Download className="w-4 h-4 text-slate-400" />
              </a>
            )}
            {county.instruction_url && (
              <a href={county.instruction_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-slate-700 rounded-lg hover:bg-slate-800/50">
                <span className="font-medium text-slate-100">Filing Instructions</span>
                <Download className="w-4 h-4 text-slate-400" />
              </a>
            )}
            {countyForms.length === 0 && !county.claim_form_url && !county.affidavit_url && !county.assignment_url && !county.instruction_url && (
              <p className="text-slate-500 text-center py-4">No templates available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {county.rules_last_updated_at && (
        <div className="text-sm text-slate-500 text-center">
          Rules last updated: {new Date(county.rules_last_updated_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}