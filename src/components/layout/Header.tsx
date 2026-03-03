import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  {
    label: "Personal",
    href: "/personal",
    children: [
      { label: "Send money", href: "/personal", desc: "Transfer internationally" },
      { label: "Multi-currency wallet", href: "/personal", desc: "Hold and convert currencies" },
      { label: "Receive money", href: "/personal", desc: "Get paid from anywhere" },
    ],
  },
  {
    label: "Business",
    href: "/business",
    children: [
      { label: "Pay suppliers", href: "/business", desc: "Global supplier payments" },
      { label: "Receive payments", href: "/business", desc: "Get paid internationally" },
      { label: "Batch payments", href: "/business", desc: "Pay multiple recipients" },
      { label: "API & integrations", href: "/business", desc: "Connect your systems" },
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
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container-wide mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight text-foreground">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground text-sm font-black">
            O
          </div>
          ORIGIN WALLET
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to={item.href}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-md"
              >
                {item.label}
                {item.children && <ChevronDown className="w-3.5 h-3.5" />}
              </Link>

              <AnimatePresence>
                {item.children && activeDropdown === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 w-72 bg-card rounded-xl shadow-xl border border-border p-2 mt-1"
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        className="block px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="text-sm font-semibold text-foreground">{child.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{child.desc}</div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Globe className="w-4 h-4" />
            EN
          </button>
          <Link to="/pricing">
            <Button variant="ghost" size="sm">Compare fees</Button>
          </Link>
          <Link to="/contact">
            <Button variant="hero" size="sm">Get started</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border-b border-border overflow-hidden"
          >
            <nav className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <div key={item.label}>
                  <Link
                    to={item.href}
                    className="block px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="ml-4 space-y-1 mt-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.href}
                          className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 space-y-2">
                <Link to="/pricing" className="block">
                  <Button variant="outline" className="w-full">Compare fees</Button>
                </Link>
                <Link to="/contact" className="block">
                  <Button variant="hero" className="w-full">Get started</Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
