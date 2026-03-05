import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing in with email:", error);
      if (error.code === "auth/invalid-email") {
        throw new Error("Email không hợp lệ");
      } else if (error.code === "auth/user-not-found") {
        throw new Error("Tài khoản không tồn tại");
      } else if (error.code === "auth/wrong-password") {
        throw new Error("Mật khẩu không đúng");
      } else if (error.code === "auth/invalid-credential") {
        throw new Error("Email hoặc mật khẩu không đúng");
      } else {
        throw new Error("Đăng nhập thất bại. Vui lòng thử lại");
      }
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Error signing up with email:", error);
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Email đã được sử dụng");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Email không hợp lệ");
      } else if (error.code === "auth/weak-password") {
        throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
      } else {
        throw new Error("Đăng ký thất bại. Vui lòng thử lại");
      }
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.code === "auth/invalid-email") {
        throw new Error("Email không hợp lệ");
      } else if (error.code === "auth/user-not-found") {
        throw new Error("Tài khoản không tồn tại");
      } else {
        throw new Error("Gửi email đặt lại mật khẩu thất bại");
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      logout 
    }}>
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
