import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Phone,
  Voicemail,
  MessageSquare,
  Copy,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

export default function AgentAssistPanel({ caseData }) {
  const [loadingScript, setLoadingScript] = useState(false);
  const [script, setScript] = useState(null);
  const toast = useStandardToast();

  const loadCallScript = async () => {
    setLoadingScript(true);
    try {
      const { data } = await base44.functions.invoke("generateCallScript", {
        case_id: caseData.id
      });
      
      if (data.status === 'error') {
        toast.error("Failed: " + (data.details || "Unknown error"));
        setLoadingScript(false);
        return;
      }
      
      setScript(data.script || data);
      toast.success("Call script loaded");
    } catch (error) {
      toast.error("Failed: " + (error.response?.data?.details || error.message || "Unknown error"));
    } finally {
      setLoadingScript(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!script && !loadingScript) {
    return null;
  }

  if (loadingScript) {
    return (
      <Card className="border-purple-500/30 bg-purple-500/10">
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-300">Preparing your script...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/30 bg-purple-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-400">
          <MessageSquare className="w-5 h-5" />
          Agent Assist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCallScript}
            className="text-xs"
          >
            Regenerate
          </Button>
        </div>

        {/* Call Script */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-400" />
              <h4 className="font-semibold text-purple-400">Opening Script</h4>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(script.opening)}
              className="text-slate-300 hover:text-white"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {script.opening}
          </p>
        </div>

        {/* Identity Questions */}
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <h4 className="font-semibold text-blue-400">Identity Verification</h4>
          </div>
          <div className="space-y-2">
            {script.identity_questions.map((q, i) => (
              <div key={i} className="bg-slate-800 p-2 rounded border border-blue-500/20 text-sm">
                <p className="font-medium text-slate-100">{q.question}</p>
                <p className="text-xs text-slate-400 mt-1">Expected: {q.expected_answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* The Pitch */}
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-green-400" />
              <h4 className="font-semibold text-green-400">The Pitch</h4>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(script.pitch)}
              className="text-slate-300 hover:text-white"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {script.pitch}
          </p>
        </div>

        {/* Objection Handling */}
        <Accordion type="single" collapsible className="bg-slate-800 rounded-lg border border-amber-500/30">
          <AccordionItem value="objections" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2 text-amber-400">
                <HelpCircle className="w-4 h-4" />
                <span className="font-semibold">Objection Handling ({script.objection_responses.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                {script.objection_responses.map((obj, i) => (
                  <div key={i} className="bg-amber-500/10 p-3 rounded border border-amber-500/20">
                    <p className="text-sm font-semibold text-amber-400 mb-2">"{obj.objection}"</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{obj.response}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs text-amber-400"
                      onClick={() => copyToClipboard(obj.response)}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy Response
                    </Button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Voicemail Script */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Voicemail className="w-4 h-4 text-slate-300" />
              <h4 className="font-semibold text-slate-100">Voicemail Script</h4>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(script.closing)}
              className="text-slate-300 hover:text-white"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {script.closing}
          </p>
        </div>

        {/* County Notes */}
        {script.county_notes && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
            <p className="text-xs font-semibold text-slate-300 mb-1">County-Specific Notes:</p>
            <p className="text-xs text-slate-400">{script.county_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}