import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function PortalIDUpload() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [frontValidation, setFrontValidation] = useState(null);
  const [backValidation, setBackValidation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  // Load case data
  const { data: caseData } = useQuery({
    queryKey: ["portal-case", token],
    queryFn: async () => {
      const cases = await base44.entities.Case.filter({ portal_token: token });
      return cases[0];
    },
    enabled: !!token,
  });

  const handleFileSelect = async (file, side) => {
    const preview = URL.createObjectURL(file);

    if (side === "front") {
      setFrontFile(file);
      setFrontPreview(preview);
      setFrontValidation(null);
    } else {
      setBackFile(file);
      setBackPreview(preview);
      setBackValidation(null);
    }

    // Upload and validate
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create document record
      const doc = await base44.entities.Document.create({
        case_id: caseData.id,
        name: `ID ${side === "front" ? "Front" : "Back"}`,
        category: side === "front" ? "id_front" : "id_back",
        file_url,
        uploaded_by: caseData.owner_email || "homeowner",
      });

      // Validate integrity
      const { data } = await base44.functions.invoke("validatePDFIntegrity", {
        file_url,
        document_type: side === "front" ? "id_front" : "id_back",
        case_id: caseData.id,
      });

      const validation = data;

      if (side === "front") {
        setFrontValidation(validation);
      } else {
        setBackValidation(validation);
      }

      // Check if validation passed
      if (validation.overall_status === "error") {
        // Block step
        await base44.functions.invoke("homeownerWorkflowService", {
          action: "block",
          case_id: caseData.id,
          step_key: "id_upload",
          reason: validation.issues[0]?.message || "ID validation failed",
        });
      }

      queryClient.invalidateQueries(["portal-case", token]);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!frontFile || !backFile) {
      alert("Please upload both front and back of your ID");
      return;
    }

    if (frontValidation?.overall_status === "error" || backValidation?.overall_status === "error") {
      alert("Please fix the issues with your ID uploads before continuing");
      return;
    }

    // Advance step
    await base44.functions.invoke("homeownerWorkflowService", {
      action: "advance",
      case_id: caseData.id,
      step_key: "id_upload",
      completed_by: caseData.owner_email || "homeowner",
    });

    // Navigate to next step
    window.location.href = createPageUrl(`PortalIntake?token=${token}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link to={createPageUrl(`PortalDashboard?token=${token}`)}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Upload Your ID</h1>
          <p className="text-slate-500 mt-1">
            We need clear photos of the front and back of your government-issued ID
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-slate-900">Tips for a good photo:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Use good lighting (avoid shadows and glare)</li>
                <li>Make sure all text is readable</li>
                <li>Lay the ID on a flat, dark surface</li>
                <li>Make sure your ID is not expired</li>
                <li>Include all four corners in the photo</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Front Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              ID Front
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!frontPreview ? (
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-emerald-500 transition-colors">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">Click to upload or take photo</p>
                  <p className="text-sm text-slate-500 mt-1">Front of your ID</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0], "front")}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <img src={frontPreview} alt="ID Front" className="rounded-lg w-full" />
                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating...</span>
                  </div>
                )}
                {frontValidation && (
                  <ValidationResult validation={frontValidation} />
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFrontFile(null);
                    setFrontPreview(null);
                    setFrontValidation(null);
                  }}
                >
                  Retake Photo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              ID Back
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!backPreview ? (
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-emerald-500 transition-colors">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">Click to upload or take photo</p>
                  <p className="text-sm text-slate-500 mt-1">Back of your ID</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0], "back")}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <img src={backPreview} alt="ID Back" className="rounded-lg w-full" />
                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating...</span>
                  </div>
                )}
                {backValidation && (
                  <ValidationResult validation={backValidation} />
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setBackFile(null);
                    setBackPreview(null);
                    setBackValidation(null);
                  }}
                >
                  Retake Photo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={
            !frontFile ||
            !backFile ||
            isUploading ||
            frontValidation?.overall_status === "error" ||
            backValidation?.overall_status === "error"
          }
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
        >
          Continue to Next Step <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ValidationResult({ validation }) {
  const statusConfig = {
    pass: {
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    error: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    },
  };

  const config = statusConfig[validation.overall_status];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`font-semibold ${config.color}`}>
            {validation.overall_status === "pass"
              ? "Looking good!"
              : validation.overall_status === "warning"
              ? "Please review"
              : "Please retake photo"}
          </p>
          {validation.issues && validation.issues.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {validation.issues.map((issue, i) => (
                <li key={i} className="text-slate-700">
                  • {issue.message}
                </li>
              ))}
            </ul>
          )}
          {validation.recommendations && validation.recommendations.length > 0 && (
            <div className="mt-2 text-sm text-slate-600">
              <p className="font-medium">Recommendations:</p>
              <ul className="mt-1 space-y-1">
                {validation.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}