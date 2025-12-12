import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  FileText,
  Calendar,
  DollarSign,
  Upload,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";

/**
 * Order & Treasurer Workflow Panel
 * Tracks order filing, judge signature, and treasurer submission
 */
export default function OrderTreasurerPanel({ caseId, caseData }) {
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showTreasurerDialog, setShowTreasurerDialog] = useState(false);
  const [orderDate, setOrderDate] = useState("");
  const [treasurerDate, setTreasurerDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  const queryClient = useQueryClient();

  const fileOrderMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Case.update(caseId, {
        order_filed: true,
        filing_status: 'order_phase',
      });

      await base44.entities.ActivityLog.create({
        case_id: caseId,
        action: 'order_filed',
        description: 'Proposed order filed with court',
        performed_by: (await base44.auth.me()).email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      setShowOrderDialog(false);
    },
  });

  const signOrderMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Case.update(caseId, {
        order_signed: true,
        order_signed_date: orderDate,
        filing_status: 'treasurer_phase',
        invoice_status: 'ready', // Now ready to invoice
      });

      await base44.entities.ActivityLog.create({
        case_id: caseId,
        action: 'order_signed',
        description: `Order signed by judge on ${orderDate}`,
        performed_by: (await base44.auth.me()).email,
      });

      // Create todo for treasurer submission
      await base44.entities.Todo.create({
        case_id: caseId,
        title: `Submit to Treasurer - ${caseData.owner_name}`,
        description: 'Submit signed order to county treasurer',
        priority: 'high',
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      setShowOrderDialog(false);
      setOrderDate("");
    },
  });

  const submitTreasurerMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Case.update(caseId, {
        treasurer_submission_date: treasurerDate,
      });

      await base44.entities.ActivityLog.create({
        case_id: caseId,
        action: 'treasurer_submitted',
        description: `Submitted to treasurer on ${treasurerDate}`,
        performed_by: (await base44.auth.me()).email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      setShowTreasurerDialog(false);
      setTreasurerDate("");
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Case.update(caseId, {
        treasurer_payment_received: paymentDate,
        filing_status: 'completed',
        invoice_status: 'ready',
      });

      await base44.entities.ActivityLog.create({
        case_id: caseId,
        action: 'treasurer_payment_received',
        description: `Payment received from treasurer on ${paymentDate}`,
        performed_by: (await base44.auth.me()).email,
      });

      // Create alert to send invoice
      await base44.entities.Alert.create({
        case_id: caseId,
        title: 'Ready to Invoice',
        message: `${caseData.owner_name} - Treasurer payment received. Send invoice now.`,
        type: 'action_required',
        priority: 'high',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      setShowTreasurerDialog(false);
      setPaymentDate("");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Order & Treasurer Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {caseData.order_filed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300" />
              )}
              <span className="font-medium">Proposed Order Filed</span>
            </div>
            {!caseData.order_filed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileOrderMutation.mutate()}
                disabled={fileOrderMutation.isPending}
              >
                {fileOrderMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Mark Filed"
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {caseData.order_signed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300" />
              )}
              <span className="font-medium">Order Signed by Judge</span>
            </div>
            {caseData.order_filed && !caseData.order_signed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOrderDialog(true)}
              >
                Record Signature
              </Button>
            )}
          </div>

          {caseData.order_signed_date && (
            <div className="ml-7 text-sm text-slate-500">
              Signed: {format(new Date(caseData.order_signed_date), "MMM d, yyyy")}
            </div>
          )}
        </div>

        {/* Treasurer Status */}
        {caseData.order_signed && (
          <>
            <div className="border-t pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {caseData.treasurer_submission_date ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                  <span className="font-medium">Submitted to Treasurer</span>
                </div>
                {!caseData.treasurer_submission_date && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTreasurerDialog(true)}
                  >
                    Record Submission
                  </Button>
                )}
              </div>

              {caseData.treasurer_submission_date && (
                <div className="ml-7 text-sm text-slate-500">
                  Submitted: {format(new Date(caseData.treasurer_submission_date), "MMM d, yyyy")}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {caseData.treasurer_payment_received ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                  <span className="font-medium">Payment Received</span>
                </div>
                {caseData.treasurer_submission_date && !caseData.treasurer_payment_received && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTreasurerDialog(true)}
                  >
                    Record Payment
                  </Button>
                )}
              </div>

              {caseData.treasurer_payment_received && (
                <div className="ml-7">
                  <div className="text-sm text-slate-500">
                    Received: {format(new Date(caseData.treasurer_payment_received), "MMM d, yyyy")}
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 mt-2">
                    Ready to Invoice Homeowner
                  </Badge>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Order Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date Order Signed</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <Button
              onClick={() => signOrderMutation.mutate()}
              disabled={!orderDate || signOrderMutation.isPending}
              className="w-full"
            >
              {signOrderMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Record Signature
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Treasurer Dialog */}
      <Dialog open={showTreasurerDialog} onOpenChange={setShowTreasurerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Treasurer Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!caseData.treasurer_submission_date ? (
              <>
                <div>
                  <Label>Submission Date</Label>
                  <Input
                    type="date"
                    value={treasurerDate}
                    onChange={(e) => setTreasurerDate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => submitTreasurerMutation.mutate()}
                  disabled={!treasurerDate || submitTreasurerMutation.isPending}
                  className="w-full"
                >
                  Record Submission
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label>Payment Received Date</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => recordPaymentMutation.mutate()}
                  disabled={!paymentDate || recordPaymentMutation.isPending}
                  className="w-full bg-emerald-600"
                >
                  Record Payment
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}