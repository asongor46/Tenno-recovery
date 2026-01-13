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

const categories = [
  { value: "surplus_basics", label: "Surplus Basics" },
  { value: "contacting_homeowners", label: "Contacting Homeowners" },
  { value: "handling_objections", label: "Handling Objections" },
  { value: "notary_guidance", label: "Notary Guidance" },
  { value: "filing_by_county", label: "Filing by County" },
  { value: "full_case_example", label: "Full Case Example" },
];

export default function HowToForm({ article, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: article?.title || "",
    category: article?.category || "surplus_basics",
    content: article?.content || "",
    order: article?.order || 0,
    is_published: article?.is_published ?? true,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (article) {
        await base44.entities.HowTo.update(article.id, formData);
      } else {
        await base44.entities.HowTo.create(formData);
      }
      toast.success(article ? "Article updated successfully" : "Article created successfully");
      onSuccess();
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error("Failed to save article: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="title">Article Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            required
            placeholder="e.g., How to Contact Homeowners"
          />
        </div>
        <div>
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
        <div>
          <Label htmlFor="order">Display Order</Label>
          <Input
            id="order"
            type="number"
            value={formData.order}
            onChange={(e) => handleChange("order", parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="content">Content * (Markdown supported)</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => handleChange("content", e.target.value)}
          required
          placeholder="Write your article content here... 

You can use Markdown:
# Heading 1
## Heading 2
**Bold text**
*Italic text*
- Bullet points
1. Numbered lists"
          rows={16}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <Label htmlFor="is_published" className="mb-0">Published</Label>
          <p className="text-xs text-slate-500">Make this article visible to users</p>
        </div>
        <Switch
          id="is_published"
          checked={formData.is_published}
          onCheckedChange={(v) => handleChange("is_published", v)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {article ? "Update Article" : "Create Article"}
        </Button>
      </div>
    </form>
  );
}