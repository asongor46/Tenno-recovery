import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Upload, Camera, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PortalAuthGuard from "@/components/portal/PortalAuthGuard";
import PortalErrorBoundary from "@/components/portal/PortalErrorBoundary";
import { toast } from "sonner";

export default function PortalInfo() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get("id");
  const userEmail = sessionStorage.getItem("portal_user_email") || localStorage.getItem("portal_user_email");
  const [caseData, setCaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // [ENHANCED - PortalInfo]
  const [formData, setFormData] = useState({
    owner_name: "",
    owner_address: "",
    owner_city: "",
    owner_state: "",
    owner_zip: "",
    owner_phone: "",
    owner_email: "",
    owner_dob: "",
    owner_ssn_last_four: "",
  });
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState(null);
  const [idBackPreview, setIdBackPreview] = useState(null);

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
        setIsLoading(false);
        return;
      }
      const c = res.data.case;
      setCaseData(c);
      setFormData({
        owner_name: c.owner_name || "",
        owner_address: c.owner_address || "",
        owner_city: c.owner_city || "",
        owner_state: c.owner_state || "",
        owner_zip: c.owner_zip || "",
        owner_phone: c.owner_phone || "",
        owner_email: c.owner_email || "",
        owner_dob: c.owner_dob || "",
        owner_ssn_last_four: c.owner_ssn_last_four || "",
      });
      if (c.id_front_url) setIdFrontPreview(c.id_front_url);
      if (c.id_back_url) setIdBackPreview(c.id_back_url);
      setIsLoading(false);
    }
    loadCase();
  }, [caseId]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (type, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "front") {
        if (idFrontPreview && idFrontPreview.startsWith('blob:')) {
          URL.revokeObjectURL(idFrontPreview);
        }
        setIdFront(file);
        setIdFrontPreview(e.target.result);
      } else {
        if (idBackPreview && idBackPreview.startsWith('blob:')) {
          URL.revokeObjectURL(idBackPreview);
        }
        setIdBack(file);
        setIdBackPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (idFrontPreview && idFrontPreview.startsWith('blob:')) {
        URL.revokeObjectURL(idFrontPreview);
      }
      if (idBackPreview && idBackPreview.startsWith('blob:')) {
        URL.revokeObjectURL(idBackPreview);
      }
    };
  }, [idFrontPreview, idBackPreview]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const sessionToken = sessionStorage.getItem("portal_session_token") || localStorage.getItem("portal_session_token");

    let id_front_url = caseData.id_front_url;
    let id_back_url = caseData.id_back_url;

    // Upload ID photos if new ones were selected
    if (idFront) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: idFront });
      id_front_url = file_url;
    }
    if (idBack) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: idBack });
      id_back_url = file_url;
    }

    const res = await base44.functions.invoke("updatePortalCase", {
      session_token: sessionToken,
      case_id: caseData.id,
      action: "submit_info",
      payload: {
        owner_name: formData.owner_name,
        owner_address: formData.owner_address,
        owner_city: formData.owner_city,
        owner_state: formData.owner_state,
        owner_zip: formData.owner_zip,
        owner_phone: formData.owner_phone,
        owner_dob: formData.owner_dob,
        owner_ssn_last_four: formData.owner_ssn_last_four,
        id_front_url,
        id_back_url,
        id_uploaded_at: id_front_url && id_back_url ? new Date().toISOString() : caseData.id_uploaded_at,
      },
    });

    if (!res.data?.success) {
      toast.error(res.data?.error || "Failed to save information");
      setIsSubmitting(false);
      return;
    }

    toast.success("Information saved successfully!");
    navigate(createPageUrl(`PortalNotary?id=${caseId}`));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // [ENHANCED - PortalInfo] - Validation includes new required fields
  const isValid = formData.owner_name && formData.owner_address && formData.owner_city &&
                  formData.owner_state && formData.owner_zip && formData.owner_phone && 
                  formData.owner_email && formData.owner_dob && formData.owner_ssn_last_four &&
                  (idFrontPreview) && (idBackPreview);

  // [ENHANCED - PortalInfo] - Dark theme applied
  return (
    <PortalErrorBoundary>
    <PortalAuthGuard>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex justify-center w-full sm:w-auto">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="TENNO RECOVERY" 
                className="h-10 w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-emerald-400 font-semibold text-sm">2</span>
              </div>
              <span className="text-sm text-slate-400">Step 2 of 3</span>
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

          <h1 className="text-2xl font-bold text-white mb-2">Confirm Your Information</h1>
          <p className="text-slate-300 mb-6">We need accurate information to file your claim</p>

          {/* Case Info - Display Only */}
          <Card className="mb-6 bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Case Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Case #:</span>
                  <span className="text-white font-medium">{caseData?.case_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Property:</span>
                  <span className="text-white">{caseData?.property_address}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info Form */}
          <Card className="mb-6 bg-white border-slate-200">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-slate-900 mb-4">Your Information</h3>
              
              <div>
                <Label htmlFor="owner_name">Full Legal Name *</Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) => handleChange("owner_name", e.target.value)}
                  placeholder="As it appears on your ID"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="owner_dob">Date of Birth *</Label>
                  <Input
                    id="owner_dob"
                    type="date"
                    value={formData.owner_dob}
                    onChange={(e) => handleChange("owner_dob", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="owner_ssn_last_four">Last 4 of SSN *</Label>
                  <Input
                    id="owner_ssn_last_four"
                    type="text"
                    maxLength={4}
                    value={formData.owner_ssn_last_four}
                    onChange={(e) => handleChange("owner_ssn_last_four", e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                  />
                  <p className="text-xs text-slate-500 mt-1">Required for county verification</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Current Mailing Address</h4>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="owner_address">Street Address *</Label>
                    <Input
                      id="owner_address"
                      value={formData.owner_address}
                      onChange={(e) => handleChange("owner_address", e.target.value)}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="owner_city">City *</Label>
                      <Input
                        id="owner_city"
                        value={formData.owner_city}
                        onChange={(e) => handleChange("owner_city", e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="owner_state">State *</Label>
                      <Input
                        id="owner_state"
                        value={formData.owner_state}
                        onChange={(e) => handleChange("owner_state", e.target.value)}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label htmlFor="owner_zip">ZIP *</Label>
                      <Input
                        id="owner_zip"
                        value={formData.owner_zip}
                        onChange={(e) => handleChange("owner_zip", e.target.value)}
                        placeholder="ZIP"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h4>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="owner_phone">Phone Number *</Label>
                    <Input
                      id="owner_phone"
                      value={formData.owner_phone}
                      onChange={(e) => handleChange("owner_phone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="owner_email">Email (cannot change)</Label>
                    <Input
                      id="owner_email"
                      type="email"
                      value={formData.owner_email}
                      disabled
                      className="text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ID Upload */}
          <Card className="mb-8 bg-white border-slate-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-900 mb-4">ID Verification *</h3>
              <p className="text-sm text-slate-600 mb-4">
                Please upload clear photos of the front and back of your government-issued ID 
                (driver's license, state ID, or passport).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID Front */}
                <div>
                  <Label className="mb-2 block">ID Front</Label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-4 text-center relative ${
                      idFrontPreview ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
                    }`}
                  >
                    {idFrontPreview ? (
                      <div className="relative">
                        <img 
                          src={idFrontPreview} 
                          alt="ID Front" 
                          className="max-h-40 mx-auto rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setIdFront(null);
                            setIdFrontPreview(null);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-6">
                        <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-700 font-medium">Upload Front</p>
                        <p className="text-xs text-slate-500 mt-1">Click or tap to select</p>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleFileSelect("front", e)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* ID Back */}
                <div>
                  <Label className="mb-2 block">ID Back</Label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-4 text-center relative ${
                      idBackPreview ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
                    }`}
                  >
                    {idBackPreview ? (
                      <div className="relative">
                        <img 
                          src={idBackPreview} 
                          alt="ID Back" 
                          className="max-h-40 mx-auto rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setIdBack(null);
                            setIdBackPreview(null);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-6">
                        <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-700 font-medium">Upload Back</p>
                        <p className="text-xs text-slate-500 mt-1">Click or tap to select</p>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleFileSelect("back", e)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              size="lg"
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 px-8"
            >
              {isSubmitting ? "Saving..." : "Continue"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
    </PortalAuthGuard>
    </PortalErrorBoundary>
  );
}