import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Download,
  Eye,
  Edit2,
  Trash2,
  Send,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import InvoiceForm from "@/components/invoices/InvoiceForm";

const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Send },
  viewed: { label: "Viewed", color: "bg-indigo-100 text-indigo-700", icon: Eye },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-700", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "bg-slate-200 text-slate-600", icon: XCircle },
};

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const deleteInvoice = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const generatePDF = useMutation({
    mutationFn: (invoice_id) => base44.functions.invoke("generateInvoicePDF", { invoice_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      alert("PDF generated successfully!");
    },
  });

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid</p>
              <p className="text-2xl font-bold text-slate-900">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Outstanding</p>
              <p className="text-2xl font-bold text-slate-900">${totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
        <Button onClick={() => { setEditingInvoice(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">No invoices found</TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const StatusIcon = statusConfig[invoice.status]?.icon || FileText;
                return (
                  <TableRow key={invoice.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(invoice.due_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right font-semibold">${invoice.total_amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${invoice.amount_paid?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">${invoice.balance_due?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig[invoice.status]?.color} border-0 gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[invoice.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {invoice.pdf_url ? (
                          <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => generatePDF.mutate(invoice.id)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => { setEditingInvoice(invoice); setShowForm(true); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600"
                          onClick={() => {
                            if (window.confirm("Delete this invoice?")) {
                              deleteInvoice.mutate(invoice.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice}
            onSuccess={() => {
              setShowForm(false);
              setEditingInvoice(null);
              queryClient.invalidateQueries({ queryKey: ["invoices"] });
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingInvoice(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}