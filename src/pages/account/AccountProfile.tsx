import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Mail, MapPin, Phone, Save, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AccountProfile = () => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [company, setCompany] = useState(user?.company ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setCompany(user.company ?? "");
    setCountry(user.country ?? "");
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSavedMessage("");
    setErrorMessage("");

    try {
      await updateProfile({
        name: fullName,
        email,
        phone,
        company,
        country,
      });
      setSavedMessage("Profile updated successfully.");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to update profile.";
      setErrorMessage(nextMessage);
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
            <CardTitle className="text-[2.2rem] font-bold tracking-[-0.03em] text-[#111111]">Update profile</CardTitle>
          </CardHeader>

          <CardContent className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b87]" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="h-12 border-[#d7d7d2] pl-10"
                      placeholder="Nguyen Van A"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b87]" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 border-[#d7d7d2] pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b87]" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="h-12 border-[#d7d7d2] pl-10"
                      placeholder="+84 123 456 789"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b87]" />
                    <Input
                      id="company"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      className="h-12 border-[#d7d7d2] pl-10"
                      placeholder="Origin Wallet"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b87]" />
                  <Input
                    id="country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="h-12 border-[#d7d7d2] pl-10"
                    placeholder="Vietnam"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-[#ecece8] pt-6">
                <p className={`text-sm ${errorMessage ? "text-[#dc2626]" : "text-[#6c6c68]"}`}>
                  {errorMessage || savedMessage || ""}
                </p>
                <Button className="rounded-full bg-[#4f46e5] px-6 text-white hover:bg-[#4338ca]" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountProfile;
