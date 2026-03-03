import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CurrencyCalculator from "@/components/CurrencyCalculator";
import { motion } from "framer-motion";
import {
  Shield, Globe, Zap, Users, ArrowRight, Star, CheckCircle2,
  TrendingUp, Building2, Wallet, CreditCard, BarChart3, Send,
  ChevronRight, Quote
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 },
};

const Index = () => {
  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-hero min-h-[90vh] flex items-center">
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/80" />

        <div className="relative z-10 container-wide mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div {...fadeUp}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-[1.1] mb-6">
                Move money globally.{" "}
                <span className="text-gradient">No hidden fees.</span>
              </h1>
              <p className="text-lg sm:text-xl text-primary-foreground/70 mb-8 max-w-lg leading-relaxed">
                Send, receive, and manage money across borders with the real exchange rate. 
                Always transparent. Always fair.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/contact">
                  <Button variant="hero" size="lg" className="text-base px-8">
                    Get started <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="hero-outline" size="lg" className="text-base px-8">
                    Compare fees
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
              <CurrencyCalculator />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <section className="bg-card border-b border-border">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "170+", label: "Countries supported", icon: Globe },
              { value: "50+", label: "Currencies available", icon: Wallet },
              { value: "4.7★", label: "Average user rating", icon: Star },
              { value: "256-bit", label: "Encryption standard", icon: Shield },
            ].map((stat) => (
              <motion.div key={stat.label} {...fadeUp} className="flex flex-col items-center gap-2">
                <stat.icon className="w-6 h-6 text-accent" />
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== REAL EXCHANGE RATE ===== */}
      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center mb-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
              Transparent pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              The real exchange rate. Always.
            </h2>
            <p className="text-muted-foreground text-lg">
              Banks and traditional providers hide fees in inflated exchange rates. We don't. 
              You always get the mid-market rate — the one you see on Google or Reuters.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Mid-market rate",
                desc: "The real rate, midpoint between buy and sell. No markup, no surprises.",
                icon: TrendingUp,
              },
              {
                title: "Upfront fees",
                desc: "One small, clear fee shown before you send. That's it — nothing hidden.",
                icon: CheckCircle2,
              },
              {
                title: "Rate alerts",
                desc: "Set your target rate and we'll notify you when it's time to transfer.",
                icon: BarChart3,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-card rounded-2xl border border-border p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== TRANSPARENT FEES ===== */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
                No surprises
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                See every cent before you send
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                We break down every transfer into clear line items: the amount you send, our service fee, 
                the exchange rate, and exactly what your recipient gets. No fine print.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Service fee always shown upfront",
                  "No rate markups or hidden charges",
                  "Full breakdown before confirmation",
                  "Guaranteed delivery estimate",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/pricing">
                <Button variant="hero">
                  See our pricing <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8">
              <h4 className="font-bold mb-4">Example: Sending $1,000 USD → EUR</h4>
              <div className="space-y-3">
                {[
                  { label: "You send", value: "$1,000.00 USD" },
                  { label: "Service fee", value: "−$4.00 USD", sub: "0.4% fee" },
                  { label: "Amount we convert", value: "$996.00 USD" },
                  { label: "Exchange rate", value: "1 USD = 0.9200 EUR", highlight: true },
                  { label: "Recipient gets", value: "€916.32 EUR", bold: true },
                ].map((row) => (
                  <div key={row.label} className={`flex justify-between items-center py-2 ${row.bold ? "border-t border-border pt-3" : ""}`}>
                    <span className="text-muted-foreground text-sm">{row.label}</span>
                    <span className={`text-sm ${row.bold ? "font-bold text-lg text-foreground" : row.highlight ? "text-accent font-medium" : "font-medium text-foreground"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
              Simple process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Three steps. That's it.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Moving money globally shouldn't be complicated. Here's how it works.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create your transfer",
                desc: "Choose the amount, pick your currencies, and see the exact cost upfront. No account needed to check rates.",
                icon: Send,
              },
              {
                step: "02",
                title: "Fund your transfer",
                desc: "Pay by bank transfer, card, or wallet balance. We'll start converting as soon as we receive your funds.",
                icon: Wallet,
              },
              {
                step: "03",
                title: "Money arrives",
                desc: "Your recipient gets the money directly in their bank account. Track every step in real time.",
                icon: CheckCircle2,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative bg-card rounded-2xl border border-border p-8 text-center"
              >
                <div className="text-5xl font-extrabold text-accent/15 mb-4">{item.step}</div>
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOR PEOPLE / FOR BUSINESSES ===== */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Built for everyone</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Whether you're sending money home or managing international business payments.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div {...fadeUp} className="bg-card rounded-2xl border border-border p-10">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-3">For people</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Send money internationally, hold multiple currencies, and spend abroad — all with transparent fees and the real exchange rate.
              </p>
              <ul className="space-y-2 mb-8">
                {["International transfers", "Multi-currency wallet", "Receive money globally", "Spend in any currency"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/personal">
                <Button variant="hero">Personal account <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </motion.div>

            <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border p-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">For businesses</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Pay suppliers, receive payments, and manage international finances — with batch payments, API access, and team controls.
              </p>
              <ul className="space-y-2 mb-8">
                {["Global supplier payments", "Batch payouts", "API & integrations", "Roles & permissions"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/business">
                <Button>Business account <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== PRODUCT SUITE ===== */}
      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Everything you need</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A complete platform for managing money across borders.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Send money", desc: "Fast international transfers with transparent pricing.", icon: Send, href: "/personal" },
              { title: "Multi-currency wallet", desc: "Hold and convert 50+ currencies instantly.", icon: Wallet, href: "/personal" },
              { title: "Business payments", desc: "Pay suppliers and contractors worldwide.", icon: Building2, href: "/business" },
              { title: "Batch transfers", desc: "Send to hundreds of recipients at once.", icon: BarChart3, href: "/business" },
              { title: "Real-time rates", desc: "Always the mid-market rate. No markup.", icon: TrendingUp, href: "/pricing" },
              { title: "Enterprise security", desc: "Bank-grade encryption and fraud prevention.", icon: Shield, href: "/security" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={item.href}
                  className="block bg-card rounded-2xl border border-border p-7 hover:shadow-lg hover:border-accent/30 transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <item.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-bold text-lg mb-1.5">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GLOBAL COVERAGE ===== */}
      <section className="section-padding bg-hero text-primary-foreground">
        <div className="container-wide mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Global coverage</h2>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-12">
              Send money to 170+ countries in 50+ currencies. We're expanding coverage every month.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-w-3xl mx-auto">
            {[
              { flag: "🇺🇸", name: "USD" }, { flag: "🇪🇺", name: "EUR" }, { flag: "🇬🇧", name: "GBP" },
              { flag: "🇯🇵", name: "JPY" }, { flag: "🇦🇺", name: "AUD" }, { flag: "🇨🇦", name: "CAD" },
              { flag: "🇸🇬", name: "SGD" }, { flag: "🇻🇳", name: "VND" }, { flag: "🇮🇳", name: "INR" },
              { flag: "🇧🇷", name: "BRL" }, { flag: "🇰🇷", name: "KRW" }, { flag: "🇲🇽", name: "MXN" },
            ].map((cur) => (
              <div key={cur.name} className="bg-primary-foreground/5 rounded-xl p-4 flex flex-col items-center gap-2">
                <span className="text-2xl">{cur.flag}</span>
                <span className="text-sm font-medium text-primary-foreground/80">{cur.name}</span>
              </div>
            ))}
          </motion.div>
          <p className="text-primary-foreground/40 text-sm mt-8">...and many more</p>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">What people say</h2>
            <p className="text-muted-foreground text-lg">Real feedback from real users.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "Finally a platform that shows me exactly what I'm paying. No more guessing with hidden bank fees.",
                name: "Sarah M.",
                role: "Freelancer",
              },
              {
                quote: "We switched our supplier payments to Origin Wallet and saved thousands in hidden markup fees per quarter.",
                name: "David L.",
                role: "CFO, Tech Startup",
              },
              {
                quote: "The multi-currency wallet is a game changer. I hold USD, EUR, and VND without converting back and forth.",
                name: "Minh T.",
                role: "Digital Nomad",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-8"
              >
                <Quote className="w-8 h-8 text-accent/30 mb-4" />
                <p className="text-foreground mb-6 leading-relaxed">{t.quote}</p>
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA + FAQ PREVIEW ===== */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-tight mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Ready to move money the fair way?
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto mb-8">
              Join thousands of people and businesses who trust Origin Wallet for transparent, low-cost international transfers.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <Link to="/contact">
                <Button variant="hero" size="lg" className="text-base px-8">
                  Get started <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg" className="text-base px-8">
                  Compare fees
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* FAQ Preview */}
          <motion.div {...fadeUp} className="text-left max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-6 text-center">Common questions</h3>
            <div className="space-y-4">
              {[
                {
                  q: "How much does it cost to send money?",
                  a: "Our fees start from as low as 0.4% of the transfer amount. You'll always see the exact fee before confirming.",
                },
                {
                  q: "How long does a transfer take?",
                  a: "Most transfers arrive within 1–2 business days. Some routes are even faster.",
                },
                {
                  q: "Is my money safe?",
                  a: "We use bank-grade encryption and follow strict security practices. Your funds and data are protected at every step.",
                },
              ].map((faq, i) => (
                <details key={i} className="bg-card rounded-xl border border-border group">
                  <summary className="px-6 py-4 cursor-pointer text-foreground font-medium flex items-center justify-between list-none">
                    {faq.q}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 pb-4 text-muted-foreground text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link to="/help" className="text-accent hover:underline text-sm font-medium">
                View all FAQs →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
