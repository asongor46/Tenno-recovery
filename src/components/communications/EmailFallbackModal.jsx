import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function EmailFallbackModal({ open, onClose, data }) {
  const [copied, setCopied] = React.useState(null);

  if (!data) return null;

  const copyToClipboard = async (text, type) => {
    await navigator.clipboard.writeText(text || "");
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email Content (Copy Manually)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-500">To:</label>
            <p className="font-mono bg-slate-100 p-2 rounded mt-1">{data.recipientEmail}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-500">Subject:</label>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(data.emailSubject, "subject")}>
                {copied === "subject" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="font-mono bg-slate-100 p-2 rounded mt-1 text-sm">{data.emailSubject}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-500">Body:</label>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(data.emailBody, "body")}>
                {copied === "body" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <pre className="font-mono bg-slate-100 p-3 rounded mt-1 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
{data.emailBody}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}