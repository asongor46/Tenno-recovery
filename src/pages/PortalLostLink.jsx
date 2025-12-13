import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * LOST YOUR LINK RECOVERY PAGE
 * Email-based portal link resend (no authentication required)
 */

export default function PortalLostLink() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await base44.functions.invoke("resendPortalLink", {
        owner_email: email,
      });
      
      setSubmitted(true);
    } catch (err) {
      setError("Failed to send link. Please try again or contact support.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Lost Your Portal Link?</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your email to receive a new link
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    We'll send a new secure link to your email address.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send New Link
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-slate-600">
                    Need help?{" "}
                    <a
                      href="mailto:tennoassetrecovery@gmail.com"
                      className="text-emerald-600 hover:underline"
                    >
                      Contact Support
                    </a>
                  </p>
                </div>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Check Your Email</h3>
                <p className="text-sm text-slate-600">
                  If an account exists with <strong>{email}</strong>, a new portal link has been sent.
                </p>
                <p className="text-xs text-slate-500 mt-4">
                  Please check your spam folder if you don't see it in a few minutes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Contact:{" "}
            <a
              href="mailto:tennoassetrecovery@gmail.com"
              className="text-slate-700 hover:underline"
            >
              tennoassetrecovery@gmail.com
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}