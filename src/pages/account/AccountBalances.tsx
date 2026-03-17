
import { MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BALANCES = [
  { name: "United States Dollar", code: "USD", amount: "USD 0", flag: "🇺🇸" },
  { name: "Euro", code: "EUR", amount: "EUR 45.80", flag: "🇪🇺" },
  { name: "Hong Kong Dollar", code: "HKD", amount: "HKD 314.03", flag: "🇭🇰" },
  { name: "Pound Sterling", code: "GBP", amount: "GBP 0", flag: "🇬🇧" },
  { name: "Japanese Yen", code: "JPY", amount: "JPY 0", flag: "🇯🇵" },
  { name: "Canadian Dollar", code: "CAD", amount: "CAD 0", flag: "🇨🇦" },
  { name: "Australian Dollar", code: "AUD", amount: "AUD 0", flag: "🇦🇺" },
  { name: "New Zealand Dollar", code: "NZD", amount: "NZD 0", flag: "🇳🇿" },
  { name: "Renminbi", code: "CNH", amount: "CNH 0", flag: "🇨🇳" },
  { name: "Singapore Dollar", code: "SGD", amount: "SGD 0", flag: "🇸🇬" },
];

const AccountBalances = () => {
  return (
    <div className="bg-[#f8f8f6] px-7 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111]">Balances</h1>

        <Card className="mt-10 overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
          <div className="grid grid-cols-[1fr_auto_52px] border-b border-[#d7d7d2] px-5 py-4 text-sm font-semibold text-[#303030]">
            <div>Currency</div>
            <div className="pr-4">Amount</div>
            <div />
          </div>
          <CardContent className="p-0">
            {BALANCES.map((balance) => (
              <div
                key={balance.code}
                className="grid grid-cols-[1fr_auto_52px] items-center border-b border-[#ecece7] px-5 py-4 last:border-b-0"
              >
                <div className="flex items-center gap-3 text-[1.08rem] text-[#202020]">
                  <span className="text-[1.75rem]">{balance.flag}</span>
                  <span>{balance.name}</span>
                </div>
                <div className="pr-4 text-[1.08rem] text-[#202020]">{balance.amount}</div>
                <button className="flex h-9 w-9 items-center justify-center rounded-full text-[#686868] transition hover:bg-[#f3f4ef]">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
=======
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  Search,
  MoreHorizontal,
  HelpCircle,
  Globe,
  ChevronDown,
  TrendingUp,
  Wallet,
  ArrowRight,
} from "lucide-react";

const BALANCES = [
  { name: "United States Dollar", code: "USD", amount: "0.00", flag: "🇺🇸" },
  { name: "Euro", code: "EUR", amount: "45.80", flag: "🇪🇺" },
  { name: "Hong Kong Dollar", code: "HKD", amount: "314.03", flag: "🇭🇰" },
  { name: "Pound Sterling", code: "GBP", amount: "0.00", flag: "🇬🇧" },
  { name: "Japanese Yen", code: "JPY", amount: "0", flag: "🇯🇵" },
  { name: "Canadian Dollar", code: "CAD", amount: "0.00", flag: "🇨🇦" },
  { name: "Australian Dollar", code: "AUD", amount: "0.00", flag: "🇦🇺" },
  { name: "New Zealand Dollar", code: "NZD", amount: "0.00", flag: "🇳🇿" },
  { name: "Renminbi", code: "CNH", amount: "0.00", flag: "🇨🇳" },
  { name: "Singapore Dollar", code: "SGD", amount: "0.00", flag: "🇸🇬" },
  { name: "Swiss Franc", code: "CHF", amount: "0.00", flag: "🇨🇭" },
];

const AccountBalances = () => {
  const [lang] = useState("EN");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBalances = BALANCES.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBalanceUSD = "92.55";

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Top bar - giống Currenxie */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm">
            <ArrowUpDown className="w-4 h-4" />
            Move funds
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors">
            <Globe className="w-4 h-4 text-gray-500" />
            {lang}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-700 text-sm font-semibold">K</span>
                </div>
                <span>My account</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-red-600">Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Total Balance Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-2 border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Total balance</p>
                    <p className="text-3xl font-bold text-gray-900">USD {totalBalanceUSD}</p>
                    <p className="text-xs text-gray-400 mt-1">≈ 359.83 EUR • 723.96 HKD</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between h-full">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">Exchange</p>
                    <p className="text-xl font-bold text-white">Convert currencies</p>
                    <p className="text-xs text-white/70 mt-1">Get real rates</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/70" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search currency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
              />
            </div>
            <Button variant="outline" className="gap-2 border-gray-200 hover:bg-gray-50">
              <TrendingUp className="w-4 h-4" />
              View statement
            </Button>
          </div>

          {/* Balances Table */}
          <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Currency
                    </th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">
                      Available balance
                    </th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">
                      In orders
                    </th>
                    <th className="w-14" />
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((row) => (
                    <tr
                      key={row.code}
                      className="border-b border-gray-100 last:border-0 hover:bg-green-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="flex w-10 h-10 rounded-full items-center justify-center text-xl bg-gray-100 shrink-0 shadow-sm">
                            {row.flag}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {row.name}
                            </p>
                            <p className="text-xs text-gray-500">{row.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {row.code} {Number(row.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="text-sm font-medium text-gray-400">
                          {row.code} 0.00
                        </p>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                              aria-label="More options"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <ArrowUpDown className="w-4 h-4" />
                              Exchange
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <ArrowRight className="w-4 h-4" />
                              Transfer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <Wallet className="w-4 h-4" />
                              View details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredBalances.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-gray-500">No currencies found</p>
              </div>
            )}
          </Card>

          {/* Footer info */}
          <div className="flex items-center justify-between text-xs text-gray-400 px-2">
            <p>Showing {filteredBalances.length} of {BALANCES.length} currencies</p>
            <p>Last updated: Today</p>
          </div>
        </div>
      </div>

      {/* Floating Help button */}
      <div className="fixed bottom-6 right-6 z-30">
        <Button
          size="lg"
          className="rounded-full h-12 px-5 bg-[#2d3238] hover:bg-[#3d4248] text-white shadow-lg gap-2 border-0"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="font-medium">Help</span>
        </Button>
      </div>
    </div>
  );
};

export default AccountBalances;
