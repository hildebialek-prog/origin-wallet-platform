import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
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

const Register = () => {
  const navigate = useNavigate();
  const { register, verifyRegister, authError, clearAuthError } = useAuth();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setIsEmailLoading(true);

    try {
      const challenge = await register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        passwordConfirmation: confirmPassword,
      });
      setEmail(challenge.email || email.trim());
      setNotice(challenge.message || "Verification code sent to your email.");
      setStep("verify");
    } catch (authFailure) {
      setError(getAuthErrorMessage(authFailure, "Unable to create account."));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsVerifyLoading(true);

    try {
      await verifyRegister(email.trim(), verificationCode.trim());
      navigate("/account");
    } catch (authFailure) {
      setError(getAuthErrorMessage(authFailure, "Unable to verify registration."));
    } finally {
      setIsVerifyLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#eff6ff_100%)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <Card className="border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-4 pb-3 text-center">
            <div className="flex justify-center">
              <img src="/logo/knt-logo.svg" alt="Origin Wallet" className="h-16 w-auto" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-slate-900">
                {step === "form" ? "Create your account" : "Verify your email"}
              </CardTitle>
              <CardDescription className="text-base leading-7 text-slate-600">
                {step === "form"
                  ? "Register with your details or continue with Google."
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

            {step === "form" ? (
              <>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Jane Doe"
                        className="h-12 pl-10"
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+84901234567"
                        className="h-12 pl-10"
                        autoComplete="tel"
                        required
                      />
                    </div>
                  </div>

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
                        className="h-12 pl-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Minimum 6 characters"
                        className="h-12 pl-10"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Re-enter your password"
                        className="h-12 pl-10"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isEmailLoading} className="h-12 w-full bg-green-600 hover:bg-green-700">
                    {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account with email
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400">Or</span>
                  </div>
                </div>

                <GoogleSignInButton
                  onSuccess={() => navigate("/account")}
                  onError={(message) => setError(getAuthErrorMessage(new Error(message), "Unable to register with Google."))}
                />
              </>
            ) : (
              <form onSubmit={handleVerifyRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification code</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="verificationCode"
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                      placeholder="Enter the 6-digit code"
                      className="h-12 pl-10 tracking-[0.3em]"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isVerifyLoading} className="h-12 w-full bg-green-600 hover:bg-green-700">
                  {isVerifyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify and continue
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full"
                  onClick={() => {
                    setStep("form");
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

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-green-700 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
