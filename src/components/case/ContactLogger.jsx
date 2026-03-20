import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PhoneOff,
  PhoneMissed,
  CalendarClock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStandardToast } from "@/components/shared/useStandardToast";

const OUTCOMES = [
  { value: "no_answer", label: "No Answer", icon: PhoneMissed, color: "text-slate-500" },
  { value: "left_voicemail", label: "Left Voicemail", icon: Phone, color: "text-blue-500" },
  { value: "hung_up", label: "Hung Up", icon: PhoneOff, color: "text-red-500" },
  { value: "thought_scam", label: "Thought It Was a Scam", icon: AlertCircle, color: "text-orange-500" },
  { value: "interested_sending_portal", label: "Interested — Sending Portal Link", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "interested_thinking", label: "Interested — Needs to Think About It", icon: Clock, color: "text-amber-500" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-red-600" },
  { value: "wrong_number", label: "Wrong Number", icon: PhoneOff, color: "text-slate-500" },
  { value: "disconnected", label: "Number Disconnected", icon: PhoneOff, color: "text-slate-400" },
  { value: "call_back", label: "Need to Call Back", icon: CalendarClock, color: "text-purple-500" },
  { value: "signed_up", label: "Signed Up", icon: CheckCircle2, color: "text-emerald-700" },
];

const METHOD_ICONS = {
  phone: Phone,
  email: Mail,
  text: MessageSquare,
  in_person: Users,
};

const OUTCOME_BADGE_COLORS = {
  no_answer: "bg-slate-100 text-slate-600",
  left_voicemail: "bg-blue-100 text-blue-700",
  hung_up: "bg-red-100 text-red-700",
  thought_scam: "bg-orange-100 text-orange-700",
  interested_sending_portal: "bg-emerald-100 text-emerald-700",
  interested_thinking: "bg-amber-100 text-amber-700",
  not_interested: "bg-red-100 text-red-700",
  wrong_number: "bg-slate-100 text-slate-600",
  disconnected: "bg-slate-100 text-slate-500",
  call_back: "bg-purple-100 text-purple-700",
  signed_up: "bg-emerald-100 text-emerald-800",
};

export default function ContactLogger({ caseId, caseData }) {
  const [showDialog, setShowDialog] = useState(false);
  const [method, setMethod] = useState("phone");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const { data: attempts = [] } = useQuery({
    queryKey: ["contactAttempts", caseId],
    queryFn: () => base44.entities.ContactAttempt.filter({ case_id: caseId }, "-created_date"),
    enabled: !!caseId,
  });

  const logMutation = useMutation({
    mutationFn: async (data) => {
      const attempt = await base44.entities.ContactAttempt.create(data);

      // Log activity
      await base44.entities.ActivityLog.create({
        case_id: caseId,
        action: "Contact Attempt",
        description: `${data.contact_method.toUpperCase()} — ${OUTCOMES.find(o => o.value === data.outcome)?.label}`,
        is_client_visible: false,
      });

      // If "Need to Call Back" with date, create a Todo
      if (data.outcome === "call_back" && data.follow_up_date) {
        await base44.entities.Todo.create({
          case_id: caseId,
          title: `Call back ${caseData?.owner_name || "homeowner"}`,
          description: data.notes || "Follow-up call",
          due_date: data.follow_up_date,
          priority: "high",
          auto_generated: true,
        });
        toast.success("Logged + reminder created!");
      } else {
        toast.success("Contact attempt logged");
      }

      return attempt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactAttempts", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      setShowDialog(false);
      setOutcome("");
      setNotes("");
      setFollowUpDate("");
    },
  });

  const handleSubmit = () => {
    if (!outcome) {
      toast.error("Please select an outcome");
      return;
    }
    logMutation.mutate({
      case_id: caseId,
      contact_method: method,
      outcome,
      notes: notes || undefined,
      contacted_at: new Date().toISOString(),
      follow_up_date: followUpDate || undefined,
    });
  };

  const selectedOutcome = OUTCOMES.find(o => o.value === outcome);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Contact History</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{attempts.length} attempt{attempts.length !== 1 ? "s" : ""} total</p>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-3 h-3 mr-1" /> Log Contact
          </Button>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No contact attempts logged yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {attempts.map((attempt) => {
                const MethodIcon = METHOD_ICONS[attempt.contact_method] || Phone;
                const outcomeLabel = OUTCOMES.find(o => o.value === attempt.outcome)?.label || attempt.outcome;
                return (
                  <div key={attempt.id} className="flex gap-3 items-start border-b last:border-0 pb-3 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MethodIcon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs border-0 ${OUTCOME_BADGE_COLORS[attempt.outcome] || "bg-slate-100 text-slate-600"}`}>
                          {outcomeLabel}
                        </Badge>
                        <span className="text-xs text-slate-400 capitalize">{attempt.contact_method}</span>
                      </div>
                      {attempt.notes && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{attempt.notes}</p>
                      )}
                      {attempt.follow_up_date && (
                        <p className="text-xs text-purple-600 mt-0.5">
                          Follow-up: {format(new Date(attempt.follow_up_date), "MMM d, yyyy")}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {attempt.contacted_at
                          ? format(new Date(attempt.contacted_at), "MMM d, yyyy h:mm a")
                          : format(new Date(attempt.created_date), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Contact Attempt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Contact Method</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[
                  { value: "phone", label: "Phone", icon: Phone },
                  { value: "email", label: "Email", icon: Mail },
                  { value: "text", label: "Text", icon: MessageSquare },
                  { value: "in_person", label: "In Person", icon: Users },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setMethod(value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                      method === value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map(({ value, label, icon: Icon, color }) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${color}`} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {outcome === "call_back" && (
              <div>
                <Label>Follow-up Date</Label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="mt-1 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={logMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {logMutation.isPending ? "Logging..." : "Log Attempt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}