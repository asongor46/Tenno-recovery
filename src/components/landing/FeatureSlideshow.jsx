import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const defaultSlides = [
{
  title: "Command Center Dashboard",
  description: "Pipeline value, active cases, daily tasks, and live lead feed — everything at a glance.",
  screenshot: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/dashboard-screenshot.png",
  tag: "Dashboard",
  color: "from-emerald-500/10 to-teal-500/10",
  fallback: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80"
},
{
  title: "Lead Import & Case Management",
  description: "Import leads from county PDFs, screenshots, or manual entry. All in one place.",
  screenshot: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/cases-screenshot.png",
  tag: "Cases",
  color: "from-blue-500/10 to-indigo-500/10",
  fallback: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80"
},
{
  title: "Full Case Detail View",
  description: "Owner info, portal status, documents, filing workflow — every case detail in one screen.",
  screenshot: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/case-detail-screenshot.png",
  tag: "Case Detail",
  color: "from-purple-500/10 to-pink-500/10",
  fallback: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80"
},
{
  title: "State Compliance Engine",
  description: "Fee caps, registration requirements, waiting periods — all 50 states + DC, always current.",
  screenshot: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/compliance-screenshot.png",
  tag: "Compliance",
  color: "from-amber-500/10 to-orange-500/10",
  fallback: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80"
},
{
  title: "Homeowner Portal",
  description: "Homeowners sign agreements, upload IDs, and complete notary — entirely self-serve.",
  screenshot: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/portal-screenshot.png",
  tag: "Homeowner Portal",
  color: "from-cyan-500/10 to-blue-500/10",
  fallback: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80"
},
{
  title: "Packet Builder",
  description: "Assemble and generate county-specific filing packets with one click.",
  screenshot: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/packet-screenshot.png",
  tag: "Packet Builder",
  color: "from-rose-500/10 to-red-500/10",
  fallback: "https://images.unsplash.com/photo-1568992688065-536aad8a12f6?w=1200&q=80"
},
{
  title: "Kanban Pipeline",
  description: "Drag cases through stages. Imported → Signed → Filed → Paid. Visual, fast, clear.",
  screenshot: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/pipeline-screenshot.png",
  tag: "Pipeline",
  color: "from-green-500/10 to-emerald-500/10",
  fallback: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&q=80"
}];


export default function FeatureSlideshow() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Fetch slides from SlideshowSlide entity
  const { data: slideshowData = [] } = useQuery({
    queryKey: ["slideshowSlides"],
    queryFn: async () => {
      try {
        const slides = await base44.entities.SlideshowSlide.filter({ is_active: true });
        return slides.sort((a, b) => a.slide_index - b.slide_index);
      } catch (error) {
        console.error("Error fetching slideshow slides:", error);
        return [];
      }
    },
  });

  // Use fetched slides or fall back to defaults
  const slides = slideshowData.length > 0 
    ? slideshowData.map(s => ({
        title: s.title,
        description: s.description,
        screenshot: s.image_url,
        tag: s.tag,
        media_type: s.media_type || "image",
        color: "from-slate-500/10 to-slate-500/10",
        fallback: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80"
      }))
    : defaultSlides;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const timer = setInterval(next, 4500);
    return () => clearInterval(timer);
  }, [next, paused, slides.length]);

  const slide = slides[current] || slides[0];

  return (
    <div
      className="relative w-full max-w-5xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>
      
      {/* Browser frame mockup */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-800">
        {/* Browser chrome */}
        








        

        {/* Slide content */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0">
              
              {/* Screenshot or Video */}
              {slide.media_type === "video" ? (
                <video
                  src={slide.screenshot}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={slide.screenshot}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { if (slide.fallback) e.target.src = slide.fallback; }}
                />
              )}
              
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-60`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Text overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  {slide.tag}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{slide.title}</h3>
                <p className="text-slate-300 text-sm sm:text-base max-w-lg">{slide.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 mt-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 border border-slate-600 flex items-center justify-center text-white transition-all">
        
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 mt-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 border border-slate-600 flex items-center justify-center text-white transition-all">
        
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-5">
        {slides.map((_, i) =>
        <button
          key={i}
          onClick={() => setCurrent(i)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
          i === current ? "bg-emerald-400 w-8" : "bg-slate-600 w-2 hover:bg-slate-400"}`
          } />

        )}
      </div>
    </div>);

}