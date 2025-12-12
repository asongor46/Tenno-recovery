import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download } from "lucide-react";

/**
 * Form Preview Dialog
 * Shows form details, field mappings, and preview
 */
export default function FormPreviewDialog({ form, open, onClose }) {
  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.form_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Form Type</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {form.form_type?.replace(/_/g, " ")}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-slate-500">Form Set</p>
              <p className="font-medium mt-1">{form.form_set_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Requires Notary</p>
              <p className="font-medium mt-1">{form.requires_notary ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Fillable</p>
              <p className="font-medium mt-1">{form.is_fillable ? "Yes" : "No"}</p>
            </div>
          </div>

          {/* Field Mappings */}
          {form.field_mappings && Object.keys(form.field_mappings).length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3">Field Mappings</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(form.field_mappings).map(([pdfField, caseField]) => (
                  <div key={pdfField} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm">{pdfField}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {caseField}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Locations */}
          {form.signature_locations && form.signature_locations.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3">Signature Requirements</h3>
              <div className="space-y-1">
                {form.signature_locations.map((sig, idx) => (
                  <div key={idx} className="text-sm flex items-center gap-2">
                    <Badge className="text-xs capitalize">{sig.type}</Badge>
                    <span className="text-slate-600">{sig.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {form.instructions && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Instructions</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {form.instructions}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.open(form.file_url, '_blank')}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Original PDF
            </Button>
            {form.generated_fillable_url && (
              <Button
                onClick={() => window.open(form.generated_fillable_url, '_blank')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Fillable Version
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}