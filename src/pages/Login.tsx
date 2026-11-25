import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthCeremony, { AuthMessages, useAuthWait } from "@/components/auth/AuthCeremony";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const accountDestination = (value: unknown) => {
  if (typeof value !== "string") return "/account";
  try {
    const destination = new URL(value, window.location.origin);
    return destination.origin === window.location.origin
      && (destination.pathname === "/account" || destination.pathname.startsWith("/account/"))
      ? destination.pathname : "/account";
  } catch { return "/account"; }
};

export default function Login() {
  const { user, loading, login, busy, ceremony, recoveryCodes, registration, cancelCeremony, assistedRecovery } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(registration?.verified ? registration.email : "");
  const [password, setPassword] = useState("");
  const wait = useAuthWait();
  const nextPath = accountDestination(location.state?.from);
  useEffect(() => {
    if (user && !recoveryCodes.length) navigate(nextPath, { replace: true });
  }, [navigate, nextPath, recoveryCodes.length, user]);
  useEffect(() => () => cancelCeremony(), [cancelCeremony]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || loading || wait > 0) return;
    const value = password;
    setPassword("");
    void login(email.trim(), value);
  };
  return <div translate="no" className="notranslate flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f7ff_0%,#ffffff_48%,#eef2ff_100%)] p-4 py-10">
    <Card className="w-full max-w-xl border-indigo-100 bg-white shadow-xl">
      <CardHeader className="space-y-3 text-center">
        <img src="/logo/logo.jpg" alt="Origin Wallet" className="mx-auto h-16 w-16 rounded-2xl object-cover" />
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in with your email, password and mandatory Google Authenticator verification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AuthMessages />
        {registration?.verified && <p role="status" className="text-sm">Email verified. Enter your password again to authorize authenticator enrollment. Keep your registration email code for setup if requested.</p>}
        {loading ? <p role="status">Validating account session…</p> : ceremony || recoveryCodes.length ? <AuthCeremony />
          : <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" autoComplete="username" maxLength={255} required
                value={email} onChange={event => setEmail(event.target.value)} disabled={busy || wait > 0} /></div>
            <div className="space-y-2"><Label htmlFor="login-password">Password</Label>
              <Input id="login-password" type="password" autoComplete="current-password" maxLength={1024} required
                value={password} onChange={event => setPassword(event.target.value)} disabled={busy || wait > 0} /></div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={busy || wait > 0}>{busy ? "Please wait…" : "Sign in"}</Button>
            {busy && <Button type="button" variant="outline" onClick={cancelCeremony}>Cancel and restart</Button>}
          </form>}
        {!loading && !recoveryCodes.length && <div className="space-y-2 border-t pt-4">
          <p className="text-sm text-slate-600">Lost your authenticator and recovery codes? Record an assisted recovery request and contact your established support channel.</p>
          <Label htmlFor="recovery-email">Recovery email</Label>
          <Input id="recovery-email" type="email" maxLength={255} value={email} onChange={event => setEmail(event.target.value)}
            disabled={busy || wait > 0} autoComplete="username" />
          <Button type="button" variant="outline" disabled={busy || wait > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
            onClick={() => void assistedRecovery(email.trim())}>Request assisted recovery</Button>
        </div>}
        <p className="text-sm text-slate-600">Resetting your password does not remove the authenticator requirement.</p>
        <GoogleSignInButton />
        <div className="flex flex-wrap justify-between gap-3 text-sm text-indigo-700">
          <Link to="/forgot-password">Forgot password?</Link><Link to="/register">Create account</Link><Link to="/">Back to home</Link>
        </div>
      </CardContent>
    </Card>
  </div>;
}
