import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Send, Wallet, ArrowRight, CheckCircle2, Globe, CreditCard, ChevronRight, ArrowDownToLine } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const modules = [
  {
    id: "send",
    icon: Send,
    title: "Send money internationally",
    desc: "Transfer money to 170+ countries with the real exchange rate and low, transparent fees. No hidden markups.",
    benefits: [
      "Real mid-market exchange rate",
      "Low, upfront fees from 0.4%",
      "1–2 business day delivery on most routes",
      "Track your transfer in real time",
    ],
    steps: [
      "Enter the amount and choose your currencies",
      "Review the transparent fee breakdown",
      "Fund your transfer by bank or card",
      "Recipient gets the money in their account",
    ],
  },
  {
    id: "wallet",
    icon: Wallet,
    title: "Multi-currency wallet",
    desc: "Hold, convert, and manage money in 50+ currencies. Convert between currencies at the real rate whenever you need to.",
    benefits: [
      "Hold 50+ currencies in one place",
      "Convert at the mid-market rate",
      "Receive money like a local in multiple currencies",
      "No monthly fees on your wallet",
    ],
    steps: [
      "Open your multi-currency wallet",
      "Add money in any supported currency",
      "Convert between currencies instantly",
      "Spend or send from your balances",
    ],
  },
  {
    id: "receive",
    icon: ArrowDownToLine,
    title: "Receive money",
    desc: "Get local account details so people and businesses can pay you as if you were a local — even when you're not.",
    benefits: [
      "Local account details in multiple currencies",
      "Receive payments without conversion fees",
      "Ideal for freelancers and remote workers",
      "Funds land directly in your wallet",
    ],
    steps: [
      "Get your local account details",
      "Share them with whoever is paying you",
      "Receive money directly into your wallet",
      "Convert or hold in any currency",
    ],
  },
  {
    id: "spend",
    icon: CreditCard,
    title: "Spend globally",
    desc: "Use your wallet balance to spend in any currency. Always get the real exchange rate — no conversion surprises.",
    benefits: [
      "Spend in any currency from your wallet",
      "Real exchange rate at point of sale",
      "No foreign transaction fees",
      "Works online and in-store worldwide",
    ],
    steps: [
      "Load your wallet with any currency",
      "Spend directly from your balance",
      "Automatic conversion at the real rate",
      "Track all spending in your dashboard",
    ],
  },
];

const Personal = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto text-center">
          <motion.div {...fadeUp}>
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/20 text-accent rounded-full mb-4">
              Personal
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
              Your money, no borders
            </h1>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-8">
              Send, receive, hold, and spend money in 50+ currencies — all with the real exchange rate and transparent fees.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/contact">
                <Button variant="hero" size="lg">Get started <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
              <Link to="/pricing">
                <Button variant="hero-outline" size="lg">See pricing</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Modules */}
      {modules.map((mod, idx) => (
        <section key={mod.id} className={`section-padding ${idx % 2 === 0 ? "bg-background" : "bg-surface-subtle"}`}>
          <div className="container-wide mx-auto">
            <motion.div {...fadeUp} className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <mod.icon className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-3xl font-extrabold mb-4">{mod.title}</h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{mod.desc}</p>

                <h4 className="font-bold mb-3">Benefits</h4>
                <ul className="space-y-2 mb-8">
                  {mod.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="flex gap-3">
                  <Link to="/pricing"><Button variant="outline" size="sm">View fees</Button></Link>
                  <Link to="/contact"><Button variant="hero" size="sm">Get started</Button></Link>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-8">
                <h4 className="font-bold mb-4">How it works</h4>
                <div className="space-y-4">
                  {mod.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-sm font-bold text-accent">
                        {i + 1}
                      </div>
                      <p className="text-muted-foreground pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* FAQ */}
      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <h2 className="text-2xl font-extrabold mb-8 text-center">Common questions</h2>
          <div className="space-y-3 max-w-2xl mx-auto">
            {[
              { q: "Is there a minimum transfer amount?", a: "The minimum depends on the currency pair. In most cases, you can send as little as $10 USD equivalent." },
              { q: "How are exchange rates determined?", a: "We use the mid-market rate — the real exchange rate without any markup. This is the same rate you see on independent sources like Reuters." },
              { q: "Can I cancel a transfer?", a: "You can cancel a transfer before it has been processed. Once conversion begins, cancellation may not be possible." },
              { q: "What currencies can I hold?", a: "You can hold 50+ currencies in your multi-currency wallet. New currencies are added regularly." },
            ].map((faq, i) => (
              <details key={i} className="bg-card rounded-xl border border-border group">
                <summary className="px-6 py-4 cursor-pointer font-medium flex items-center justify-between list-none">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-6 pb-4 text-muted-foreground text-sm leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-hero text-primary-foreground text-center">
        <div className="container-tight mx-auto">
          <h2 className="text-3xl font-extrabold mb-4">Start moving money globally</h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            Join thousands using Origin Wallet for transparent international transfers.
          </p>
          <Link to="/contact">
            <Button variant="hero" size="lg">Get started <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Personal;
