import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, LogIn, LogOut, User, Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LanguageSelector from "@/components/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  {
    label: "Personal",
    href: "/personal",
    children: [
      { label: "Send money", href: "/personal/send", desc: "Transfer internationally" },
      { label: "Multi-currency wallet", href: "/personal/wallet", desc: "Hold and convert currencies" },
      { label: "Receive money", href: "/personal/receive", desc: "Get paid from anywhere" },
    ],
  },
  {
    label: "Business",
    href: "/business",
    children: [
      { label: "Pay suppliers", href: "/business/suppliers", desc: "Global supplier payments" },
      { label: "Receive payments", href: "/business/receive", desc: "Get paid internationally" },
      { label: "Batch payments", href: "/business/batch-payments", desc: "Pay multiple recipients" },
      { label: "API & integrations", href: "/business/api", desc: "Connect your systems" },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  { label: "Help", href: "/help" },
  { label: "Security", href: "/security" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border/70 bg-card/88 backdrop-blur-md transition-all duration-300 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="container-wide mx-auto flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3 text-foreground">
          <img
            src="/logo/logo.jpg"
            alt="Origin Wallet"
            className="h-10 w-10 rounded-xl object-contain"
          />
          <span className="hidden whitespace-nowrap sm:flex sm:flex-col sm:leading-none">
            <span className="text-[0.95rem] font-black tracking-tight text-accent">ORIGIN</span>
            <span className="text-[0.95rem] font-black tracking-tight text-foreground">WALLET</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to={item.href}
                className="flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
                {item.children && <ChevronDown className="h-3.5 w-3.5" />}
              </Link>

              <AnimatePresence>
                {item.children && activeDropdown === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1 w-72 rounded-xl border border-border bg-card p-2 shadow-xl"
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        className="block rounded-lg px-4 py-3 transition-colors hover:bg-muted"
                      >
                        <div className="text-sm font-semibold text-foreground">{child.label}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{child.desc}</div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-2">
          <LanguageSelector compact />
          <Link to="/pricing">
            <Button variant="ghost" size="sm" className="px-3">
              Compare fees
            </Button>
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/account/settings/profile">
                <Button variant="ghost" size="sm" className="max-w-[170px] gap-2 px-3">
                  <User className="h-4 w-4" />
                  <span className="truncate">{user.name || user.email?.split("@")[0] || "Profile"}</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 px-3">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="px-3">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="hero" size="sm" className="px-4">Get started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="xl:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-border bg-card xl:hidden"
          >
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
              <div className="mb-3 flex items-center gap-2">
                <Languages className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">Select language</span>
              </div>
              <div className="w-full">
                <LanguageSelector variant="mobile" />
              </div>
            </div>

            <nav className="space-y-1 px-4 py-4">
              {navItems.map((item) => (
                <div key={item.label}>
                  <Link
                    to={item.href}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.href}
                          className="block px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="space-y-2 pt-4">
                {user ? (
                  <>
                    <Link to="/account/settings/profile" className="block">
                      <Button variant="outline" className="w-full gap-2">
                        <User className="h-4 w-4" />
                        {user.name || user.email?.split("@")[0] || "Profile"}
                      </Button>
                    </Link>
                    <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block">
                      <Button variant="outline" className="w-full gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign in
                      </Button>
                    </Link>
                    <Link to="/register" className="block">
                      <Button variant="hero" className="w-full">Get started</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
