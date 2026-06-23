import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getKycProfile, type KycProfile } from "@/services/kycService";
import {
  getBalances,
  getBankAccounts,
  getBeneficiaries,
  getTransactions,
} from "@/services/moneyMovementService";
import { formatAmount, formatDateTime, toNumber } from "@/lib/money";
import { formatStatusLabel, getSemanticStatus, isVerifiedKycStatus, normalizeStatus } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock3,
  ShieldCheck,
  Plus,
  Wallet,
  Building,
} from "lucide-react";

const TOP_BALANCES: Array<{ code: string; amount: string; flag: string }> = [];

const QUICK_ACTIONS = [
  {
    icon: ArrowUpRight,
    label: "Send money",
    desc: "Send to a beneficiary",
    href: "/account/transfers",
    color: "bg-[#16a34a]",
  },
  {
    icon: ArrowDownLeft,
    label: "Receive money",
    desc: "Get your account details",
    href: "/account/virtual-accounts",
    color: "bg-[#16a34a]",
  },
  {
    icon: Wallet,
    label: "Exchange",
    desc: "Convert currencies",
    href: "/account/balances",
    color: "bg-purple-600",
  },
  {
    icon: Building,
    label: "Local banks",
    desc: "Pay locally",
    href: "/account/beneficiaries",
    color: "bg-orange-600",
  },
];

const RECENT_ACTIVITY: Array<{ date: string; text: string }> = [];

const VIRTUAL_ACCOUNTS: Array<{ name: string; country: string; flag: string; currencies: string }> = [];

const getStatusClassName = (status?: string | null) => {
  switch (getSemanticStatus(status)) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "danger":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300";
  }
};

const getKycSetupSteps = (profile: KycProfile | null, accountStatus?: string | null) => {
  const profileStatus = normalizeStatus(profile?.status);
  const profileVerified = isVerifiedKycStatus(profileStatus);
  const documentsSubmitted = (profile?.documents?.length ?? 0) > 0;
  const reviewDone = profileVerified || profileStatus === "rejected";

  return [
    { done: Boolean(accountStatus), label: "Account created" },
    { done: true, label: "Email verified" },
    {
      done: Boolean(profile),
      label: profile?.applicant_type === "business" ? "KYB type selected" : "KYC type selected",
      href: "/account/kyc",
    },
    {
      done: documentsSubmitted,
      label: "Documents submitted",
      href: "/account/kyc",
    },
    {
      done: reviewDone,
      label:
        profileVerified
          ? "Internal review approved"
          : profileStatus === "rejected"
            ? "Review needs attention"
            : "Internal review pending",
      href: "/account/kyc",
    },
    {
      done: profileVerified,
      label: "Account onboarding",
      href: "/account/integrations",
      disabled: !profileVerified,
    },
  ];
};

