import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Zap,
  FileText,
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";

export default function LandingPage() {
  const handleAgentLogin = async () => {
    try {
      await base44.auth.me();
      window.location.href = createPageUrl("Dashboard");
    } catch {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    }
  };

  const features = [
    {
      icon: Zap,
      title: "Automated Case Management",
      description: "Streamline your surplus recovery workflow with intelligent automation and AI-powered assistance.",
    },
    {
      icon: Shield,
      title: "Secure Client Portal",
      description: "Give clients 24/7 access to their case status with password-protected accounts and email notifications.",
    },
    {
      icon: FileText,
      title: "Smart Document Generation",
      description: "Auto-generate county-specific forms, agreements, and packets with built-in compliance checks.",
    },
    {
      icon: Users,
      title: "People Finder Integration",
      description: "Locate hard-to-find property owners with integrated skip tracing and identity verification.",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Analytics",
      description: "Track your pipeline, revenue, and performance metrics with comprehensive dashboards.",
    },
    {
      icon: Clock,
      title: "Deadline Management",
      description: "Never miss a filing deadline with automated reminders and waiting period tracking.",
    },
  ];

  const stats = [
    { value: "98%", label: "Filing Accuracy" },
    { value: "50%", label: "Time Saved" },
    { value: "24/7", label: "Client Access" },
    { value: "50+", label: "Counties Supported" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="TENNO RECOVERY" 
                className="h-10 w-auto"
              />
            </div>
            <div className="flex items-center gap-3">
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

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Tax Sale Surplus Recovery{" "}
                <span className="text-emerald-600">Made Simple</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-600">
                The complete platform for surplus recovery professionals. Manage cases, 
                automate workflows, and help homeowners recover their funds—all in one place.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  onClick={handleAgentLogin}
                  className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8"
                >
                  Get Started <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Link to={createPageUrl("HowItWorks")}>
                  <Button size="lg" variant="outline" className="text-lg px-8">
                    See How It Works
                  </Button>
                </Link>
              </div>
              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-white"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Trusted by 100+ agents</p>
                  <p className="text-xs text-slate-500">Processing millions in recoveries</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-slate-900">Case #2024-1234</p>
                      <p className="text-sm text-slate-600">Agreement signed, ready for notary</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-900">Case #2024-5678</p>
                      <p className="text-sm text-slate-600">Waiting period: 45 days remaining</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                    <Award className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="font-semibold text-slate-900">Case #2024-9012</p>
                      <p className="text-sm text-slate-600">$45,000 surplus approved!</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-emerald-100 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Everything You Need to Scale Your Business
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Built specifically for surplus recovery professionals
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Recovery Business?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join hundreds of professionals already using TENNO Asset Recovery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={handleAgentLogin}
              className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8"
            >
              Get Started Now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link to={createPageUrl("PortalLogin")}>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 bg-white text-slate-900 hover:bg-slate-100"
              >
                Access Client Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="TENNO RECOVERY" 
                className="h-8 w-auto mb-4 brightness-200"
              />
              <p className="text-sm">
                Professional surplus recovery platform for tax sale professionals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to={createPageUrl("HowItWorks")} className="hover:text-white">How It Works</Link></li>
                <li><a href="mailto:tennoassetrecovery@gmail.com" className="hover:text-white">Contact</a></li>
                <li><Link to={createPageUrl("PortalLogin")} className="hover:text-white">Client Portal</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Contact</h3>
              <p className="text-sm">
                Email: <a href="mailto:tennoassetrecovery@gmail.com" className="hover:text-white">tennoassetrecovery@gmail.com</a>
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm">
            <p>&copy; 2025 TENNO Asset Recovery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}