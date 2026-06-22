import { useEffect } from "react";
import { Outlet, useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LANGUAGES, useLanguage, getLanguageByCode, type Language } from "@/contexts/LanguageContext";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Users,
  UsersRound,
  Plug,
  LogOut,
  ClipboardList,
  Globe,
  Settings,
  ChevronDown,
  Check,
  Loader2,
  User,
  ArrowUpDown,
  ShieldCheck,
  SendHorizonal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HelpChatbot from "@/components/help/HelpChatbot";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/account", label: "Home", icon: LayoutDashboard },
  { to: "/account/balances", label: "Balances", icon: Wallet },
  { to: "/account/transfers", label: "Move funds", icon: SendHorizonal },
  { to: "/account/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/account/virtual-accounts", label: "Virtual accounts", icon: CreditCard },
  { to: "/account/beneficiaries", label: "Beneficiaries", icon: Users },
  { to: "/account/team", label: "Team", icon: UsersRound },
  { to: "/account/integrations", label: "Integrations", icon: Plug },
  { to: "/account/fx-orders", label: "FX Orders", icon: ClipboardList },
  { to: "/account/kyc", label: "KYC/KYB", icon: ShieldCheck },
];

const AccountLayout = () => {
  const { user, loading, logout } = useAuth();
  const { currentLanguage, setLanguage, isTranslating } = useLanguage();
  const navigate = useNavigate();
  const currentLanguageOption = getLanguageByCode(currentLanguage) ?? LANGUAGES[0];
  const displayName = user?.name || user?.email?.split("@")[0] || "My account";
  const userInitials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0f1115]">
        <div className="w-10 h-10 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] dark:bg-[#111318] lg:pl-64">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-[#1a1d21] text-white shadow-sm lg:flex lg:flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-white/10">
          <img
            src="/logo/logo.jpg"
            alt="Origin Wallet"
            className="h-9 w-9 rounded-xl object-cover"
          />
          <span className="font-semibold text-lg">Origin Wallet</span>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/account"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2 border-transparent",
                  isActive
                    ? "bg-[#22314a] text-[#22c55e] border-l-[#22c55e]"
                    : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen min-w-0 bg-[#f8f8f6] dark:bg-[#161a20]">
        <div className="h-1 bg-gradient-to-r from-[#3ce4bf] via-[#7ae3cb] to-[#22c55e]" />
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-end gap-3 border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-[#1b2027]/95">
          <Button asChild className="gap-2 rounded-full bg-[#16a34a] px-5 text-white hover:bg-[#15803d]">
            <Link to="/account/transfers">
              <ArrowUpDown className="w-4 h-4" />
              Move funds
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 disabled:cursor-wait disabled:opacity-70 dark:text-gray-300 dark:hover:text-white"
                disabled={isTranslating}
              >
                {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {currentLanguageOption.nameEn}
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#1c2128]"
            >
              {LANGUAGES.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => setLanguage(language.code as Language)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-700 dark:text-gray-200"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700 dark:bg-white/10 dark:text-gray-200">
                    {language.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{language.nameEn}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{language.nativeName}</span>
                  </span>
                  {language.code === currentLanguage ? <Check className="h-4 w-4 text-[#16a34a]" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-8 w-px bg-gray-200 dark:bg-white/10" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-[#22c55e] dark:text-white">
                <User className="w-4 h-4" />
                My account
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 rounded-xl border border-gray-200 bg-white p-0 shadow-xl dark:border-white/10 dark:bg-[#1c2128]"
            >
              <div className="px-4 py-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Origin Wallet
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ecfdf3] text-sm font-bold text-[#16a34a]">
                    {userInitials || "OW"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900 dark:text-white">{displayName}</div>
                    <div className="truncate text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="m-0 bg-gray-200 dark:bg-white/10" />

              <DropdownMenuItem asChild className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                <Link to="/account/settings/general" className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="m-0 bg-gray-200 dark:bg-white/10" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <LogOut className="mr-3 w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <Outlet />

        <HelpChatbot />
      </main>
    </div>
  );
};

export default AccountLayout;
