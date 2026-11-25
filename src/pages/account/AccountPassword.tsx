import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPassword() {
  return <div className="bg-[#f8f8f6] px-7 py-10">
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/account/settings/security" className="text-sm text-green-700">Back to settings</Link>
      <Card className="rounded-3xl border border-[#d7d7d2] bg-white shadow-none">
        <CardHeader><CardTitle>Update password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p>Password changes in Settings are currently unavailable.</p>
          <p>Use the password-reset email workflow. You will need to sign in again with your new password and authenticator.</p>
          <Link to="/forgot-password" className="font-medium text-green-700 underline">Reset password by email</Link>
        </CardContent>
      </Card>
    </div>
  </div>;
}
