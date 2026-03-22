import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SlideshowManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(null); // slide id being uploaded

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["adminSlides"],
    queryFn: () => base44.entities.SlideshowSlide.list("slide_index"),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["adminSlides"] });
    qc.invalidateQueries({ queryKey: ["slideshowSlides"] });
  };

  const updateSlide = async (id, data) => {
    await base44.entities.SlideshowSlide.update(id, data);
    invalidate();
  };

  const deleteSlide = async (id) => {
    if (!window.confirm("Delete this slide?")) return;
    await base44.entities.SlideshowSlide.delete(id);
    invalidate();
    toast({ title: "Slide deleted" });
  };

  const addSlide = async () => {
    const nextIndex = slides.length > 0 ? Math.max(...slides.map(s => s.slide_index || 0)) + 1 : 1;
    await base44.entities.SlideshowSlide.create({
      slide_index: nextIndex,
      title: "New Slide",
      description: "Add a description",
      tag: "Feature",
      image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
      media_type: "image",
      is_active: true,
    });
    invalidate();
    toast({ title: "Slide added" });
  };

  const handleUpload = async (slideId, file) => {
    setUploading(slideId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.SlideshowSlide.update(slideId, { image_url: file_url });
      invalidate();
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({ title: "Upload failed: " + err.message, variant: "destructive" });
    }
    setUploading(null);
  };

  if (isLoading) return <div className="text-slate-400 text-sm py-4">Loading slides...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{slides.length} slides</p>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addSlide}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Slide
        </Button>
      </div>

      <div className="space-y-3">
        {slides.map((slide) => (
          <div key={slide.id} className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 flex gap-4">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-slate-800 relative">
              {slide.media_type === "video" ? (
                <video src={slide.image_url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                {uploading === slide.id ? (
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleUpload(slide.id, e.target.files[0])}
                />
              </label>
            </div>

            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={slide.title}
                onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                placeholder="Title"
                className="bg-slate-800 border-slate-700 text-sm h-8"
              />
              <Input
                value={slide.tag}
                onChange={(e) => updateSlide(slide.id, { tag: e.target.value })}
                placeholder="Tag"
                className="bg-slate-800 border-slate-700 text-sm h-8"
              />
              <Input
                value={slide.description}
                onChange={(e) => updateSlide(slide.id, { description: e.target.value })}
                placeholder="Description"
                className="bg-slate-800 border-slate-700 text-sm h-8 sm:col-span-2"
              />
              <div className="flex items-center gap-3">
                <Select
                  value={slide.media_type || "image"}
                  onValueChange={(v) => updateSlide(slide.id, { media_type: v })}
                >
                  <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={slide.is_active !== false}
                    onCheckedChange={(v) => updateSlide(slide.id, { is_active: v })}
                  />
                  <span className="text-xs text-slate-400">{slide.is_active !== false ? "Active" : "Hidden"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge className="bg-slate-700 text-slate-300 border-0 text-xs">#{slide.slide_index}</Badge>
                <button onClick={() => deleteSlide(slide.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          No slides yet. Click "Add Slide" to create one.
        </div>
      )}
    </div>
  );
}