import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Mail, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : fallback;
  return message || fallback;
};

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyLogin, authError, clearAuthError } = useAuth();

  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isVerifyLoading, setIsVerifyLoading] = useState(false);

  useEffect(() => {
    clearAuthError();
    setError("");
    setNotice("");
  }, [clearAuthError]);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsEmailLoading(true);

    try {
      const challenge = await login(email.trim(), password);
      setEmail(challenge.email || email.trim());
      setNotice(challenge.message || "Verification code sent to your email.");
      setStep("verify");
    } catch (authFailure) {
      setError(getAuthErrorMessage(authFailure, "Unable to sign in with email."));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsVerifyLoading(true);

    try {
      await verifyLogin(email.trim(), verificationCode.trim());
      navigate("/account");
    } catch (authFailure) {
      setError(getAuthErrorMessage(authFailure, "Unable to verify login."));
    } finally {
      setIsVerifyLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(135deg,#f5f7ff_0%,#ffffff_48%,#eef2ff_100%)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <Card className="border border-indigo-100/70 bg-white/96 shadow-[0_28px_80px_rgba(79,70,229,0.14)] backdrop-blur">
          <CardHeader className="space-y-4 pb-3 text-center">
            <div className="flex justify-center">
              <img src="/logo/knt-logo.svg" alt="Origin Wallet" className="h-16 w-auto" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-slate-900">
                {step === "credentials" ? "Welcome back" : "Verify your login"}
              </CardTitle>
              <CardDescription className="text-base leading-7 text-slate-600">
                {step === "credentials"
                  ? "Sign in with Google or request a verification code with your email and password."
                  : `Enter the verification code sent to ${email}.`}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {(error || authError) && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error || authError}</span>
              </div>
            )}

            {notice && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {notice}
              </div>
            )}

            {step === "credentials" ? (
              <>
                <GoogleSignInButton
                  onSuccess={() => navigate("/account")}
                  onError={(message) => setError(getAuthErrorMessage(new Error(message), "Unable to sign in with Google."))}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-[0.3em]">
                    <span className="bg-white px-3 text-slate-500">Or</span>
                  </div>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="h-12 rounded-xl border-slate-200 pl-10 focus-visible:border-indigo-400 focus-visible:ring-indigo-200"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-slate-700">
                        Password
                      </Label>
                      <Link
                        to="/forgot-password"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="h-12 rounded-xl border-slate-200 pl-10 focus-visible:border-indigo-400 focus-visible:ring-indigo-200"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isEmailLoading}
                    className="h-14 w-full rounded-xl bg-indigo-600 text-base font-medium text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)] hover:bg-indigo-700"
                  >
                    {isEmailLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Send verification code
                  </Button>
                </form>
              </>
            ) : (
              <form onSubmit={handleVerifyLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode" className="text-slate-700">
                    Verification code
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="verificationCode"
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                      placeholder="Enter the 6-digit code"
                      className="h-12 rounded-xl border-slate-200 pl-10 tracking-[0.3em] focus-visible:border-indigo-400 focus-visible:ring-indigo-200"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isVerifyLoading}
                  className="h-14 w-full rounded-xl bg-indigo-600 text-base font-medium text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)] hover:bg-indigo-700"
                >
                  {isVerifyLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Verify and sign in
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-xl"
                  onClick={() => {
                    setStep("credentials");
                    setVerificationCode("");
                    setNotice("");
                    setError("");
                    clearAuthError();
                  }}
                >
                  Back
                </Button>
              </form>
            )}

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-slate-600 hover:text-indigo-700">
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
