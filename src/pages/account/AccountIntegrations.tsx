import { Building2, CircleAlert, Link2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

const providers = [
  {
    id: "currenxie",
    name: "Currenxie",
    summary: "Connect your Currenxie account to sync balances, transactions, and provider activity into Origin Wallet.",
    status: "Available now",
    onboardingUrl: "https://in.sumsub.com/websdk/p/RXN0ssu1U5gK1MGg",
  },
];

const AccountIntegrations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const requiredProfileFields = [
    { label: "Full name", value: user?.name },
    { label: "Email", value: user?.email },
    { label: "Phone", value: user?.phone },
    { label: "Company", value: user?.company },
    { label: "Country", value: user?.country },
  ];

  const missingFields = requiredProfileFields
    .filter(({ value }) => !String(value ?? "").trim())
    .map(({ label }) => label);

  const isProfileComplete = missingFields.length === 0;

  const handleConnectProvider = (onboardingUrl: string) => {
    if (!isProfileComplete) {
      toast({
        variant: "destructive",
        title: "Profile incomplete",
        description: `Please complete your profile before continuing. Missing: ${missingFields.join(", ")}.`,
      });
      navigate("/account/settings/profile");
      return;
    }

    window.open(onboardingUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-[#f8f8f6] px-7 py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 space-y-3">
          <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111] dark:text-white">Integrations</h1>
          <p className="max-w-3xl text-[1.05rem] text-[#6c6c68] dark:text-gray-400">
            Connect external providers to bring your account data into one place. We are starting with Currenxie and
            will add more providers over time.
          </p>
        </div>

        {!isProfileComplete && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Complete your profile before connecting a provider.</p>
                <p className="text-sm">
                  Missing information: {missingFields.join(", ")}.{" "}
                  <Link to="/account/settings/profile" className="font-semibold underline underline-offset-4">
                    Update profile
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {providers.map((provider) => (
            <Card
              key={provider.id}
              className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]"
            >
              <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4f46e5]/10 text-[#4f46e5] dark:bg-[#4f46e5]/15 dark:text-[#8b83ff]">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[1.2rem] font-semibold text-[#232323] dark:text-white">{provider.name}</h2>
                      <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#15803d] dark:bg-green-500/10 dark:text-green-400">
                        {provider.status}
                      </span>
                    </div>
                    <p className="max-w-3xl text-[1.02rem] leading-7 text-[#6f6f6b] dark:text-gray-400">{provider.summary}</p>
                  </div>
                </div>

                <Button
                  className="h-11 rounded-full bg-[#4f46e5] px-7 text-[1rem] font-semibold text-white hover:bg-[#4338ca] dark:shadow-[0_12px_24px_rgba(79,70,229,0.22)]"
                  onClick={() => handleConnectProvider(provider.onboardingUrl)}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect provider
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountIntegrations;
