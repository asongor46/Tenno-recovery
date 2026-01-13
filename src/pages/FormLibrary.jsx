import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Eye,
  Trash2,
  Download,
  CheckCircle2,
  Edit2,
  AlertCircle,
  Settings,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FieldMappingReview from "@/components/formLibrary/FieldMappingReview";
import FormPreviewDialog from "@/components/formLibrary/FormPreviewDialog";
import PDFViewerDialog from "@/components/pdf/PDFViewerDialog";
import VisualFieldMapper from "@/components/pdf/VisualFieldMapper";
import { useStandardToast } from "@/components/shared/useStandardToast";
import RoleGuard from "@/components/rbac/RoleGuard";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";

export default function FormLibrary() {
  const [selectedCounty, setSelectedCounty] = useState("");
  const [uploadingFile, setUploadingFile] = useState(null);
  const [formSetName, setFormSetName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [reviewingForm, setReviewingForm] = useState(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [previewForm, setPreviewForm] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [mappingForm, setMappingForm] = useState(null);
  const [showVisualMapper, setShowVisualMapper] = useState(false);

  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const { data: counties = [] } = useQuery({
    queryKey: ["counties"],
    queryFn: () => base44.entities.County.list("name"),
  });

  const { data: formTemplates = [] } = useQuery({
    queryKey: ["formTemplates", selectedCounty],
    queryFn: () => base44.entities.CountyFormTemplate.filter({ 
      county_id: selectedCounty,
      is_active: true 
    }, 'order'),
    enabled: !!selectedCounty,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file_url, county_id, form_set_name }) => {
      const { data } = await base44.functions.invoke("uploadCountyPacket", {
        file_url,
        county_id,
        form_set_name,
      });
      return data;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setShowAnalysisDialog(true);
      setUploadingFile(null);
      setFormSetName("");
      queryClient.invalidateQueries({ queryKey: ["formTemplates"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CountyFormTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formTemplates"] });
      toast.success("Form deleted");
    },
  });

  const testGenerateMutation = useMutation({
    mutationFn: async (template_id) => {
      // Get first active case for testing
      const cases = await base44.entities.Case.filter({ status: "active" }, "-created_date", 1);
      if (!cases[0]) {
        throw new Error("No active cases found for testing");
      }
      const { data } = await base44.functions.invoke("generateFillableForm", {
        case_id: cases[0].id,
        county_form_template_id: template_id
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated fillable form (${data.completion_percentage}% complete)`);
      if (data.filled_pdf_url) {
        window.open(data.filled_pdf_url, '_blank');
      }
    },
    onError: (err) => toast.error(`Test failed: ${err.message}`)
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCounty) return;

    setIsUploading(true);
    
    // Upload file first
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadingFile(file_url);
    
    // Process packet
    uploadMutation.mutate({
      file_url,
      county_id: selectedCounty,
      form_set_name: formSetName || "Standard",
    });
    
    setIsUploading(false);
  };

  return (
    <RoleGuard allowedRoles={["admin", "agent"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Form Library</h1>
          <p className="text-slate-500 mt-1">Upload and manage county form templates</p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload County Form Packet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>County *</Label>
              <Select value={selectedCounty} onValueChange={setSelectedCounty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  {counties.map((county) => (
                    <SelectItem key={county.id} value={county.id}>
                      {county.name}, {county.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Form Set Name</Label>
              <Input
                value={formSetName}
                onChange={(e) => setFormSetName(e.target.value)}
                placeholder="e.g., CVEP1, Standard, 2024"
              />
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="font-medium text-slate-700 mb-2">
              Upload County Form Packet PDF
            </p>
            <p className="text-sm text-slate-500 mb-4">
              AI will analyze and extract individual forms
            </p>
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={!selectedCounty || isUploading}
              className="max-w-xs mx-auto"
            />
            {isUploading && (
              <p className="text-sm text-blue-600 mt-3">Analyzing forms...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Templates Table */}
      {selectedCounty && (
        <Card>
          <CardHeader>
            <CardTitle>
              County Forms ({formTemplates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Set</TableHead>
                  <TableHead>Merge Fields</TableHead>
                  <TableHead>Notary</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No forms uploaded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  formTemplates.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{form.form_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {form.form_type?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{form.form_set_name}</TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {form.merge_fields?.length || 0} fields
                        </span>
                      </TableCell>
                      <TableCell>
                        {form.requires_notary ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="View Details"
                            onClick={() => {
                              setPreviewForm(form);
                              setShowPreviewDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setMappingForm(form);
                              setShowVisualMapper(true);
                            }}
                            title="Visual Field Mapper"
                            className="text-purple-600"
                          >
                            <MapPin className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setReviewingForm(form);
                              setShowMappingDialog(true);
                            }}
                            title="Review Field Mappings"
                          >
                            <Settings className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => testGenerateMutation.mutate(form.id)}
                            disabled={testGenerateMutation.isPending}
                            title="Test Generate Fillable Form"
                          >
                            <Play className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(`Delete "${form.form_name}"? This cannot be undone.`)) {
                                deleteMutation.mutate(form.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Form Preview Dialog */}
      <FormPreviewDialog
        form={previewForm}
        open={showPreviewDialog}
        onClose={() => {
          setShowPreviewDialog(false);
          setPreviewForm(null);
        }}
      />

      {/* Visual Field Mapper Dialog */}
      <Dialog open={showVisualMapper} onOpenChange={setShowVisualMapper}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Visual Field Mapper - {mappingForm?.form_name}</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              Click on the PDF to create field mappings. Each click places a marker that you can assign to a case field.
            </p>
          </DialogHeader>
          {mappingForm && (
            <VisualFieldMapper
              pdfUrl={mappingForm.file_url}
              initialMappings={mappingForm.field_mappings || {}}
              onSave={async (mappingData) => {
                try {
                  await base44.entities.CountyFormTemplate.update(mappingForm.id, {
                    field_mappings: mappingData.field_mappings,
                    metadata: {
                      ...mappingForm.metadata,
                      field_locations: mappingData.field_locations,
                    },
                  });
                  toast.success("Field mappings saved successfully!");
                  queryClient.invalidateQueries({ queryKey: ["formTemplates"] });
                  setShowVisualMapper(false);
                  setMappingForm(null);
                } catch (error) {
                  toast.error("Failed to save mappings: " + error.message);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Field Mapping Review Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Field Mappings</DialogTitle>
          </DialogHeader>
          {reviewingForm && (
            <FieldMappingReview 
              formTemplate={reviewingForm} 
              onClose={() => {
                setShowMappingDialog(false);
                setReviewingForm(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Analysis Result Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Form Analysis Complete</DialogTitle>
          </DialogHeader>
          {analysisResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold">
                  Successfully extracted {analysisResult.forms_created} forms
                </p>
              </div>
              
              {analysisResult.detected_county && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">
                    Detected: {analysisResult.detected_county}, {analysisResult.detected_state}
                  </p>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analysisResult.forms?.map((form, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{form.form_name}</p>
                        <p className="text-sm text-slate-500 capitalize">
                          {form.form_type?.replace(/_/g, " ")}
                        </p>
                      </div>
                      {form.requires_notary && (
                        <Badge className="bg-amber-100 text-amber-700">
                          Notary Required
                        </Badge>
                      )}
                    </div>
                    {form.merge_fields?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 mb-1">Merge Fields:</p>
                        <div className="flex flex-wrap gap-1">
                          {form.merge_fields.map((field, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setShowAnalysisDialog(false)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </RoleGuard>
  );
}