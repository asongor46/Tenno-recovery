// [NEW - Tier 3] Payment Pipeline & Invoice Tracking
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Send,
  Eye,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useStandardToast } from "@/components/shared/useStandardToast";
import RoleGuard from "@/components/rbac/RoleGuard";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";

export default function PaymentPipeline() {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["paymentCases"],
    queryFn: () => base44.entities.Case.list("-updated_date", 200),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 100),
  });

  // Calculate metrics
  const approvedCases = cases.filter(c => ['approved', 'paid', 'closed'].includes(c.stage));
  const pendingPayment = cases.filter(c => c.stage === 'approved' && !c.paid_at);
  const paidCases = cases.filter(c => c.stage === 'paid' || c.stage === 'closed');
  
  const totalRecovered = paidCases.reduce((sum, c) => sum + (c.surplus_amount || 0), 0);
  const totalEarned = paidCases.reduce((sum, c) => 
    sum + ((c.surplus_amount || 0) * ((c.fee_percent || 20) / 100)), 0
  );
  const pendingValue = pendingPayment.reduce((sum, c) => 
    sum + ((c.surplus_amount || 0) * ((c.fee_percent || 20) / 100)), 0
  );

  // Filter cases
  const filteredCases = cases.filter(c => {
    if (filter === "approved") return c.stage === "approved";
    if (filter === "paid") return c.stage === "paid" || c.stage === "closed";
    if (filter === "pending_invoice") return c.stage === "approved" && c.invoice_status !== "sent";
    return ['approved', 'paid', 'closed'].includes(c.stage);
  });

  const generateInvoice = useMutation({
    mutationFn: async (caseId) => {
      const { data } = await base44.functions.invoke("generateInvoicePDF", { case_id: caseId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentCases"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice generated successfully");
    },
    onError: () => toast.error("Failed to generate invoice"),
  });

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["admin", "agent"]}>
        <LoadingState message="Loading payment pipeline..." />
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "agent"]}>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payment Pipeline</h1>
        <p className="text-slate-500 mt-1">Track approved cases, invoices, and payments</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Recovered</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    ${totalRecovered.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Earned</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    ${totalEarned.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending Payment</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    ${pendingValue.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">{pendingPayment.length} cases</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Cases Paid</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {paidCases.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter cases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Approved & Paid</SelectItem>
                <SelectItem value="approved">Approved (Awaiting Payment)</SelectItem>
                <SelectItem value="pending_invoice">Needs Invoice</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500">
              {filteredCases.length} cases
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCases.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No payment cases"
              description="Cases will appear here once they're approved for payment"
            />
          ) : (
            <div className="divide-y">
              {filteredCases.map((caseItem) => {
                const feeAmount = (caseItem.surplus_amount * (caseItem.fee_percent / 100)).toFixed(0);
                const recoveryAmount = (caseItem.surplus_amount - feeAmount).toFixed(0);

                return (
                  <div key={caseItem.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Link 
                          to={createPageUrl(`CaseDetail?id=${caseItem.id}`)}
                          className="font-semibold text-slate-900 hover:text-emerald-600"
                        >
                          {caseItem.case_number}
                        </Link>
                        <Badge className={
                          caseItem.stage === 'paid' || caseItem.stage === 'closed'
                            ? "bg-green-100 text-green-700 border-0"
                            : "bg-amber-100 text-amber-700 border-0"
                        }>
                          {caseItem.stage === 'paid' || caseItem.stage === 'closed' ? 'Paid' : 'Approved'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{caseItem.owner_name}</p>
                      <p className="text-xs text-slate-500">{caseItem.county}, {caseItem.state}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-slate-500">Surplus</p>
                      <p className="font-bold text-slate-900">
                        ${caseItem.surplus_amount?.toLocaleString() || "0"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-slate-500">Your Fee ({caseItem.fee_percent}%)</p>
                      <p className="font-bold text-emerald-600">
                        ${parseFloat(feeAmount).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-slate-500">Client Gets</p>
                      <p className="font-semibold text-slate-700">
                        ${parseFloat(recoveryAmount).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {caseItem.stage === 'approved' && caseItem.invoice_status !== 'sent' && (
                        <Button
                          size="sm"
                          onClick={() => generateInvoice.mutate(caseItem.id)}
                          disabled={generateInvoice.isPending}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Generate Invoice
                        </Button>
                      )}
                      {caseItem.invoice_status === 'sent' && (
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          Invoice Sent
                        </Badge>
                      )}
                      {(caseItem.stage === 'paid' || caseItem.stage === 'closed') && caseItem.paid_at && (
                        <div className="text-xs text-slate-500">
                          Paid {format(new Date(caseItem.paid_at), "MMM d, yyyy")}
                        </div>
                      )}
                      <Link to={createPageUrl(`CaseDetail?id=${caseItem.id}`)}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Invoice #{invoice.id.substring(0, 8)}</p>
                    <p className="text-sm text-slate-500">
                      {invoice.created_date && format(new Date(invoice.created_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">${invoice.amount?.toLocaleString() || "0"}</p>
                    <Badge className={
                      invoice.status === 'paid' ? "bg-green-100 text-green-700 border-0" :
                      invoice.status === 'sent' ? "bg-blue-100 text-blue-700 border-0" :
                      "bg-slate-100 text-slate-700 border-0"
                    }>
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </RoleGuard>
  );
}