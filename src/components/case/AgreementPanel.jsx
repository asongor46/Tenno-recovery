import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  FileText,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function AgreementPanel({ caseId, caseData }) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [generatedAgreement, setGeneratedAgreement] = useState(null);
  const [localFee, setLocalFee] = useState(caseData?.fee_percent || 20);
  const updateTimeoutRef = React.useRef(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    setLocalFee(caseData?.fee_percent || 20);
  }, [caseData?.fee_percent]);

  const { data: templates = [] } = useQuery({
    queryKey: ["agreementTemplates"],
    queryFn: () => base44.entities.AgreementTemplate.filter({ is_active: true }),
  });

  const generateMutation = useMutation({
    mutationFn: async ({ send_email }) => {
      const { data } = await base44.functions.invoke("generateAgreement", {
        case_id: caseId,
        template_id: selectedTemplateId,
        send_email,
      });
      return data;
    },
    onSuccess: (data) => {
      setGeneratedAgreement(data);
      setShowGenerateDialog(false);
      if (data.sent_email) {
        toast.success("Agreement sent successfully!");
        setShowPreview(false);
      } else {
        setShowPreview(true);
      }
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
    },
    onError: (error) => {
      toast.error("Failed to generate agreement: " + error.message);
    },
  });



  const defaultTemplate = templates.find((t) => t.is_default) || templates[0];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Agreement Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agreement Status */}
          {caseData.agreement_signed_at && (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">Agreement Signed</p>
                  <p className="text-sm text-green-700">
                    {format(new Date(caseData.agreement_signed_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fee Editor */}
          <div className="pt-4 border-t space-y-3">
            <div>
              <Label className="text-sm text-slate-600">Finder Fee Percentage (10-30%)</Label>
              <div className="flex items-center gap-3 mt-2">
                <Input
                  type="number"
                  min="10"
                  max="30"
                  step="1"
                  value={localFee}
                  onChange={(e) => {
                    const newFee = parseInt(e.target.value);
                    setLocalFee(newFee);
                    
                    if (updateTimeoutRef.current) {
                      clearTimeout(updateTimeoutRef.current);
                    }
                    
                    if (newFee >= 10 && newFee <= 30) {
                      updateTimeoutRef.current = setTimeout(async () => {
                        await base44.entities.Case.update(caseId, { fee_percent: newFee });
                        queryClient.invalidateQueries({ queryKey: ["case", caseId] });
                        toast.success(`Fee updated to ${newFee}%`);
                      }, 1000);
                    }
                  }}
                  disabled={caseData.fee_locked || caseData.agreement_status === "signed"}
                  className="w-24"
                />
                <span className="font-semibold">%</span>
                {(caseData.fee_locked || caseData.agreement_status === "signed") && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    🔒 Locked
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm text-slate-600">Fee Amount:</span>
              <span className="font-bold text-emerald-600">
                $
                {(
                  ((caseData.surplus_amount || 0) * localFee) /
                  100
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Agreement Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={defaultTemplate ? defaultTemplate.name : "Select template"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.is_default && "(Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              Agreement will be sent to: <strong>{caseData.owner_email || "No email on file"}</strong>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => generateMutation.mutate({ send_email: false })}
                disabled={!selectedTemplateId || generateMutation.isPending}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Only
              </Button>
              <Button
                onClick={() => generateMutation.mutate({ send_email: true })}
                disabled={!selectedTemplateId || !caseData.owner_email || generateMutation.isPending}
                className="flex-1 bg-emerald-600"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agreement Preview</DialogTitle>
          </DialogHeader>
          {generatedAgreement && (
            <div className="space-y-4">
              <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-6 rounded-lg">
                {generatedAgreement.agreement_text}
              </pre>
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <span className="text-sm text-emerald-700">
                  Fee: {caseData.fee_percent}% = ${generatedAgreement.fee_amount?.toLocaleString()}
                </span>
                {generatedAgreement.pdf_url && (
                  <a href={generatedAgreement.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}