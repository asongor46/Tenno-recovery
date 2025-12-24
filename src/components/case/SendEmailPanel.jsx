import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mail, ExternalLink, Copy, Check } from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

export default function SendEmailPanel({ caseId, caseData }) {
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [filled, setFilled] = React.useState(null);
  const [copied, setCopied] = React.useState(null);
  const toast = useStandardToast();
  const qc = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["emailTemplates"],
    queryFn: () => base44.entities.EmailTemplate.filter({ is_active: true }),
    staleTime: 300000,
  });

  const fillMutation = useMutation({
    mutationFn: async (template_id) => {
      const { data } = await base44.functions.invoke("fillEmailTemplate", { template_id, case_id: caseId });
      return data;
    },
    onSuccess: (data) => setFilled(data),
  });

  const handleOpenOutlook = () => {
    if (!filled?.outlook_link) return;
    window.open(filled.outlook_link, "_blank");
  };

  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text || "");
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  const markSent = useMutation({
    mutationFn: async () => {
      if (!filled) return;
      const tpl = templates.find(t => t.id === selectedTemplateId);
      await base44.entities.EmailLog.create({
        case_id: caseId,
        template_name: tpl?.name || "Custom",
        recipient_email: filled.recipient,
        subject_sent: filled.subject,
        sent_at: new Date().toISOString(),
        status: "Sent"
      });
    },
    onSuccess: () => {
      toast.success("Email logged!");
      qc.invalidateQueries({ queryKey: ["emailLogs", caseId] });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Send Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={(v) => { setSelectedTemplateId(v); fillMutation.mutate(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} {t.category ? `(${t.category})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>To</Label>
            <Input value={caseData?.owner_email || ''} readOnly />
          </div>
        </div>

        <div>
          <Label>Subject</Label>
          <div className="flex gap-2 mt-1">
            <Input value={filled?.subject || ''} readOnly />
            <Button type="button" variant="outline" onClick={() => copy(filled?.subject || '', 'subject')}>
              {copied === 'subject' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label>Body</Label>
          <div className="flex gap-2 mt-1">
            <Textarea value={filled?.body || ''} readOnly rows={10} className="font-mono" />
            <Button type="button" variant="outline" onClick={() => copy(filled?.body || '', 'body')}>
              {copied === 'body' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="outline" onClick={handleOpenOutlook} disabled={!filled?.outlook_link}>
            <ExternalLink className="w-4 h-4 mr-2" /> Open in Outlook
          </Button>
          <Button type="button" onClick={() => markSent.mutate()} disabled={!filled}>
            Mark as Sent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}