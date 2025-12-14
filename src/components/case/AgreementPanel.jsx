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
  Mail,
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

  const queryClient = useQueryClient();

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

  const resendMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke("generateAgreement", {
        case_id: caseId,
        template_id: selectedTemplateId,
        send_email: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      toast.success("Agreement resent!");
    },
    onError: (error) => {
      toast.error("Failed to resend agreement: " + error.message);
    },
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "signed":
        return "bg-green-100 text-green-700";
      case "notarized":
        return "bg-emerald-100 text-emerald-700";
      case "opened":
        return "bg-blue-100 text-blue-700";
      case "sent":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "signed":
      case "notarized":
        return <CheckCircle2 className="w-4 h-4" />;
      case "opened":
      case "sent":
        return <Mail className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

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
          {/* Status Display */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  caseData.agreement_status === "signed" ||
                  caseData.agreement_status === "notarized"
                    ? "bg-green-100"
                    : caseData.agreement_status === "sent" ||
                      caseData.agreement_status === "opened"
                    ? "bg-amber-100"
                    : "bg-slate-200"
                }`}
              >
                {getStatusIcon(caseData.agreement_status)}
              </div>
              <div>
                <p className="font-medium">Agreement</p>
                <Badge className={`${getStatusColor(caseData.agreement_status)} border-0`}>
                  {caseData.agreement_status?.replace(/_/g, " ") || "Not Sent"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {caseData.agreement_status === "not_sent" && (
                <Button size="sm" onClick={() => setShowGenerateDialog(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Agreement
                </Button>
              )}
              {caseData.agreement_status === "sent" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                >
                  {resendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Resend
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Timeline */}
          {caseData.agreement_sent_at && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span>Sent: {format(new Date(caseData.agreement_sent_at), "MMM d, yyyy h:mm a")}</span>
              </div>
              {caseData.agreement_signed_at && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Signed: {format(new Date(caseData.agreement_signed_at), "MMM d, yyyy h:mm a")}</span>
                </div>
              )}
              {caseData.agreement_notarized_at && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Notarized: {format(new Date(caseData.agreement_notarized_at), "MMM d, yyyy h:mm a")}</span>
                </div>
              )}
            </div>
          )}

          {/* Fee Editor */}
          <div className="pt-4 border-t space-y-3">
            <div>
              <Label className="text-sm text-slate-600">Finder Fee Percentage</Label>
              <div className="flex items-center gap-3 mt-2">
                <Select
                  value={(caseData.fee_percent || 20).toString()}
                  onValueChange={async (value) => {
                    const newFee = parseInt(value);
                    await base44.entities.Case.update(caseId, { fee_percent: newFee });
                    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
                    toast.success(`Fee updated to ${newFee}%`);
                  }}
                  disabled={caseData.fee_locked || caseData.agreement_status === "signed"}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="30">30%</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-slate-500">
                  {caseData.fee_locked || caseData.agreement_status === "signed" ? "🔒 Locked" : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm text-slate-600">Fee Amount:</span>
              <span className="font-bold text-emerald-600">
                $
                {(
                  ((caseData.surplus_amount || 0) * (caseData.fee_percent || 20)) /
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