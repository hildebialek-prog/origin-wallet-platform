import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound, LockKeyhole, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AccountPassword = () => {
  const { updatePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSaving(true);

    try {
      await updatePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (updateError) {
      const nextMessage = updateError instanceof Error ? updateError.message : "Unable to update password.";
      setError(nextMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#f8f8f6] px-7 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            to="/account/settings/security"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#5e5e5e] hover:text-[#232323]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Link>
        </div>

        <Card className="rounded-3xl border border-[#d7d7d2] bg-white shadow-none">
          <CardHeader className="border-b border-[#ecece8] px-8 py-7">
            <CardTitle className="text-[2.2rem] font-bold tracking-[-0.03em] text-[#111111]">Update password</CardTitle>
          </CardHeader>

          <CardContent className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b87]" />
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="h-12 border-[#d7d7d2] pl-10"
                      placeholder="Enter your current password"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b87]" />
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="h-12 border-[#d7d7d2] pl-10"
                        placeholder="Minimum 6 characters"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b87]" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="h-12 border-[#d7d7d2] pl-10"
                        placeholder="Re-enter new password"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-[#ecece8] pt-6">
                <p className={`text-sm ${error ? "text-[#dc2626]" : "text-[#6c6c68]"}`}>{error || message || ""}</p>
                <Button className="rounded-full bg-[#4f46e5] px-6 text-white hover:bg-[#4338ca]" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountPassword;
