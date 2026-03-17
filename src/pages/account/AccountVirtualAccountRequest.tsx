import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AccountVirtualAccountRequest = () => {
  return (
    <div className="bg-[#f8f8f6] px-7 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-[#7a7a7a]">
          <Home className="h-4 w-4" />
          <Link to="/account/virtual-accounts" className="hover:text-[#242424]">
            Virtual accounts
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#242424]">Request</span>
        </div>

        <h1 className="mb-10 text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111]">
          Request virtual account
        </h1>

        <div className="max-w-[31rem] space-y-10">
          <div className="space-y-3">
            <label className="block text-[1.05rem] font-semibold text-[#2a2a2a]">Country/territory</label>
            <select className="h-12 w-full rounded-md border border-[#575757] bg-white px-4 text-[1rem] text-[#202020]">
              <option>United States of America</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-[1.05rem] font-semibold text-[#2a2a2a]">Account alias</label>
            <Input className="h-12 border-[#575757] bg-white text-[1rem]" placeholder="Enter new account name" />
          </div>

          <div className="space-y-3">
            <label className="block text-[1.05rem] font-semibold text-[#2a2a2a]">Currency</label>
            <div className="rounded-md border border-[#d7d7d2] bg-white px-4 py-4">
              <span className="rounded-md border border-[#d8d8d1] bg-[#fbfbf8] px-3 py-1 text-sm font-medium text-[#4a4a4a]">
                USD
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[1.05rem] font-semibold text-[#2a2a2a]">Store link (if applicable)</label>
            <Input className="h-12 border-[#575757] bg-white text-[1rem]" />
          </div>

          <div className="flex items-center gap-5 pt-2">
            <button className="px-5 py-3 text-[1rem] font-medium text-[#2f2f2f]">Cancel</button>
            <Button className="rounded-full bg-green-500 px-7 text-[1rem] font-semibold text-white hover:bg-green-600">
              Confirm and request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountVirtualAccountRequest;
