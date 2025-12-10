import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Image as ImageIcon,
  Upload,
  Loader2,
  CheckCircle,
  X,
  Sparkles,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Screenshot Case Builder - OCR-based extraction
 * Handles RealForeclose, auction screenshots, and other image-based data sources
 */
export default function ScreenshotCaseBuilder({ onSuccess, onCancel }) {
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedCases, setExtractedCases] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // STEP 1: Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // STEP 2: Process screenshot with OCR
  const handleProcess = async () => {
    if (!screenshot) return;

    setIsProcessing(true);

    try {
      // Upload screenshot
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: screenshot,
      });

      // Extract data via OCR
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            cases: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  case_number: { type: "string" },
                  owner_name: { type: "string" },
                  property_address: { type: "string" },
                  county: { type: "string" },
                  state: { type: "string" },
                  sale_amount: { type: "number" },
                  judgment_amount: { type: "number" },
                  surplus_amount: { type: "number" },
                  sale_date: { type: "string" },
                  plaintiff: { type: "string" },
                  defendant: { type: "string" },
                },
              },
            },
          },
        },
      });

      if (result.status === "success" && result.output?.cases) {
        const normalized = result.output.cases.map((c) => ({
          ...c,
          source_type: "screenshot",
          is_hot: (c.surplus_amount || 0) >= 30000,
        }));

        setExtractedCases(normalized);
        setSelectedRows(normalized.map((_, i) => i));
      } else {
        alert("OCR extraction failed: " + (result.details || "Unknown error"));
      }
    } catch (error) {
      alert("Processing error: " + error.message);
    }

    setIsProcessing(false);
  };

  // STEP 3: Edit extracted data
  const handleEditCell = (index, field, value) => {
    const updated = [...extractedCases];
    updated[index][field] = value;
    setExtractedCases(updated);
  };

  // STEP 4: Import cases
  const handleImport = async () => {
    const casesToImport = extractedCases.filter((_, i) =>
      selectedRows.includes(i)
    );

    if (casesToImport.length === 0) {
      alert("Please select at least one case to import");
      return;
    }

    setIsImporting(true);

    try {
      for (const caseData of casesToImport) {
        const newCase = await base44.entities.Case.create({
          ...caseData,
          status: "active",
          stage: "imported",
        });
        
        // Auto-classify the case
        await base44.functions.invoke("classifyCase", { case_id: newCase.id });
      }

      alert(`Successfully imported ${casesToImport.length} cases`);
      onSuccess?.();
    } catch (error) {
      alert("Import error: " + error.message);
    }

    setIsImporting(false);
  };

  const toggleRowSelection = (index) => {
    setSelectedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === extractedCases.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(extractedCases.map((_, i) => i));
    }
  };

  return (
    <div className="space-y-6">
      {/* STEP 1: File Upload */}
      {!extractedCases.length && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">
                  Upload Screenshot
                </p>
                <p className="text-sm text-slate-500">
                  RealForeclose, auction results, or any surplus data screenshot
                </p>
              </div>

              <Label
                htmlFor="screenshot-upload"
                className="cursor-pointer px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Choose Screenshot
              </Label>
              <Input
                id="screenshot-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {previewUrl && (
            <div className="space-y-3">
              <Label>Preview</Label>
              <div className="border rounded-lg overflow-hidden max-h-96">
                <img
                  src={previewUrl}
                  alt="Screenshot preview"
                  className="w-full h-auto"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {isProcessing ? "Processing with OCR..." : "Extract Data"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setScreenshot(null);
                    setPreviewUrl(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      )}

      {/* STEP 2: Preview & Edit Extracted Data */}
      {extractedCases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {extractedCases.length} Cases Extracted
              </p>
              <p className="text-sm text-slate-500">
                Review and select cases to import
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExtractedCases([]);
                setSelectedRows([]);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Extracted Cases Table */}
          <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === extractedCases.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Property Address</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Case #</TableHead>
                  <TableHead>Surplus</TableHead>
                  <TableHead>Sale Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedCases.map((caseData, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(index)}
                        onCheckedChange={() => toggleRowSelection(index)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={caseData.owner_name || ""}
                        onChange={(e) =>
                          handleEditCell(index, "owner_name", e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={caseData.property_address || ""}
                        onChange={(e) =>
                          handleEditCell(
                            index,
                            "property_address",
                            e.target.value
                          )
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={caseData.county || ""}
                        onChange={(e) =>
                          handleEditCell(index, "county", e.target.value)
                        }
                        className="h-8 w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={caseData.case_number || ""}
                        onChange={(e) =>
                          handleEditCell(index, "case_number", e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={caseData.surplus_amount || ""}
                        onChange={(e) =>
                          handleEditCell(
                            index,
                            "surplus_amount",
                            parseFloat(e.target.value)
                          )
                        }
                        className="h-8 w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={caseData.sale_date || ""}
                        onChange={(e) =>
                          handleEditCell(index, "sale_date", e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Import Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleImport}
              disabled={isImporting || selectedRows.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isImporting
                ? "Importing..."
                : `Import ${selectedRows.length} Selected Cases`}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}