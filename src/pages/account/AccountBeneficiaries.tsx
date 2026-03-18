import { Landmark, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const AccountBeneficiaries = () => {
  return (
    <div className="bg-[#f8f8f6] px-7 py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111] dark:text-white">Beneficiaries</h1>
          <Button
            variant="outline"
            className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9] dark:border-white/15 dark:bg-[#252b34] dark:text-white dark:hover:bg-[#2d3440]"
          >
            Add
          </Button>
        </div>

        <div className="relative mb-8 max-w-[30.5rem]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#969696] dark:text-gray-500" />
          <Input
            className="h-12 rounded-full border-[#d6d6d0] bg-white pl-11 text-[1rem] dark:border-white/10 dark:bg-[#1b2027] dark:text-white dark:placeholder:text-gray-500"
            placeholder="Alias, name, bank, or account number"
          />
        </div>

        <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
          <CardContent className="flex min-h-[18rem] flex-col items-center justify-center gap-4 p-10 text-center">
            <Landmark className="h-8 w-8 text-[#222222] dark:text-white" />
            <div className="space-y-2">
              <h2 className="text-[1.75rem] font-semibold text-[#1f1f1f] dark:text-white">No beneficiaries yet</h2>
              <p className="max-w-[36rem] text-[1.05rem] leading-7 text-[#8b8b8b] dark:text-gray-400">
                Add beneficiaries to send payments in more than 20 currencies to accounts worldwide.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9] dark:border-green-500/40 dark:bg-transparent dark:text-green-400 dark:hover:bg-green-500/10"
            >
              Add beneficiary
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountBeneficiaries;
