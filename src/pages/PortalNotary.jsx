import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Download, Upload, CheckCircle, Building2, Globe, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PortalNotary() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const [caseData, setCaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notaryPhoto, setNotaryPhoto] = useState(null);
  const [notaryPhotoPreview, setNotaryPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState("in_person");

  useEffect(() => {
    async function loadCase() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      const cases = await base44.entities.Case.filter({ portal_token: token });
      if (cases.length > 0) {
        setCaseData(cases[0]);
        if (cases[0].notary_photo_url) {
          setNotaryPhotoPreview(cases[0].notary_photo_url);
        }
      }
      setIsLoading(false);
    }
    loadCase();
  }, [token]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setNotaryPhoto(file);
      setNotaryPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitNotary = async () => {
    if (!notaryPhoto && !notaryPhotoPreview) return;
    
    setIsSubmitting(true);

    let notary_photo_url = caseData.notary_photo_url;

    if (notaryPhoto) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: notaryPhoto });
      notary_photo_url = file_url;
    }

    await base44.entities.Case.update(caseData.id, {
      notary_type: "in_person",
      notary_status: "uploaded",
      notary_photo_url,
      stage: "notary_completed",
    });

    await base44.entities.ActivityLog.create({
      case_id: caseData.id,
      action: "Notary Page Uploaded",
      description: "Homeowner uploaded notarized page via portal",
      performed_by: "Homeowner",
    });

    window.location.href = createPageUrl(`PortalComplete?token=${token}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex justify-center w-full sm:w-auto">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
                alt="TENNO RECOVERY" 
                className="h-10 w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 font-semibold text-xs sm:text-sm">3</span>
              </div>
              <span className="text-xs sm:text-sm text-slate-500 hidden sm:inline">Step 3 of 3</span>
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
          <Link to={createPageUrl(`PortalInfo?token=${token}`)}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Notarization</h1>
          <p className="text-slate-500 mb-6">
            Your county requires a notarized signature. Choose an option below.
          </p>

          <Tabs value={selectedOption} onValueChange={setSelectedOption}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="in_person" className="gap-2">
                <Building2 className="w-4 h-4" />
                In-Person Notary
              </TabsTrigger>
              <TabsTrigger value="online" className="gap-2">
                <Globe className="w-4 h-4" />
                Online Notary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="in_person">
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-slate-900 mb-3">In-Person Notary (Free)</h3>
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      Visit a local notary (banks, UPS stores, and many other locations offer notary services). 
                      Bring a valid government-issued ID. After signing in front of the notary, 
                      take a clear photo of the notarized page and upload it below.
                    </p>
                  </div>

                  {/* Download Button */}
                  <Button variant="outline" className="w-full mb-6">
                    <Download className="w-4 h-4 mr-2" />
                    Download Notary Page to Print
                  </Button>

                  {/* Upload Section */}
                  <div>
                    <p className="font-medium text-slate-900 mb-3">Upload Notarized Page</p>
                    <div 
                      className={`border-2 border-dashed rounded-xl p-6 text-center ${
                        notaryPhotoPreview ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      {notaryPhotoPreview ? (
                        <div className="relative">
                          <img 
                            src={notaryPhotoPreview} 
                            alt="Notarized Page" 
                            className="max-h-60 mx-auto rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setNotaryPhoto(null);
                              setNotaryPhotoPreview(null);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block py-4">
                          <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-slate-600 font-medium">Upload Photo of Notarized Page</p>
                          <p className="text-sm text-slate-400 mt-1">
                            Take a clear, well-lit photo showing the entire page including the notary stamp
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileSelect}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center sm:justify-end mt-6">
                    <Button
                      size="lg"
                      disabled={!notaryPhotoPreview || isSubmitting}
                      onClick={handleSubmitNotary}
                      className="bg-emerald-600 hover:bg-emerald-700 px-6 sm:px-8 w-full sm:w-auto"
                    >
                      {isSubmitting ? "Uploading..." : "Submit Notarized Page"}
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="online">
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-slate-900 mb-3">Online Notary (Fee Applies)</h3>
                  <div className="bg-amber-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-800">
                      Online notarization allows you to complete the notary requirement from your computer 
                      or phone via video call. A third-party notary fee typically ranges from $25-$50.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border rounded-xl">
                      <p className="font-medium">How it works:</p>
                      <ol className="mt-2 space-y-2 text-sm text-slate-600">
                        <li>1. Click the button below to connect with an online notary</li>
                        <li>2. Verify your identity via video call</li>
                        <li>3. Sign electronically in front of the notary</li>
                        <li>4. Receive your notarized document instantly</li>
                      </ol>
                    </div>

                    <Button className="w-full" variant="outline">
                      <Globe className="w-4 h-4 mr-2" />
                      Connect to Online Notary Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}