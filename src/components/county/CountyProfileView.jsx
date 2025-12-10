import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  AlertCircle,
  Clock,
  Shield,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * County Profile View - Complete county rules and requirements display
 */
export default function CountyProfileView({ county }) {
  if (!county) {
    return (
      <div className="text-center py-12 text-slate-500">
        County information not available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-900">
          {county.name} County, {county.state}
        </h2>
        {county.special_notes && (
          <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{county.special_notes}</p>
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
              <p className="font-semibold">{county.clerk_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Filing Address</p>
              <p className="font-semibold">{county.filing_address || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-semibold">{county.clerk_email || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-semibold">{county.clerk_phone || "—"}</p>
            </div>
          </div>

          {(county.surplus_website || county.efile_portal) && (
            <div className="pt-3 border-t space-y-2">
              {county.surplus_website && (
                <a
                  href={county.surplus_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  Surplus Info Website
                </a>
              )}
              {county.efile_portal && (
                <a
                  href={county.efile_portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  E-Filing Portal
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
                <span className="text-slate-700">Representative Filing Allowed</span>
                {county.rep_allowed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Assignment Required</span>
                {county.assignment_required ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Notarization Required</span>
                {county.notary_required ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Filing Method</p>
                <Badge className="mt-1 capitalize">
                  {county.filing_method || "mail"}
                </Badge>
              </div>
              {county.notary_required && (
                <>
                  <div>
                    <p className="text-sm text-slate-500">Accepted Notary Type</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {county.notary_type || "either"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Notary Format</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {county.notary_format || "either"}
                    </Badge>
                  </div>
                  {county.requires_separate_notary_page && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded">
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
              <p className="font-semibold text-lg text-red-600">
                {county.claim_deadline_days} days from sale date
              </p>
            </div>
          )}
          {county.processing_timeline && (
            <div>
              <p className="text-sm text-slate-500">Typical Processing Time</p>
              <p className="font-semibold">{county.processing_timeline}</p>
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
            {county.claim_form_url && (
              <a
                href={county.claim_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
              >
                <span className="font-medium">Claim Form</span>
                <Download className="w-4 h-4 text-slate-400" />
              </a>
            )}
            {county.affidavit_url && (
              <a
                href={county.affidavit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
              >
                <span className="font-medium">Affidavit Template</span>
                <Download className="w-4 h-4 text-slate-400" />
              </a>
            )}
            {county.assignment_url && (
              <a
                href={county.assignment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
              >
                <span className="font-medium">Assignment Form</span>
                <Download className="w-4 h-4 text-slate-400" />
              </a>
            )}
            {county.instruction_url && (
              <a
                href={county.instruction_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
              >
                <span className="font-medium">Filing Instructions</span>
                <Download className="w-4 h-4 text-slate-400" />
              </a>
            )}
            {!county.claim_form_url && !county.affidavit_url && !county.assignment_url && !county.instruction_url && (
              <p className="text-slate-500 text-center py-4">No templates available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      {county.rules_last_updated_at && (
        <div className="text-sm text-slate-500 text-center">
          Rules last updated: {new Date(county.rules_last_updated_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}