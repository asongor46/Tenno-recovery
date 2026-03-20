import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { 
  ArrowLeft, ArrowRight, Download, Upload, CheckCircle, Camera, 
  FileText, X, AlertCircle, Loader2, MapPin, Phone, Clock,
  HelpCircle, Check, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import PortalAuthGuard from "@/components/portal/PortalAuthGuard";

export default function PortalNotary() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get("id");
  const userEmail = sessionStorage.getItem("portal_user_email") || localStorage.getItem("portal_user_email");
  const [caseData, setCaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState("overview"); // overview, print, find, at_notary, upload, verify
  const [notaryFiles, setNotaryFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPacket, setIsGeneratingPacket] = useState(false);
  const [packetInfo, setPacketInfo] = useState(null);
  const [printConfirmed, setPrintConfirmed] = useState(false);
  const [selectedNotary, setSelectedNotary] = useState(null);
  const [nearbyNotaries, setNearbyNotaries] = useState([
    {
      id: 1,
      icon: "🏦",
      name: "Wells Fargo Bank",
      address: "123 Main St",
      hours: "Mon-Fri 9am-5pm",
      distance: 0.8,
      phone: "(555) 123-4567",
      free_for_customers: true
    },
    {
      id: 2,
      icon: "📦",
      name: "The UPS Store",
      address: "456 Oak Ave",
      hours: "Mon-Sat 9am-7pm",
      distance: 1.2,
      phone: "(555) 234-5678",
      cost: 15
    },
    {
      id: 3,
      icon: "📄",
      name: "FedEx Office",
      address: "789 Pine Rd",
      hours: "Mon-Sun 8am-8pm",
      distance: 1.5,
      phone: "(555) 345-6789",
      cost: 10
    }
  ]);

  useEffect(() => {
    async function loadCase() {
      if (!caseId || !userEmail) {
        window.location.href = createPageUrl("PortalLogin");
        return;
      }
      const cases = await base44.entities.Case.filter({ id: caseId });
      const c = cases[0];
      if (!c || c.owner_email?.toLowerCase() !== userEmail?.toLowerCase()) {
        window.location.href = createPageUrl("PortalDashboard");
        setIsLoading(false);
        return;
      }
      setCaseData(c);
      if (c.notary_packet_generated && c.notary_packet_url) {
        setPacketInfo({
          url: c.notary_packet_url,
          generated_at: c.notary_packet_generated_at
        });
      }
      setIsLoading(false);
    }
    loadCase();
  }, [caseId, userEmail]);

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
      const uploadedUrls = [];
      for (let i = 0; i < notaryFiles.length; i++) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: notaryFiles[i].file });
        uploadedUrls.push(file_url);
        
        await base44.entities.Document.create({
          case_id: caseData.id,
          category: "notary_page",
          file_url,
          name: `Notarized Document ${i + 1}`,
          uploaded_by: "homeowner",
          is_primary: i === 0,
        });
      }

      await base44.entities.Case.update(caseData.id, {
        notary_type: "in_person",
        notary_packet_uploaded: true,
        notary_packet_upload_url: uploadedUrls[0],
        notary_verified: "pending",
        stage: "notary_completed",
      });

      await base44.entities.ActivityLog.create({
        case_id: caseData.id,
        action: "Notarization Packet Uploaded",
        description: `Homeowner uploaded ${notaryFiles.length} notarized document(s) via portal`,
        performed_by: "Homeowner",
        is_client_visible: true,
      });

      toast.success('Notarization packet submitted successfully!');
      navigate(createPageUrl(`PortalComplete?id=${caseId}`));
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
    <PortalAuthGuard>
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
          <Link to={createPageUrl("PortalDashboard")}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Notarization Step</h1>
          <p className="text-slate-500 mb-6">
            {caseData?.county} County requires your claim forms to be notarized. We'll guide you through it.
          </p>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 px-4 overflow-x-auto">
            {['Download', 'Print', 'Find Notary', 'Get Notarized', 'Upload'].map((s, i) => {
              const stepIndex = ['overview', 'print', 'find', 'at_notary', 'upload'].indexOf(step);
              return (
                <div key={s} className="flex flex-col items-center min-w-max">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    stepIndex > i ? 'bg-emerald-500' : stepIndex === i ? 'bg-blue-500' : 'bg-slate-200'
                  }`}>
                    {stepIndex > i ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span className={`text-sm font-semibold ${stepIndex === i ? 'text-white' : 'text-slate-500'}`}>
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 text-center">{s}</span>
                </div>
              );
            })}
          </div>

          {/* STEP: Overview */}
          {step === 'overview' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-yellow-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-4">One More Step: Notarization</h2>
              
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                {caseData?.county} County requires your claim forms to be notarized. 
                This verifies your identity and is a standard legal requirement.
              </p>
              
              {/* What is a notary */}
              <Card className="mb-8 text-left">
                <CardContent className="pt-6">
                  <details>
                    <summary className="font-semibold cursor-pointer flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-blue-600" />
                      What is a notary? (tap to learn)
                    </summary>
                    <div className="mt-4 text-sm text-slate-700 space-y-2">
                      <p>
                        A notary public is an official who verifies your identity and watches you sign 
                        important documents. They then stamp the document to confirm it's legitimate.
                      </p>
                      <p className="font-medium">You can find notaries at:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Banks (often free for account holders)</li>
                        <li>UPS Stores</li>
                        <li>FedEx Office</li>
                        <li>AAA offices</li>
                        <li>Law offices</li>
                        <li>Real estate offices</li>
                      </ul>
                    </div>
                  </details>
                </CardContent>
              </Card>
              
              {/* Time and cost */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-2xl mb-1">⏱️</div>
                  <div className="font-semibold">15-30 min</div>
                  <div className="text-sm text-slate-500">Total time</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-2xl mb-1">💵</div>
                  <div className="font-semibold">$0-25</div>
                  <div className="text-sm text-slate-500">Typical cost</div>
                </div>
              </div>
              
              <Button
                onClick={() => setStep('print')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg"
              >
                Let's Get Started
              </Button>
            </div>
          )}

          {/* STEP: Print */}
          {step === 'print' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Step 1: Download & Print Your Documents</h2>
              
              {/* Download packet */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  {packetInfo ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="font-medium text-emerald-900">Packet Ready</p>
                            <p className="text-xs text-emerald-700">
                              {new Date(packetInfo.generated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <a href={packetInfo.url} target="_blank" rel="noopener noreferrer" download>
                          <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleGeneratePacket}
                      disabled={isGeneratingPacket}
                      className="w-full"
                    >
                      {isGeneratingPacket ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><FileText className="w-4 h-4 mr-2" />Generate Notarization Packet</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {/* Where to print */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">Where to Print</h4>
                  <div className="space-y-3">
                    <div className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="text-2xl">🏠</span>
                      <div>
                        <p className="font-medium">At Home</p>
                        <p className="text-sm text-slate-600">If you have a printer</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="text-2xl">📦</span>
                      <div>
                        <p className="font-medium">UPS / FedEx Store</p>
                        <p className="text-sm text-slate-600">~$0.15 per page • Can notarize too!</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="text-2xl">📚</span>
                      <div>
                        <p className="font-medium">Local Library</p>
                        <p className="text-sm text-slate-600">Usually free or very cheap</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pro tip */}
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <p className="text-green-800 flex items-start gap-2">
                    <span className="text-xl">💡</span>
                    <span><strong>Pro Tip:</strong> UPS Stores have notaries! Print AND get notarized in one trip.</span>
                  </p>
                </CardContent>
              </Card>
              
              {/* Confirmation */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printConfirmed}
                      onChange={(e) => setPrintConfirmed(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <span>I have printed my documents</span>
                  </label>
                </CardContent>
              </Card>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('overview')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep('find')}
                  disabled={!printConfirmed}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Documents Printed
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP: Find Notary */}
          {step === 'find' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Step 2: Find a Notary Near You</h2>
              
              <div className="space-y-4 mb-8">
                {nearbyNotaries.map((notary) => (
                  <Card 
                    key={notary.id}
                    className={`cursor-pointer transition ${
                      selectedNotary?.id === notary.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedNotary(notary)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <span className="text-3xl">{notary.icon}</span>
                          <div>
                            <h4 className="font-semibold">{notary.name}</h4>
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {notary.address}
                            </p>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {notary.hours}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">{notary.distance} mi</div>
                          {notary.free_for_customers && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              Free for members
                            </span>
                          )}
                          {notary.cost && (
                            <span className="text-sm text-slate-500">~${notary.cost}</span>
                          )}
                        </div>
                      </div>
                      
                      {selectedNotary?.id === notary.id && (
                        <div className="mt-4 pt-4 border-t flex gap-2">
                          <a 
                            href={`tel:${notary.phone}`}
                            className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-center font-medium"
                          >
                            <Phone className="w-4 h-4 inline mr-1" />
                            Call
                          </a>
                          <a 
                            href={`https://maps.google.com/?q=${encodeURIComponent(notary.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-center font-medium"
                          >
                            🗺️ Directions
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('print')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep('at_notary')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  What to Do There
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP: At Notary */}
          {step === 'at_notary' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Step 3: At the Notary</h2>
              
              {/* Critical warning */}
              <Card className="mb-6 bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-red-700">IMPORTANT</h4>
                      <p className="text-red-700">
                        Do NOT sign anything until you are in front of the notary. They need to watch you sign!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* What to bring */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">📋 What to Bring</h4>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm">1</div>
                      <span>Your printed claim packet (unsigned)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm">2</div>
                      <span>Your photo ID (driver's license or passport)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm">3</div>
                      <span>Payment method (cash or card, typically $5-25)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              {/* What to say */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4">💬 What to Say</h4>
                  <div className="bg-slate-50 rounded-lg p-4 italic text-slate-700">
                    "Hi, I need to get some documents notarized for a surplus funds claim."
                  </div>
                </CardContent>
              </Card>
              
              {/* After notarization */}
              <Card className="mb-6 bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-green-800 mb-2">✅ After Notarization</h4>
                  <p className="text-green-700 text-sm mb-2">Make sure you have:</p>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• Your signature on each signature line</li>
                    <li>• Notary's signature and stamp on each notary block</li>
                    <li>• Date filled in</li>
                    <li>• Notary's commission expiration date</li>
                  </ul>
                </CardContent>
              </Card>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('find')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep('upload')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  I've Been Notarized
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP: Upload */}
          {step === 'upload' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Step 4: Upload Your Notarized Documents</h2>
              
              <p className="text-slate-600 mb-6">
                Take clear photos of each page, or scan if you have access to a scanner.
              </p>
              
              {/* Upload zone */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <label className="border-2 border-dashed rounded-xl p-8 text-center block cursor-pointer hover:border-blue-400 transition">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    {notaryFiles.length === 0 ? (
                      <>
                        <Camera className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="font-semibold">Tap to take photos or upload files</p>
                        <p className="text-sm text-slate-500 mt-2">Upload all pages of your notarized packet</p>
                      </>
                    ) : (
                      <div className="space-y-2">
                        {notaryFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-slate-600" />
                              <span className="text-sm">{file.name}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                removeFile(idx);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        <p className="text-sm text-blue-600 mt-4">+ Add more</p>
                      </div>
                    )}
                  </label>
                </CardContent>
              </Card>
              
              {/* Tips */}
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">📸 Tips for clear photos:</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• Place document on flat, dark surface</li>
                    <li>• Make sure all text is readable</li>
                    <li>• Include entire page including notary stamp</li>
                    <li>• Avoid shadows and glare</li>
                  </ul>
                </CardContent>
              </Card>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('at_notary')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmitNotary}
                  disabled={notaryFiles.length === 0 || isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <>Submit for Verification</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
    </PortalAuthGuard>
  );
}