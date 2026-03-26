import { Search, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TEAM_MEMBERS: Array<{ name: string; email: string }> = [];

const AccountTeam = () => {
  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-[2.35rem] font-bold tracking-[-0.04em] text-[#111111] sm:text-[3.2rem] dark:text-white">
            Team
          </h1>
          <Button
            variant="outline"
            className="w-full rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9] sm:w-auto dark:border-white/15 dark:bg-[#252b34] dark:text-white dark:hover:bg-[#2d3440]"
          >
            Invite
          </Button>
        </div>

        <div className="relative mb-8 w-full max-w-[30.5rem]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#969696] dark:text-gray-500" />
          <Input
            className="h-12 rounded-full border-[#d6d6d0] bg-white pl-11 text-[1rem] dark:border-white/10 dark:bg-[#1b2027] dark:text-white dark:placeholder:text-gray-500"
            placeholder="Search by name or email"
          />
        </div>

        <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
          <div className="overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid grid-cols-[1fr_220px] border-b border-[#d7d7d2] px-5 py-4 text-sm font-semibold text-[#303030] dark:border-white/10 dark:text-gray-200">
                <div>Name</div>
                <div className="pr-9 text-right">Permissions</div>
              </div>
              <CardContent className="p-0">
                {TEAM_MEMBERS.length === 0 && (
                  <div className="px-5 py-14 text-center">
                    <p className="text-[1.05rem] font-medium text-[#202020] dark:text-white">No team data available yet</p>
                    <p className="mt-2 text-sm text-[#8a8a8a] dark:text-gray-400">
                      Team members and permissions will appear here after dynamic data is connected.
                    </p>
                  </div>
                )}
              </CardContent>
            </div>
          </div>
          {TEAM_MEMBERS.length === 0 && (
            <div className="border-t border-[#ecece7] px-5 py-3 text-center text-xs text-[#8a8a8a] sm:hidden dark:border-white/5 dark:text-gray-500">
              Swipe horizontally if you need to review the team table on a smaller screen.
            </div>
          )}
        </Card>

        <Card className="mt-8 rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
          <CardContent className="flex min-h-[14rem] flex-col items-center justify-center gap-4 p-6 text-center sm:p-10">
            <Users2 className="h-8 w-8 text-[#222222] dark:text-white" />
            <div className="space-y-2">
              <h2 className="text-[1.45rem] font-semibold text-[#1f1f1f] sm:text-[1.75rem] dark:text-white">No team members yet</h2>
              <p className="max-w-[38rem] text-[1rem] leading-7 text-[#8b8b8b] sm:text-[1.05rem] dark:text-gray-400">
                Invite new members and set their permissions to manage beneficiaries, virtual accounts, and transfers.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9] sm:w-auto dark:border-green-500/40 dark:bg-transparent dark:text-green-400 dark:hover:bg-green-500/10"
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
