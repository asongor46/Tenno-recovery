import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Mail, Lock, Key, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import TennoLogo from "@/components/shared/TennoLogo";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PortalLogin() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState("access_code");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validatedCases, setValidatedCases] = useState([]);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const checkExistingSession = () => {
      const sessionToken = localStorage.getItem("portal_session_token") || sessionStorage.getItem("portal_session_token");
      const userEmail = localStorage.getItem("portal_user_email") || sessionStorage.getItem("portal_user_email");
      
      if (sessionToken && userEmail) {
        window.location.href = createPageUrl("PortalDashboard");
      }
    };
    
    checkExistingSession();
  }, []);

  const handleAccessCodeSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data } = await base44.functions.invoke("validateAccessCode", {
        email: email.toLowerCase().trim(),
        access_code: accessCode.toUpperCase().trim()
      });

      if (data?.success) {
        setValidatedCases(data.cases || []);
        setShowPasswordSetup(true);
      } else {
        setError(data?.error || "Invalid email or access code");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const password_hash = await hashPassword(newPassword);
      
      const { data } = await base44.functions.invoke("setupPortalPassword", {
        email: email.toLowerCase().trim(),
        access_code: accessCode.toUpperCase().trim(),
        password_hash,
        remember_me: rememberMe
      });

      if (data.success) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("portal_session_token", data.session_token);
        storage.setItem("portal_user_email", data.user.email);
        navigate(createPageUrl("PortalDashboard"));
      } else {
        setError(data.error || "Account creation failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const password_hash = await hashPassword(password);
      
      const { data } = await base44.functions.invoke("portalLogin", {
        email: email.toLowerCase().trim(),
        password_hash,
        remember_me: rememberMe
      });

      if (data.success) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("portal_session_token", data.session_token);
        storage.setItem("portal_user_email", data.user.email);
        if (data.session_expires_at) {
          storage.setItem("portal_session_expires", data.session_expires_at);
        }
        navigate(createPageUrl("PortalDashboard"));
      } else {
        setError(data.error || "Login failed");
      }
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
        <div className="text-center mb-8">
          <TennoLogo size="md" light className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Surplus Recovery Portal</h1>
          <p className="text-slate-500 mt-1">Access your case information</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Login Method</Label>
              <RadioGroup value={loginType} onValueChange={setLoginType} className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
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
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

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
                    {isLoading ? "Validating..." : "Validate & Create Account"}
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
                  <div>
                    <Label htmlFor="password_input">Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="password_input"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer font-normal">
                      Remember me for 30 days
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                    {!isLoading && <LogIn className="w-4 h-4 ml-2" />}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

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

        <Dialog open={showPasswordSetup} onOpenChange={setShowPasswordSetup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Your Password</DialogTitle>
              <DialogDescription>
                Create a secure password for your account. You'll use this to sign in on future visits.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePasswordSetup} className="space-y-4 mt-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="new_password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="At least 8 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Re-enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember_setup"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                />
                <Label htmlFor="remember_setup" className="text-sm cursor-pointer font-normal">
                  Keep me signed in for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account & Sign In"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2026 TENNO Asset Recovery
        </p>
      </motion.div>
    </div>
  );
}