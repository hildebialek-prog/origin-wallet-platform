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
      </div>
    </div>
  );
};

export default AccountBalances;
