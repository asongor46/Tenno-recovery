import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  CheckCircle2,
  Menu,
  X,
  ChevronDown,
  Star,
  Zap,
  Map,
  FileText,
  Users,
  Package } from
"lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger } from
"@/components/ui/accordion";
import { base44 } from "@/api/base44Client";
import FeatureSlideshow from "@/components/landing/FeatureSlideshow";
import PublicSurplusSearch from "@/components/landing/PublicSurplusSearch";
import TennoLogo from "@/components/shared/TennoLogo";

const features = [
{ icon: FileText, title: "CRM + Pipeline", description: "Manage every case from import to payment. Manual stage control on Starter, auto-advance on Pro." },
{ icon: Map, title: "State Compliance Engine", description: "Fee caps, PI/attorney rules, waiting periods — all 50 states + DC. Tax sale vs. sheriff sale, broken out." },
{ icon: Users, title: "Client Self-Serve Portal", description: "Pro plan: clients sign agreements, upload IDs, and complete notarization entirely on their own." },
{ icon: Package, title: "Packet Builder", description: "Pro plan: generate county-specific filing packets with one click — affidavit-based or court-motion-based." },
{ icon: Zap, title: "Lead Import Tools", description: "Starter: manual entry + CSV. Pro: also PDF with AI extraction, screenshot, and URL paste." },
{ icon: Shield, title: "Secure by Default", description: "Row-level security — each agent sees only their own cases. Agents are completely invisible to each other." }];


const comparisonRows = [
{ feature: "CRM + Pipeline", tenno: true, excessElite: true, surplusSystems: true, spreadsheet: false },
{ feature: "Lead Import (CSV + Manual)", tenno: true, excessElite: true, surplusSystems: true, spreadsheet: false },
{ feature: "PDF / Screenshot AI Import", tenno: "Pro only", excessElite: true, surplusSystems: "Partial", spreadsheet: false },
{ feature: "State Compliance Engine", tenno: true, excessElite: false, surplusSystems: false, spreadsheet: false },
{ feature: "Tax Sale vs Sheriff Sale Rules", tenno: true, excessElite: false, surplusSystems: false, spreadsheet: false },
{ feature: "Client Self-Serve Portal", tenno: "Pro only", excessElite: false, surplusSystems: false, spreadsheet: false },
{ feature: "Packet Builder", tenno: "Pro only", excessElite: false, surplusSystems: "Partial", spreadsheet: false },
{ feature: "Power Dialer", tenno: false, excessElite: true, surplusSystems: true, spreadsheet: false },
{ feature: "Monthly Price", tenno: "$50–$97", excessElite: "$200–400+", surplusSystems: "$197–497", spreadsheet: "Free" }];


const faqs = [
{
  question: "Do you provide leads?",
  answer: "We provide import tools. You bring your own data — from county websites, tax records, court filings, or anywhere else. Starter agents import via CSV or manual entry. Pro agents also upload PDFs, screenshots, or paste URLs for AI extraction."
},
{
  question: "What about skip tracing?",
  answer: "We link to free lookup tools inside the platform. A skip trace add-on is coming. For now, use any people-finder tool and manually log contact info — the contact logger is built in."
},
{
  question: "What's the difference between Starter and Pro?",
  answer: "Starter ($50/mo): full CRM, pipeline, manual/CSV import, state compliance engine, county directory, contact logging, email templates, training guides. Pro ($97/mo): everything in Starter plus the client self-serve portal, PDF/screenshot/URL AI import, packet builder, form library, advanced templates, and file manager."
},
{
  question: "Is there a contract?",
  answer: "No. Month to month. Cancel anytime from Settings → Manage Subscription. No cancellation fees, no lock-in."
},
{
  question: "What's the difference between a tax sale and a sheriff sale?",
  answer: "Tax sale surplus comes from properties sold at auction for unpaid property taxes — filed administratively with the county. Sheriff sale surplus comes from mortgage foreclosures — typically requires a court motion and sometimes an attorney. TENNO tracks both types separately and shows the correct fee cap, filing method, and process for each."
},
{
  question: "Is my data private from other agents?",
  answer: "Yes — row-level security means each agent sees only their own cases and clients. Multiple agents can work the same lead independently (common in the industry) — they'll never see each other's data."
}];


