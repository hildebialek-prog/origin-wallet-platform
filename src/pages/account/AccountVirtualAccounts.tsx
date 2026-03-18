import { Info, MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ACCOUNTS = [
  { alias: "Multi Currency Account-AUD", location: "Hong Kong", currency: "AUD" },
  { alias: "Multi Currency Account-CAD", location: "Hong Kong", currency: "CAD" },
  { alias: "Multi Currency Account-CHF", location: "Hong Kong", currency: "CHF" },
  { alias: "Multi Currency Account-CNH", location: "Hong Kong", currency: "CNH" },
  { alias: "Multi Currency Account-EUR", location: "Hong Kong", currency: "EUR" },
  { alias: "Multi Currency Account-GBP", location: "Hong Kong", currency: "GBP" },
  { alias: "Multi Currency Account-HKD", location: "Hong Kong", currency: "HKD" },
  { alias: "Multi Currency Account-JPY", location: "Hong Kong", currency: "JPY" },
  { alias: "Multi Currency Account-NZD", location: "Hong Kong", currency: "NZD" },
];

const AccountVirtualAccounts = () => {
  const location = useLocation();
  const activeTab = new URLSearchParams(location.search).get("tab") || "approved";

  return (
    <div className="bg-[#f8f8f6] px-7 py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111] dark:text-white">Virtual accounts</h1>

          <div className="flex items-center gap-4">
            <button className="inline-flex items-center gap-2 text-[1rem] font-semibold text-[#545454] dark:text-gray-300">
              <Info className="h-4 w-4" />
              Capabilities
            </button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#7ae3cb] bg-white px-6 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9] dark:border-white/15 dark:bg-[#252b34] dark:text-white dark:hover:bg-[#2d3440]"
            >
              <Link to="/account/virtual-accounts/request">Request</Link>
            </Button>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-8 text-[1.05rem] font-semibold">
          <Link
            to="/account/virtual-accounts?tab=approved"
            className={
              activeTab === "approved"
                ? "border-b-2 border-[#3ce4bf] pb-3 text-[#202020] dark:text-white"
                : "pb-3 text-[#5e5e5e] dark:text-gray-400"
            }
          >
            Approved
          </Link>
          <Link
            to="/account/virtual-accounts?tab=pending"
            className={
              activeTab === "pending"
                ? "border-b-2 border-[#3ce4bf] pb-3 text-[#202020] dark:text-white"
                : "pb-3 text-[#5e5e5e] dark:text-gray-400"
            }
          >
            Pending
          </Link>
        </div>

        <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
          <div className="grid grid-cols-[1.8fr_1.1fr_0.8fr_52px] border-b border-[#d7d7d2] px-5 py-4 text-sm font-semibold text-[#303030] dark:border-white/10 dark:text-gray-200">
            <div>Alias</div>
            <div>Location</div>
            <div>Currency</div>
            <div />
          </div>
          <CardContent className="p-0">
            {(activeTab === "pending" ? ACCOUNTS.slice(0, 2) : ACCOUNTS).map((account) => (
              <div
                key={account.alias}
                className="grid grid-cols-[1.8fr_1.1fr_0.8fr_52px] items-center border-b border-[#ecece7] px-5 py-4 last:border-b-0 dark:border-white/5"
              >
                <div className="text-[1.05rem] text-[#202020] dark:text-white">{account.alias}</div>
                <div className="flex items-center gap-3 text-[1.05rem] text-[#202020] dark:text-white">
                  <span className="text-[1.55rem]">HK</span>
                  {account.location}
                </div>
                <div>
                  <span className="rounded-md border border-[#d8d8d1] bg-[#fbfbf8] px-3 py-1 text-sm font-medium text-[#4a4a4a] dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                    {account.currency}
                  </span>
                </div>
                <button className="flex h-9 w-9 items-center justify-center rounded-full text-[#686868] transition hover:bg-[#f3f4ef] dark:text-gray-400 dark:hover:bg-white/10">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountVirtualAccounts;
