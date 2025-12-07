import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowRight, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PortalWelcome() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const [caseData, setCaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCase() {
      if (!token) {
        setError("Invalid access link. Please contact support.");
        setIsLoading(false);
        return;
      }

      const cases = await base44.entities.Case.filter({ portal_token: token });
      if (cases.length === 0) {
        setError("Case not found. Please contact support.");
        setIsLoading(false);
        return;
      }

      setCaseData(cases[0]);
      
      // Update portal access time
      await base44.entities.Case.update(cases[0].id, {
        portal_last_accessed: new Date().toISOString()
      });
      
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Access Error</h2>
            <p className="text-slate-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-semibold text-xl text-slate-900">Base44</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Welcome, {caseData.owner_name}
            </h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              We're assisting you in recovering surplus funds held by your county from a property sale.
            </p>
          </div>

          {/* Case Info */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-900 mb-4">Your Case Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Case Number</p>
                  <p className="font-semibold">{caseData.case_number}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">County</p>
                  <p className="font-semibold">{caseData.county}, {caseData.state}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Property Address</p>
                  <p className="font-semibold">{caseData.property_address || "On file"}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-600">Estimated Surplus</p>
                  <p className="font-bold text-emerald-700 text-xl">
                    ${caseData.surplus_amount?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Steps */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-900 mb-4">What happens next?</h3>
              <div className="space-y-4">
                {[
                  { step: 1, text: "Review and sign the service agreement" },
                  { step: 2, text: "Provide your personal information and ID" },
                  { step: 3, text: "Complete the notarization requirement" },
                  { step: 4, text: "We handle the filing and follow-up" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 font-semibold text-sm">{step}</span>
                    </div>
                    <p className="text-slate-700">{text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <Link to={createPageUrl(`PortalAgreement?token=${token}`)}>
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-6 h-auto">
                Continue <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4">
              This process takes about 5-10 minutes to complete
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          <p>Questions? Contact us at support@base44.com</p>
        </div>
      </footer>
    </div>
  );
}