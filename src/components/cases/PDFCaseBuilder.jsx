import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
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
 * PDF Case Builder - Upload surplus lists, sheriff sale PDFs, etc.
 * Auto-extracts case data using OCR and structured parsing.
 */
export default function PDFCaseBuilder({ onSuccess, onCancel }) {
  const [file, setFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedCases, setExtractedCases] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // STEP 1: File upload handler
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // STEP 2: Extract data from PDF
  const handleExtract = async () => {
    if (!file) return;

    setIsExtracting(true);

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Call extraction function
      const { data } = await base44.functions.invoke("extractPDFData", {
        file_url,
        extraction_type: "surplus_list",
        county: null, // Will be auto-detected from PDF
        state: "PA", // Default to PA
      });

      if (data.status === "success") {
        setExtractedCases(data.cases || []);
        setSelectedRows(data.cases?.map((_, i) => i) || []); // Select all by default
        
        // Show summary
        if (data.filtered_out > 0) {
          alert(
            `Found ${data.total_found} total entries.\n` +
            `${data.filtered_out} filtered out (corporate/LLC defendants or no surplus).\n` +
            `${data.surplus_cases_found} valid surplus cases ready to import.`
          );
        }
      } else {
        alert("Extraction failed: " + (data.details || data.error || "Unknown error"));
      }
    } catch (error) {
      alert("Extraction error: " + error.message);
    }

    setIsExtracting(false);
  };

  // STEP 3: Edit extracted data
  const handleEditCell = (index, field, value) => {
    const updated = [...extractedCases];
    updated[index][field] = value;
    setExtractedCases(updated);
  };

  // STEP 4: Import selected cases
  const handleImport = async () => {
    const casesToImport = extractedCases.filter((_, i) => selectedRows.includes(i));

    if (casesToImport.length === 0) {
      alert("Please select at least one case to import");
      return;
    }

    setIsImporting(true);

    // Create cases
    for (const caseData of casesToImport) {
      const newCase = await base44.entities.Case.create({
        ...caseData,
        source_type: "pdf_import",
        status: "active",
        stage: "imported",
      });
      
      // Auto-classify the case
      await base44.functions.invoke("classifyCase", { case_id: newCase.id });
    }

    setIsImporting(false);
    alert(`Successfully imported ${casesToImport.length} cases`);
    onSuccess?.();
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
      {/* STEP 1: Upload Section */}
      {!extractedCases.length && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors">
            <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="font-semibold text-slate-700 mb-2">Upload Surplus List PDF</p>
            <p className="text-sm text-slate-500 mb-4">
              Accepts: Surplus lists, sheriff sale lists, auction exports, county claim
              instructions
            </p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload">
              <Button asChild variant="outline">
                <span>
                  <FileText className="w-4 h-4 mr-2" />
                  Choose PDF File
                </span>
              </Button>
            </label>
            {file && (
              <p className="text-sm text-slate-600 mt-3">
                <CheckCircle className="w-4 h-4 inline text-emerald-500 mr-1" />
                {file.name}
              </p>
            )}
          </div>

          {file && (
            <div className="flex gap-3">
              <Button
                onClick={handleExtract}
                disabled={isExtracting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isExtracting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {isExtracting ? "Extracting Data..." : "Extract Cases"}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          )}
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtractedCases([])}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
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
                          handleEditCell(index, "property_address", e.target.value)
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