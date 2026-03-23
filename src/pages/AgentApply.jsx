import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Crown, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import StripeEmbeddedCheckout from "@/components/stripe/EmbeddedCheckout";

export default function AgentApply() {
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company_name: "",
  });
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.error("Please agree to the Terms of Use to continue.");
      return;
    }

    setIsSubmitting(true);

    // Block checkout inside iframe (preview)
    if (window.self !== window.top) {
      alert("Checkout is only available from the published app. Please open the app in a new tab to complete signup.");
      setIsSubmitting(false);
      return;
    }

    try {
      const user = await base44.auth.me();

      // Check if profile already exists
      const existing = await base44.entities.AgentProfile.filter({ email: user.email });
      if (!existing[0]) {
        await base44.entities.AgentProfile.create({
          user_id: user.id,
          email: user.email,
          full_name: formData.full_name,
          phone: formData.phone,
          company_name: formData.company_name,
          plan: selectedPlan,
          plan_status: "pending_payment",
          onboarding_completed: false,
        });
      } else {
        // Update plan selection if they're coming back
        await base44.entities.AgentProfile.update(existing[0].id, {
          plan: selectedPlan,
          plan_status: "pending_payment",
          full_name: formData.full_name || existing[0].full_name,
          phone: formData.phone || existing[0].phone,
          company_name: formData.company_name || existing[0].company_name,
        });
      }

      setCheckoutPlan(selectedPlan);
      setShowCheckout(true);
    } catch (error) {
      sessionStorage.setItem("tenno_signup_form", JSON.stringify({
        full_name: formData.full_name,
        phone: formData.phone,
        company_name: formData.company_name,
        plan: selectedPlan,
      }));
      base44.auth.redirectToLogin(createPageUrl("AgentApply"));
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("tenno_signup_form");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...data }));
        if (data.plan) setSelectedPlan(data.plan);
        setAgreedToTerms(true);
        sessionStorage.removeItem("tenno_signup_form");
      } catch {}
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {showCheckout && checkoutPlan && (
        <StripeEmbeddedCheckout
          plan={checkoutPlan}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => { setShowCheckout(false); window.location.href = createPageUrl("AgentOnboarding"); }}
        />
      )}
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
            <h1 className="text-3xl font-bold text-white mb-2">Get Started with TENNO Recovery</h1>
            <p className="text-slate-400">
              Choose your plan, create your account, and start managing surplus recovery cases today.
            </p>
            <p className="text-sm text-slate-500 mt-3">
              Already have an account?{" "}
              <button
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
                className="text-emerald-400 hover:underline"
              >
                Log in →
              </button>
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
              <CardTitle className="text-white">Your Details</CardTitle>
              <p className="text-sm text-slate-400 mt-1">You'll create your account in the next step.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
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
                  <Label htmlFor="company_name" className="text-slate-200">Company Name (optional)</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your business name, if any"
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                  />
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-3 p-4 bg-slate-900/60 rounded-xl border border-slate-700">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={setAgreedToTerms}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm text-slate-300 leading-relaxed cursor-pointer">
                    I agree to TENNO's{" "}
                    <Link to={createPageUrl("TermsPage")} className="text-emerald-400 hover:underline" target="_blank">
                      Terms of Use
                    </Link>
                    . I understand I am an independent contractor and TENNO does not guarantee results.
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !agreedToTerms}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  {isSubmitting ? "Processing..." : `Continue to Payment — ${selectedPlan === "pro" ? "Pro ($97/mo)" : "Starter ($50/mo)"}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 justify-center mt-6 text-slate-500 text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Secure checkout · No contracts · Cancel anytime</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}