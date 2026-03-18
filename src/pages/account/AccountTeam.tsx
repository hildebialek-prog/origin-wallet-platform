import { ChevronRight, Eye, Landmark, Repeat, Search, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const AccountTeam = () => {
  return (
    <div className="bg-[#f8f8f6] px-7 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111]">Team</h1>
          <Button
            variant="outline"
            className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9]"
          >
            Invite
          </Button>
        </div>

        <div className="relative mb-8 max-w-[30.5rem]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#969696]" />
          <Input className="h-12 rounded-full border-[#d6d6d0] bg-white pl-11 text-[1rem]" placeholder="Search by name or email" />
        </div>

        <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
          <div className="grid grid-cols-[1fr_220px] border-b border-[#d7d7d2] px-5 py-4 text-sm font-semibold text-[#303030]">
            <div>Name</div>
            <div className="pr-9 text-right">Permissions</div>
          </div>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_220px] items-center border-b border-[#ecece7] px-5 py-4">
              <div>
                <div className="text-[1.05rem] font-semibold text-[#202020]">Aleksandr Muzafarov (You)</div>
                <div className="text-sm text-[#8a8a8a]">providencegiebelmfum@hotmail.com</div>
              </div>
              <div className="flex items-center justify-end gap-3 text-[#555555]">
                <Eye className="h-4 w-4" />
                <Landmark className="h-4 w-4" />
                <Users2 className="h-4 w-4" />
                <Repeat className="h-4 w-4" />
                <ChevronRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8 rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
          <CardContent className="flex min-h-[14rem] flex-col items-center justify-center gap-4 p-10 text-center">
            <Users2 className="h-8 w-8 text-[#222222]" />
            <div className="space-y-2">
              <h2 className="text-[1.75rem] font-semibold text-[#1f1f1f]">No team members yet</h2>
              <p className="max-w-[38rem] text-[1.05rem] leading-7 text-[#8b8b8b]">
                Invite new members and set their permissions to manage beneficiaries, virtual accounts, and transfers.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9]"
            >
              Invite team members
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountTeam;
