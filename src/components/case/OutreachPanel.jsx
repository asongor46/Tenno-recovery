import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  MessageSquare,
  Send,
  Copy,
  CheckCircle2,
  Clock,
  User,
  FileText,
  HelpCircle,
  Loader2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function OutreachPanel({ caseId, caseData }) {
  const [contactMethod, setContactMethod] = useState("");
  const [result, setResult] = useState("");
  const [valueUsed, setValueUsed] = useState("");
  const [notes, setNotes] = useState("");
  const [callScript, setCallScript] = useState(null);
  const [loadingScript, setLoadingScript] = useState(false);

  const queryClient = useQueryClient();

  const { data: attempts = [] } = useQuery({
    queryKey: ["contactAttempts", caseId],
    queryFn: () => base44.entities.ContactAttempt.filter({ case_id: caseId }, "-created_date"),
    enabled: !!caseId,
  });

  const logAttempt = useMutation({
    mutationFn: (data) => base44.functions.invoke("logContactAttempt", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactAttempts", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      setContactMethod("");
      setResult("");
      setValueUsed("");
      setNotes("");
      toast.success("Contact attempt logged");
    },
  });

  const sendPortalLink = useMutation({
    mutationFn: () => base44.functions.invoke("generatePortalLink", {
      case_id: caseId,
      send_email: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      toast.success("Portal link sent!");
    },
  });

  const loadCallScript = async () => {
    setLoadingScript(true);
    try {
      const { data } = await base44.functions.invoke("generateCallScript", {
        case_id: caseId
      });
      setCallScript(data.script);
    } catch (error) {
      toast.error("Failed to generate call script");
    } finally {
      setLoadingScript(false);
    }
  };

  const copyTemplate = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleLogContact = () => {
    if (!contactMethod || !result) {
      toast.error("Contact method and result are required");
      return;
    }

    logAttempt.mutate({
      case_id: caseId,
      contact_method: contactMethod,
      attempt_type: contactMethod === "phone" ? "call" : contactMethod,
      value_used: valueUsed,
      result,
      notes,
    });
  };

  const getResultIcon = (result) => {
    if (result.includes("interested") || result === "spoke_to_owner") {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (result === "owner_declined" || result === "wrong_number") {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-amber-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Outreach & Communication
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="script" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="script">Call Script</TabsTrigger>
            <TabsTrigger value="log">Log Contact</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="quick">Quick Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="script" className="space-y-4">
            {!callScript ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">Generate a personalized call script</p>
                <Button onClick={loadCallScript} disabled={loadingScript}>
                  {loadingScript ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Call Script
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-emerald-900">Opening</h4>
                    <Button variant="ghost" size="sm" onClick={() => copyTemplate(callScript.opening)}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{callScript.opening}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Identity Verification Questions</h4>
                  <div className="space-y-3">
                    {callScript.identity_questions.map((q, i) => (
                      <div key={i} className="bg-white p-3 rounded border border-blue-100">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{q.question}</p>
                            <p className="text-xs text-slate-500 mt-1">Expected: {q.expected_answer}</p>
                            <Badge variant="outline" className="text-xs mt-1">{q.purpose}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-purple-900">The Pitch</h4>
                    <Button variant="ghost" size="sm" onClick={() => copyTemplate(callScript.pitch)}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{callScript.pitch}</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Objection Handling
                  </h4>
                  <Accordion type="single" collapsible>
                    {callScript.objection_responses.map((obj, i) => (
                      <AccordionItem key={i} value={`obj-${i}`}>
                        <AccordionTrigger className="text-sm font-medium">
                          "{obj.objection}"
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="bg-white p-3 rounded border">
                            <p className="text-sm text-slate-700">{obj.response}</p>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyTemplate(obj.response)}>
                              <Copy className="w-3 h-3 mr-1" /> Copy Response
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-900">Closing</h4>
                    <Button variant="ghost" size="sm" onClick={() => copyTemplate(callScript.closing)}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{callScript.closing}</p>
                </div>

                {callScript.county_notes && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">County-Specific Notes</h4>
                    <p className="text-sm text-slate-700">{callScript.county_notes}</p>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={loadCallScript} disabled={loadingScript}>
                  <FileText className="w-4 h-4 mr-2" /> Regenerate Script
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="log" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Method</Label>
                <Select value={contactMethod} onValueChange={setContactMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="text">Text/SMS</SelectItem>
                    <SelectItem value="mail">Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Result</Label>
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                    <SelectItem value="left_voicemail">Left Voicemail</SelectItem>
                    <SelectItem value="spoke_to_owner">Spoke to Owner</SelectItem>
                    <SelectItem value="spoke_to_relative">Spoke to Relative</SelectItem>
                    <SelectItem value="wrong_number">Wrong Number</SelectItem>
                    <SelectItem value="disconnected">Disconnected</SelectItem>
                    <SelectItem value="owner_interested">Owner Interested</SelectItem>
                    <SelectItem value="owner_declined">Owner Declined</SelectItem>
                    <SelectItem value="callback_requested">Callback Requested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Phone/Email Used</Label>
              <Input
                value={valueUsed}
                onChange={(e) => setValueUsed(e.target.value)}
                placeholder={caseData?.owner_phone || caseData?.owner_email || "Enter contact used"}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add details about this contact attempt..."
                rows={3}
              />
            </div>

            <Button onClick={handleLogContact} disabled={logAttempt.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {logAttempt.isPending ? "Logging..." : "Log Contact Attempt"}
            </Button>
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {attempts.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No contact attempts logged</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="p-3 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        {getResultIcon(attempt.result)}
                        <div className="flex-1">
                          <p className="font-medium text-sm capitalize">
                            {attempt.contact_method} - {attempt.result.replace(/_/g, " ")}
                          </p>
                          {attempt.value_used && (
                            <p className="text-xs text-slate-500 mt-0.5">{attempt.value_used}</p>
                          )}
                          {attempt.notes && (
                            <p className="text-sm text-slate-600 mt-1">{attempt.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(attempt.created_date), "MMM d")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quick" className="space-y-3">
            <Button onClick={() => sendPortalLink.mutate()} disabled={sendPortalLink.isPending || !caseData?.owner_email} className="w-full" variant="outline">
              <Send className="w-4 h-4 mr-2" />
              {sendPortalLink.isPending ? "Sending..." : "Send Portal Link via Email"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}