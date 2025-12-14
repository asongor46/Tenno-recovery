import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function EditCaseDialog({ caseData, open, onClose }) {
  const [formData, setFormData] = useState({
    owner_name: caseData.owner_name || "",
    owner_email: caseData.owner_email || "",
    owner_phone: caseData.owner_phone || "",
    owner_address: caseData.owner_address || "",
    property_address: caseData.property_address || "",
    parcel_number: caseData.parcel_number || "",
    surplus_amount: caseData.surplus_amount || "",
    sale_date: caseData.sale_date || "",
    sale_amount: caseData.sale_amount || "",
    judgment_amount: caseData.judgment_amount || "",
    case_complexity: caseData.case_complexity || "medium",
    internal_notes: caseData.internal_notes || "",
  });

  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Case.update(caseData.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", caseData.id] });
      toast.success("Case updated successfully");
      onClose();
    },
    onError: () => toast.error("Failed to update case"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanData = { ...formData };
    if (cleanData.surplus_amount) cleanData.surplus_amount = parseFloat(cleanData.surplus_amount);
    if (cleanData.sale_amount) cleanData.sale_amount = parseFloat(cleanData.sale_amount);
    if (cleanData.judgment_amount) cleanData.judgment_amount = parseFloat(cleanData.judgment_amount);
    updateMutation.mutate(cleanData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Case Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Owner Name *</Label>
              <Input
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.owner_phone}
                onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Mailing Address</Label>
              <Input
                value={formData.owner_address}
                onChange={(e) => setFormData({ ...formData, owner_address: e.target.value })}
              />
            </div>
            <div>
              <Label>Property Address</Label>
              <Input
                value={formData.property_address}
                onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
              />
            </div>
            <div>
              <Label>Parcel Number</Label>
              <Input
                value={formData.parcel_number}
                onChange={(e) => setFormData({ ...formData, parcel_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Surplus Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.surplus_amount}
                onChange={(e) => setFormData({ ...formData, surplus_amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Sale Date</Label>
              <Input
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Sale Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.sale_amount}
                onChange={(e) => setFormData({ ...formData, sale_amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Judgment Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.judgment_amount}
                onChange={(e) => setFormData({ ...formData, judgment_amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Case Complexity</Label>
              <Select
                value={formData.case_complexity}
                onValueChange={(val) => setFormData({ ...formData, case_complexity: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Internal Notes</Label>
            <Textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}