import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

/**
 * Outreach Panel - Contact tracking and communication
 */
export default function OutreachPanel({ caseId, caseData }) {
  const [contactMethod, setContactMethod] = useState("");
  const [attemptType, setAttemptType] = useState("");
  const [result, setResult] = useState("");
  const [valueUsed, setValueUsed] = useState("");
  const [notes, setNotes] = useState("");

  const queryClient = useQueryClient();

  const { data: attempts = [] } = useQuery({
    queryKey: ["contactAttempts", caseId],
    queryFn: () => base44.entities.ContactAttempt.filter({ case_id: caseId }, "-created_date"),
    enabled: !!caseId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["outreachTemplates"],
    queryFn: () => base44.entities.Template.filter({ is_active: true }),
  });

  const logAttempt = useMutation({
    mutationFn: (data) => base44.functions.invoke("logContactAttempt", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactAttempts", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      queryClient.invalidateQueries({ queryKey: ["todos", caseId] });
      // Reset form
      setContactMethod("");
      setAttemptType("");
      setResult("");
      setValueUsed("");
      setNotes("");
    },
  });

  const sendPortalLink = useMutation({
    mutationFn: () => base44.functions.invoke("generatePortalLink", {
      case_id: caseId,
      send_email: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      alert("Portal link sent successfully!");
    },
  });

  const handleLogContact = () => {
    if (!contactMethod || !result) {
      alert("Contact method and result are required");
      return;
    }

    logAttempt.mutate({
      case_id: caseId,
      contact_method: contactMethod,
      attempt_type: attemptType,
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
        <Tabs defaultValue="log" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="log">Log Contact</TabsTrigger>
            <TabsTrigger value="history">History ({attempts.length})</TabsTrigger>
            <TabsTrigger value="quick">Quick Actions</TabsTrigger>
          </TabsList>

          {/* Log Contact Tab */}
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
              <Select value={valueUsed} onValueChange={setValueUsed}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {caseData?.owner_phone && (
                    <SelectItem value={caseData.owner_phone}>{caseData.owner_phone}</SelectItem>
                  )}
                  {caseData?.owner_email && (
                    <SelectItem value={caseData.owner_email}>{caseData.owner_email}</SelectItem>
                  )}
                </SelectContent>
              </Select>
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

            <Button
              onClick={handleLogContact}
              disabled={logAttempt.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Log Contact Attempt
            </Button>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-3">
            {attempts.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No contact attempts logged</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="p-3 border rounded-lg hover:bg-slate-50"
                  >
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

          {/* Quick Actions Tab */}
          <TabsContent value="quick" className="space-y-3">
            <Button
              onClick={() => sendPortalLink.mutate()}
              disabled={sendPortalLink.isPending || !caseData?.owner_email}
              className="w-full"
              variant="outline"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendPortalLink.isPending ? "Sending..." : "Send Portal Link via Email"}
            </Button>

            <Button
              onClick={() => {
                const phoneTemplates = templates.filter(t => t.category === "phone_script");
                if (phoneTemplates.length > 0) {
                  alert("Phone script:\n\n" + phoneTemplates[0].body);
                } else {
                  alert("No phone script template found");
                }
              }}
              className="w-full"
              variant="outline"
            >
              <Phone className="w-4 h-4 mr-2" />
              View Phone Script
            </Button>

            <Button
              onClick={() => {
                const smsTemplates = templates.filter(t => t.category === "sms");
                if (smsTemplates.length > 0) {
                  navigator.clipboard.writeText(smsTemplates[0].body);
                  alert("SMS template copied to clipboard!");
                } else {
                  alert("No SMS template found");
                }
              }}
              className="w-full"
              variant="outline"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Copy SMS Template
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}