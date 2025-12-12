import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from "lucide-react";

const AVAILABLE_MERGE_FIELDS = [
  "OWNER_NAME",
  "OWNER_ADDRESS",
  "PROPERTY_ADDRESS",
  "COUNTY",
  "STATE",
  "CASE_NUMBER",
  "SURPLUS_AMOUNT",
  "FINDER_FEE_PERCENT",
  "FINDER_FEE_AMOUNT",
  "DATE",
  "SALE_DATE",
];

export default function AgreementTemplateForm({ template, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    template_body: template?.template_body || "",
    merge_fields: template?.merge_fields || [],
    fee_percentage_options: template?.fee_percentage_options || [15, 20, 25, 30],
    requires_notary: template?.requires_notary ?? true,
    is_active: template?.is_active ?? true,
    version: template?.version || "1.0",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMergeField = (field) => {
    setFormData((prev) => ({
      ...prev,
      merge_fields: prev.merge_fields.includes(field)
        ? prev.merge_fields.filter((f) => f !== field)
        : [...prev.merge_fields, field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (template) {
        await base44.entities.AgreementTemplate.update(template.id, formData);
      } else {
        await base44.entities.AgreementTemplate.create({
          ...formData,
          created_by: (await base44.auth.me()).email,
        });
      }
      onSuccess();
    } catch (error) {
      alert("Error: " + error.message);
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Template Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="e.g., Standard Agreement"
          />
        </div>
        <div>
          <Label>Version</Label>
          <Input
            value={formData.version}
            onChange={(e) => handleChange("version", e.target.value)}
            placeholder="e.g., 1.0"
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Input
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Brief description of this template"
        />
      </div>

      <div>
        <Label>Agreement Body *</Label>
        <Textarea
          value={formData.template_body}
          onChange={(e) => handleChange("template_body", e.target.value)}
          required
          rows={20}
          placeholder="Enter agreement text with merge fields like {OWNER_NAME}, {PROPERTY_ADDRESS}, etc."
          className="font-mono text-sm"
        />
      </div>

      <div>
        <Label className="mb-3 block">Available Merge Fields</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_MERGE_FIELDS.map((field) => (
            <Badge
              key={field}
              variant={formData.merge_fields.includes(field) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleMergeField(field)}
            >
              {formData.merge_fields.includes(field) && "✓ "}
              {field}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Fee Percentage Options</Label>
          <div className="flex gap-2 mt-2">
            {[15, 20, 25, 30].map((fee) => (
              <Badge
                key={fee}
                variant={
                  formData.fee_percentage_options.includes(fee) ? "default" : "outline"
                }
                className="cursor-pointer"
                onClick={() => {
                  const options = formData.fee_percentage_options.includes(fee)
                    ? formData.fee_percentage_options.filter((f) => f !== fee)
                    : [...formData.fee_percentage_options, fee];
                  handleChange("fee_percentage_options", options.sort());
                }}
              >
                {fee}%
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.requires_notary}
              onCheckedChange={(checked) => handleChange("requires_notary", checked)}
            />
            <Label className="cursor-pointer">Requires Notarization</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange("is_active", checked)}
            />
            <Label className="cursor-pointer">Active Template</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="bg-emerald-600">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {template ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}