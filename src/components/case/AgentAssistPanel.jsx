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
      setScript(data);
      toast.success("Call script loaded");
    } catch (error) {
      toast.error("Failed to generate script");
    } finally {
      setLoadingScript(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (!script && !loadingScript) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="pt-6 text-center">
          <MessageSquare className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">Generate your call script</p>
          <Button onClick={loadCallScript} className="bg-purple-600 hover:bg-purple-700">
            <Phone className="w-4 h-4 mr-2" />
            Load Agent Assist
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loadingScript) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-600">Preparing your script...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <MessageSquare className="w-5 h-5" />
          Agent Assist
          <Badge variant="outline" className="ml-auto text-xs border-purple-300 text-purple-700">
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCallScript}
            className="text-xs border-purple-200 hover:bg-purple-100"
          >
            Regenerate
          </Button>
        </div>

        {/* Call Script */}
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-700" />
              <h4 className="font-semibold text-purple-900">Opening Script</h4>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(script.opening)}
              className="text-purple-700 hover:text-purple-900"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {script.opening}
          </p>
        </div>

        {/* Identity Questions */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
            <h4 className="font-semibold text-blue-900">Identity Verification</h4>
          </div>
          <div className="space-y-2">
            {script.identity_questions.map((q, i) => (
              <div key={i} className="bg-white p-2 rounded border border-blue-100 text-sm">
                <p className="font-medium text-slate-800">{q.question}</p>
                <p className="text-xs text-slate-500 mt-1">Expected: {q.expected_answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* The Pitch */}
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-700" />
              <h4 className="font-semibold text-emerald-900">The Pitch</h4>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(script.pitch)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {script.pitch}
          </p>
        </div>

        {/* Objection Handling */}
        <Accordion type="single" collapsible className="bg-white rounded-lg border border-amber-200">
          <AccordionItem value="objections" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2 text-amber-900">
                <HelpCircle className="w-4 h-4" />
                <span className="font-semibold">Objection Handling ({script.objection_responses.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                {script.objection_responses.map((obj, i) => (
                  <div key={i} className="bg-amber-50 p-3 rounded border border-amber-100">
                    <p className="text-sm font-semibold text-amber-900 mb-2">"{obj.objection}"</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{obj.response}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs text-amber-700"
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
        <div className="bg-slate-100 rounded-lg p-4 border border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Voicemail className="w-4 h-4 text-slate-700" />
              <h4 className="font-semibold text-slate-900">Voicemail Script</h4>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard(script.closing)}
              className="text-slate-700 hover:text-slate-900"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {script.closing}
          </p>
        </div>

        {/* County Notes */}
        {script.county_notes && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-1">County-Specific Notes:</p>
            <p className="text-xs text-slate-600">{script.county_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}