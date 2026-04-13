import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "251785792812-mpjegenufvk3ujl1tsq4sjd1n0k1bf0l.apps.googleusercontent.com";
const allowGoogleOnLocalhost = import.meta.env.VITE_ENABLE_GOOGLE_AUTH_ON_LOCALHOST === "true";

const isLocalhostOrigin = () => {
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
};

const loadGoogleScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google sign-in")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(script);
  });

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

const GoogleSignInButton = ({ onSuccess, onError }: GoogleSignInButtonProps) => {
  const { signInWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const showDebugInfo = import.meta.env.DEV || isLocalhostOrigin();

  useEffect(() => {
    let mounted = true;

    const renderGoogleButton = async () => {
      if (isLocalhostOrigin() && !allowGoogleOnLocalhost) {
        setAvailabilityMessage("Google sign-in is hidden on localhost until the OAuth origin is whitelisted.");
        setLoading(false);
        return;
      }

      try {
        await loadGoogleScript();
        if (!mounted || !containerRef.current) {
          return;
        }

        const googleId = window.google?.accounts?.id;
        if (!googleId) {
          throw new Error("Google sign-in is not available");
        }

        googleId.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              onError("Google did not return an ID token.");
              return;
            }

            try {
              await signInWithGoogle(response.credential);
              onSuccess();
            } catch (error) {
              onError(error instanceof Error ? error.message : "Unable to sign in with Google.");
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        containerRef.current.innerHTML = "";
        googleId.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 460,
          logo_alignment: "left",
        });
        setLoading(false);
      } catch (error) {
        setLoading(false);
        onError(error instanceof Error ? error.message : "Unable to load Google sign-in.");
      }
    };

    void renderGoogleButton();

    return () => {
      mounted = false;
    };
  }, [onError, onSuccess, signInWithGoogle]);

  return (
    <div className="w-full">
      {availabilityMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {availabilityMessage}
        </div>
      )}
      {loading && (
        <div className="flex h-14 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading Google sign-in
        </div>
      )}
      <div ref={containerRef} className={loading || !!availabilityMessage ? "hidden" : "flex justify-center"} />
      {showDebugInfo && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-700">Google OAuth debug</span>
          </div>
          <div>
            Origin: <span className="font-mono">{currentOrigin || "unknown"}</span>
          </div>
          <div>
            Client ID: <span className="font-mono break-all">{googleClientId}</span>
          </div>
          <div>
            Localhost allowed: <span className="font-mono">{allowGoogleOnLocalhost ? "true" : "false"}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;
