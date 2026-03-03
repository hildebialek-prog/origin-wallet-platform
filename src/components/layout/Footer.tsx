import { Link } from "react-router-dom";

const footerLinks = {
  Products: [
    { label: "Personal", href: "/personal" },
    { label: "Business", href: "/business" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Security", href: "/security" },
    { label: "Contact", href: "/contact" },
  ],
  Support: [
    { label: "Help center", href: "/help" },
    { label: "FAQs", href: "/help" },
  ],
  Legal: [
    { label: "Privacy policy", href: "/policies#privacy" },
    { label: "Terms of service", href: "/policies#terms" },
    { label: "Disclaimer", href: "/policies#disclaimer" },
  ],
};

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-wide mx-auto section-padding">
        {/* Top */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 font-extrabold text-lg mb-3">
              <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-accent-foreground text-xs font-black">
                O
              </div>
              ORIGIN WALLET
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
              Move and manage money globally with full transparency. Low fees, real exchange rates.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm mb-4 text-primary-foreground/90">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-primary-foreground/10 pt-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="text-xs text-primary-foreground/50 leading-relaxed max-w-2xl">
              <p className="mb-2">
                A platform by <strong className="text-primary-foreground/70">KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY</strong>
              </p>
              <p>
                ORIGIN WALLET is a financial technology platform. Services described on this website are for informational purposes. 
                ORIGIN WALLET does not claim to hold any specific licenses or regulatory approvals unless explicitly stated. 
                Fees and exchange rates shown are illustrative and may vary.
              </p>
            </div>
            <div className="text-xs text-primary-foreground/40">
              © {new Date().getFullYear()} ORIGIN WALLET. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
