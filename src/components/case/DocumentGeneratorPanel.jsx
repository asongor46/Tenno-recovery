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
import { FileText, Loader2, CheckCircle2, Download, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStandardToast } from "@/components/shared/useStandardToast";

/**
 * Document Generator Panel - Quick document generation for cases
 */
export default function DocumentGeneratorPanel({ caseId }) {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  // Fetch case to get county
  const { data: caseData } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const cases = await base44.entities.Case.filter({ id: caseId });
      return cases[0];
    },
    enabled: !!caseId,
  });

  // Fetch county form templates
  const { data: formTemplates = [] } = useQuery({
    queryKey: ["countyFormTemplates", caseData?.county, caseData?.state],
    queryFn: async () => {
      if (!caseData?.county || !caseData?.state) return [];
      const counties = await base44.entities.County.filter({
        name: caseData.county,
        state: caseData.state
      });
      if (!counties[0]) return [];
      
      return base44.entities.CountyFormTemplate.filter({
        county_id: counties[0].id,
        is_active: true
      }, 'order');
    },
    enabled: !!caseData?.county && !!caseData?.state,
  });

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const { data } = await base44.functions.invoke("generateFillableForm", {
        case_id: caseId,
        county_form_template_id: selectedTemplate,
      });

      if (data.status === 'error') {
        toast.error(data.details || "Failed to generate form");
        return;
      }

      setResult(data);
      toast.success(`Generated ${data.form_name} (${data.completion_percentage}% complete)`);
      queryClient.invalidateQueries({ queryKey: ["documents", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    try {
      const { data } = await base44.functions.invoke("generateFilledPacket", {
        case_id: caseId
      });

      if (data.status === 'error') {
        toast.error(data.details || "Failed to generate packet");
        return;
      }

      toast.success(`Generated ${data.forms_generated} forms for ${data.county}`);
      queryClient.invalidateQueries({ queryKey: ["documents", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Generate County Forms
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Auto-fill forms with case data
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {formTemplates.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-sm">
            No form templates available for {caseData?.county}
          </div>
        ) : (
          <>
            <div>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select form to generate" />
                </SelectTrigger>
                <SelectContent>
                  {formTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.form_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedTemplate || isGenerating}
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
                  Generate Selected Form
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or</span>
              </div>
            </div>

            <Button
              onClick={handleGenerateAll}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating All...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Complete Packet ({formTemplates.length} forms)
                </>
              )}
            </Button>
          </>
        )}

        {result && result.filled_pdf_url && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-emerald-900">Form Generated Successfully</p>
                <p className="text-sm text-emerald-700 mt-1">
                  {result.form_name} - {result.completion_percentage}% complete
                </p>
                <div className="mt-2 text-xs text-emerald-600">
                  <p>✓ {result.fields_completed?.length || 0} fields pre-filled</p>
                  {result.fields_remaining?.length > 0 && (
                    <p>○ {result.fields_remaining.length} fields to complete</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => window.open(result.filled_pdf_url, '_blank')}
                >
                  <Download className="w-3 h-3 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}