import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Download, Upload, CheckCircle, Building2, Globe, FileText, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function PortalNotary() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const [caseData, setCaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notaryFiles, setNotaryFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPacket, setIsGeneratingPacket] = useState(false);
  const [selectedOption, setSelectedOption] = useState("in_person");
  const [packetInfo, setPacketInfo] = useState(null);

  useEffect(() => {
    async function loadCase() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      const cases = await base44.entities.Case.filter({ portal_token: token });
      if (cases.length > 0) {
        setCaseData(cases[0]);
        
        // Check if packet already exists
        if (cases[0].notary_packet_generated && cases[0].notary_packet_url) {
          setPacketInfo({
            url: cases[0].notary_packet_url,
            generated_at: cases[0].notary_packet_generated_at
          });
        }
      }
      setIsLoading(false);
    }
    loadCase();
  }, [token]);

  const handleGeneratePacket = async () => {
    setIsGeneratingPacket(true);
    try {
      const { data } = await base44.functions.invoke("generateNotarizationPacket", {
        case_id: caseData.id
      });

      if (data.status === 'success') {
        setPacketInfo({
          url: data.packet_url,
          document_count: data.document_count,
          generated_at: new Date().toISOString()
        });
        toast.success(`Notarization packet generated with ${data.document_count} documents`);
        
        // Refresh case data
        const cases = await base44.entities.Case.filter({ portal_token: token });
        if (cases.length > 0) {
          setCaseData(cases[0]);
        }
      } else {
        toast.error(data.error || 'Failed to generate packet');
      }
    } catch (error) {
      toast.error('Error generating packet: ' + error.message);
    } finally {
      setIsGeneratingPacket(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    setNotaryFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setNotaryFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmitNotary = async () => {
    if (notaryFiles.length === 0) {
      toast.error('Please upload the notarized documents');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Upload all files
      const uploadedUrls = [];
      for (const fileObj of notaryFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileObj.file });
        uploadedUrls.push(file_url);
      }

      // Create a merged document record
      const mainUploadUrl = uploadedUrls[0]; // Primary upload

      await base44.entities.Case.update(caseData.id, {
        notary_type: "in_person",
        notary_packet_uploaded: true,
        notary_packet_upload_url: mainUploadUrl,
        notary_verified: "pending",
        stage: "notary_completed",
      });

      await base44.entities.ActivityLog.create({
        case_id: caseData.id,
        action: "Notarization Packet Uploaded",
        description: `Homeowner uploaded ${notaryFiles.length} notarized document(s) via portal`,
        performed_by: "Homeowner",
        metadata: {
          file_count: notaryFiles.length,
          upload_urls: uploadedUrls
        }
      });

      toast.success('Notarization packet submitted successfully!');
      window.location.href = createPageUrl(`PortalComplete?token=${token}`);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
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

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Notarization Packet</h1>
          <p className="text-slate-500 mb-6">
            Your county requires notarization of specific documents. Follow the steps below.
          </p>

          {/* Prerequisites Check */}
          {caseData && (!caseData.agreement_status || caseData.agreement_status !== 'signed') && (
            <Card className="mb-6 border-amber-300 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900">Agreement Must Be Signed First</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      The service agreement must be signed before the notarization packet can be generated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  
                  {/* Step 1: Generate/Download Packet */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <h4 className="font-semibold">Download Notarization Packet</h4>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 mb-3">
                      <p className="text-sm text-blue-800">
                        {packetInfo 
                          ? "Your notarization packet is ready. Download and print all pages."
                          : "Generate a complete packet with all documents requiring notarization."}
                      </p>
                    </div>

                    {packetInfo ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-medium text-emerald-900">Packet Generated</p>
                              <p className="text-xs text-emerald-700">
                                {new Date(packetInfo.generated_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <a href={packetInfo.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </a>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleGeneratePacket}
                          disabled={isGeneratingPacket}
                          className="w-full"
                        >
                          {isGeneratingPacket ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>Regenerate Packet</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleGeneratePacket}
                        disabled={isGeneratingPacket || !caseData || caseData.agreement_status !== 'signed'}
                        className="w-full"
                      >
                        {isGeneratingPacket ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Packet...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Notarization Packet
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Step 2: Visit Notary */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-slate-300 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <h4 className="font-semibold">Visit a Notary Public</h4>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <ul className="text-sm text-slate-700 space-y-2">
                        <li>• Print the entire packet</li>
                        <li>• Bring valid government-issued ID</li>
                        <li>• Sign all documents in front of the notary</li>
                        <li>• Notary will add their stamp and signature</li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 3: Upload */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-slate-300 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <h4 className="font-semibold">Upload Notarized Documents</h4>
                    </div>
                    
                    <div 
                      className="border-2 border-dashed rounded-xl p-6 text-center mb-4"
                    >
                      <label className="cursor-pointer block py-4">
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">Upload Notarized Packet</p>
                        <p className="text-sm text-slate-400 mt-1">
                          PDF or clear photos of all notarized pages (with stamps visible)
                        </p>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </div>

                    {notaryFiles.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {notaryFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-slate-600" />
                              <span className="text-sm text-slate-700">{file.name}</span>
                            </div>
                            <button
                              onClick={() => removeFile(idx)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      size="lg"
                      disabled={notaryFiles.length === 0 || isSubmitting}
                      onClick={handleSubmitNotary}
                      className="bg-emerald-600 hover:bg-emerald-700 w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          Submit Notarized Packet
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
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