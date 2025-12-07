import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function NotaryValidator() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationResult(null);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleValidate = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);

    // Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProgress(30);

    // Extract notary information using AI
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          notary_name: { type: "string", description: "Name of the notary public" },
          commission_number: { type: "string", description: "Notary commission number" },
          expiration_date: { type: "string", description: "Commission expiration date" },
          notary_date: { type: "string", description: "Date of notarization" },
          state: { type: "string", description: "State of notary commission" },
          has_seal: { type: "boolean", description: "Is there a visible notary seal/stamp?" },
          has_signature: { type: "boolean", description: "Is there a notary signature?" },
          signer_name: { type: "string", description: "Name of the person who signed" },
          is_legible: { type: "boolean", description: "Is the document clearly legible?" },
        },
      },
    });

    setProgress(70);

    if (result.status === "success") {
      const data = result.output;
      
      // Calculate validation scores
      const checks = {
        seal: { passed: data.has_seal === true, label: "Notary Seal Detected" },
        signature: { passed: data.has_signature === true, label: "Notary Signature Present" },
        date: { passed: !!data.notary_date, label: "Notarization Date Visible" },
        commission: { passed: !!data.commission_number, label: "Commission Number Readable" },
        expiration: { passed: !!data.expiration_date, label: "Expiration Date Found" },
        legibility: { passed: data.is_legible !== false, label: "Document Legible" },
      };

      const passedCount = Object.values(checks).filter(c => c.passed).length;
      const totalChecks = Object.keys(checks).length;
      const score = Math.round((passedCount / totalChecks) * 100);

      setValidationResult({
        ...data,
        checks,
        score,
        status: score >= 80 ? "valid" : score >= 50 ? "warning" : "invalid",
        file_url,
      });
    }

    setProgress(100);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
          <CheckSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notary Validator</h1>
          <p className="text-slate-500">Validate notarized documents automatically</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Notary Page</CardTitle>
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
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">Upload notary page image</p>
                  <p className="text-sm text-slate-400 mt-1">
                    PNG, JPG, or PDF files supported
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            {isProcessing && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-slate-500 mt-2">Analyzing document...</p>
              </div>
            )}

            {file && !isProcessing && (
              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setFile(null);
                    setFilePreview(null);
                    setValidationResult(null);
                  }}
                >
                  Clear
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleValidate}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Validate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!validationResult ? (
              <div className="text-center py-12 text-slate-500">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Upload a notary page to validate</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score */}
                <div className="text-center p-6 rounded-xl bg-slate-50">
                  <div className={`text-5xl font-bold mb-2 ${
                    validationResult.status === "valid" ? "text-emerald-600" :
                    validationResult.status === "warning" ? "text-amber-600" :
                    "text-red-600"
                  }`}>
                    {validationResult.score}%
                  </div>
                  <Badge className={`${
                    validationResult.status === "valid" ? "bg-emerald-100 text-emerald-700" :
                    validationResult.status === "warning" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {validationResult.status === "valid" ? "Valid" :
                     validationResult.status === "warning" ? "Needs Review" :
                     "Invalid"}
                  </Badge>
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                  {Object.values(validationResult.checks).map((check, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                      {check.passed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className={check.passed ? "text-slate-700" : "text-slate-400"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Extracted Info */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-3">Extracted Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Notary Name</span>
                      <span className="font-medium">{validationResult.notary_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Commission #</span>
                      <span className="font-medium">{validationResult.commission_number || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expiration</span>
                      <span className="font-medium">{validationResult.expiration_date || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Notary Date</span>
                      <span className="font-medium">{validationResult.notary_date || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Signer</span>
                      <span className="font-medium">{validationResult.signer_name || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    View Cleaned PDF
                  </Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}