import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  HelpCircle,
  Clock,
  DollarSign,
  FileText,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * ADDED: FAQ & Knowledge Base Section
 * Self-service help for common questions
 */

const categoryIcons = {
  process: Info,
  timeline: Clock,
  payment: DollarSign,
  documents: FileText,
  general: HelpCircle,
};

const categoryLabels = {
  process: "Process",
  timeline: "Timeline",
  payment: "Payment",
  documents: "Documents",
  general: "General",
};

export default function FAQSection() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch FAQs
  const { data: faqs = [] } = useQuery({
    queryKey: ["faqs"],
    queryFn: () => base44.entities.FAQItem.filter({ is_published: true }, "order"),
  });

  const filteredFAQs = selectedCategory === "all" 
    ? faqs 
    : faqs.filter(f => f.category === selectedCategory);

  const categories = ["all", ...new Set(faqs.map(f => f.category))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat] || HelpCircle;
            return (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className={`cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "hover:bg-slate-100"
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                <Icon className="w-3 h-3 mr-1" />
                {cat === "all" ? "All" : categoryLabels[cat]}
              </Badge>
            );
          })}
        </div>

        {/* FAQ Accordion */}
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <HelpCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No FAQs available</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredFAQs.map((faq) => {
              const Icon = categoryIcons[faq.category];
              return (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div 
                      className="text-slate-600 prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}