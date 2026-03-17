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

const TOP_BALANCES = [
  { code: "EUR", amount: "45.80", flag: "🇪🇺" },
  { code: "HKD", amount: "314.03", flag: "🇭🇰" },
  { code: "USD", amount: "0", flag: "🇺🇸" },
  { code: "GBP", amount: "0", flag: "🇬🇧" },
];

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

const RECENT_ACTIVITY = [
  {
    date: "10 Mar 2026",
    text: "Received HKD 177.03 from NONGKRAN JOMSAWAN",
    type: "in",
  },
  {
    date: "9 Mar 2026",
    text: "Received HKD 137.00 from NONGKRAN JOMSAWAN",
    type: "in",
  },
  {
    date: "6 Mar 2026",
    text: "Received EUR 45.80 from NONGKRAN JOMSAWAN",
    type: "in",
  },
  {
    date: "7 Jan 2026",
    text: 'Your Hong Kong virtual account request "Monroca OU" was not approved.',
    type: "info",
  },
  {
    date: "7 Jan 2026",
    text: 'You have requested to add Hong Kong virtual account "Monroca OU". We should approve within 2 business days.',
    type: "info",
  },
  {
    date: "18 Dec 2025",
    text: 'Your Hong Kong virtual account "Multi Currency Account-AUD" has been approved.',
    type: "info",
  },
];

const SETUP_STEPS = [
  { done: true, label: "Virtual account requested" },
  { done: true, label: "Add funds to your account" },
  { done: false, label: "Add a beneficiary", href: "/account/beneficiaries" },
  { done: false, label: "Make a transfer", disabled: true },
];

const VIRTUAL_ACCOUNTS = [
  { name: "Multi Currency Account", country: "Hong Kong", flag: "🇭🇰", currencies: "AUD, CNH, SGD, USD, EUR, GBP" },
  { name: "Euro EU IBAN", country: "Europe", flag: "🇪🇺", currencies: "EUR" },
];

const AccountDashboard = () => {
  const { user } = useAuth();
  const displayName = user?.name || user?.email?.split("@")[0] || "Account";
  const totalBalance = "92.55";

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left + center: main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account name & total balance */}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                {displayName}
              </h1>
              <p className="text-4xl font-bold text-gray-900">USD {totalBalance}</p>
              <p className="text-sm text-gray-500 mt-1">
                Your total balance estimate
              </p>
            </div>

            {/* Quick actions */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.label}
                      to={action.href}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all group"
                    >
                      <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                        <action.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700">
                          {action.label}
                        </p>
                        <p className="text-xs text-gray-500">{action.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top balances */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Top balances
                </CardTitle>
                <Link
                  to="/account/balances"
                  className="text-sm text-green-600 hover:underline font-medium"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {TOP_BALANCES.map((b) => (
                    <div
                      key={b.code}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 flex items-center gap-3"
                    >
                      <span className="text-2xl">{b.flag}</span>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {b.code} {b.amount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Virtual accounts */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Your virtual accounts
                </CardTitle>
                <Link
                  to="/account/virtual-accounts"
                  className="text-sm text-green-600 hover:underline font-medium"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {VIRTUAL_ACCOUNTS.map((va, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{va.flag}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{va.name}</p>
                          <p className="text-sm text-gray-500">{va.country} • {va.currencies}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent activity */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-gray-100">
                  {RECENT_ACTIVITY.map((item, i) => (
                    <li
                      key={i}
                      className="py-4 flex items-start justify-between gap-4 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500">{item.date}</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {item.text}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-gray-600 mt-1" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Set up your account */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Set up your account
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {SETUP_STEPS.map((step, i) => (
                    <li key={i} className="flex items-center gap-3">
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                      )}
                      {step.href && !step.disabled ? (
                        <Link
                          to={step.href}
                          className="text-sm font-medium text-gray-900 hover:text-green-600 flex items-center gap-1 flex-1 group"
                        >
                          {step.label}
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5" />
                        </Link>
                      ) : (
                        <span
                          className={
                            step.disabled
                              ? "text-sm text-gray-400"
                              : "text-sm font-medium text-gray-900"
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

            {/* No beneficiaries yet */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  No beneficiaries yet
                </CardTitle>
                <p className="text-sm text-gray-500 font-normal mt-1">
                  Add beneficiaries to send payments in more than 20 currencies
                  to accounts worldwide.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 gap-2"
                >
                  <Link to="/account/beneficiaries">
                    <Plus className="w-4 h-4" />
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
