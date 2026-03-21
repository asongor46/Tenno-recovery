import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, PenTool, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import PortalAuthGuard from "@/components/portal/PortalAuthGuard";
import PortalErrorBoundary from "@/components/portal/PortalErrorBoundary";

export default function PortalAgreement() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get("id");
  const userEmail = sessionStorage.getItem("portal_user_email") || localStorage.getItem("portal_user_email");
  const [hasRead, setHasRead] = useState(false);
  const [signatureType, setSignatureType] = useState("type"); // type or draw
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [caseData, setCaseData] = useState(null);
  const [agreementDoc, setAgreementDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCase() {
      const sessionToken = sessionStorage.getItem("portal_session_token") || localStorage.getItem("portal_session_token");
      if (!caseId || !sessionToken) {
        window.location.href = createPageUrl("PortalLogin");
        return;
      }
      const res = await base44.functions.invoke("getPortalCaseData", { session_token: sessionToken, case_id: caseId });
      if (!res.data?.success) {
        window.location.href = createPageUrl("PortalDashboard");
        return;
      }
      setCaseData(res.data.case);
      setAgreementDoc(res.data.agreement_doc);
      setIsLoading(false);
    }
    loadCase();
  }, [caseId]);

  // Canvas drawing functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    if (!hasRead) return;
    
    let signature = "";
    if (signatureType === "type") {
      if (!typedSignature.trim()) return;
      signature = typedSignature;
    } else {
      const canvas = canvasRef.current;
      signature = canvas.toDataURL();
    }

    // Validate fee is set before locking
    if (!caseData.fee_percent || caseData.fee_percent <= 0) {
      toast.error("Fee not set. Contact your agent.");
      return;
    }

    setIsSubmitting(true);

    const sessionToken = sessionStorage.getItem("portal_session_token") || localStorage.getItem("portal_session_token");

    try {
      const res = await base44.functions.invoke("updatePortalCase", {
        session_token: sessionToken,
        case_id: caseData.id,
        action: "sign_agreement",
        payload: { signature },
      });

      if (!res.data?.success) {
        toast.error(res.data?.error || "Failed to sign agreement");
        setIsSubmitting(false);
        return;
      }

      toast.success("Agreement signed successfully!");
      navigate(createPageUrl(`PortalInfo?id=${caseId}`));
    } catch (error) {
      toast.error("Failed to sign agreement: " + error.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Prevent re-signing if already signed
  if (caseData?.agreement_status === 'signed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Agreement Already Signed</h2>
          <p className="text-slate-600 mb-6">
            This agreement was signed on {caseData.agreement_signed_at && new Date(caseData.agreement_signed_at).toLocaleDateString()}
          </p>
          <Link to={createPageUrl(`PortalInfo?id=${caseId}`)}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Continue to Next Step
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <PortalErrorBoundary>
    <PortalAuthGuard>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex justify-center w-full sm:w-auto">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="Tenno Recovery" 
                className="h-10 w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 font-semibold text-sm">1</span>
              </div>
              <span className="text-xs sm:text-sm text-slate-500">Step 1 of 3</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to={createPageUrl("PortalDashboard")}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Service Agreement</h1>
          <p className="text-slate-500 mb-6">Please review and sign the agreement below</p>

          {/* Digital Signature Notice */}
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-700">
                    This is a private service agreement between you and Tenno Recovery. Your digital 
                    signature below is legally binding under the E-SIGN Act.
                  </p>
                  <p className="text-sm text-blue-700 mt-2">
                    <em>Note: The county claim forms will require notarization, but we'll guide you through 
                    that simple process later.</em>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agreement Content */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              {agreementDoc && (
                <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-700">Official Agreement Document Available</span>
                  </div>
                  <a href={agreementDoc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </a>
                </div>
              )}
              <div className="h-80 overflow-y-auto border rounded-lg p-6 bg-slate-50 text-sm text-slate-700 leading-relaxed">
                <h2 className="font-bold text-lg mb-4">SURPLUS RECOVERY SERVICE AGREEMENT</h2>
                
                <p className="mb-4">
                  This Agreement is entered into by and between Tenno Recovery ("Company") and the property owner 
                  identified below ("Client") regarding surplus funds recovery services.
                </p>

                <h3 className="font-semibold mt-6 mb-2">1. SERVICES</h3>
                <p className="mb-4">
                  Company agrees to provide services to assist Client in recovering surplus funds from the 
                  sale of property located at the address associated with the above-referenced case number. 
                  Services include: research, document preparation, filing with appropriate government offices, 
                  and follow-up communications.
                </p>

                <h3 className="font-semibold mt-6 mb-2">2. COMPENSATION</h3>
                <p className="mb-4">
                  Client agrees to pay Company a contingency fee of <strong>{caseData?.fee_percent || 20}%</strong> of any surplus funds recovered. This fee is due and payable only upon successful recovery of surplus funds. If no funds are recovered, Client owes nothing.
                </p>

                <h3 className="font-semibold mt-6 mb-2">3. CLIENT RESPONSIBILITIES</h3>
                <p className="mb-4">
                  Client agrees to: (a) provide accurate information and documentation as requested; 
                  (b) respond to communications in a timely manner; (c) complete any required notarization 
                  as directed; (d) not engage another party to pursue the same surplus funds during the 
                  term of this Agreement.
                </p>

                <h3 className="font-semibold mt-6 mb-2">4. TERM AND TERMINATION</h3>
                <p className="mb-4">
                  This Agreement shall remain in effect until the surplus funds are recovered and distributed, 
                  or until terminated by either party with written notice. If Client terminates after Company 
                  has filed a claim, Client remains responsible for the contingency fee if funds are subsequently 
                  recovered within 12 months.
                </p>

                <h3 className="font-semibold mt-6 mb-2">5. DISCLAIMER</h3>
                <p className="mb-4">
                  Company makes no guarantee that surplus funds will be recovered. Recovery depends on various 
                  factors including county procedures, competing claims, and applicable laws. Past results do 
                  not guarantee future outcomes.
                </p>

                <p className="mt-8 text-xs text-slate-500">
                  By signing below, I acknowledge that I have read, understand, and agree to the terms of this Agreement.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Read Confirmation */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="hasRead"
                  checked={hasRead}
                  onCheckedChange={setHasRead}
                />
                <Label htmlFor="hasRead" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                  I have read and understand the Service Agreement above. I agree to the terms and conditions 
                  outlined, including the contingency fee structure. I understand that my digital signature 
                  is legally binding.
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-900 mb-4">Your Signature</h3>
              
              <div className="flex gap-4 mb-4">
                <Button
                  variant={signatureType === "type" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignatureType("type")}
                >
                  Type Signature
                </Button>
                <Button
                  variant={signatureType === "draw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignatureType("draw")}
                >
                  <PenTool className="w-4 h-4 mr-2" /> Draw Signature
                </Button>
              </div>

              {signatureType === "type" ? (
                <div>
                  <Input
                    placeholder="Type your full legal name"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    className="text-xl sm:text-2xl font-serif h-14 sm:h-16"
                  />
                  {typedSignature && (
                    <p className="mt-4 text-2xl sm:text-3xl font-serif text-slate-800 italic break-words">
                      {typedSignature}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    className="border rounded-lg bg-white cursor-crosshair w-full touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      const rect = e.target.getBoundingClientRect();
                      const canvas = canvasRef.current;
                      const ctx = canvas.getContext("2d");
                      ctx.beginPath();
                      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      setIsDrawing(true);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      if (!isDrawing) return;
                      const touch = e.touches[0];
                      const rect = e.target.getBoundingClientRect();
                      const canvas = canvasRef.current;
                      const ctx = canvas.getContext("2d");
                      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      ctx.stroke();
                    }}
                    onTouchEnd={() => setIsDrawing(false)}
                  />
                  <Button variant="ghost" size="sm" className="mt-2" onClick={clearCanvas}>
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-center sm:justify-end">
            <Button
              size="lg"
              disabled={!hasRead || (signatureType === "type" && !typedSignature.trim()) || isSubmitting}
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 px-6 sm:px-8 w-full sm:w-auto"
            >
              {isSubmitting ? "Signing..." : "Sign Agreement & Continue"}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
          </div>

          {/* Legal Notice */}
          <p className="text-xs text-center text-slate-400 mt-6">
            By clicking "Sign Agreement & Continue", you are providing your electronic signature, 
            which is legally binding under the Electronic Signatures in Global and National Commerce Act (E-SIGN Act).
          </p>
        </motion.div>
      </main>
    </div>
    </PortalAuthGuard>
    </PortalErrorBoundary>
  );
}