function CellValue({ val }) {
  if (val === true) return <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />;
  if (val === false) return <span className="text-slate-600 text-lg mx-auto block text-center">—</span>;
  return <span className="text-slate-300 text-sm">{val}</span>;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleAgentLogin = async () => {
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.AgentProfile.filter({ email: user.email });
      const profile = profiles[0];
      if (!profile || !profile.plan_status || profile.plan_status === "pending_payment") {
        window.location.href = createPageUrl("AgentApply");
      } else if (profile.plan_status === "active" && !profile.onboarding_completed) {
        window.location.href = createPageUrl("AgentOnboarding");
      } else {
        window.location.href = createPageUrl("Dashboard");
      }
    } catch {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <img src={LOGO} alt="TENNO RECOVERY" className="h-9 w-auto" />
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a href="#features" className="text-slate-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="text-slate-400 hover:text-white transition-colors">FAQ</a>
              <div className="flex flex-col items-center">
                <button onClick={handleAgentLogin} className="text-slate-400 hover:text-white transition-colors">
                  Agent Login
                </button>
                <span className="text-xs text-slate-600 mt-0.5">New here? Get started above</span>
              </div>
              <Link to="/Demo">
                <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 h-8 text-xs">
                  Try Demo →
                </Button>
              </Link>
              <Link to={createPageUrl("PortalLogin")}>
                <Button variant="outline" size="sm" className="bg-background text-green-500 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-8 border-slate-600 hover:bg-slate-800">
                  Client Portal
                </Button>
              </Link>
            </nav>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-400 hover:text-white">
              
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          {mobileMenuOpen &&
          <div className="md:hidden py-4 border-t border-slate-800 flex flex-col gap-3 text-sm">
              <a href="#features" className="text-slate-300" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="text-slate-300" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#faq" className="text-slate-300" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <button onClick={handleAgentLogin} className="text-slate-300 text-left">Agent Login</button>
              <Link to={createPageUrl("PortalLogin")} className="text-slate-300">Client Portal</Link>
            </div>
          }
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 lg:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12)_0%,_transparent_60%)]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            

            
            

            
            <h1 className="text-green-400 text-5xl font-bold tracking-tight leading-tight sm:text-6xl lg:text-7xl">Welcome to Tenno Recovery



            </h1>
            

            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              




              
              





              
            </div>
            <p className="mt-5 text-sm text-slate-500">Unlimited cases · No per-lead fees · Cancel anytime</p>
            
          </motion.div>
        </div>
      </section>

      {/* Public Surplus Search */}
      <PublicSurplusSearch />

      {/* Feature Slideshow */}
      <section id="slideshow" className="py-20 bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Every Tool You Need</h2>
            <p className="mt-3 text-slate-400 text-lg"></p>
          </div>
          <FeatureSlideshow />
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Built for Agents</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) =>
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              viewport={{ once: true }}
              className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors">
              
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">How TENNO Compares</h2>
            <p className="mt-3 text-slate-400">Our moat: Compliance engine + client portal. Nobody else has either.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-left px-5 py-4 text-slate-400 font-medium">Feature</th>
                  <th className="px-5 py-4 text-center">
                    <span className="text-emerald-400 font-bold text-base">TENNO</span>
                    <span className="block text-slate-500 text-xs font-normal">$50–$97/mo</span>
                  </th>
                  <th className="px-5 py-4 text-center text-slate-400 font-medium">
                    Excess Elite<span className="block text-xs font-normal text-slate-500">$200–400+</span>
                  </th>
                  <th className="px-5 py-4 text-center text-slate-400 font-medium">
                    Surplus Systems<span className="block text-xs font-normal text-slate-500">$197–497</span>
                  </th>
                  <th className="px-5 py-4 text-center text-slate-400 font-medium">
                    Spreadsheets<span className="block text-xs font-normal text-slate-500">Free</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) =>
                <tr key={row.feature} className={`border-b border-slate-800 ${i % 2 === 0 ? "bg-slate-900/40" : ""}`}>
                    <td className="px-5 py-3.5 text-slate-300 font-medium">{row.feature}</td>
                    <td className="px-5 py-3.5 text-center"><CellValue val={row.tenno} /></td>
                    <td className="px-5 py-3.5 text-center"><CellValue val={row.excessElite} /></td>
                    <td className="px-5 py-3.5 text-center"><CellValue val={row.surplusSystems} /></td>
                    <td className="px-5 py-3.5 text-center"><CellValue val={row.spreadsheet} /></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-slate-400 mb-12">Start solo. Upgrade when you're ready for the portal and AI tools.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Starter */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 text-left">
              <h3 className="text-xl font-bold text-white mb-1">Starter</h3>
              <p className="text-slate-400 text-sm mb-6">For solo agents getting started.</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">$50</span>
                <span className="text-slate-400 text-lg">/month</span>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-300 mb-8">
                {[
                "Unlimited cases",
                "Full CRM & pipeline",
                "Manual case entry + CSV import",
                "State compliance engine — all 50 states",
                "County directory with filing rules",
                "Contact logging & email templates",
                "Case notes & document uploads",
                "How-to training guides"].
                map((item) =>
                <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {item}
                  </li>
                )}
              </ul>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 text-base font-semibold h-12"
                onClick={() => window.location.href = createPageUrl("AgentApply")}>
                Start with Starter <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </div>

            {/* Pro */}
            <div className="bg-slate-800 border-2 border-emerald-500/50 rounded-3xl p-8 text-left relative shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
              <p className="text-slate-400 text-sm mb-6">For full-time agents who want every tool.</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-emerald-400">$97</span>
                <span className="text-slate-400 text-lg">/month</span>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-300 mb-8">
                {[
                "Everything in Starter",
                "Client self-serve portal",
                "PDF import with AI extraction",
                "Screenshot & URL import",
                "Letter generator (mail-ready PDFs)",
                "Packet builder",
                "Form library",
                "Advanced email templates + custom creation",
                "File manager"].
                map((item) =>
                <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                )}
              </ul>
              <Button
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-base font-semibold h-12"
                onClick={() => window.location.href = createPageUrl("AgentApply")}>
                Start with Pro <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
              <p className="mt-4 text-xs text-slate-500 text-center">Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-slate-900/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) =>
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-6">
              
                <AccordionTrigger className="text-left font-semibold text-white hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 pb-4 pt-0 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Build Your Pipeline?</h2>
          <p className="text-slate-400 text-lg mb-8">Join surplus recovery agents managing their entire business on TENNO.</p>
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-base px-10 h-12 font-semibold"
            onClick={() => window.location.href = createPageUrl("AgentApply")}>
            Get Started — From $50/mo <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="mt-4 text-sm text-slate-500">No contracts · Cancel anytime · Starter $50 · Pro $97</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <img src={LOGO} alt="TENNO RECOVERY" className="h-8 w-auto mb-4 brightness-200" />
              <p className="text-sm text-slate-500">
                The surplus recovery platform for agents who are serious about closing deals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-sm">Platform</h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-sm">Access</h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <button onClick={handleAgentLogin} className="hover:text-white">
                    Agent Login
                  </button>
                </li>
                <li>
                  <Link to={createPageUrl("PortalLogin")} className="hover:text-white">
                    Client Portal
                  </Link>
                </li>
                <li>
                  <a href="mailto:tennoassetrecovery@gmail.com" className="hover:text-white">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-600 space-y-2">
            <p>© 2026 TENNO Asset Recovery. All rights reserved.</p>
            <p>
              TENNO is a software platform for surplus recovery professionals. TENNO is not a law firm and does not provide legal advice.{" "}
              <Link to={createPageUrl("TermsPage")} className="text-slate-400 hover:text-white underline">Terms & Conditions</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>);

}