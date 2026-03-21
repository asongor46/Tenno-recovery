import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex items-center gap-4">
        <img src={LOGO} alt="TENNO RECOVERY" className="h-8 w-auto" />
        <Link to={createPageUrl("LandingPage")}>
          <Button variant="ghost" size="sm" className="text-slate-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-slate-300">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Terms & Conditions</h1>
          <p className="text-slate-500 text-sm">Last updated: March 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. Platform Overview</h2>
          <p>TENNO GROUP LLC ("TENNO", "we", "us") provides a software platform for surplus recovery professionals ("Agents"). TENNO provides technology tools only. TENNO is not a law firm, does not provide legal advice, and does not practice law in any jurisdiction.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. Independent Contractor Status</h2>
          <p>Agents using the TENNO platform are independent contractors. TENNO does not employ, supervise, direct, endorse, or vouch for individual agents. TENNO does not control how agents conduct their business, communicate with homeowners, or file claims.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. No Guarantee of Results</h2>
          <p>TENNO makes no representation or warranty that use of the platform will result in successful surplus recovery. Results depend on individual case circumstances, county and state procedures, applicable law, competing claims, and many other factors outside TENNO's control.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4. Homeowner Rights Disclosure</h2>
          <p>Homeowners may claim surplus funds directly from their county or state government at no cost, without hiring a third-party agent. TENNO requires that all agents disclose this right to homeowners before entering into any fee agreement.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">5. Agent Compliance Obligations</h2>
          <p>Agents are solely responsible for complying with all applicable local, state, and federal laws governing surplus recovery in each jurisdiction where they operate. This includes, but is not limited to, fee cap laws, attorney requirements, and licensing requirements. TENNO's compliance engine provides informational guidance only and does not constitute legal advice.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">6. Fee Agreements</h2>
          <p>All fee agreements are between the agent and the homeowner. TENNO is not a party to any fee agreement. TENNO is not responsible for the enforcement, validity, or fairness of any agent-homeowner agreement.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">7. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, TENNO shall not be liable for any direct, indirect, incidental, special, or consequential damages arising out of or related to your use of the platform, agent conduct, claim outcomes, or any other matter. In no event shall TENNO's liability exceed the amount paid by you in subscription fees in the three (3) months preceding the claim.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">8. Privacy</h2>
          <p>TENNO collects and stores information necessary to provide the platform. Case data, homeowner information, and documents are stored securely with row-level access controls. Agents may only access their own data. TENNO does not sell personal data to third parties.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">9. Subscription & Cancellation</h2>
          <p>Subscriptions are billed monthly. You may cancel at any time from your Settings page. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial months.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">10. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of Florida, without regard to conflict of law principles.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">11. Contact</h2>
          <p>Questions about these Terms? Email us at <a href="mailto:tennoassetrecovery@gmail.com" className="text-emerald-400 hover:underline">tennoassetrecovery@gmail.com</a>.</p>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-600">
        © 2026 TENNO Asset Recovery. All rights reserved.
      </footer>
    </div>
  );
}