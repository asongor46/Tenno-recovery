import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, User, Phone, Mail, Home, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function PortalIntake() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const { data: caseData } = useQuery({
    queryKey: ["portal-case", token],
    queryFn: async () => {
      const cases = await base44.entities.Case.filter({ portal_token: token });
      return cases[0];
    },
    enabled: !!token,
  });

  const [formData, setFormData] = useState({
    full_name: caseData?.owner_name || "",
    email: caseData?.owner_email || "",
    phone: caseData?.owner_phone || "",
    mailing_address: caseData?.owner_address || "",
    ssn_last_4: "",
    date_of_birth: "",
    ownership_confirmation: "",
    additional_notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Update case with intake data
      await base44.entities.Case.update(caseData.id, {
        owner_name: formData.full_name,
        owner_email: formData.email,
        owner_phone: formData.phone,
        owner_address: formData.mailing_address,
      });

      // Log event
      await base44.entities.HomeownerTaskEvent.create({
        case_id: caseData.id,
        event_type: "intake_submitted",
        performed_by: formData.email,
        details: formData,
      });

      // Advance step
      await base44.functions.invoke("homeownerWorkflowService", {
        action: "advance",
        case_id: caseData.id,
        step_key: "intake",
        completed_by: formData.email,
      });

      // Navigate to next step
      window.location.href = createPageUrl(`PortalNotary?token=${token}`);
    } catch (error) {
      alert("Submission failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link to={createPageUrl(`PortalDashboard?token=${token}`)}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Information</h1>
          <p className="text-slate-500 mt-1">
            Please provide accurate information to process your claim
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Legal Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  required
                  placeholder="As it appears on your ID"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Phone Number *</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Last 4 Digits of SSN *</Label>
                  <Input
                    type="text"
                    maxLength={4}
                    value={formData.ssn_last_4}
                    onChange={(e) => handleChange("ssn_last_4", e.target.value.replace(/\D/g, ""))}
                    required
                    placeholder="1234"
                  />
                </div>
                <div>
                  <Label>Date of Birth *</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange("date_of_birth", e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mailing Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Mailing Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Where should we mail documents? *</Label>
              <Textarea
                value={formData.mailing_address}
                onChange={(e) => handleChange("mailing_address", e.target.value)}
                required
                rows={3}
                placeholder="123 Main St, Apt 4, City, State ZIP"
              />
            </CardContent>
          </Card>

          {/* Property Ownership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Property Ownership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Please confirm your relationship to the property *</Label>
              <Textarea
                value={formData.ownership_confirmation}
                onChange={(e) => handleChange("ownership_confirmation", e.target.value)}
                required
                rows={3}
                placeholder="Example: I was the owner of record at the time of the tax sale..."
              />
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Anything else we should know?</Label>
              <Textarea
                value={formData.additional_notes}
                onChange={(e) => handleChange("additional_notes", e.target.value)}
                rows={3}
                placeholder="Any special circumstances, co-owners, estate information, etc."
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
          >
            {isSubmitting ? "Saving..." : "Continue to Next Step"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
}