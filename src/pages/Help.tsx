import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Send, DollarSign, Wallet, Building2, Shield, MessageCircle, ChevronRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const categories = [
  {
    icon: Send,
    title: "Transfers",
    articles: [
      { q: "How do I send money internationally?", a: "Enter the recipient's details, choose your currencies and amount, review the transparent fee breakdown, and confirm. Most transfers arrive in 1–2 business days." },
      { q: "How long does a transfer take?", a: "Most transfers are completed within 1–2 business days. Some routes may be faster depending on the destination and payment method." },
      { q: "Can I cancel a transfer?", a: "Transfers can be cancelled before they're processed. Once currency conversion has started, cancellation may not be possible. Contact support for help." },
      { q: "What payment methods can I use?", a: "You can fund transfers via bank transfer, debit card, or from your Origin Wallet balance. Available methods may vary by country." },
      { q: "Is there a transfer limit?", a: "Limits depend on your verification level and the corridor. Most routes support transfers from $10 to $1,000,000 equivalent." },
    ],
  },
  {
    icon: DollarSign,
    title: "Fees & rates",
    articles: [
      { q: "How much does a transfer cost?", a: "Our fees start from 0.4% of the transfer amount. The exact fee depends on the currency pair and payment method, and is always shown before you confirm." },
      { q: "What exchange rate do you use?", a: "We always use the mid-market rate — the real exchange rate without any markup. This is the same rate shown on Google, Reuters, and other independent sources." },
      { q: "Are there hidden fees?", a: "No. The service fee shown in our calculator is the only fee. We never mark up the exchange rate or add hidden charges." },
      { q: "How does your pricing compare to banks?", a: "Most banks add a margin of 2–5% to the exchange rate. With our transparent service fee (from 0.4%) and the real exchange rate, you typically save significantly." },
    ],
  },
  {
    icon: Wallet,
    title: "Wallet / account",
    articles: [
      { q: "What is the multi-currency wallet?", a: "It's a digital wallet that lets you hold, convert, and manage money in 50+ currencies. You can receive payments, convert between currencies at the real rate, and send money." },
      { q: "How do I add money to my wallet?", a: "You can add money via bank transfer, card payment, or by receiving funds from another Origin Wallet user or external source." },
      { q: "Is there a fee to hold currencies?", a: "No. There's no monthly fee or charge to hold currencies in your wallet. You only pay when you convert or send money." },
      { q: "Can I receive money in my wallet?", a: "Yes. You can get local account details in supported currencies so others can send you money directly." },
    ],
  },
  {
    icon: Building2,
    title: "Business",
    articles: [
      { q: "Is there a business account?", a: "Yes. Our business account offers features like batch payments, API access, roles and permissions, and dedicated support." },
      { q: "Can I pay multiple people at once?", a: "Yes. With batch payments, you can upload a CSV file and pay hundreds of recipients in a single transaction." },
      { q: "Do you offer an API?", a: "Yes. Our API lets you automate payments, check rates, manage transfers, and integrate with your existing systems." },
      { q: "How do team permissions work?", a: "You can assign different roles (admin, approver, viewer) to team members and set up custom approval workflows." },
    ],
  },
  {
    icon: Shield,
    title: "Security",
    articles: [
      { q: "How is my data protected?", a: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. We never store sensitive information in plain text." },
      { q: "What if I notice suspicious activity?", a: "Contact our support team immediately through the contact page. We'll investigate and take action to protect your account." },
      { q: "Do you require identity verification?", a: "Depending on the services and amounts involved, we may ask for identity verification. This is a standard practice to prevent fraud." },
    ],
  },
  {
    icon: MessageCircle,
    title: "Contact & support",
    articles: [
      { q: "How can I contact support?", a: "You can reach us through the contact page on our website. We aim to respond within 24 hours." },
      { q: "What are your support hours?", a: "Our support team is available Monday through Friday. Response times may vary depending on volume." },
      { q: "Can I request a call back?", a: "Yes. Fill out the contact form and select 'Request callback' as the subject. We'll get back to you as soon as possible." },
    ],
  },
];

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    articles: cat.articles.filter(
      (a) =>
        a.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.articles.length > 0);

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-tight mx-auto text-center">
          <motion.div {...fadeUp}>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">How can we help?</h1>
            <p className="text-primary-foreground/70 text-lg mb-8">
              Search our help center or browse by topic below.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-card text-foreground border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category tiles */}
      {!searchQuery && (
        <section className="section-padding bg-background">
          <div className="container-wide mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <motion.div key={cat.title} {...fadeUp}>
                  <a
                    href={`#${cat.title.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    className="block bg-card rounded-2xl border border-border p-8 hover:shadow-lg hover:border-accent/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                      <cat.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{cat.title}</h3>
                    <p className="text-sm text-muted-foreground">{cat.articles.length} articles</p>
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ sections */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-tight mx-auto">
          {filteredCategories.map((cat) => (
            <div key={cat.title} id={cat.title.toLowerCase().replace(/[^a-z]/g, "-")} className="mb-12 last:mb-0 scroll-mt-24">
              <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-3">
                <cat.icon className="w-6 h-6 text-accent" />
                {cat.title}
              </h2>
              <div className="space-y-3">
                {cat.articles.map((faq, i) => (
                  <details key={i} className="bg-card rounded-xl border border-border group">
                    <summary className="px-6 py-4 cursor-pointer font-medium flex items-center justify-between list-none">
                      {faq.q}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform shrink-0 ml-4" />
                    </summary>
                    <div className="px-6 pb-4 text-muted-foreground text-sm leading-relaxed">{faq.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No results found for "{searchQuery}"</p>
              <Link to="/contact" className="text-accent hover:underline font-medium">Contact support →</Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-background text-center">
        <div className="container-tight mx-auto">
          <h2 className="text-2xl font-extrabold mb-4">Still need help?</h2>
          <p className="text-muted-foreground mb-6">Our support team is here for you.</p>
          <Link to="/contact">
            <Button variant="hero">Contact support</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Help;
