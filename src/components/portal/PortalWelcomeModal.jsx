import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Upload, ScrollText, ChevronRight } from "lucide-react";

const steps = [
  {
    title: "Welcome to Your Case Portal",
    icon: "🏠",
    content: "We're working on recovering surplus funds from your property sale. This portal lets you track your case and complete required steps. Everything can be done online — no office visit needed."
  },
  {
    title: "What You'll Need to Do",
    icon: "📋",
    items: [
      { icon: FileText, label: "Sign the recovery agreement (digital signature)" },
      { icon: Upload, label: "Upload a photo of your government ID (front and back)" },
      { icon: CheckCircle2, label: "Complete a short intake form with your information" },
      { icon: ScrollText, label: "Get your documents notarized (we'll guide you step by step)" },
    ]
  },
  {
    title: "Questions?",
    icon: "💬",
    content: "Contact your recovery agent at any time. We're here to help you through every step of the process.",
    email: "tennoassetrecovery@gmail.com"
  }
];

export default function PortalWelcomeModal({ open, onClose }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md mx-auto" hideClose>
        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-emerald-400" : "w-4 bg-slate-600"
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="text-xl font-bold text-white">{current.title}</h2>
        </div>

        {current.content && (
          <p className="text-slate-300 text-sm leading-relaxed text-center mb-4">
            {current.content}
          </p>
        )}

        {current.email && (
          <div className="text-center mb-4">
            <a
              href={`mailto:${current.email}`}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {current.email}
            </a>
            <p className="text-xs text-slate-400 mt-1">or reply to any email from us</p>
          </div>
        )}

        {current.items && (
          <div className="space-y-3 mb-6">
            {current.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                <item.icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-slate-200">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              className="text-slate-400 hover:text-white"
            >
              Back
            </Button>
          )}
          <Button
            onClick={isLast ? onClose : () => setStep(step + 1)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isLast ? "Get Started" : (
              <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}