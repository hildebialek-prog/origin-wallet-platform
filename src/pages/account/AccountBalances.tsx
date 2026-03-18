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
  ArrowRight,
  ArrowUpDown,
  MoreHorizontal,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
// aa
const BALANCES = [
  { name: "United States Dollar", code: "USD", amount: "0.00", flag: "USD" },
  { name: "Euro", code: "EUR", amount: "45.80", flag: "EUR" },
  { name: "Hong Kong Dollar", code: "HKD", amount: "314.03", flag: "HKD" },
  { name: "Pound Sterling", code: "GBP", amount: "0.00", flag: "GBP" },
  { name: "Japanese Yen", code: "JPY", amount: "0.00", flag: "JPY" },
  { name: "Canadian Dollar", code: "CAD", amount: "0.00", flag: "CAD" },
  { name: "Australian Dollar", code: "AUD", amount: "0.00", flag: "AUD" },
  { name: "New Zealand Dollar", code: "NZD", amount: "0.00", flag: "NZD" },
  { name: "Renminbi", code: "CNH", amount: "0.00", flag: "CNH" },
  { name: "Singapore Dollar", code: "SGD", amount: "0.00", flag: "SGD" },
  { name: "Swiss Franc", code: "CHF", amount: "0.00", flag: "CHF" },
];

const AccountBalances = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBalances = BALANCES.filter(
    (balance) =>
      balance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      balance.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalBalanceUSD = "92.55";

  return (
    <div className="bg-[#f5f5f5] dark:bg-[#161a20]">
      <div className="overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="col-span-2 border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Total balance</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">USD {totalBalanceUSD}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Approx. 359.83 EUR / 723.96 HKD</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
                    <Wallet className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-gradient-to-br from-green-500 to-green-600 shadow-sm dark:border-green-500/20 dark:from-green-500 dark:to-emerald-500">
              <CardContent className="p-6">
                <div className="flex h-full items-start justify-between">
                  <div>
                    <p className="mb-1 text-sm font-medium text-white/80">Exchange</p>
                    <p className="text-xl font-bold text-white">Convert currencies</p>
                    <p className="mt-1 text-xs text-white/70">Get real rates</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white/70" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search currency..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-white/10 dark:bg-[#1b2027] dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            <Button variant="outline" className="gap-2 border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:bg-[#1b2027] dark:text-white dark:hover:bg-white/10">
              <TrendingUp className="h-4 w-4" />
              View statement
            </Button>
          </div>

          <Card className="overflow-hidden border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-white/5">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Currency
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Available balance
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                      In orders
                    </th>
                    <th className="w-14" />
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((row) => (
                    <tr
                      key={row.code}
                      className="group cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-green-50/30 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 shadow-sm dark:bg-white/5 dark:text-gray-300">
                            {row.flag}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{row.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {row.code}{" "}
                          {Number(row.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">{row.code} 0.00</p>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="rounded-lg p-2 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-gray-200"
                              aria-label="More options"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 dark:border-white/10 dark:bg-[#1c2128]">
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <ArrowUpDown className="h-4 w-4" />
                              Exchange
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <ArrowRight className="h-4 w-4" />
                              Transfer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <Wallet className="h-4 w-4" />
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
                <p className="text-gray-500 dark:text-gray-400">No currencies found</p>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between px-2 text-xs text-gray-400 dark:text-gray-500">
            <p>
              Showing {filteredBalances.length} of {BALANCES.length} currencies
            </p>
            <p>Last updated: Today</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountBalances;
