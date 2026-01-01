import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createPageUrl } from "@/utils";



export default function PortalLogin() {
  const [loginType, setLoginType] = useState("access_code");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password setup dialog state (for first-time users)
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validatedCases, setValidatedCases] = useState([]);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleAccessCodeSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // First, authenticate with Base44 OAuth
      const isAuthenticated = await base44.auth.isAuthenticated();
      
      if (!isAuthenticated) {
        // Redirect to Base44 login, will come back here after
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }

      // Get authenticated user
      const user = await base44.auth.me();
      
      // Validate that the access code matches this user's email
      const { data } = await base44.functions.invoke("validateAccessCode", {
        email: user.email,
        access_code: accessCode.toUpperCase().trim()
      });

      if (data?.success) {
        // Success - redirect to portal dashboard
        window.location.href = createPageUrl("PortalDashboard");
      } else {
        setError(data?.error || "Invalid access code for your account");
      }
    } catch (err) {
      console.error("Access code validation error:", err);
      setError(err?.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Use Base44's built-in authentication
      const isAuthenticated = await base44.auth.isAuthenticated();
      
      if (!isAuthenticated) {
        // Redirect to Base44 login
        base44.auth.redirectToLogin(createPageUrl("PortalDashboard"));
        return;
      }

      // Already authenticated - redirect to dashboard
      window.location.href = createPageUrl("PortalDashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
            alt="TENNO RECOVERY" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-900">Surplus Recovery Portal</h1>
          <p className="text-slate-500 mt-1">Access your case information</p>
        </div>

        <Card>
          <CardContent className="pt-6">


            {/* Login Type Toggle */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Login Method</Label>
              <RadioGroup value={loginType} onValueChange={setLoginType}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="access_code" id="access_code" />
                  <Label htmlFor="access_code" className="cursor-pointer font-normal">
                    First time? I have an access code
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="password" id="password" />
                  <Label htmlFor="password" className="cursor-pointer font-normal">
                    Returning? I have a password
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {loginType === "access_code" ? (
                  <motion.form
                    key="access_code"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleAccessCodeSubmit}
                    className="space-y-4"
                  >
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 mb-4">
                      You'll be prompted to create a Base44 account, then validate your access code.
                    </div>

                    <div>
                      <Label htmlFor="access_code_input">Access Code (8 characters)</Label>
                      <div className="relative mt-1">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="access_code_input"
                          type="text"
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                          className="pl-10 uppercase tracking-wider"
                          placeholder="ABC123XY"
                          maxLength={8}
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Authenticating..." : "Authenticate & Validate Code"}
                    </Button>
                  </motion.form>
              ) : (
                <motion.form
                  key="password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handlePasswordLogin}
                  className="space-y-4"
                >
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-4">
                    Use your Base44 account to sign in.
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In with Base44"}
                    {!isLoading && <LogIn className="w-4 h-4 ml-2" />}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t text-center text-sm text-slate-500">
              <p>Lost your access code?</p>
              <p className="mt-1">
                Contact: <a href="mailto:tennoassetrecovery@gmail.com" className="text-emerald-600 hover:text-emerald-700">
                  tennoassetrecovery@gmail.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2025 TENNO Asset Recovery
        </p>
      </motion.div>


    </div>
  );
}