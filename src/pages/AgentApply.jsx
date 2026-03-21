import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, CheckCircle2, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AgentApply() {
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    location: "",
    has_experience: false,
    application_reason: "",
  });
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Block checkout inside iframe (preview)
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app. Please open the app in a new tab to complete signup.");
      setIsSubmitting(false);
      return;
    }

    try {
      const user = await base44.auth.me();
      
      await base44.entities.AgentProfile.create({
        user_id: user.id,
        email: user.email,
        ...formData,
        plan: selectedPlan,
        role: "agent",
        status: "pending",
        applied_at: new Date().toISOString(),
      });

      await base44.entities.ActivityLog.create({
        action: "Agent Application Submitted",
        description: `${formData.full_name} applied as ${selectedPlan} agent`,
        performed_by: user.email,
      });

      // Redirect to Stripe Checkout
      const res = await base44.functions.invoke("createCheckoutSession", {
        plan: selectedPlan,
        successUrl: window.location.origin + "/Dashboard?checkout=success",
        cancelUrl: window.location.origin + "/AgentApply?checkout=cancelled",
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Could not start checkout. Please try again.");
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.error("Failed to submit application: " + error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
            alt="TENNO RECOVERY" 
            className="h-10 w-auto"
          />
          <Link to={createPageUrl("LandingPage")}>
            <Button variant="ghost" className="text-slate-300">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Apply to Join Our Team</h1>
            <p className="text-lg text-slate-300">
              We're looking for motivated individuals to help homeowners recover their surplus funds.
            </p>
          </div>

          {/* Plan Selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setSelectedPlan("starter")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${selectedPlan === "starter" ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-800 hover:border-slate-600"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">Starter</span>
                {selectedPlan === "starter" && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
              </div>
              <p className="text-2xl font-bold text-white">$50<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-400 mt-1">CRM, pipeline, state compliance, counties</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("pro")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${selectedPlan === "pro" ? "border-amber-500 bg-amber-500/10" : "border-slate-700 bg-slate-800 hover:border-slate-600"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-white">Pro</span>
                {selectedPlan === "pro" && <CheckCircle2 className="w-4 h-4 text-amber-400 ml-auto" />}
              </div>
              <p className="text-2xl font-bold text-white">$97<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-400 mt-1">Everything + AI imports, portal, packet builder</p>
            </button>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Application Form</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="full_name" className="text-slate-200">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-slate-200">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-slate-200">Location (City, State) *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Miami, FL"
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-slate-200 mb-3 block">Experience with surplus recovery?</Label>
                  <RadioGroup
                    value={formData.has_experience ? "yes" : "no"}
                    onValueChange={(value) => setFormData({ ...formData, has_experience: value === "yes" })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="exp-yes" />
                      <Label htmlFor="exp-yes" className="text-slate-300 font-normal cursor-pointer">
                        Yes, I have experience
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="exp-no" />
                      <Label htmlFor="exp-no" className="text-slate-300 font-normal cursor-pointer">
                        No, but I'm eager to learn
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="reason" className="text-slate-200">Why do you want to join? *</Label>
                  <Textarea
                    id="reason"
                    value={formData.application_reason}
                    onChange={(e) => setFormData({ ...formData, application_reason: e.target.value })}
                    placeholder="Tell us about your interest in surplus recovery..."
                    rows={5}
                    className="bg-slate-900 border-slate-700 text-white mt-1 resize-none"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  {isSubmitting ? "Redirecting to Checkout..." : `Apply & Subscribe to ${selectedPlan === "pro" ? "Pro ($97/mo)" : "Starter ($50/mo)"}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-slate-400 mt-6">
            By applying, you agree to our terms and conditions
          </p>
        </motion.div>
      </main>
    </div>
  );
}