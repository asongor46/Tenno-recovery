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

      // If email was sent directly by backend, show success
      if (data.email_sent) {
        toast.success(`Portal link sent to ${ownerEmail}`);
        return { success: true, data: data.data || data };
      }

      // Email failed — fallback to mailto
      toast.warning("Portal link generated but email failed. Opening email client...");
      const emailContent = data.email_content || {};
      const subject = encodeURIComponent(emailContent.subject || data.data?.emailSubject || "");
      const body = encodeURIComponent(emailContent.body || data.data?.emailBody || "");
      const to = encodeURIComponent(emailContent.to || data.data?.recipientEmail || ownerEmail);

      try {
        const a = document.createElement("a");
        a.href = `mailto:${to}?subject=${subject}&body=${body}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        setFallbackData({
          recipientEmail: decodeURIComponent(to),
          emailSubject: decodeURIComponent(subject),
          emailBody: decodeURIComponent(body),
        });
        toast.warning("Could not open email client. Copy the content manually.");
      }

      return { success: true, data: data.data || data };
    } finally {
      setIsLoading(false);
    }
  };

  const clearFallback = () => setFallbackData(null);

  return { generateAndSend, isLoading, fallbackData, clearFallback };
}

export default usePortalLink;