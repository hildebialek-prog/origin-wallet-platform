import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  Circle,
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
    href: "/account/transactions",
    color: "bg-green-600",
  },
  {
    icon: ArrowDownLeft,
    label: "Receive money",
    desc: "Get your account details",
    href: "/account/virtual-accounts",
    color: "bg-blue-600",
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

const SETUP_STEPS = [
  { done: true, label: "Virtual account requested" },
  { done: true, label: "Add funds to your account" },
  { done: false, label: "Add a beneficiary", href: "/account/beneficiaries" },
  { done: false, label: "Make a transfer", disabled: true },
];

const VIRTUAL_ACCOUNTS: Array<{ name: string; country: string; flag: string; currencies: string }> = [];

const AccountDashboard = () => {
  const { user } = useAuth();
  const displayName = user?.name || user?.email?.split("@")[0] || "Account";

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#161a20]">
      <div className="mx-auto max-w-7xl p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div>
              <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-white">{displayName}</h1>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">Waiting for live data</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your total balance will appear here once synced.
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
                      className="group flex flex-col items-center gap-2 rounded-lg border border-gray-100 p-4 transition-all hover:border-green-200 hover:bg-green-50/30 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700 dark:text-white dark:group-hover:text-green-400">
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
                <Link to="/account/balances" className="text-sm font-medium text-green-600 hover:underline dark:text-green-400">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {TOP_BALANCES.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {TOP_BALANCES.map((balance) => (
                      <div
                        key={balance.code}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-white/5"
                      >
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">{balance.flag}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {balance.code} {balance.amount}
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
                <Link to="/account/virtual-accounts" className="text-sm font-medium text-green-600 hover:underline dark:text-green-400">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                {VIRTUAL_ACCOUNTS.length > 0 ? (
                  <div className="space-y-3">
                    {VIRTUAL_ACCOUNTS.map((account) => (
                      <div
                        key={account.name}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200 dark:border-white/5 dark:hover:border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">{account.flag}</span>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {account.country} - {account.currencies}
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
                {RECENT_ACTIVITY.length > 0 ? (
                  <ul className="divide-y divide-gray-100 dark:divide-white/5">
                    {RECENT_ACTIVITY.map((item, index) => (
                      <li key={index} className="group flex cursor-pointer items-start justify-between gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.date}</p>
                          <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{item.text}</p>
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
                <CardTitle className="text-base font-semibold dark:text-white">Set up your account</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {SETUP_STEPS.map((step, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {step.done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600" />
                      )}
                      {step.href && !step.disabled ? (
                        <Link
                          to={step.href}
                          className="group flex flex-1 items-center gap-1 text-sm font-medium text-gray-900 hover:text-green-600 dark:text-white dark:hover:text-green-400"
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
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader>
                <CardTitle className="text-base font-semibold dark:text-white">No beneficiaries yet</CardTitle>
                <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                  Add beneficiaries to send payments in more than 20 currencies to accounts worldwide.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  variant="outline"
                  className="w-full gap-2 border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-500/50 dark:text-green-400 dark:hover:bg-green-500/10 dark:hover:text-green-300"
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

export default AccountDashboard;
