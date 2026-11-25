interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

// Backend POST /auth/google is 410 with no compliant MFA handoff. Keep every
// caller inert; do not load Google scripts, request credentials or call onSuccess.
export default function GoogleSignInButton(_props: GoogleSignInButtonProps) {
  return <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
    Google sign-in is currently unavailable. Use email and password, then your authenticator.
  </p>;
}
