import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthCeremony, { AuthMessages, useAuthWait } from "@/components/auth/AuthCeremony";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const phoneCountryOptions = [
  { label: "Vietnam (+84)", value: "+84" }, { label: "Hong Kong (+852)", value: "+852" },
  { label: "Singapore (+65)", value: "+65" }, { label: "United States (+1)", value: "+1" },
  { label: "United Kingdom (+44)", value: "+44" },
];
const toE164Phone = (callingCode: string, localPhone: string) => {
  const code = callingCode.replace(/\D/g, "");
  const number = localPhone.replace(/\D/g, "").replace(/^0+/, "");
  return code && number ? "+" + code + number : "";
};

export default function Register() {
  const { register, verifyRegister, registration, ceremony, recoveryCodes, leaveRegistration, cancelCeremony, busy, loading, user } = useAuth();
  const navigate = useNavigate();
  const wait = useAuthWait();
  const [fullName, setFullName] = useState("");
  const [callingCode, setCallingCode] = useState("+84");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (user && !recoveryCodes.length) navigate("/account", { replace: true });
    else if (registration?.verified) navigate("/login", { replace: true });
  }, [navigate, recoveryCodes.length, registration?.verified, user]);
  useEffect(() => leaveRegistration, [leaveRegistration]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || wait > 0 || loading) return;
    setError("");
    if (password !== confirmation) { setError("Password confirmation does not match."); return; }
    const formattedPhone = toE164Phone(callingCode, phone);
    if (!formattedPhone) { setError("Enter a valid phone number."); return; }
    const value = password;
    const confirmed = confirmation;
    setPassword(""); setConfirmation("");
    void register({ fullName: fullName.trim(), phone: formattedPhone, email: email.trim(), password: value, passwordConfirmation: confirmed });
  };
  const verify = (event: FormEvent) => {
    event.preventDefault();
    if (busy || wait > 0 || !registration) return;
    const value = code;
    setCode(""); setError("");
    void verifyRegister(registration.email, value);
  };
  return <div translate="no" className="notranslate flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#eff6ff_100%)] p-4 py-10">
    <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl">
      <CardHeader className="text-center">
        <img src="/logo/logo.jpg" alt="Origin Wallet" className="mx-auto h-16 w-16 rounded-2xl object-cover" />
        <CardTitle className="text-2xl">{ceremony || recoveryCodes.length ? "Complete authenticator enrollment" : registration ? "Verify your email" : "Create your account"}</CardTitle>
        <CardDescription>{registration ? "Enter the registration email code, then set up Google Authenticator." : "Email verification and Google Authenticator enrollment are required before account access."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AuthMessages />{error && <p role="alert">{error}</p>}
        {loading ? <p role="status">Validating account session…</p> : ceremony || recoveryCodes.length ? <AuthCeremony /> : registration ? <form onSubmit={verify} className="space-y-4">
          <p className="text-sm">Verification email: {registration.email}</p>
          <Label htmlFor="registration-code">Registration email code</Label>
          <Input id="registration-code" inputMode="numeric" type="text" maxLength={6} pattern="[0-9]{6}" value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required autoComplete="off" disabled={busy || wait > 0} />
          <Button type="submit" disabled={busy || wait > 0}>{busy ? "Please wait…" : "Verify email"}</Button>
          <Button type="button" variant="outline" onClick={() => { setCode(""); cancelCeremony(); }}>Cancel registration</Button>
        </form> : <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="full-name">Full name</Label><Input id="full-name" maxLength={255} required value={fullName} onChange={event => setFullName(event.target.value)} disabled={busy || wait > 0} autoComplete="name" /></div>
          <div className="space-y-2"><Label htmlFor="calling-code">Calling code</Label><select id="calling-code" value={callingCode} onChange={event => setCallingCode(event.target.value)} disabled={busy || wait > 0} className="w-full rounded-md border p-2">{phoneCountryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="phone">Phone number</Label><Input id="phone" type="tel" maxLength={24} required value={phone} onChange={event => setPhone(event.target.value)} disabled={busy || wait > 0} autoComplete="tel-national" /></div>
          <div className="space-y-2"><Label htmlFor="register-email">Email</Label><Input id="register-email" type="email" maxLength={255} required value={email} onChange={event => setEmail(event.target.value)} disabled={busy || wait > 0} autoComplete="username" /></div>
          <div className="space-y-2"><Label htmlFor="register-password">Password</Label><Input id="register-password" type="password" minLength={6} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy || wait > 0} autoComplete="new-password" /></div>
          <div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" minLength={6} required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy || wait > 0} autoComplete="new-password" /></div>
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={busy || wait > 0}>{busy ? "Please wait…" : "Create account with email"}</Button>
          {busy && <Button type="button" variant="outline" onClick={cancelCeremony}>Cancel registration</Button>}
        </form>}
        <GoogleSignInButton />
        <p className="text-sm">Already have an account? <Link to="/login" className="text-green-700">Sign in</Link></p>
        <Link to="/" className="text-sm text-slate-600">Back to home</Link>
      </CardContent>
    </Card>
  </div>;
}
