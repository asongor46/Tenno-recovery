import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

const categories = [
  { value: "phone_script", label: "Phone Script" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "voicemail", label: "Voicemail" },
  { value: "rebuttal", label: "Rebuttal" },
  { value: "document", label: "Document" },
  { value: "agreement", label: "Agreement" },
  { value: "notary_instructions", label: "Notary Instructions" },
  { value: "cover_letter", label: "Cover Letter" },
];

export default function TemplateForm({ template, category, mergeTags, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || "",
    category: template?.category || category || "phone_script",
    subject: template?.subject || "",
    body: template?.body || "",
    is_active: template?.is_active ?? true,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const insertMergeTag = (tag) => {
    const textarea = document.getElementById("template-body");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = formData.body.substring(0, start) + tag + formData.body.substring(end);
    handleChange("body", newBody);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (template) {
        await base44.entities.Template.update(template.id, formData);
      } else {
        await base44.entities.Template.create(formData);
      }
      toast.success(template ? "Template updated successfully!" : "Template created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Error saving template: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSubject = ["email", "cover_letter"].includes(formData.category);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="e.g., Initial Contact Script"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showSubject && (
        <div>
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => handleChange("subject", e.target.value)}
            placeholder="Email subject..."
          />
        </div>
      )}

      {/* Merge Tags */}
      <div>
        <Label className="mb-2 block">Merge Tags</Label>
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
          {mergeTags.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer hover:bg-slate-200 transition-colors"
              onClick={() => insertMergeTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">Click a tag to insert it at cursor position</p>
      </div>

      <div>
        <Label htmlFor="template-body">Template Body *</Label>
        <Textarea
          id="template-body"
          value={formData.body}
          onChange={(e) => handleChange("body", e.target.value)}
          required
          placeholder="Write your template content here..."
          rows={12}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <Label htmlFor="is_active" className="mb-0">Active</Label>
          <p className="text-xs text-slate-500">Show this template in selection lists</p>
        </div>
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(v) => handleChange("is_active", v)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {template ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}