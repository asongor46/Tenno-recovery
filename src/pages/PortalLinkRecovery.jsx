import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * LOST YOUR LINK RECOVERY PAGE
 * Allows homeowners to resend portal link via email
 * No accounts or passwords required
 */

export default function PortalLinkRecovery() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const { data } = await base44.functions.invoke("resendPortalLink", {
        email: email.trim().toLowerCase()
      });

      if (data.status === "success") {
        setStatus("success");
        setMessage("Portal link sent! Check your email (and spam folder) for your secure access link.");
      } else {
        setStatus("error");
        setMessage(data.details || "Unable to send link. Please contact support.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred. Please try again or contact support.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Lost Your Link?</CardTitle>
            <p className="text-slate-500 mt-2">
              Enter your email address and we'll resend your secure portal access link.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading" || status === "success"}
                  className="text-center"
                />
              </div>

              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800">{message}</p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{message}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {status === "loading" ? "Sending..." : "Resend Link"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                Need help? Contact us at{" "}
                <a href="mailto:tennoassetrecovery@gmail.com" className="text-emerald-600 hover:underline">
                  tennoassetrecovery@gmail.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}