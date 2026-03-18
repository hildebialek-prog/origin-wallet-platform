import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TRANSACTIONS = [
  {
    date: "10 Mar 2026",
    id: "#6C7893A6",
    description: "Payment from NONGKRAN JOMSAWAN",
    amount: "HKD 177.03",
  },
  {
    date: "09 Mar 2026",
    id: "#AA71EDB0",
    description: "Payment from NONGKRAN JOMSAWAN",
    amount: "HKD 137.00",
  },
];

const AccountTransactions = () => {
  return (
    <div className="bg-[#f8f8f6] px-7 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111]">Transactions</h1>
          <Button
            variant="outline"
            className="rounded-full border-[#7ae3cb] bg-white px-6 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9]"
          >
            Statements
          </Button>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-4">
          <select className="h-11 rounded-lg border border-[#202020] bg-white px-4 text-[1rem] text-[#202020]">
            <option>HKD</option>
            <option>EUR</option>
            <option>USD</option>
          </select>
          <select className="h-11 min-w-[18.5rem] rounded-lg border border-[#202020] bg-white px-4 text-[1rem] text-[#6b6b6b]">
            <option>Select date range</option>
          </select>
          <div className="relative min-w-[22rem] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#969696]" />
            <Input
              className="h-11 rounded-full border-[#d6d6d0] bg-white pl-11 text-[1rem]"
              placeholder="Search by transaction ID"
            />
          </div>
          <button className="inline-flex items-center gap-2 text-[1rem] font-semibold text-[#3d3d3d]">
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        </div>

        <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
          <div className="grid grid-cols-[160px_180px_1fr_140px_44px] border-b border-[#d7d7d2] px-5 py-4 text-sm font-semibold text-[#303030]">
            <div>Date</div>
            <div>Transaction ID</div>
            <div>Description</div>
            <div>Amount</div>
            <div />
          </div>
          <CardContent className="p-0">
            {TRANSACTIONS.map((transaction) => (
              <div
                key={transaction.id}
                className="grid grid-cols-[160px_180px_1fr_140px_44px] items-center border-b border-[#ecece7] px-5 py-5 text-[1.05rem] text-[#202020] last:border-b-0"
              >
                <div>{transaction.date}</div>
                <div>{transaction.id}</div>
                <div>{transaction.description}</div>
                <div>{transaction.amount}</div>
                <button className="flex h-9 w-9 items-center justify-center rounded-full text-[#6b6b6b] hover:bg-[#f3f4ef]">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-10 flex items-center justify-center gap-5 text-[#bdbdb6]">
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[1rem] font-medium text-[#535353]">1</span>
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountTransactions;
