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
      // For now, all authenticated users go to Dashboard
      // TODO: Add role-based routing when AgentProfile system is implemented
      window.location.href = createPageUrl("Dashboard");
    } catch {
      // Not authenticated - trigger Base44 login
      // After successful login, user will be redirected to Dashboard
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
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
    {
      icon: DollarSign,
      title: "We File & Collect",
      description: "We handle all paperwork and court filings. You get paid when we recover your funds.",
    },
  ];

  const trustPoints = [
    { icon: CheckCircle2, text: "No upfront fees" },
    { icon: CheckCircle2, text: "Contingency only" },
    { icon: CheckCircle2, text: "We do all the work" },
    { icon: Shield, text: "Licensed & insured" },
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
                    <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
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
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
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

      {/* Trust Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
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

      {/* Features */}
      <section className="py-20 lg:py-32 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Everything You Need to Scale Your Business
            </h2>
            <p className="mt-4 text-lg text-slate-300">
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
                <Card className="h-full hover:shadow-lg transition-shadow bg-slate-800 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-300">{feature.description}</p>
                  </CardContent>
                </Card>
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
              Get Started Now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link to={createPageUrl("PortalLogin")}>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 border-slate-600 text-white hover:bg-slate-800"
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