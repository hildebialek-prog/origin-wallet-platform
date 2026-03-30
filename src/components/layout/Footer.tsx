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
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 mb-4 md:col-span-4 lg:col-span-1 lg:mb-0">
            <div className="mb-3 flex items-center gap-2 text-lg font-extrabold">
              <img
                src="/logo/logo.jpg"
                alt="Origin Wallet"
                className="h-7 w-7 rounded-md object-contain"
              />
              <span className="hidden lg:inline">
                <span className="text-accent">ORIGIN</span> WALLET
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/70">
              Embedded finance and cross-border payment workflows for businesses, operators, and
              integration-led platforms.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold text-primary-foreground/90">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-primary-foreground/10 pt-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="max-w-2xl text-xs leading-relaxed text-primary-foreground/50">
              <p className="mb-2">
                Operated by{" "}
                <strong className="text-primary-foreground/70">
                  KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY
                </strong>
              </p>
              <p>
                Legal entity: CONG TY CO PHAN CONG NGHE KHOI NGUYEN. Tax ID: 0111409165.
                Registered address: So 23 ngach 157/6 Duc Giang, To 18, Phuong Viet Hung,
                Ha Noi, Viet Nam. Contact:{" "}
                <a
                  href="mailto:info@khoinguyentechnology.com"
                  className="text-primary-foreground/70 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline"
                >
                  info@khoinguyentechnology.com
                </a>
                . Origin Wallet is a financial technology platform focused on provider-connected
                cross-border payment workflows. Service availability, regulatory treatment, and
                scope may vary by jurisdiction. The platform is currently onboarding early users
                and expanding provider integrations, including support for providers such as
                Airwallex, Wise, and Currenxie where available.
              </p>
            </div>
            <div className="text-xs text-primary-foreground/40">
              Copyright {new Date().getFullYear()} KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
