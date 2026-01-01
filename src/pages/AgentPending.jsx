import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Mail, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function AgentPending() {
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

  const handleLogout = () => {
    base44.auth.logout();
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
          <Button variant="ghost" onClick={handleLogout} className="text-slate-300">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Application Under Review</h1>
          <p className="text-lg text-slate-300 mb-8">
            Thanks for applying! We're reviewing your application and will get back to you soon.
          </p>

          <Card className="bg-slate-800 border-slate-700 text-left">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <span className="text-slate-200 font-medium">Status:</span>
                  <span className="text-amber-400 font-semibold">PENDING REVIEW</span>
                </div>

                {profile?.applied_at && (
                  <div className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                    <span className="text-slate-300">Applied:</span>
                    <span className="text-white">{format(new Date(profile.applied_at), "MMMM d, yyyy")}</span>
                  </div>
                )}

                <div className="mt-6 p-4 bg-slate-900 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">What happens next?</h3>
                  <ol className="space-y-2 text-slate-300">
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">1.</span>
                      <span>We review your application (usually 24-48 hours)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">2.</span>
                      <span>You'll receive an email when approved</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">3.</span>
                      <span>Log back in and complete onboarding training</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">4.</span>
                      <span>Start working cases and earning commissions!</span>
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <Mail className="w-5 h-5 text-slate-400 inline-block mr-2" />
            <span className="text-slate-300">
              Questions? Contact us at{" "}
              <a href="mailto:tennoassetrecovery@gmail.com" className="text-emerald-400 hover:text-emerald-300">
                tennoassetrecovery@gmail.com
              </a>
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}