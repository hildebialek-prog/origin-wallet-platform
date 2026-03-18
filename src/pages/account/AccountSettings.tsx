import { ChevronDown, Globe, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { LANGUAGES, type Language, useLanguage } from "@/contexts/LanguageContext";
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
  const { currentLanguage, setLanguage, isTranslating } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isSecurity =
    location.pathname.endsWith("/security") ||
    location.pathname.endsWith("/profile") ||
    location.pathname.endsWith("/password");
  const currentLanguageOption = LANGUAGES.find((item) => item.code === currentLanguage) ?? LANGUAGES[0];
  const darkModeLabel =
    theme === "system" ? "Use system settings" : theme === "dark" ? "Dark" : "Light";

  return (
    <div className="bg-[#f8f8f6] px-7 py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111] dark:text-white">Settings</h1>

        <div className="mb-8 flex items-center gap-8 text-[1.05rem] font-semibold">
          <Link
            to="/account/settings/general"
            className={
              !isSecurity
                ? "border-b-2 border-[#3ce4bf] pb-3 text-[#202020] dark:text-white"
                : "pb-3 text-[#5e5e5e] dark:text-gray-400"
            }
          >
            General
          </Link>
          <Link
            to="/account/settings/security"
            className={
              isSecurity
                ? "border-b-2 border-[#3ce4bf] pb-3 text-[#202020] dark:text-white"
                : "pb-3 text-[#5e5e5e] dark:text-gray-400"
            }
          >
            Security
          </Link>
        </div>

        {!isSecurity ? (
          <div className="space-y-4">
            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
              <CardContent className="flex items-center justify-between p-5">
                <div className="text-[1.15rem] font-medium text-[#232323] dark:text-white">Language</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="rounded-md px-3 text-[1.05rem] font-semibold text-[#232323] hover:bg-[#f5f5f2] dark:text-white dark:hover:bg-white/10"
                    >
                      <Globe className="mr-2 h-5 w-5" />
                      {isTranslating ? "Updating..." : currentLanguageOption.nameEn}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-52 rounded-xl border border-[#d7d7d2] bg-white p-2 dark:border-white/10 dark:bg-[#1c2128]"
                  >
                    {LANGUAGES.map((language) => (
                      <DropdownMenuItem
                        key={language.code}
                        onClick={() => setLanguage(language.code as Language)}
                        className="flex items-center justify-between"
                      >
                        <span>{language.nameEn}</span>
                        <span className="text-xs text-[#8b8b87] dark:text-gray-400">{language.nativeName}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
              <CardContent className="flex items-center justify-between p-5">
                <div className="text-[1.15rem] font-medium text-[#232323] dark:text-white">Dark mode</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-md border-[#7ae3cb] bg-white px-5 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9] dark:border-white/15 dark:bg-[#252b34] dark:text-white dark:hover:bg-[#2d3440]"
                    >
                      {darkModeLabel}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-44 rounded-xl border border-[#d7d7d2] bg-white p-2 dark:border-white/10 dark:bg-[#1c2128]"
                  >
                    <DropdownMenuItem onClick={() => setTheme("system")}>Use system settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
              <CardContent className="flex items-center justify-between p-5">
                <div className="text-[1.15rem] font-medium text-[#232323] dark:text-white">Update password</div>
                <Link to="/account/settings/password">
                  <Button
                    variant="outline"
                    className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9] dark:border-white/15 dark:bg-[#252b34] dark:text-white dark:hover:bg-[#2d3440]"
                  >
                    Update
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
              <CardContent className="flex items-center justify-between p-5">
                <div className="text-[1.15rem] font-medium text-[#232323] dark:text-white">Profile</div>
                <div className="flex items-center gap-5">
                  <div className="inline-flex items-center gap-2 text-[1rem] font-medium text-[#8e8e8e] dark:text-gray-400">
                    <UserRound className="h-5 w-5 text-[#5de1c3]" />
                    Basic personal information
                  </div>
                  <Link to="/account/settings/profile">
                    <Button
                      variant="outline"
                      className="rounded-full border-[#7ae3cb] bg-white px-7 text-[1rem] font-semibold text-[#232323] hover:bg-[#f3fdf9] dark:border-white/15 dark:bg-[#252b34] dark:text-white dark:hover:bg-[#2d3440]"
                    >
                      Manage
                    </Button>
                  </Link>
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
