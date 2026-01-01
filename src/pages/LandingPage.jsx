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
  Phone,
  DollarSign,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { base44 } from "@/api/base44Client";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleAgentLogin = async () => {
    try {
      // Check if already authenticated
      const user = await base44.auth.me();
      
      // Check if user has an AgentProfile
      const profiles = await base44.entities.AgentProfile.filter({ email: user.email });
      const profile = profiles[0];

      if (!profile) {
        // No profile - redirect to application
        window.location.href = createPageUrl("AgentApply");
        return;
      }

      // Route based on status
      if (profile.status === "approved") {
        window.location.href = createPageUrl("Dashboard");
      } else if (profile.status === "pending") {
        window.location.href = createPageUrl("AgentPending");
      } else if (profile.status === "rejected") {
        alert("Your application has been rejected. Please contact support for more information.");
      }
    } catch {
      // Not authenticated - trigger Base44 login, will check profile after
      base44.auth.redirectToLogin(window.location.pathname);
    }
  };

  const howItWorksSteps = [
    {
      icon: Phone,
      title: "We Call You",
      description: "We identify potential surplus and contact you. No searching required on your part.",
    },
    {
      icon: FileText,
      title: "You Sign Online",
      description: "Complete our simple online agreement - no upfront cost, no hidden fees.",
    },
  ];

  const trustPoints = [
    { icon: CheckCircle2, text: "No upfront fees" },
    { icon: CheckCircle2, text: "Contingency only" },
    { icon: Shield, text: "Secure portal" },
    { icon: Clock, text: "Track your case 24/7" },
  ];

  const faqs = [
    {
      question: "What are surplus funds?",
      answer: "Surplus funds are excess proceeds from a property sale (foreclosure or tax sale) after all debts and fees are paid. By law, these funds belong to the former property owner and can be claimed.",
    },
    {
      question: "How much does this cost?",
      answer: "We work on a contingency basis. You pay nothing upfront. Our fee is only taken from the recovered amount, and only if we successfully recover your money. If we don't recover funds, you owe nothing.",
    },
    {
      question: "How long does the process take?",
      answer: "The timeline varies by county and case complexity, but typically ranges from 3-9 months. We handle all the paperwork, court filings, and waiting periods while you track progress through our secure portal.",
    },
    {
      question: "Is this legitimate?",
      answer: "Yes! Surplus recovery is a legal process governed by state and county laws. We are licensed professionals specializing in helping property owners recover funds that legally belong to them.",
    },
    {
      question: "What do I need to provide?",
      answer: "You'll need to provide proof of identity (government-issued ID) and sign our recovery agreement. Everything can be done online through our secure client portal. We handle all the legal paperwork and court filings.",
    },
  ];





  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="TENNO RECOVERY" 
                className="h-10 w-auto"
              />
              <nav className="hidden md:flex items-center gap-6">
                <Link to={createPageUrl("HowItWorks")} className="text-slate-300 hover:text-white transition-colors">
                  How It Works
                </Link>
                <a href="mailto:tennoassetrecovery@gmail.com" className="text-slate-300 hover:text-white transition-colors">
                  Contact
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:border-slate-500">
                      Sign In
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem onClick={handleAgentLogin} className="text-slate-200 hover:text-white focus:bg-slate-700 focus:text-white">
                      Agent Login
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("PortalLogin")} className="text-slate-200 hover:text-white">
                        Client Portal
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-800">
              <nav className="flex flex-col gap-3">
                <Link to={createPageUrl("HowItWorks")} className="text-slate-300 hover:text-white transition-colors">
                  How It Works
                </Link>
                <a href="mailto:tennoassetrecovery@gmail.com" className="text-slate-300 hover:text-white transition-colors">
                  Contact
                </a>
                <Button variant="outline" onClick={handleAgentLogin} className="justify-start border-slate-700 text-white hover:bg-slate-800">
                  Agent Login
                </Button>
                <Link to={createPageUrl("PortalLogin")}>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Client Portal
                  </Button>
                </Link>
              </nav>
            </div>
          )}
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
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Tax Sale Surplus Recovery{" "}
                <span className="text-emerald-400">Made Simple</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-300">
                The complete platform for surplus recovery professionals. Manage cases, 
                automate workflows, and help homeowners recover their funds—all in one place.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  onClick={handleAgentLogin}
                  className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8"
                >
                  Join Our Team <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Link to={createPageUrl("HowItWorks")}>
                  <Button size="lg" className="text-lg px-8 bg-slate-800 text-white hover:bg-slate-700 border border-slate-600">
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
                  <p className="text-sm font-semibold text-white">Trusted by 100+ agents</p>
                  <p className="text-xs text-slate-400">Processing millions in recoveries</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-white">Case #2024-1234</p>
                      <p className="text-sm text-slate-300">Agreement signed, ready for notary</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Clock className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="font-semibold text-white">Case #2024-5678</p>
                      <p className="text-sm text-slate-300">Waiting period: 45 days remaining</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <Award className="w-6 h-6 text-amber-400" />
                    <div>
                      <p className="font-semibold text-white">Case #2024-9012</p>
                      <p className="text-sm text-slate-300">$45,000 surplus approved!</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - 3 Steps */}
      <section className="py-20 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-lg text-slate-300">Simple, transparent, and no upfront cost</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-300">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* Trust Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {trustPoints.map((point, index) => (
              <motion.div
                key={point.text}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
              >
                <point.icon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="font-medium text-white">{point.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* FAQ Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="mt-4 text-lg text-slate-300">Everything you need to know about surplus recovery</p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-slate-800 border border-slate-700 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left font-semibold text-white hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
              Join Our Team <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link to={createPageUrl("PortalLogin")}>
              <Button 
                size="lg" 
                className="text-lg px-8 bg-slate-800 text-white hover:bg-slate-700 border border-slate-600"
              >
                Access Client Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-slate-400 py-12 border-t border-slate-800">
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