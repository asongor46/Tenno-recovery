import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function NewCaseForm({ counties, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    surplus_type: "",
    case_number: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
    owner_address: "",
    property_address: "",
    county: "",
    state: "",
    surplus_amount: "",
    sale_date: "",
    sale_amount: "",
    judgment_amount: "",
    internal_notes: "",
    fee_percent: 20,
  });

  // Fetch StateCompliance when state changes
  const { data: stateCompliance } = useQuery({
    queryKey: ["stateCompliance", formData.state],
    queryFn: async () => {
      if (!formData.state) return null;
      const results = await base44.entities.StateCompliance.filter({ 
        state_abbrev: formData.state 
      });
      return results[0] || null;
    },
    enabled: !!formData.state,
  });

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-set fee percent when state compliance loads
      if (field === "state" && stateCompliance) {
        const feeCapField = updated.surplus_type === 'tax_sale' 
          ? 'tax_sale_fee_cap_pct' 
          : 'sheriff_sale_fee_cap_pct';
        const suggestedFee = Math.min(stateCompliance[feeCapField] || 20, 20);
        updated.fee_percent = suggestedFee;
      }
      return updated;
    });
  };

  const handleCountyChange = (countyId) => {
    const county = counties.find(c => c.id === countyId);
    if (county) {
      setFormData(prev => ({
        ...prev,
        county: county.name,
        state: county.state,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.surplus_type) {
      toast.error("Please select a surplus type (Tax Sale or Sheriff Sale)");
      setIsSubmitting(false);
      return;
    }

    // Get agent profile to stamp agent_id
    let agentId = null;
    try {
      const user = await base44.auth.me();
      if (user?.email) {
        const profiles = await base44.entities.AgentProfile.filter({ email: user.email });
        agentId = profiles[0]?.id || null;
      }
    } catch (_) {}

    const caseData = {
      ...formData,
      surplus_amount: parseFloat(formData.surplus_amount) || 0,
      sale_amount: parseFloat(formData.sale_amount) || 0,
      judgment_amount: parseFloat(formData.judgment_amount) || 0,
      is_hot: parseFloat(formData.surplus_amount) >= 30000,
      status: "active",
      stage: "imported",
      notary_status: "pending",
      portal_token: crypto.randomUUID(),
      agent_id: agentId,
    };

    try {
      const newCase = await base44.entities.Case.create(caseData);
      
      toast.success("Case created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error creating case:", error);
      toast.error("Error creating case: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Surplus Type — first field, large buttons */}
      <div>
        <Label>Surplus Type *</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {[
            { value: "tax_sale", label: "🏛 Tax Sale", desc: "Delinquent property taxes" },
            { value: "sheriff_sale", label: "⚖️ Sheriff Sale", desc: "Foreclosure / mortgage default" },
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleChange("surplus_type", value)}
              className={`p-4 border-2 rounded-xl text-left transition-all ${
                formData.surplus_type === value
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className={`font-semibold text-sm ${formData.surplus_type === value ? "text-emerald-700" : "text-slate-700"}`}>{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="case_number">Case Number *</Label>
          <Input
            id="case_number"
            value={formData.case_number}
            onChange={(e) => handleChange("case_number", e.target.value)}
            required
            placeholder="e.g., 2024-CV-1234"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="owner_name">Owner Name *</Label>
          <Input
            id="owner_name"
            value={formData.owner_name}
            onChange={(e) => handleChange("owner_name", e.target.value)}
            required
            placeholder="Full legal name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="owner_email">Owner Email</Label>
          <Input
            id="owner_email"
            type="email"
            value={formData.owner_email}
            onChange={(e) => handleChange("owner_email", e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <Label htmlFor="owner_phone">Owner Phone</Label>
          <Input
            id="owner_phone"
            value={formData.owner_phone}
            onChange={(e) => handleChange("owner_phone", e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="owner_address">Owner Mailing Address</Label>
        <Input
          id="owner_address"
          value={formData.owner_address}
          onChange={(e) => handleChange("owner_address", e.target.value)}
          placeholder="123 Main St, City, State ZIP"
        />
      </div>

      <div>
        <Label htmlFor="property_address">Property Address</Label>
        <Input
          id="property_address"
          value={formData.property_address}
          onChange={(e) => handleChange("property_address", e.target.value)}
          placeholder="Address of the sold property"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="county">County *</Label>
          <Select onValueChange={handleCountyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent>
              {counties.map(county => (
                <SelectItem key={county.id} value={county.id}>
                  {county.name}, {county.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="surplus_amount">Surplus Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              id="surplus_amount"
              type="number"
              value={formData.surplus_amount}
              onChange={(e) => handleChange("surplus_amount", e.target.value)}
              className="pl-7"
              required
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Low-value warning */}
      {formData.surplus_amount && parseFloat(formData.surplus_amount) > 0 && parseFloat(formData.surplus_amount) < 1000 && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            This case has a surplus of ${parseFloat(formData.surplus_amount).toLocaleString()}. At {formData.fee_percent}% fee, your earnings would be ~${(parseFloat(formData.surplus_amount) * formData.fee_percent / 100).toFixed(0)}. Low-value cases may not justify the filing effort.
          </span>
        </div>
      )}

      {/* Compliance Banner */}
      {stateCompliance && formData.surplus_type && (
        <div className={`p-4 rounded-lg border-2 ${
          stateCompliance.hassle_rating <= 2 ? 'bg-emerald-500/10 border-emerald-500/30' :
          stateCompliance.hassle_rating === 3 ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <h4 className="font-semibold text-sm mb-2">
            {stateCompliance.state_name} — {formData.surplus_type === 'tax_sale' ? `${stateCompliance.tax_sale_fee_cap}% fee cap` : `${stateCompliance.sheriff_sale_fee_cap}% fee cap`}
          </h4>
          <div className="text-sm space-y-1">
            <div><strong>Registration:</strong> {stateCompliance.registration_required ? stateCompliance.registration_detail : 'None required'}</div>
            <div><strong>PI/Attorney:</strong> {stateCompliance.pi_attorney_required ? stateCompliance.pi_attorney_detail : 'Not required'}</div>
            <div className="flex justify-between">
              <span><strong>Hassle Rating:</strong> {stateCompliance.hassle_rating}/5</span>
              <span className="text-xs">{stateCompliance.remote_friendly ? '✓ Remote friendly' : '⚠ May require in-person'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="sale_date">Sale Date</Label>
          <Input
            id="sale_date"
            type="date"
            value={formData.sale_date}
            onChange={(e) => handleChange("sale_date", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sale_amount">Sale Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              id="sale_amount"
              type="number"
              value={formData.sale_amount}
              onChange={(e) => handleChange("sale_amount", e.target.value)}
              className="pl-7"
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="judgment_amount">Judgment Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              id="judgment_amount"
              type="number"
              value={formData.judgment_amount}
              onChange={(e) => handleChange("judgment_amount", e.target.value)}
              className="pl-7"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Fee Percentage Selector */}
      <div>
        <Label htmlFor="fee_percent">Finder Fee Percentage *</Label>
        <div className="grid grid-cols-4 gap-3 mt-2">
          {[15, 20, 25, 30].map((fee) => (
            <button
              key={fee}
              type="button"
              onClick={() => handleChange("fee_percent", fee)}
              className={`p-3 border-2 rounded-lg font-semibold transition-all ${
                formData.fee_percent === fee
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 hover:border-slate-300 text-slate-600"
              }`}
            >
              {fee}%
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Selected fee: {formData.fee_percent}% of ${formData.surplus_amount || 0} = $
          {((parseFloat(formData.surplus_amount) || 0) * (formData.fee_percent / 100)).toFixed(2)}
        </p>
        
        {/* Fee cap warning */}
        {stateCompliance && formData.surplus_type && (
          <div className={`mt-3 p-3 rounded-lg border text-sm ${
            formData.fee_percent > (formData.surplus_type === 'tax_sale' ? stateCompliance.tax_sale_fee_cap_pct : stateCompliance.sheriff_sale_fee_cap_pct)
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
              : 'hidden'
          }`}>
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Your fee of {formData.fee_percent}% exceeds the {stateCompliance.state_name} cap of {formData.surplus_type === 'tax_sale' ? stateCompliance.tax_sale_fee_cap_pct : stateCompliance.sheriff_sale_fee_cap_pct}% for {formData.surplus_type} cases. Verify this is permitted before proceeding.</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="internal_notes">Internal Notes</Label>
        <Textarea
          id="internal_notes"
          value={formData.internal_notes}
          onChange={(e) => handleChange("internal_notes", e.target.value)}
          placeholder="Add any notes about this case..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Case
        </Button>
      </div>
    </form>
  );
}