import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2, CheckCircle2, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Document Generator Panel - Quick document generation for cases
 */
export default function DocumentGeneratorPanel({ caseId }) {
  const [docType, setDocType] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  
  const queryClient = useQueryClient();

  const documentTypes = [
    { value: "claim_form", label: "Claim Form" },
    { value: "affidavit", label: "Affidavit of Claimant" },
    { value: "w9", label: "W-9 Form" },
    { value: "rep_authorization", label: "Representative Authorization" },
    { value: "assignment", label: "Assignment of Rights" },
    { value: "cover_sheet", label: "Filing Cover Sheet" },
  ];

  const handleGenerate = async () => {
    if (!docType) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const { data } = await base44.functions.invoke("generateDocument", {
        case_id: caseId,
        document_type: docType,
      });

      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["documents", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
    } catch (error) {
      alert("Error generating document: " + error.message);
    }

    setIsGenerating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generate Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!docType || isGenerating}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generate Document
            </>
          )}
        </Button>

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-emerald-900">Document Generated</p>
                <p className="text-sm text-emerald-700 mt-1">
                  Template: {result.template_used}
                </p>
                {result.content && (
                  <div className="mt-3 p-3 bg-white rounded text-xs max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-slate-700">
                      {result.content.substring(0, 500)}...
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}