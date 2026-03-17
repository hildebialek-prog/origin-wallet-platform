import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Chrome } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-slate-900 dark:to-purple-950 p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <img src="/logo/knt-logo.svg" alt="Origin Wallet" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">Account recovery</CardTitle>
            <CardDescription>
              Password reset is no longer needed because this app now uses Google sign-in only
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-900">
              Use the same Google account you registered with. Google handles account recovery on its side.
            </div>

            <Button onClick={handleGoogleSignIn} className="w-full h-12 gap-2">
              <Chrome className="w-4 h-4" />
              Continue with Google
            </Button>

            <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            â† Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
