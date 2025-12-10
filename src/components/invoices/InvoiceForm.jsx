import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2 } from "lucide-react";

export default function InvoiceForm({ invoice, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    invoice_number: "",
    client_name: "",
    client_email: "",
    client_address: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    tax_rate: 0,
    notes: "",
    terms: "Payment due within 30 days",
    status: "draft",
    ...invoice,
  });

  const [items, setItems] = useState([
    { description: "", quantity: 1, unit_price: 0, amount: 0 },
  ]);

  useEffect(() => {
    if (invoice?.id) {
      // Fetch items for editing
      base44.entities.InvoiceItem.filter({ invoice_id: invoice.id }, "order").then(setItems);
    }
  }, [invoice?.id]);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax_amount = subtotal * (formData.tax_rate / 100);
    const total_amount = subtotal + tax_amount;
    const balance_due = total_amount - (formData.amount_paid || 0);

    return { subtotal, tax_amount, total_amount, balance_due };
  };

  const totals = calculateTotals();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const invoiceData = {
        ...formData,
        ...totals,
      };

      let invoiceId = invoice?.id;

      if (invoiceId) {
        // Update existing
        await base44.entities.Invoice.update(invoiceId, invoiceData);
        
        // Audit log
        await base44.functions.invoke("auditInvoiceChange", {
          invoice_id: invoiceId,
          action: "updated",
          new_values: invoiceData,
          changed_fields: Object.keys(invoiceData),
        });

        // Delete old items
        const oldItems = await base44.entities.InvoiceItem.filter({ invoice_id: invoiceId });
        for (const item of oldItems) {
          await base44.entities.InvoiceItem.delete(item.id);
        }
      } else {
        // Create new
        const newInvoice = await base44.entities.Invoice.create(invoiceData);
        invoiceId = newInvoice.id;

        // Audit log
        await base44.functions.invoke("auditInvoiceChange", {
          invoice_id: invoiceId,
          action: "created",
          new_values: invoiceData,
        });
      }

      // Create items
      for (let i = 0; i < items.length; i++) {
        await base44.entities.InvoiceItem.create({
          ...items[i],
          invoice_id: invoiceId,
          order: i,
        });
      }

      return invoiceId;
    },
    onSuccess: onSuccess,
  });

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === "quantity" || field === "unit_price" ? parseFloat(value) || 0 : value;
    updated[index].amount = updated[index].quantity * updated[index].unit_price;
    setItems(updated);
  };

  return (
    <div className="space-y-6">
      {/* Client Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Invoice Number</Label>
          <Input
            value={formData.invoice_number}
            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            placeholder="INV-001"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(status) => setFormData({ ...formData, status })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Client Name</Label>
          <Input
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Client Email</Label>
          <Input
            type="email"
            value={formData.client_email}
            onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Client Address</Label>
          <Textarea
            value={formData.client_address}
            onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
            rows={2}
          />
        </div>
        <div>
          <Label>Invoice Date</Label>
          <Input
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base">Line Items</Label>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Rate"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input value={`$${item.amount.toLocaleString()}`} disabled />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-600"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border rounded-lg p-4 bg-slate-50">
        <div className="max-w-sm ml-auto space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-semibold">${totals.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm items-center gap-2">
            <span className="text-slate-600">Tax Rate (%):</span>
            <Input
              type="number"
              className="w-24 h-8"
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tax:</span>
            <span className="font-semibold">${totals.tax_amount.toLocaleString()}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span className="text-emerald-600">${totals.total_amount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div>
        <Label>Terms & Conditions</Label>
        <Textarea
          value={formData.terms}
          onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1">
          {saveMutation.isPending ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}