const AccountDashboard = () => {
  const { user, token, onboarding } = useAuth();
  const displayName = user?.name || user?.email?.split("@")[0] || "Account";
  const kycQuery = useQuery({
    queryKey: ["kyc-profile", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getKycProfile({ userId: user?.id as string, token: token as string }),
  });
  const kycProfile = kycQuery.data?.kyc_profile ?? null;
  const kycStatus = kycProfile?.status ?? user?.kycStatus ?? "pending";
  const setupSteps = getKycSetupSteps(kycProfile, user?.status);
  const balancesQuery = useQuery({
    queryKey: ["money-balances", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBalances({ userId: user?.id as string, token: token as string }),
  });
  const accountsQuery = useQuery({
    queryKey: ["money-bank-accounts", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBankAccounts({ userId: user?.id as string, token: token as string }),
  });
  const beneficiariesQuery = useQuery({
    queryKey: ["money-beneficiaries", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBeneficiaries({ userId: user?.id as string, token: token as string }),
  });
  const transactionsQuery = useQuery({
    queryKey: ["money-transactions", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getTransactions({ userId: user?.id as string, token: token as string }),
  });
  const balances = balancesQuery.data ?? [];
  const bankAccounts = accountsQuery.data ?? [];
  const beneficiaries = beneficiariesQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const totalVisibleBalance = balances.reduce((sum, balance) => sum + toNumber(balance.available_balance), 0);
  const topBalances = balances.slice(0, 4);
  const topVirtualAccounts = bankAccounts.slice(0, 3);
  const recentActivity = transactions.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#161a20]">
      <div className="mx-auto max-w-7xl p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div>
              <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-white">{displayName}</h1>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">
                {balances.length ? formatAmount(totalVisibleBalance, "mixed") : "Waiting for live data"}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {balances.length
                  ? `${balances.length} synced balance records across your wallet accounts.`
                  : "Your total balance will appear here once synced."}
              </p>
            </div>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold dark:text-white">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.label}
                      to={action.href}
                      className="group flex flex-col items-center gap-2 rounded-lg border border-gray-100 p-4 transition-all hover:border-[#bbf7d0] hover:bg-[#ecfdf3]/40 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#16a34a] dark:text-white dark:group-hover:text-[#86efac]">
                          {action.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold dark:text-white">Top balances</CardTitle>
                <Link to="/account/balances" className="text-sm font-medium text-[#16a34a] hover:underline dark:text-[#86efac]">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {topBalances.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {topBalances.map((balance) => (
                      <div
                        key={balance.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-white/5"
                      >
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">{balance.currency}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatAmount(balance.available_balance, balance.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                    No balance data available yet. This card is waiting for dynamic balances.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold dark:text-white">Your virtual accounts</CardTitle>
                <Link to="/account/virtual-accounts" className="text-sm font-medium text-[#16a34a] hover:underline dark:text-[#86efac]">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                {topVirtualAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {topVirtualAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200 dark:border-white/5 dark:hover:border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">{account.currency}</span>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {account.account_name || account.external_account_id || "Origin Wallet account"}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {account.country_code || "Wallet"} - {account.currency}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                    No virtual accounts yet. This section is waiting for dynamic account data.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader>
                <CardTitle className="text-base font-semibold dark:text-white">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {recentActivity.length > 0 ? (
                  <ul className="divide-y divide-gray-100 dark:divide-white/5">
                    {recentActivity.map((item) => (
                      <li key={item.id} className="group flex cursor-pointer items-start justify-between gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDateTime(item.booked_at || item.created_at)}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                            {item.description || item.transaction_type} - {formatAmount(item.amount, item.currency)}
                          </p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                    No recent activity yet. Transactions will appear here when live data is available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold dark:text-white">
                  <ShieldCheck className="h-5 w-5 text-[#16a34a]" />
                  Account status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <StatusRow label="Account" value={formatStatusLabel(user?.status || "pending")} status={user?.status || "pending"} />
                <StatusRow label="KYC/KYB" value={formatStatusLabel(kycStatus)} status={kycStatus} />
                <StatusRow
                  label="Origin Wallet"
                  value={formatStatusLabel(onboarding?.selected_provider_account_status || "not_started")}
                  status={onboarding?.selected_provider_account_status || "not_started"}
                />
                {kycQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock3 className="h-4 w-4" />
                    Loading verification status...
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader>
                <CardTitle className="text-base font-semibold dark:text-white">KYC/KYB steps</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {setupSteps.map((step, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {step.done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#16a34a]" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600" />
                      )}
                      {step.href && !step.disabled ? (
                        <Link
                          to={step.href}
                          className="group flex flex-1 items-center gap-1 text-sm font-medium text-gray-900 hover:text-[#16a34a] dark:text-white dark:hover:text-[#86efac]"
                        >
                          {step.label}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span
                          className={
                            step.disabled
                              ? "text-sm text-gray-400 dark:text-gray-500"
                              : "text-sm font-medium text-gray-900 dark:text-white"
                          }
                        >
                          {step.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-5 w-full rounded-full bg-[#16a34a] text-white hover:bg-[#15803d]"
                >
                  <Link to="/account/kyc">
                    {kycProfile ? "Review KYC/KYB profile" : "Start KYC/KYB"}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader>
                <CardTitle className="text-base font-semibold dark:text-white">
                  {beneficiaries.length ? `${beneficiaries.length} beneficiaries` : "No beneficiaries yet"}
                </CardTitle>
                <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                  {beneficiaries.length
                    ? "Manage recipient details before initiating transfers."
                    : "Add beneficiaries to send payments in more than 20 currencies to accounts worldwide."}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  variant="outline"
                  className="w-full gap-2 border-[#16a34a] text-[#16a34a] hover:bg-[#ecfdf3] hover:text-[#15803d] dark:border-[#16a34a]/60 dark:text-[#86efac] dark:hover:bg-[#16a34a]/10 dark:hover:text-[#bbf7d0]"
                >
                  <Link to="/account/beneficiaries">
                    <Plus className="h-4 w-4" />
                    Add beneficiary
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusRow = ({ label, status, value }: { label: string; status?: string | null; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClassName(status)}`}>
      {value}
    </span>
  </div>
);

export default AccountDashboard;
