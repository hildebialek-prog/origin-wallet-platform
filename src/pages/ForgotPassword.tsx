import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { requestPasswordReset, resetPassword, authError, clearAuthError } = useAuth();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    clearAuthError();
    setError("");
    setSuccess("");
  }, [clearAuthError]);

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const challenge = await requestPasswordReset(email.trim());
      setEmail(challenge.email || email.trim());
      setSuccess(challenge.message || "Password reset code sent to your email.");
      setStep("reset");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to request password reset.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setIsResetting(true);

    try {
      const message = await resetPassword({
        email: email.trim(),
        verificationCode: verificationCode.trim(),
        password,
        passwordConfirmation: confirmPassword,
      });
      setSuccess(message || "Password reset successful. Redirecting to sign in...");
      setVerificationCode("");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : "Unable to reset password.";
      setError(message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_28%),linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#f0fdf4_100%)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <Card className="border-white/70 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <img src="/logo/knt-logo.svg" alt="Origin Wallet" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {step === "request" ? "Forgot password" : "Reset your password"}
            </CardTitle>
            <CardDescription>
              {step === "request"
                ? "Enter your email to receive a password reset code."
                : `Enter the code sent to ${email} and choose a new password.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {(error || authError) && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error || authError}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {step === "request" ? (
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="h-12 w-full bg-green-600 hover:bg-green-700">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reset code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification code</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="verificationCode"
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                      placeholder="Enter the 6-digit code"
                      className="pl-10 tracking-[0.3em]"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter a new password"
                      className="pl-10"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your new password"
                      className="pl-10"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isResetting} className="h-12 w-full bg-green-600 hover:bg-green-700">
                  {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset password
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full"
                  onClick={() => {
                    setStep("request");
                    setVerificationCode("");
                    setPassword("");
                    setConfirmPassword("");
                    setSuccess("");
                    setError("");
                    clearAuthError();
                  }}
                >
                  Back
                </Button>
              </form>
            )}

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
