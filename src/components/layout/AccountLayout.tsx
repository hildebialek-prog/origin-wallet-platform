import { useEffect } from "react";
import { Outlet, useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Users,
  UsersRound,
  Plug,
  LogOut,
  Globe,
  Settings,
  ChevronDown,
  User,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { to: "/account/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/account/virtual-accounts", label: "Virtual accounts", icon: CreditCard },
  { to: "/account/beneficiaries", label: "Beneficiaries", icon: Users },
  { to: "/account/team", label: "Team", icon: UsersRound },
  { to: "/account/integrations", label: "Integrations", icon: Plug },
];

const AccountLayout = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar - Currenxie style */}
      <aside className="w-64 min-h-screen bg-[#1a1d21] text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-2 border-b border-white/10">
          <img
            src="/logo/knt-logo.svg"
            alt="Origin Wallet"
            className="h-8 w-auto brightness-0 invert"
          />
          <span className="font-semibold text-lg">Origin Wallet</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/account"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2 border-transparent",
                  isActive
                    ? "bg-gray-700/80 text-green-400 border-l-green-400"
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
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-300 to-green-400" />
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur">
          <Button className="gap-2 rounded-full bg-green-500 px-5 text-white hover:bg-green-600">
            <ArrowUpDown className="w-4 h-4" />
            Move funds
          </Button>

          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            <Globe className="w-4 h-4" />
            EN
          </button>

          <div className="h-8 w-px bg-gray-200" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-green-400">
                <User className="w-4 h-4" />
                My account
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 rounded-xl border border-gray-200 bg-white p-0 shadow-xl"
            >
              <div className="px-4 py-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                  Origin Wallet
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                    {userInitials || "OW"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900">{displayName}</div>
                    <div className="truncate text-sm text-gray-500">{user?.email}</div>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="m-0 bg-gray-200" />

              <DropdownMenuItem asChild className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700">
                <Link to="/account/settings/general" className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="m-0 bg-gray-200" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700"
              >
                <LogOut className="mr-3 w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <Outlet />

        <button className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-gray-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-xs">
            ?
          </span>
          Help
        </button>
      </main>
    </div>
  );
};

export default AccountLayout;
