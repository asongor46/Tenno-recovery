import React from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, ExternalLink, Copy, Check, Loader2, Send } from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";
import { EMAIL_TEMPLATES, getTemplatesByCategory } from "@/components/shared/emailTemplates";

export default function SendEmailPanel({ caseId, caseData }) {
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [portalInfo, setPortalInfo] = React.useState(null);
  const [emailContent, setEmailContent] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [sendingDirect, setSendingDirect] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('portal');
  const toast = useStandardToast();

  const categories = [
    { id: 'portal', label: 'Portal Invites' },
    { id: 'outreach', label: 'Cold Outreach' },
    { id: 'status', label: 'Status Updates' }
  ];

  const templates = getTemplatesByCategory(activeTab);

  const generatePortal = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('generatePortalLink', { case_id: caseId });
      return data;
    },
    onSuccess: (data) => {
      setPortalInfo({
        portal_link: data.portal_url || data.data?.portalUrl,
        access_code: data.access_code || data.data?.accessCode
      });
    }
  });

  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    setLoading(true);
    try {
      let currentPortalInfo = portalInfo;
      if (template.category === 'portal' && !currentPortalInfo) {
        const portalResult = await generatePortal.mutateAsync();
        currentPortalInfo = {
          portal_link: portalResult.portal_url || portalResult.portal_link,
          access_code: portalResult.access_code
        };
        setPortalInfo(currentPortalInfo);
      }
      const { data: fillResult } = await base44.functions.invoke('fillEmailTemplate', {
        case_id: caseId, template_id: template.id,
        portal_link: currentPortalInfo?.portal_link, access_code: currentPortalInfo?.access_code
      });
      if (fillResult.success) setEmailContent(fillResult);
    } catch (error) {
      toast.error('Failed to prepare email');
    }
    setLoading(false);
  };

  const handleSendDirect = async () => {
    setSendingDirect(true);
    try {
      const { data: result } = await base44.functions.invoke('sendDirectEmail', {
        case_id: caseId, to: emailContent.to, subject: emailContent.subject,
        body_html: emailContent.body_html, body_text: emailContent.body_text
      });
      if (result.success) {
        toast.success('Email sent successfully!');
      } else if (result.should_use_mailto) {
        toast.warning('Recipient not in system - use "Open in Email Client" option');
      }
    } catch (error) {
      toast.error('Failed to send email');
    }
    setSendingDirect(false);
  };

  const handleCopyContent = () => {
    const textToCopy = `To: ${emailContent.to}\nSubject: ${emailContent.subject}\n\n${emailContent.body_text}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" /> Send Email
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          To: {caseData?.owner_email || 'No email on file'}
        </p>
      </CardHeader>
      
      <div className="flex border-b border-slate-700">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveTab(cat.id);
              setSelectedTemplate(null);
              setEmailContent(null);
            }}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === cat.id 
                ? 'text-emerald-400 border-b-2 border-emerald-500' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      
      <CardContent className="space-y-4 mt-4">
        <div>
          <Label className="text-sm font-medium text-slate-300 mb-2 block">Select Template</Label>
          <div className="space-y-2">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedTemplate?.id === template.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <p className="font-medium text-sm text-slate-100">{template.name}</p>
                <p className="text-xs text-slate-500 mt-1 truncate">{template.subject}</p>
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-sm text-slate-500 mt-2">Preparing email...</p>
          </div>
        )}

        {emailContent && !loading && (
          <div className="border-t border-slate-700 pt-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-sm text-slate-100">Preview</h4>
                <button
                  onClick={handleCopyContent}
                  className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 max-h-64 overflow-y-auto">
                <p className="text-sm text-slate-400 mb-1"><strong>To:</strong> {emailContent.to}</p>
                <p className="text-sm text-slate-400 mb-3"><strong>Subject:</strong> {emailContent.subject}</p>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">{emailContent.body_text}</div>
              </div>
            </div>

            {portalInfo && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm font-medium text-emerald-400 mb-2">Portal Access Info</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-emerald-400/70">Access Code</label>
                    <p className="font-mono font-bold text-emerald-400">{portalInfo.access_code}</p>
                  </div>
                  <div>
                    <label className="text-xs text-emerald-400/70">Portal Link</label>
                    <a href={portalInfo.portal_link} target="_blank" rel="noopener noreferrer"
                      className="text-emerald-400 text-sm hover:underline truncate block">
                      View Portal
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <button
                onClick={handleSendDirect}
                disabled={sendingDirect}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium
                         hover:bg-emerald-700 disabled:bg-emerald-800 flex items-center 
                         justify-center gap-2"
              >
                {sendingDirect ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                ) : (
                  <><Send className="w-4 h-4" />Send Email Directly</>
                )}
              </button>

              <div className="text-center text-sm text-slate-500">or</div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={emailContent.outlook_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 border border-slate-600 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> Open in Outlook
                </a>
                <a
                  href={emailContent.mailto_link}
                  className="py-3 px-4 border border-slate-600 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" /> Default Email App
                </a>
              </div>

              <p className="text-xs text-slate-500 text-center mt-2">
                "Open in..." options let you review and send from your own email account
              </p>
            </div>
          </div>
        )}

        {!selectedTemplate && !loading && (
          <div className="p-8 text-center text-slate-500">
            <Mail className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p>Select a template to preview and send</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}