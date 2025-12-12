import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  PackageOpen, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  X
} from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

/**
 * Bulk Packet Generator
 * Generate and download packets for multiple cases
 */
export default function BulkPacketGenerator({ cases, onClose }) {
  const [selectedCases, setSelectedCases] = useState(cases.map(c => c.id));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const toast = useStandardToast();

  const toggleCase = (caseId) => {
    setSelectedCases(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  const toggleAll = () => {
    setSelectedCases(prev =>
      prev.length === cases.length ? [] : cases.map(c => c.id)
    );
  };

  const generatePackets = async () => {
    setIsGenerating(true);
    setProgress(0);
    setResults([]);

    const total = selectedCases.length;
    const generatedResults = [];

    for (let i = 0; i < selectedCases.length; i++) {
      const caseId = selectedCases[i];
      const caseData = cases.find(c => c.id === caseId);

      try {
        const { data } = await base44.functions.invoke("generateFilledPacket", {
          case_id: caseId
        });

        generatedResults.push({
          caseId,
          caseName: caseData.owner_name,
          caseNumber: caseData.case_number,
          status: data.status === 'success' ? 'success' : 'error',
          formsCount: data.forms_generated || 0,
          message: data.status === 'success' 
            ? `Generated ${data.forms_generated} forms` 
            : data.details
        });
      } catch (error) {
        generatedResults.push({
          caseId,
          caseName: caseData.owner_name,
          caseNumber: caseData.case_number,
          status: 'error',
          message: error.message
        });
      }

      setProgress(((i + 1) / total) * 100);
      setResults([...generatedResults]);
    }

    setIsGenerating(false);
    
    const successCount = generatedResults.filter(r => r.status === 'success').length;
    toast.success(`Generated packets for ${successCount}/${total} cases`);
  };

  const downloadAsZip = async () => {
    toast.info("ZIP download coming soon - files generated individually");
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bulk Packet Generator</h3>
          <p className="text-sm text-slate-500 mt-1">
            Generate county forms for multiple cases at once
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Case Selection */}
      {!isGenerating && results.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedCases.length === cases.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">
                Select All ({selectedCases.length}/{cases.length})
              </span>
            </div>
          </div>

          <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
            {cases.map(caseItem => (
              <div key={caseItem.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                <Checkbox
                  checked={selectedCases.includes(caseItem.id)}
                  onCheckedChange={() => toggleCase(caseItem.id)}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{caseItem.owner_name}</p>
                  <p className="text-xs text-slate-500">{caseItem.case_number} • {caseItem.county}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  ${caseItem.surplus_amount?.toLocaleString() || 0}
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={generatePackets}
              disabled={selectedCases.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <PackageOpen className="w-4 h-4 mr-2" />
              Generate {selectedCases.length} Packet{selectedCases.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Progress */}
      {isGenerating && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <div className="flex-1">
              <p className="font-medium text-sm">Generating packets...</p>
              <p className="text-xs text-slate-500 mt-1">
                {results.length} of {selectedCases.length} completed
              </p>
            </div>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !isGenerating && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {successCount} Success
              </Badge>
              {errorCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-0">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errorCount} Failed
                </Badge>
              )}
            </div>
            {successCount > 0 && (
              <Button variant="outline" size="sm" onClick={downloadAsZip}>
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            )}
          </div>

          <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
            {results.map((result) => (
              <div key={result.caseId} className="p-3">
                <div className="flex items-start gap-3">
                  {result.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{result.caseName}</p>
                    <p className="text-xs text-slate-500 mt-1">{result.caseNumber}</p>
                    <p className={`text-xs mt-1 ${
                      result.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      )}
    </div>
  );
}