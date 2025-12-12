import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { CheckCircle, PartyPopper, Clock, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PortalComplete() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const [caseData, setCaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCase() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      const cases = await base44.entities.Case.filter({ portal_token: token });
      if (cases.length > 0) {
        setCaseData(cases[0]);
      }
      setIsLoading(false);
    }
    loadCase();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="font-semibold text-xl text-slate-900">TENNO Recovery</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((step) => (
                <div key={step} className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              ))}
              <span className="text-sm text-emerald-600 ml-2 font-medium">Complete!</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Success Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle className="w-12 h-12 text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="absolute -top-2 -right-2"
            >
              <PartyPopper className="w-8 h-8 text-amber-500" />
            </motion.div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-slate-900 mb-4"
          >
            You're All Done!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-slate-600 mb-8 max-w-lg mx-auto"
          >
            Thank you, {caseData?.owner_name}. We've received all your information and will handle everything from here.
          </motion.p>

          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="mb-8 text-left">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-4">Submission Summary</h3>
                <div className="space-y-3">
                  <SummaryItem label="Name" value={caseData?.owner_name} />
                  <SummaryItem label="Address" value={caseData?.owner_address} />
                  <SummaryItem label="Case Number" value={caseData?.case_number} />
                  <SummaryItem label="County" value={`${caseData?.county}, ${caseData?.state}`} />
                  <SummaryItem 
                    label="Estimated Surplus" 
                    value={`$${caseData?.surplus_amount?.toLocaleString() || "0"}`}
                    highlight
                  />
                </div>

                <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">All documents received</span>
                  </div>
                  <ul className="text-sm text-emerald-600 ml-7 space-y-1">
                    <li>✓ Agreement signed</li>
                    <li>✓ Personal information submitted</li>
                    <li>✓ ID verification complete</li>
                    <li>✓ Notarization complete</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* What's Next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="mb-8">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-4">What Happens Next?</h3>
                <div className="space-y-4 text-left">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-semibold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Document Review</p>
                      <p className="text-sm text-slate-500">We'll verify all documents and prepare your filing packet</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-semibold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">County Filing</p>
                      <p className="text-sm text-slate-500">We'll submit your claim to {caseData?.county} County</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-semibold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Follow Up & Payment</p>
                      <p className="text-sm text-slate-500">We'll track your claim and contact you when funds are released</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Typical processing time: 4-12 weeks depending on county</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-4">Questions?</h3>
                <p className="text-slate-500 mb-4">
                  We'll keep you updated throughout the process. If you have any questions, please reach out:
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>(555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span>support@tennorecovery.com</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          <p>Thank you for choosing TENNO Recovery • Reference: {caseData?.case_number}</p>
        </div>
      </footer>
    </div>
  );
}

function SummaryItem({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? "font-bold text-emerald-600" : "font-medium text-slate-900"}>
        {value || "—"}
      </span>
    </div>
  );
}