import React from "react";
import { base44 } from "@/api/base44Client";
import { useStandardToast } from "@/components/shared/useStandardToast";

export function usePortalLink() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [fallbackData, setFallbackData] = React.useState(null);
  const toast = useStandardToast();

  const generateAndSend = async (caseId, ownerEmail) => {
    if (!ownerEmail) {
      toast.error("Owner email is required. Add it under Homeowner Info.");
      return { success: false };
    }

    setIsLoading(true);
    try {
      const resp = await base44.functions.invoke("generatePortalLink", { case_id: caseId });
      const data = resp.data || {};

      if (!data.success && data.status !== "success") {
        console.error("Portal Link Diagnostics:", data.diagnostics);
        toast.error(data.details || "Failed to generate portal link");
        return { success: false };
      }

      // Prefer Outlook deeplink with filled template
      try {
        const tplResp = await base44.entities.EmailTemplate.filter({ name: 'Portal Link', is_active: true });
        if (tplResp && tplResp.length > 0) {
          const tpl = tplResp[0];
          const filled = await base44.functions.invoke('fillEmailTemplate', { template_id: tpl.id, case_id: caseId });
          const out = filled.data || {};
          if (out.outlook_link) {
            window.open(out.outlook_link, '_blank');
            toast.success(`Outlook opened for ${out.recipient || ownerEmail}`);
            return { success: true, data: out };
          }
        }
      } catch (e) {
        console.warn('Outlook deeplink fallback to mailto:', e?.message);
      }

      // Fallback to mailto
      const email = data.email_content || {};
      const subject = encodeURIComponent(email.subject || data.data?.emailSubject || "");
      const body = encodeURIComponent(email.body || data.data?.emailBody || "");
      const to = encodeURIComponent(email.to || data.data?.recipientEmail || ownerEmail);

      const mailto = `mailto:${to}?subject=${subject}&body=${body}`;

      try {
        const a = document.createElement("a");
        a.href = mailto;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(`Email client opened for ${decodeURIComponent(to)}`);
      } catch (e) {
        setFallbackData({
          recipientEmail: decodeURIComponent(to),
          emailSubject: decodeURIComponent(subject),
          emailBody: decodeURIComponent(body),
        });
        toast.warning("Could not open email client. Copy the content manually.");
      }

      return { success: true, data: data.data };
    } finally {
      setIsLoading(false);
    }
  };

  const clearFallback = () => setFallbackData(null);

  return { generateAndSend, isLoading, fallbackData, clearFallback };
}

export default usePortalLink;