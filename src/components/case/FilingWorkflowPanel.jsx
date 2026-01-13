import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Send,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

/**
 * Filing Workflow Panel - Manage filing, waiting period, and court decisions
 */
export default function FilingWorkflowPanel({ caseId, caseData }) {
  const [filingMethod, setFilingMethod] = useState("mail");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [filingNotes, setFilingNotes] = useState("");
  
  const [decisionType, setDecisionType] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");
  
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("check");
  const [paymentCheckNumber, setPaymentCheckNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [showFilingDialog, setShowFilingDialog] = useState(false);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const queryClient = useQueryClient();

  const fileCase = useMutation({
    mutationFn: () => base44.functions.invoke("fileCase", {
      case_id: caseId,
      filing_method: filingMethod,
      tracking_number: trackingNumber,
      notes: filingNotes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      queryClient.invalidateQueries({ queryKey: ["todos", caseId] });
      setShowFilingDialog(false);
      toast.success("Case filed successfully!");
    },
    onError: (error) => {
      console.error("Error filing case:", error);
      toast.error("Failed to file case: " + error.message);
    },
  });

  const recordDecision = useMutation({
    mutationFn: () => base44.functions.invoke("recordCourtDecision", {
      case_id: caseId,
      decision_type: decisionType,
      decision_date: decisionDate,
      decision_notes: decisionNotes,
      approved_amount: approvedAmount ? parseFloat(approvedAmount) : null,
      check_number: checkNumber,
      expected_payment_date: expectedPaymentDate
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      queryClient.invalidateQueries({ queryKey: ["todos", caseId] });
      setShowDecisionDialog(false);
      toast.success("Decision recorded successfully!");
    },
    onError: (error) => {
      console.error("Error recording decision:", error);
      toast.error("Failed to record decision: " + error.message);
    },
  });

  const recordPayment = useMutation({
    mutationFn: () => base44.functions.invoke("recordPayment", {
      case_id: caseId,
      payment_amount: parseFloat(paymentAmount),
      payment_date: paymentDate,
      payment_method: paymentMethod,
      check_number: paymentCheckNumber,
      notes: paymentNotes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", caseId] });
      queryClient.invalidateQueries({ queryKey: ["todos", caseId] });
      setShowPaymentDialog(false);
      toast.success("Payment recorded successfully!");
    },
    onError: (error) => {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment: " + error.message);
    },
  });

  const getWaitingDays = () => {
    if (!caseData.filed_at) return null;
    const filed = new Date(caseData.filed_at);
    const now = new Date();
    return Math.floor((now - filed) / (1000 * 60 * 60 * 24));
  };

  const waitingDays = getWaitingDays();

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Filing & Court Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filing Status */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                caseData.filed_at ? 'bg-green-100' : 'bg-slate-200'
              }`}>
                {caseData.filed_at ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <FileCheck className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-medium">Filing Status</p>
                {caseData.filed_at ? (
                  <p className="text-sm text-slate-500">
                    Filed on {format(new Date(caseData.filed_at), "MMM d, yyyy")}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Not yet filed</p>
                )}
              </div>
            </div>
            {!caseData.filed_at && (
              <Dialog open={showFilingDialog} onOpenChange={setShowFilingDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!caseData.packet_url}>
                    <Send className="w-4 h-4 mr-2" />
                    File Case
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>File Case</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Filing Method</Label>
                      <Select value={filingMethod} onValueChange={setFilingMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mail">Mail</SelectItem>
                          <SelectItem value="efile">E-File</SelectItem>
                          <SelectItem value="in_person">In Person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tracking Number (optional)</Label>
                      <Input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="USPS, FedEx, etc."
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={filingNotes}
                        onChange={(e) => setFilingNotes(e.target.value)}
                        placeholder="Filing notes..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => fileCase.mutate()}
                      disabled={fileCase.isPending}
                      className="w-full"
                    >
                      {fileCase.isPending ? "Filing..." : "Confirm Filing"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Waiting Period */}
          {caseData.filed_at && caseData.stage !== 'approved' && caseData.stage !== 'paid' && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Waiting Period</p>
                  <p className="text-sm text-blue-600">
                    {waitingDays} days since filing
                  </p>
                </div>
              </div>
              {waitingDays > 90 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Follow up needed
                </Badge>
              )}
            </div>
          )}

          {/* Court Decision */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                caseData.stage === 'approved' ? 'bg-green-100' :
                caseData.stage === 'closed' && !caseData.paid_at ? 'bg-red-100' :
                'bg-slate-200'
              }`}>
                {caseData.stage === 'approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : caseData.stage === 'closed' && !caseData.paid_at ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <FileCheck className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-medium">Court Decision</p>
                {caseData.stage === 'approved' ? (
                  <p className="text-sm text-green-600">Approved</p>
                ) : caseData.stage === 'closed' && !caseData.paid_at ? (
                  <p className="text-sm text-red-600">Denied</p>
                ) : (
                  <p className="text-sm text-slate-500">Awaiting decision</p>
                )}
              </div>
            </div>
            {caseData.filed_at && !caseData.paid_at && caseData.stage !== 'approved' && (
              <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Record Decision
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Court Decision</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Decision Type</Label>
                      <Select value={decisionType} onValueChange={setDecisionType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select decision" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="denied">Denied</SelectItem>
                          <SelectItem value="more_info_needed">More Info Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Decision Date</Label>
                      <Input
                        type="date"
                        value={decisionDate}
                        onChange={(e) => setDecisionDate(e.target.value)}
                      />
                    </div>
                    {decisionType === 'approved' && (
                      <>
                        <div>
                          <Label>Approved Amount</Label>
                          <Input
                            type="number"
                            value={approvedAmount}
                            onChange={(e) => setApprovedAmount(e.target.value)}
                            placeholder="Amount"
                          />
                        </div>
                        <div>
                          <Label>Check Number (optional)</Label>
                          <Input
                            value={checkNumber}
                            onChange={(e) => setCheckNumber(e.target.value)}
                            placeholder="Check #"
                          />
                        </div>
                        <div>
                          <Label>Expected Payment Date</Label>
                          <Input
                            type="date"
                            value={expectedPaymentDate}
                            onChange={(e) => setExpectedPaymentDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        placeholder="Decision details..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => recordDecision.mutate()}
                      disabled={recordDecision.isPending || !decisionType}
                      className="w-full"
                    >
                      {recordDecision.isPending ? "Recording..." : "Record Decision"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Payment */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                caseData.paid_at ? 'bg-emerald-100' : 'bg-slate-200'
              }`}>
                {caseData.paid_at ? (
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                ) : (
                  <DollarSign className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-medium">Payment</p>
                {caseData.paid_at ? (
                  <p className="text-sm text-emerald-600">
                    Received ${caseData.payment_amount?.toLocaleString()} on{" "}
                    {format(new Date(caseData.paid_at), "MMM d, yyyy")}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Not received</p>
                )}
              </div>
            </div>
            {caseData.stage === 'approved' && !caseData.paid_at && (
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Payment Amount</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Amount received"
                      />
                    </div>
                    <div>
                      <Label>Payment Date</Label>
                      <Input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="wire">Wire Transfer</SelectItem>
                          <SelectItem value="ach">ACH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {paymentMethod === 'check' && (
                      <div>
                        <Label>Check Number</Label>
                        <Input
                          value={paymentCheckNumber}
                          onChange={(e) => setPaymentCheckNumber(e.target.value)}
                          placeholder="Check #"
                        />
                      </div>
                    )}
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Payment notes..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => recordPayment.mutate()}
                      disabled={recordPayment.isPending || !paymentAmount}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      {recordPayment.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}