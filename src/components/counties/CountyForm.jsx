import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function CountyForm({ county, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: county?.name || "",
    state: county?.state || "",
    clerk_name: county?.clerk_name || "",
    clerk_email: county?.clerk_email || "",
    clerk_phone: county?.clerk_phone || "",
    filing_address: county?.filing_address || "",
    surplus_website: county?.surplus_website || "",
    efile_portal: county?.efile_portal || "",
    rep_allowed: county?.rep_allowed ?? true,
    assignment_required: county?.assignment_required ?? false,
    notary_required: county?.notary_required ?? true,
    notary_type: county?.notary_type || "either",
    filing_method: county?.filing_method || "mail",
    processing_timeline: county?.processing_timeline || "",
    special_notes: county?.special_notes || "",
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (county) {
        await base44.entities.County.update(county.id, formData);
      } else {
        await base44.entities.County.create(formData);
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving county:", error);
      alert("Error saving county: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">County Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="e.g., Los Angeles"
          />
        </div>
        <div>
          <Label htmlFor="state">State *</Label>
          <Select value={formData.state} onValueChange={(v) => handleChange("state", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clerk Info */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-900">Clerk Information</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="clerk_name">Clerk Name</Label>
            <Input
              id="clerk_name"
              value={formData.clerk_name}
              onChange={(e) => handleChange("clerk_name", e.target.value)}
              placeholder="Name"
            />
          </div>
          <div>
            <Label htmlFor="clerk_email">Clerk Email</Label>
            <Input
              id="clerk_email"
              type="email"
              value={formData.clerk_email}
              onChange={(e) => handleChange("clerk_email", e.target.value)}
              placeholder="email@county.gov"
            />
          </div>
          <div>
            <Label htmlFor="clerk_phone">Clerk Phone</Label>
            <Input
              id="clerk_phone"
              value={formData.clerk_phone}
              onChange={(e) => handleChange("clerk_phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="filing_address">Filing Address</Label>
        <Textarea
          id="filing_address"
          value={formData.filing_address}
          onChange={(e) => handleChange("filing_address", e.target.value)}
          placeholder="Full mailing address for filings..."
          rows={2}
        />
      </div>

      {/* URLs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="surplus_website">Surplus Website</Label>
          <Input
            id="surplus_website"
            value={formData.surplus_website}
            onChange={(e) => handleChange("surplus_website", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="efile_portal">E-File Portal</Label>
          <Input
            id="efile_portal"
            value={formData.efile_portal}
            onChange={(e) => handleChange("efile_portal", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-900">Filing Rules</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="rep_allowed">Rep Filing Allowed</Label>
            <Switch
              id="rep_allowed"
              checked={formData.rep_allowed}
              onCheckedChange={(v) => handleChange("rep_allowed", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="assignment_required">Assignment Required</Label>
            <Switch
              id="assignment_required"
              checked={formData.assignment_required}
              onCheckedChange={(v) => handleChange("assignment_required", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notary_required">Notary Required</Label>
            <Switch
              id="notary_required"
              checked={formData.notary_required}
              onCheckedChange={(v) => handleChange("notary_required", v)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="notary_type">Notary Type</Label>
            <Select value={formData.notary_type} onValueChange={(v) => handleChange("notary_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wet">Wet Ink Only</SelectItem>
                <SelectItem value="ron">RON Only</SelectItem>
                <SelectItem value="either">Either</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filing_method">Filing Method</Label>
            <Select value={formData.filing_method} onValueChange={(v) => handleChange("filing_method", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mail">Mail</SelectItem>
                <SelectItem value="efile">E-File</SelectItem>
                <SelectItem value="in_person">In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="processing_timeline">Processing Timeline</Label>
        <Input
          id="processing_timeline"
          value={formData.processing_timeline}
          onChange={(e) => handleChange("processing_timeline", e.target.value)}
          placeholder="e.g., 4-6 weeks"
        />
      </div>

      <div>
        <Label htmlFor="special_notes">Special Notes</Label>
        <Textarea
          id="special_notes"
          value={formData.special_notes}
          onChange={(e) => handleChange("special_notes", e.target.value)}
          placeholder="Any special requirements or quirks..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {county ? "Update County" : "Create County"}
        </Button>
      </div>
    </form>
  );
}