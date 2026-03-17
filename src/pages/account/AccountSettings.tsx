import { ChevronDown, Globe, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AccountSettings = () => {
  const location = useLocation();
  const isSecurity = location.pathname.endsWith("/security");

  return (
    <div className="bg-[#f8f8f6] px-7 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111]">Settings</h1>

        <div className="mb-8 flex items-center gap-8 text-[1.05rem] font-semibold">
          <Link
            to="/account/settings/general"
            className={!isSecurity ? "border-b-2 border-[#3ce4bf] pb-3 text-[#202020]" : "pb-3 text-[#5e5e5e]"}
          >
            General
          </Link>
          <Link
            to="/account/settings/security"
            className={isSecurity ? "border-b-2 border-[#3ce4bf] pb-3 text-[#202020]" : "pb-3 text-[#5e5e5e]"}
          >
            Security
          </Link>
        </div>

        {!isSecurity ? (
          <div className="space-y-4">
            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
              <CardContent className="flex items-center justify-between p-5">
                <div className="text-[1.15rem] font-medium text-[#232323]">Language</div>
                <button className="inline-flex items-center gap-2 text-[1.05rem] font-semibold text-[#232323]">
                  <Globe className="h-5 w-5" />
                  English
                  <ChevronDown className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
              <CardContent className="flex items-center justify-between p-5">
                <div className="text-[1.15rem] font-medium text-[#232323]">Dark mode</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-md border-[#7ae3cb] bg-white px-5 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9]"
                    >
                      Use system settings
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl border border-[#d7d7d2] bg-white p-2">
                    <DropdownMenuItem>Use system settings</DropdownMenuItem>
                    <DropdownMenuItem>Light</DropdownMenuItem>
                    <DropdownMenuItem>Dark</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
              <CardContent className="flex items-center justify-between p-5">
                <div className="text-[1.15rem] font-medium text-[#232323]">Update password</div>
                <Button
                  variant="outline"
                  className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9]"
                >
                  Update
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none">
              <CardContent className="flex items-center justify-between p-5">
                <div className="text-[1.15rem] font-medium text-[#232323]">2-factor authentication</div>
                <div className="flex items-center gap-5">
                  <div className="inline-flex items-center gap-2 text-[1rem] font-medium text-[#8e8e8e]">
                    <ShieldCheck className="h-5 w-5 text-[#5de1c3]" />
                    Authenticator app (default)
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9]"
                  >
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
