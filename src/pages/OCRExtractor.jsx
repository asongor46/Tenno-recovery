import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  ScanText,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  Copy,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function OCRExtractor() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [rawText, setRawText] = useState("");

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setExtractedData(null);
    setRawText("");

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setIsProcessing(true);

    // Upload file first
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // MODIFIED: Create document record and use PDF extraction function
    const doc = await base44.entities.Document.create({
      case_id: "system", // System-level extraction
      name: file.name,
      category: "other",
      file_url,
      extraction_status: "processing",
    });

    // Call PDF extraction function
    const { data: result } = await base44.functions.invoke("extractPDFData", {
      document_id: doc.id,
    });

    if (result.status === "success") {
      setExtractedData(result.extracted_data);
      setRawText(result.extracted_data?.raw_text || "");
    }

    setIsProcessing(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
          <ScanText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">OCR Extractor</h1>
          <p className="text-slate-500">Extract data from documents and images</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center ${
                file ? "border-emerald-500 bg-emerald-50" : "border-slate-300"
              }`}
            >
              {filePreview ? (
                <div className="space-y-4">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-slate-600">{file.name}</p>
                </div>
              ) : file ? (
                <div className="space-y-4">
                  <FileText className="w-16 h-16 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-600">{file.name}</p>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">Upload a document</p>
                  <p className="text-sm text-slate-400 mt-1">
                    PDF, PNG, JPG, or CSV files supported
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            {file && (
              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setFile(null);
                    setFilePreview(null);
                    setExtractedData(null);
                    setRawText("");
                  }}
                >
                  Clear
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleExtract}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ScanText className="w-4 h-4 mr-2" />
                      Extract Data
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Extracted Data</CardTitle>
            {extractedData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(extractedData, null, 2))}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy JSON
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!extractedData ? (
              <div className="text-center py-12 text-slate-500">
                <ScanText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Upload and process a document to see extracted data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mapped Fields */}
                <div className="space-y-3">
                  <ExtractedField label="Owner Name" value={extractedData.owner_name} />
                  <ExtractedField label="Case Number" value={extractedData.case_number} />
                  <ExtractedField label="Property Address" value={extractedData.property_address} />
                  <ExtractedField 
                    label="Surplus Amount" 
                    value={extractedData.surplus_amount ? `$${extractedData.surplus_amount.toLocaleString()}` : null} 
                  />
                  <ExtractedField label="Sale Date" value={extractedData.sale_date} />
                  <ExtractedField 
                    label="Sale Amount" 
                    value={extractedData.sale_amount ? `$${extractedData.sale_amount.toLocaleString()}` : null} 
                  />
                  <ExtractedField label="County" value={extractedData.county} />
                  <ExtractedField label="Court Info" value={extractedData.court_info} />
                </div>

                {/* MODIFIED: Create Case Button with handler */}
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={async () => {
                    if (!extractedData) return;
                    
                    await base44.entities.Case.create({
                      owner_name: extractedData.owner_name,
                      case_number: extractedData.case_number,
                      property_address: extractedData.property_address,
                      surplus_amount: extractedData.surplus_amount,
                      sale_date: extractedData.sale_date,
                      sale_amount: extractedData.sale_amount,
                      county: extractedData.county,
                      source_type: "pdf_import",
                      status: "active",
                      stage: "imported",
                    });
                    
                    alert("Case created successfully!");
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Case from Extracted Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raw Text */}
      {rawText && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Raw Extracted Text</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(rawText)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={rawText}
              readOnly
              rows={10}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExtractedField({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="font-medium text-slate-900 text-sm text-right">
        {value || <span className="text-slate-300">Not found</span>}
      </span>
    </div>
  );
}