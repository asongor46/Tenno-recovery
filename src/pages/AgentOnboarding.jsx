import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Building2,
  Map,
  Shield,
  FileText,
  Send,
  Check,
  Lightbulb,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/utils";
import { useStandardToast } from "@/components/shared/useStandardToast";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

const STEPS = [
  { id: "welcome", title: "How It Works", icon: Lightbulb },
  { id: "company", title: "Your Business", icon: Building2 },
  { id: "states", title: "States", icon: Map },
  { id: "compliance", title: "Compliance", icon: Shield },
  { id: "portal", title: "Client Portal", icon: Users },
  { id: "done", title: "Ready", icon: CheckCircle2 },
];

export default function AgentOnboarding() {
  const [step, setStep] = useState(0);
  const [companyData, setCompanyData] = useState({
    company_name: "",
    company_address: "",
    company_phone: "",
    company_email: "",
  });
  const [selectedStates, setSelectedStates] = useState([]);
  const [complianceAgreed, setComplianceAgreed] = useState(false);
  const [caseSkipped, setCaseSkipped] = useState(false);

  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: profile } = useQuery({
    queryKey: ["agentProfile", user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.AgentProfile.filter({ email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email,
    onSuccess: (p) => {
      if (p) {
        setCompanyData({
          company_name: p.company_name || "",
          company_address: p.company_address || "",
          company_phone: p.company_phone || "",
          company_email: p.company_email || "",
        });
        setSelectedStates(p.states_active || []);
      }
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.AgentProfile.update(profile?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agentProfile"] }),
  });

  const progress = ((step) / (STEPS.length - 1)) * 100;

  const handleSaveCompany = async () => {
    await updateProfileMutation.mutateAsync(companyData);
    setStep(2);
  };

  const handleSaveStates = async () => {
    await updateProfileMutation.mutateAsync({ states_active: selectedStates });
    setStep(3);
  };

  const toggleState = (s) => {
    setSelectedStates(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleComplete = async () => {
    await updateProfileMutation.mutateAsync({ onboarding_completed: true });
    await base44.entities.ActivityLog.create({
      action: "Onboarding Completed",
      description: `${user?.full_name} completed platform setup`,
      performed_by: user?.email,
      is_client_visible: false,
    });
    toast.success("Setup complete! Welcome to TENNO Recovery.");
    setTimeout(() => { window.location.href = createPageUrl("Dashboard"); }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg"
            alt="TENNO RECOVERY"
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white">Welcome, {user?.full_name?.split(" ")[0]}!</h1>
          <p className="text-slate-400 mt-1">Let's get your account set up in a few quick steps.</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Step {step + 1} of {STEPS.length}</span>
            <span className="text-sm font-semibold text-emerald-400">{STEPS[step].title}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  i < step ? "bg-emerald-600 text-white" :
                  i === step ? "bg-emerald-500 text-white" :
                  "bg-slate-700 text-slate-500"
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step 0: How It Works */}
            {step === 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" /> How TENNO Recovery Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-400 text-sm">Here's how the platform works — five steps from lead to payday:</p>
                  <div className="space-y-3">
                    {[
                      { num: "1", title: "FIND LEADS", desc: "Browse the Lead Feed on your Dashboard. We upload surplus lists from counties across the US. You can also import your own via PDF, CSV, or manual entry." },
                      { num: "2", title: "WORK THE CASE", desc: "Create a Case for each lead. Research the owner, verify the surplus amount, make contact." },
                      { num: "3", title: "SIGN THE AGREEMENT", desc: "Generate a fee agreement with your company name and fee %. Send the client a secure portal link to review and e-sign." },
                      { num: "4", title: "COLLECT DOCUMENTS", desc: "The Client Portal guides them through: signing, uploading ID, and notarization. You track progress from your dashboard." },
                      { num: "5", title: "FILE & GET PAID", desc: "Assemble your filing packet, submit to the county, and record payment when funds are released." },
                    ].map(item => (
                      <div key={item.num} className="flex gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700">
                        <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">{item.num}</div>
                        <div>
                          <p className="font-semibold text-emerald-400 text-xs tracking-wider">{item.title}</p>
                          <p className="text-slate-400 text-sm mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={() => setStep(1)} className="bg-emerald-600 hover:bg-emerald-700">
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Company Details */}
            {step === 1 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" /> Your Business
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-400 text-sm">This info appears on fee agreements and filing documents. Make sure it matches your registered business name.</p>
                  <div>
                    <Label className="text-slate-300">Company / Business Name</Label>
                    <Input
                      value={companyData.company_name}
                      onChange={e => setCompanyData({ ...companyData, company_name: e.target.value })}
                      placeholder="Your business name"
                      className="bg-slate-900 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Business Address</Label>
                    <Input
                      value={companyData.company_address}
                      onChange={e => setCompanyData({ ...companyData, company_address: e.target.value })}
                      placeholder="123 Main St, City, ST 12345"
                      className="bg-slate-900 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Business Phone</Label>
                      <Input
                        value={companyData.company_phone}
                        onChange={e => setCompanyData({ ...companyData, company_phone: e.target.value })}
                        placeholder="(555) 555-5555"
                        className="bg-slate-900 border-slate-600 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Business Email</Label>
                      <Input
                        value={companyData.company_email}
                        onChange={e => setCompanyData({ ...companyData, company_email: e.target.value })}
                        placeholder="you@company.com"
                        className="bg-slate-900 border-slate-600 text-white mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveCompany} className="bg-emerald-600 hover:bg-emerald-700" disabled={updateProfileMutation.isPending}>
                      Save & Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Select States */}
            {step === 1 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Map className="w-5 h-5 text-emerald-400" /> Select Your Active States
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">Select the states where you'll be working cases. You can update this anytime in Settings.</p>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mb-6">
                    {US_STATES.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleState(s)}
                        className={`py-1.5 rounded text-xs font-semibold transition-all ${
                          selectedStates.includes(s)
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{selectedStates.length} state{selectedStates.length !== 1 ? "s" : ""} selected</p>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(0)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button onClick={handleSaveStates} className="bg-emerald-600 hover:bg-emerald-700" disabled={updateProfileMutation.isPending}>
                      Save & Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Compliance Acknowledgment */}
            {step === 2 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" /> Compliance Acknowledgment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-200 space-y-2">
                    <p className="font-semibold">Before you begin, please acknowledge the following:</p>
                    <ul className="space-y-1.5 text-amber-300/90 list-disc list-inside">
                      <li>Surplus recovery laws vary by state. It is your responsibility to comply with state law in each jurisdiction you work.</li>
                      <li>Some states cap agent fees. TENNO's compliance engine provides guidance, but you are responsible for verifying current rules.</li>
                      <li>Some states require you to be a licensed attorney or work with one. Check before filing court motions.</li>
                      <li>Homeowners may always claim surplus directly from the county at no cost. You must disclose this.</li>
                      <li>You are an independent contractor. TENNO is a software platform and is not liable for your filings or outcomes.</li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-slate-900/60 rounded-xl border border-slate-600">
                    <Checkbox
                      id="compliance"
                      checked={complianceAgreed}
                      onCheckedChange={setComplianceAgreed}
                      className="mt-0.5"
                    />
                    <Label htmlFor="compliance" className="text-sm text-slate-300 leading-relaxed cursor-pointer">
                      I understand and acknowledge the above compliance requirements. I will operate within the laws of each state I work in.
                    </Label>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={!complianceAgreed}
                    >
                      Acknowledge & Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Create First Case */}
            {step === 3 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" /> Create Your First Case
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-400 text-sm">You can create your first case now, or skip and do it from the Cases page later. Cases are the core of your workflow — one per homeowner.</p>
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-600 space-y-3 text-sm text-slate-300">
                    <p className="font-medium text-white">How to create a case:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                      <li>Go to <strong className="text-slate-300">Cases</strong> in the sidebar after finishing setup</li>
                      <li>Click <strong className="text-slate-300">+ New Case</strong> and choose your import method</li>
                      <li>Fill in the owner name, county, state, and surplus amount</li>
                      <li>Send a portal invite to the homeowner to start the agreement process</li>
                    </ol>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button onClick={() => setStep(4)} className="bg-emerald-600 hover:bg-emerald-700">
                      Got It — Finish Setup <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
              <Card className="bg-slate-800 border-slate-700 text-center">
                <CardContent className="pt-10 pb-10 space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
                    <p className="text-slate-400">Your account is configured. Head to your dashboard to start working cases.</p>
                  </div>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <Button
                      onClick={handleComplete}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      size="lg"
                      disabled={updateProfileMutation.isPending}
                    >
                      Go to Dashboard
                    </Button>
                    <Button variant="outline" onClick={() => setStep(3)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}