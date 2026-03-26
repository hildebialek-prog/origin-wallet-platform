import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const sections = [
  {
    id: "privacy",
    title: "Privacy Policy",
    content: [
      { heading: "1. Introduction", text: "This Privacy Policy describes how the operator of the Origin Wallet platform (\"we\", \"us\", \"our\") collects, uses, and protects your personal information when you use our services." },
      { heading: "2. Information We Collect", text: "We may collect personal information you provide directly, such as your name, email address, phone number, and financial information necessary to process transactions. We also collect technical data such as IP addresses, browser type, and usage patterns to improve our services." },
      { heading: "3. How We Use Your Information", text: "We use your information to provide and improve our services, process transactions, communicate with you, comply with legal obligations, and prevent fraud. We do not sell your personal information to third parties." },
      { heading: "4. Data Sharing", text: "We share your information only with trusted service providers who assist us in operating our platform, processing transactions, or complying with legal requirements. All third parties are bound by strict data protection agreements." },
      { heading: "5. Data Security", text: "We implement industry-standard security measures including encryption, access controls, and regular security audits to protect your personal information from unauthorized access, alteration, or disclosure." },
      { heading: "6. Your Rights", text: "Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict processing of your personal data. Contact us to exercise these rights." },
      { heading: "7. Cookies", text: "We use cookies and similar technologies to improve your experience, analyze usage, and personalize content. You can manage cookie preferences through your browser settings." },
      { heading: "8. Changes to This Policy", text: "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our website or sending you a direct notification." },
      { heading: "9. Contact", text: "For questions about this Privacy Policy, please contact us through the contact page on our website or by email at info@khoinguyentechnology.com." },
    ],
  },
  {
    id: "terms",
    title: "Terms of Service",
    content: [
      { heading: "1. Agreement", text: "By accessing or using Origin Wallet services, you agree to be bound by these Terms of Service. Origin Wallet is operated by KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY. If you do not agree to these terms, please do not use our services." },
      { heading: "2. Services", text: "Origin Wallet provides a technology platform for international money transfers and multi-currency management. Services described on our website are subject to availability and may vary by jurisdiction." },
      { heading: "3. Eligibility", text: "You must be at least 18 years old and legally capable of entering into contracts to use our services. We may require identity verification depending on the services and amounts involved." },
      { heading: "4. User Responsibilities", text: "You are responsible for providing accurate information, maintaining the security of your account credentials, and complying with applicable laws. You must not use our services for illegal activities." },
      { heading: "5. Fees and Pricing", text: "Our fees are displayed transparently before you confirm any transaction. Fees and exchange rates may vary depending on the currency pair, payment method, and transaction amount. All pricing shown on our website is illustrative and subject to change." },
      { heading: "6. Transfers", text: "Transfer times are estimates and may vary. We are not responsible for delays caused by third-party financial institutions, compliance checks, or circumstances beyond our control." },
      { heading: "7. Limitation of Liability", text: "To the maximum extent permitted by law, the operator of the Origin Wallet platform shall not be liable for indirect, incidental, or consequential damages arising from the use of our services." },
      { heading: "8. Intellectual Property", text: "All content, trademarks, and intellectual property on the Origin Wallet platform are owned by or licensed to the platform operator." },
      { heading: "9. Governing Law", text: "These Terms of Service shall be governed by applicable laws and regulations of Viet Nam unless otherwise stated in a specific agreement." },
      { heading: "10. Changes", text: "We reserve the right to modify these Terms at any time. Continued use of our services after changes constitutes acceptance of the updated Terms." },
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    content: [
      { heading: "General", text: "The information provided on the Origin Wallet website is for general informational purposes only. While we strive to keep the information accurate and up-to-date, we make no representations or warranties of any kind about the completeness, accuracy, or reliability of the information." },
      { heading: "Not Financial Advice", text: "Nothing on this website constitutes financial, legal, or professional advice. You should consult appropriate professionals before making financial decisions based on information found on our platform." },
      { heading: "Exchange Rates and Fees", text: "Exchange rates and fees displayed on our website are illustrative and may differ from actual rates at the time of your transaction. Final amounts will always be confirmed before you proceed with any transfer." },
      { heading: "Regulatory Status", text: "Regulatory treatment, service scope, and availability may vary by jurisdiction. Any specific licenses, approvals, or regulated service relationships should be understood only as explicitly stated by the platform operator." },
      { heading: "Third-Party Links", text: "Our website may contain links to third-party websites. We are not responsible for the content or privacy practices of these external sites." },
      { heading: "Service Availability", text: "We do not guarantee uninterrupted access to our services. We may modify, suspend, or discontinue any aspect of our services at any time without notice." },
      { heading: "Platform Operator", text: "Origin Wallet is operated by KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY, Tax ID 0111409165, with registered address at So 23 ngach 157/6 Duc Giang, To 18, Phuong Viet Hung, Ha Noi, Viet Nam. Legal obligations and liabilities relating to the platform rest with that operating entity." },
    ],
  },
];

const Policies = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("privacy");
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && sections.find((s) => s.id === hash)) {
      setActiveSection(hash);
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  useEffect(() => {
    const onScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      <div className="fixed top-16 left-0 right-0 z-40 h-0.5 bg-border">
        <div className="h-full bg-accent transition-all duration-150" style={{ width: `${scrollProgress}%` }} />
      </div>

      <section className="bg-hero text-primary-foreground section-padding pb-8">
        <div className="container-tight mx-auto text-center">
          <h1 className="text-4xl font-extrabold mb-2">Legal & Policies</h1>
          <p className="text-primary-foreground/70">
            Origin Wallet legal and policy information
          </p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <div className="grid lg:grid-cols-4 gap-12">
            <div className="lg:col-span-1">
              <nav className="sticky top-24 space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === s.id
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {s.title}
                  </a>
                ))}
                <div className="border-t border-border mt-4 pt-4">
                  <button
                    onClick={() => window.print()}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4"
                  >
                    Print this page
                  </button>
                </div>
              </nav>
            </div>

            <div className="lg:col-span-3 space-y-16">
              {sections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-3xl font-extrabold mb-8 border-b border-border pb-4">{section.title}</h2>
                  <div className="space-y-8">
                    {section.content.map((item, i) => (
                      <div key={i}>
                        <h3 className="text-lg font-bold mb-2">{item.heading}</h3>
                        <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t border-border pt-8">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These documents are maintained for the Origin Wallet platform operated by KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY, Tax ID 0111409165. Last updated: March 2026. For questions about these policies, please visit our contact page or email info@khoinguyentechnology.com.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Policies;
