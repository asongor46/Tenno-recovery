import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { ArrowRight, Search, FileText, Send, CheckCircle2, TrendingUp, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";

export default function HowItWorks() {
  const handleAgentLogin = async () => {
    try {
      await base44.auth.me();
      window.location.href = createPageUrl("Dashboard");
    } catch {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    }
  };

  const steps = [
    {
      icon: Search,
      number: "01",
      title: "Find Cases",
      description: "Import surplus lists from county websites, PDFs, or manual entry. Our AI helps identify viable cases automatically.",
    },
    {
      icon: FileText,
      number: "02",
      title: "Generate Agreements",
      description: "Create customized fee agreements with built-in compliance. Clients can review and sign electronically through their portal.",
    },
    {
      icon: Send,
      number: "03",
      title: "Send Portal Invite",
      description: "Clients receive a secure access code via email. They create a password and access their case 24/7 with status updates.",
    },
    {
      icon: CheckCircle2,
      number: "04",
      title: "Collect Documents",
      description: "Clients upload ID documents through the portal. Automated validation ensures everything is compliant before filing.",
    },
    {
      icon: FileText,
      number: "05",
      title: "Generate Packets",
      description: "Smart document engine creates county-specific filing packets with all required forms, automatically filled and formatted.",
    },
    {
      icon: TrendingUp,
      number: "06",
      title: "Track & Recover",
      description: "Monitor filing status, waiting periods, and court decisions. Get automated reminders and never miss a deadline.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl("LandingPage")} className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="TENNO RECOVERY" 
                className="h-10 w-auto"
              />
            </Link>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl("LandingPage")}>
                <Button variant="ghost">
                  <Home className="w-4 h-4 mr-2" /> Home
                </Button>
              </Link>
              <Button variant="ghost" onClick={handleAgentLogin}>
                Agent Login
              </Button>
              <Link to={createPageUrl("PortalLogin")}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Client Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-slate-900"
          >
            How TENNO Asset Recovery Works
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-xl text-slate-600"
          >
            From case discovery to successful recovery—streamlined, automated, and compliant
          </motion.p>
        </div>
      </section>

      {/* Steps */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {step.number}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <step.icon className="w-6 h-6 text-emerald-600" />
                          <h3 className="text-2xl font-bold text-slate-900">{step.title}</h3>
                        </div>
                        <p className="text-lg text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Streamline Your Recovery Process?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Start managing your cases more efficiently today
          </p>
          <Button 
            size="lg"
            onClick={handleAgentLogin}
            className="bg-white text-emerald-600 hover:bg-slate-100 text-lg px-8"
          >
            Get Started Now <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
              alt="TENNO RECOVERY" 
              className="h-8 w-auto mx-auto mb-4 brightness-200"
            />
            <p className="text-sm mb-4">
              Email: <a href="mailto:tennoassetrecovery@gmail.com" className="hover:text-white">tennoassetrecovery@gmail.com</a>
            </p>
            <p className="text-sm">&copy; 2025 TENNO Asset Recovery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}