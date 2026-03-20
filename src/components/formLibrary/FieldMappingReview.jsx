import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Edit2, AlertCircle } from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

/**
 * Field Mapping Review Component
 * Allows admins to review and correct AI-extracted field mappings
 */
export default function FieldMappingReview({ formTemplate, onClose }) {
  const [mappings, setMappings] = useState(formTemplate.field_mappings || {});
  const [validationRules, setValidationRules] = useState(formTemplate.validation_rules || {});
  const [editingField, setEditingField] = useState(null);
  
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CountyFormTemplate.update(formTemplate.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formTemplates"] });
      toast.success("Field mappings updated");
      if (onClose) onClose();
    },
    onError: () => toast.error("Failed to update mappings")
  });

  const handleSave = () => {
    updateMutation.mutate({
      field_mappings: mappings,
      validation_rules: validationRules,
      last_verified_at: new Date().toISOString()
    });
  };

  const handleMappingChange = (pdfField, newCaseField) => {
    setMappings(prev => ({
      ...prev,
      [pdfField]: newCaseField
    }));
  };

  const handleRemoveMapping = (pdfField) => {
    setMappings(prev => {
      const updated = { ...prev };
      delete updated[pdfField];
      return updated;
    });
  };

  const availableCaseFields = [
    "owner_name", "owner_email", "owner_phone", "owner_address",
    "property_address", "county", "state", "parcel_number",
    "surplus_amount", "sale_date", "sale_amount", "judgment_amount",
    "case_number", "fee_percent"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Review Field Mappings for {formTemplate.form_name}
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Verify AI-extracted mappings between PDF fields and Case data fields
          </p>
        </CardHeader>
        <CardContent>
          {Object.keys(mappings).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No field mappings detected. This may be a static form.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(mappings).map(([pdfField, caseField]) => (
                <div key={pdfField} className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-xs text-slate-500">PDF Field:</Label>
                      <span className="font-medium text-sm">{pdfField}</span>
                    </div>
                    {editingField === pdfField ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Label className="text-xs text-slate-500">Maps to:</Label>
                        <select
                          value={caseField}
                          onChange={(e) => handleMappingChange(pdfField, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="">Select Case Field</option>
                          {availableCaseFields.map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingField(null)}
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Label className="text-xs text-slate-500">Maps to:</Label>
                        <Badge variant="outline" className="font-mono text-xs">
                          {caseField || "Not mapped"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingField(pdfField)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Show validation rules if any */}
                    {validationRules[pdfField] && (
                      <div className="mt-2 text-xs text-slate-500">
                        Validation: {JSON.stringify(validationRules[pdfField])}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveMapping(pdfField)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-slate-600">
              {Object.keys(mappings).length} field(s) mapped
            </div>
            <div className="flex gap-2">
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {updateMutation.isPending ? "Saving..." : "Save Mappings"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Instructions Section */}
      {formTemplate.field_instructions && Object.keys(formTemplate.field_instructions).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Field Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(formTemplate.field_instructions).map(([field, instruction]) => (
                <div key={field} className="text-sm">
                  <span className="font-medium">{field}:</span>
                  <span className="text-slate-600 ml-2">{instruction}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}