// [NEW - Tier 3] Agent Onboarding Wizard
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  PlayCircle,
  FileText,
  Users,
  Phone,
  BookOpen,
  Award,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { createPageUrl } from "@/utils";
import { useStandardToast } from "@/components/shared/useStandardToast";

const modules = [
  {
    id: "welcome",
    title: "Welcome to TENNO",
    icon: Sparkles,
    sections: [
      {
        title: "What We Do",
        content: "We help property owners recover surplus funds from tax sales and foreclosures. You'll guide homeowners through the process and earn a commission on successful recoveries."
      },
      {
        title: "Your Role",
        content: "As an agent, you'll: (1) Contact homeowners, (2) Sign them up, (3) Collect documents, (4) File claims, and (5) Get paid when they do."
      },
      {
        title: "Commission Structure",
        content: "You earn 15-30% of the surplus recovered, based on case complexity. Hot cases (>$30k) get priority support."
      }
    ]
  },
  {
    id: "case_flow",
    title: "Case Workflow",
    icon: FileText,
    sections: [
      {
        title: "Pipeline Stages",
        content: "Cases move through: Imported → Agreement Signed → Info Completed → Notary Completed → Packet Ready → Filed → Approved → Paid → Closed"
      },
      {
        title: "Your Dashboard",
        content: "The dashboard shows active cases, hot cases, alerts, and todos. Use filters to find cases needing attention."
      },
      {
        title: "Case Detail View",
        content: "Click any case to see full details, send portal invites, generate documents, and track progress. All actions are in tabs."
      }
    ]
  },
  {
    id: "contacting",
    title: "Contacting Homeowners",
    icon: Phone,
    sections: [
      {
        title: "Initial Outreach",
        content: "Use the Pre-Call Assistant to review case details before calling. It shows verification status, risk flags, and county requirements."
      },
      {
        title: "Call Scripts",
        content: "Click 'View Call Script' to see word-for-word scripts for opening, objection handling, and voicemail. Log your call result after each attempt."
      },
      {
        title: "Portal Invites",
        content: "Once a homeowner agrees, send them a portal invite. They'll get an 8-character access code to create their account and complete tasks online."
      }
    ]
  },
  {
    id: "documents",
    title: "Documents & Filing",
    icon: BookOpen,
    sections: [
      {
        title: "Agreement & ID",
        content: "Homeowners sign the fee agreement and upload ID photos through the portal. You'll review them in the case detail page."
      },
      {
        title: "Notarization",
        content: "Some counties require notarized authorization. The homeowner downloads a packet, visits a notary, and uploads it. You verify it's valid."
      },
      {
        title: "Filing Packets",
        content: "Once all docs are ready, go to Documents tab → 'Generate Filing Packet'. The system auto-fills county forms and creates a complete packet to file."
      }
    ]
  },
  {
    id: "counties",
    title: "County Profiles",
    icon: Users,
    sections: [
      {
        title: "County Requirements",
        content: "Each county has different rules: some allow representation, some require notarization, some have deadlines. Check the County Profile tab on each case."
      },
      {
        title: "Filing Methods",
        content: "Counties use mail, e-file, or in-person filing. The system guides you through the correct process for each county."
      },
      {
        title: "Waiting Periods",
        content: "After filing, most counties have 45-90 day waiting periods. The system tracks this and alerts you when it's time to file the proposed order."
      }
    ]
  },
  {
    id: "best_practices",
    title: "Best Practices",
    icon: Award,
    sections: [
      {
        title: "Daily Workflow",
        content: "Check Dashboard alerts first, then review hot cases, make outreach calls, and respond to homeowner actions in the portal."
      },
      {
        title: "Communication",
        content: "Log all contact attempts, respond to homeowner messages within 24 hours, and keep case notes updated for team visibility."
      },
      {
        title: "Using AI Tools",
        content: "Use AI Pre-Call Assistant before calls, AI Case Automation for finding related cases, and the chatbot for quick questions."
      }
    ]
  }
];

export default function AgentOnboarding() {
  const [currentModule, setCurrentModule] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [completedModules, setCompletedModules] = useState([]);
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
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.AgentProfile.update(profile?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentProfile"] });
    },
  });

  const module = modules[currentModule];
  const section = module.sections[currentSection];
  const totalSections = module.sections.length;
  const isLastSection = currentSection === totalSections - 1;
  const isLastModule = currentModule === modules.length - 1;
  const overallProgress = ((currentModule * 3 + currentSection + 1) / (modules.length * 3)) * 100;

  const handleNext = () => {
    if (isLastSection) {
      if (!completedModules.includes(module.id)) {
        setCompletedModules([...completedModules, module.id]);
      }
      if (!isLastModule) {
        setCurrentModule(currentModule + 1);
        setCurrentSection(0);
      }
    } else {
      setCurrentSection(currentSection + 1);
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    } else if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
      setCurrentSection(modules[currentModule - 1].sections.length - 1);
    }
  };

  const handleComplete = async () => {
    if (!profile) return;
    
    await updateProfileMutation.mutateAsync({
      ...profile,
      notes: (profile.notes || "") + "\nCompleted onboarding: " + new Date().toISOString()
    });
    
    await base44.entities.ActivityLog.create({
      action: "Agent Onboarding Completed",
      description: `${user.full_name} completed the onboarding wizard`,
      performed_by: user.email
    });

    toast.success("Onboarding complete! Welcome to the team.");
    setTimeout(() => {
      window.location.href = createPageUrl("Dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
            alt="TENNO RECOVERY" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.full_name}!</h1>
          <p className="text-slate-600 mt-2">Let's get you up to speed on surplus recovery</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-sm font-semibold text-emerald-600">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              {modules.map((m, i) => (
                <div key={m.id} className="flex items-center gap-2">
                  {completedModules.includes(m.id) || i < currentModule ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : i === currentModule ? (
                    <Circle className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                  <span className={`text-sm ${
                    completedModules.includes(m.id) || i <= currentModule 
                      ? "text-slate-900 font-medium" 
                      : "text-slate-400"
                  }`}>
                    {m.title}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Module Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentModule}-${currentSection}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <module.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>{module.title}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Section {currentSection + 1} of {totalSections}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{section.title}</h3>
                  <p className="text-slate-700 leading-relaxed">{section.content}</p>
                </div>

                {/* Visual Aid */}
                {module.id === "case_flow" && currentSection === 0 && (
                  <div className="p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {["Imported", "Agreement", "Info", "Notary", "Packet", "Filed", "Approved", "Paid"].map((stage, i) => (
                        <React.Fragment key={stage}>
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs text-slate-600 mt-1 whitespace-nowrap">{stage}</span>
                          </div>
                          {i < 7 && (
                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentModule === 0 && currentSection === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  {isLastModule && isLastSection ? (
                    <Button
                      onClick={handleComplete}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={updateProfileMutation.isPending}
                    >
                      Complete Onboarding
                      <Award className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLastSection ? "Next Module" : "Next"}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Quick Links */}
        <Card className="mt-6 border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Need help?</p>
                <p className="text-sm text-slate-600 mt-1">
                  Skip to <a href={createPageUrl("Dashboard")} className="text-blue-600 hover:underline">Dashboard</a> or 
                  visit <a href={createPageUrl("HowTo")} className="text-blue-600 hover:underline">How-To Center</a> anytime.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}