// [NEW - CallScriptModal]
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Phone, PhoneOff, Voicemail, XCircle } from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

export default function CallScriptModal({ open, onClose, caseData, county }) {
  const [logging, setLogging] = useState(false);
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const logContactAttempt = async (result) => {
    setLogging(true);
    try {
      await base44.functions.invoke("logContactAttempt", {
        case_id: caseData.id,
        contact_type: "phone",
        contact_value: caseData.owner_phone || "unknown",
        result: result,
        notes: `Called from script modal`
      });

      queryClient.invalidateQueries({ queryKey: ["activities", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["case", caseData.id] });
      toast.success(`Logged: ${result.replace(/_/g, " ")}`);
      onClose();
    } catch (error) {
      toast.error("Failed to log contact attempt");
    } finally {
      setLogging(false);
    }
  };

  const feePercent = caseData?.fee_percent || caseData?.recommended_fee_percent || 25;
  const surplusAmount = caseData?.surplus_amount || 0;

  const objectionHandlers = [
    {
      objection: "Is this a scam?",
      response: `I completely understand your concern. You can verify the surplus exists by calling ${county?.name || "your county"} Clerk directly${county?.clerk_phone ? ` at ${county.clerk_phone}` : ""}. We're simply offering to handle the legal paperwork for you.`
    },
    {
      objection: "Why can't I do this myself?",
      response: "You absolutely can! But it requires filing legal documents, potentially appearing in court, and navigating county bureaucracy. Most people prefer to have us handle it so they don't have to deal with the complexity."
    },
    {
      objection: "Your fee is too high",
      response: `I understand. Keep in mind, you pay nothing unless we recover funds, and we handle everything—the paperwork, the court filings, the follow-up. What fee would work better for you? We can sometimes adjust to ${feePercent - 5}% depending on the complexity.`
    },
    {
      objection: "I need to think about it",
      response: `Of course! Take your time. Just keep in mind, ${county?.name || "this county"} has a ${county?.claim_deadline_days || 180}-day deadline to file from the sale date. I'll follow up with you in a few days. Is there anything specific you'd like to know before you decide?`
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            Call Script - {caseData?.owner_name}
          </DialogTitle>
          <div className="text-sm text-slate-600">
            Calling: {caseData?.owner_phone || "No phone number"}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Opening */}
            <div>
              <Badge className="mb-2 bg-emerald-100 text-emerald-700 border-0">Opening</Badge>
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm text-slate-900 leading-relaxed">
                  "Hi, is this <strong>{caseData?.owner_name}</strong>? Great! My name is [YOUR NAME] 
                  and I'm calling from Tenno Asset Recovery.
                  <br/><br/>
                  I'm reaching out because you may have money owed to you from a recent property sale 
                  at <strong>{caseData?.property_address}</strong>.
                  <br/><br/>
                  Are you aware there's approximately <strong>${surplusAmount.toLocaleString()}</strong> in 
                  surplus funds that may belong to you?"
                </p>
              </div>
            </div>

            {/* If Interested */}
            <div>
              <Badge className="mb-2 bg-blue-100 text-blue-700 border-0">If Interested</Badge>
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm text-slate-900 leading-relaxed">
                  "Great! Here's how this works — when your property sold at auction, it sold for more 
                  than what was owed. That extra money, called surplus funds, legally belongs to you.
                  <br/><br/>
                  We handle all the paperwork and court filings to recover it. Our fee is <strong>{feePercent}%</strong> of 
                  whatever we recover — and you pay nothing unless we get your money. No upfront costs at all.
                  <br/><br/>
                  To get started, I just need your email address and I'll send you a secure link where you 
                  can review our agreement and provide some basic information. What's the best email to reach you?"
                </p>
              </div>
            </div>

            {/* Objection Handlers */}
            <div>
              <Badge className="mb-2 bg-amber-100 text-amber-700 border-0">Objection Handlers</Badge>
              <Accordion type="single" collapsible>
                {objectionHandlers.map((handler, i) => (
                  <AccordionItem key={i} value={`objection-${i}`}>
                    <AccordionTrigger className="text-sm font-medium">
                      "{handler.objection}"
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-900 leading-relaxed">
                          "{handler.response}"
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Voicemail Script */}
            <div>
              <Badge className="mb-2 bg-slate-100 text-slate-700 border-0">Voicemail Script</Badge>
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm text-slate-900 leading-relaxed">
                  "Hi <strong>{caseData?.owner_name}</strong>, this is [YOUR NAME] from Tenno Asset Recovery.
                  <br/><br/>
                  I'm calling because you may have over <strong>${surplusAmount.toLocaleString()}</strong> owed 
                  to you from a recent property sale in {caseData?.county}.
                  <br/><br/>
                  This is legitimate surplus money from the foreclosure. Please call me back at 
                  [YOUR NUMBER] to learn more.
                  <br/><br/>
                  Again, this is [YOUR NAME], [YOUR NUMBER]. Thank you!"
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Quick Log Buttons */}
        <div className="border-t pt-4">
          <p className="text-xs text-slate-500 mb-3">Log Call Result:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => logContactAttempt("spoke_to_owner")}
              disabled={logging}
              className="gap-2"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              Spoke to Owner
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logContactAttempt("voicemail")}
              disabled={logging}
              className="gap-2"
            >
              <Voicemail className="w-4 h-4 text-blue-600" />
              Left Voicemail
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logContactAttempt("no_answer")}
              disabled={logging}
              className="gap-2"
            >
              <PhoneOff className="w-4 h-4 text-amber-600" />
              No Answer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logContactAttempt("wrong_number")}
              disabled={logging}
              className="gap-2"
            >
              <XCircle className="w-4 h-4 text-red-600" />
              Wrong Number
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}