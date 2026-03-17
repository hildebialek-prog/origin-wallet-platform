import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/lib/auth-api";

const googleClientId =
  "251785792812-mpjegenufvk3ujl1tsq4sjd1n0k1bf0l.apps.googleusercontent.com";
const authStorageKey = "origin-wallet-google-auth";

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken?: string;
}

interface AuthContextType {
  user: GoogleUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let googleScriptPromise: Promise<void> | null = null;

const loadGoogleIdentityScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser"));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google sign-in")),
        { once: true },
      );
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

  return googleScriptPromise;
};

const requestGoogleAccessToken = async () => {
  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error("Google did not return an access token"));
          return;
        }

        resolve(response.access_token);
      },
      error_callback: () => {
        reject(new Error("Google sign-in was cancelled"));
      },
    });

    if (!tokenClient) {
      reject(new Error("Google sign-in is not available"));
      return;
    }

    tokenClient.requestAccessToken({
      prompt: "select_account",
    });
  });
};

const getGoogleUserProfile = async (accessToken: string): Promise<GoogleUser> => {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch your Google profile");
  }

  const profile = await response.json();

  return {
    id: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    accessToken,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(authStorageKey);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Error restoring Google session:", error);
      localStorage.removeItem(authStorageKey);
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      const accessToken = await requestGoogleAccessToken();
      const profile = await getGoogleUserProfile(accessToken);

      localStorage.setItem(authStorageKey, JSON.stringify(profile));
      setUser(profile);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const session = await authApi.loginWithEmail(email, password);
      const nextUser: GoogleUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
        accessToken: session.accessToken,
      };

      localStorage.setItem(authStorageKey, JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (error) {
      console.error("Error signing in with email:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => {
    try {
      const session = await authApi.registerWithEmail(name, email, password, phone);
      const nextUser: GoogleUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
        accessToken: session.accessToken,
      };

      localStorage.setItem(authStorageKey, JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (error) {
      console.error("Error signing up with email:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authApi.forgotPassword(email);
    } catch (error) {
      console.error("Error requesting password reset:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const accessToken = user?.accessToken;

      localStorage.removeItem(authStorageKey);
      setUser(null);

      if (accessToken && user?.id) {
        await loadGoogleIdentityScript();
        (
          window.google?.accounts?.oauth2 as
            | { revoke?: (token: string, callback?: () => void) => void }
            | undefined
        )?.revoke?.(accessToken, () => undefined);
      }
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
