import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CurrencyCalculator from "@/components/CurrencyCalculator";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, ArrowRight, Info } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const corridors = [
  { from: "USD", to: "EUR", amount: "1,000", fee: "4.00", rate: "0.9200", gets: "916.32" },
  { from: "GBP", to: "VND", amount: "500", fee: "2.00", rate: "31,500", gets: "15,681,000" },
  { from: "EUR", to: "USD", amount: "2,000", fee: "8.00", rate: "1.0870", gets: "2,165.36" },
  { from: "USD", to: "JPY", amount: "5,000", fee: "20.00", rate: "149.50", gets: "744,510" },
  { from: "AUD", to: "GBP", amount: "1,000", fee: "4.00", rate: "0.5160", gets: "513.94" },
];

const Pricing = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto text-center">
          <motion.div {...fadeUp}>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
              Transparent pricing. Always.
            </h1>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-4">
              We believe you should know exactly what you're paying — before you pay it. No hidden fees, no rate markups, no surprises.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How pricing works */}
      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold mb-4 text-center">How our pricing works</h2>
            <div className="text-muted-foreground space-y-4 leading-relaxed">
              <p>
                When you send money with Origin Wallet, you pay one small, transparent service fee. That's it.
              </p>
              <p>
                We don't mark up the exchange rate. You always get the <strong className="text-foreground">mid-market rate</strong> — the real rate that banks and financial institutions use between themselves. It's the same rate you'll find on independent sources like Google or Reuters.
              </p>
              <p>
                Traditional banks and money transfer services often advertise "zero fees" but hide their profit in the exchange rate. They give you a worse rate and pocket the difference. We don't do that. Our fee is upfront, and our rate is real.
              </p>
            </div>
          </motion.div>

          {/* Calculator */}
          <motion.div {...fadeUp} className="flex justify-center mb-16">
            <CurrencyCalculator expanded />
          </motion.div>

          {/* Example corridors */}
          <motion.div {...fadeUp}>
            <h3 className="text-2xl font-extrabold mb-6 text-center">Example transfers</h3>
            <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">
              Here are some example transfers to show you how our pricing works in practice. Actual rates and fees may vary.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full max-w-3xl mx-auto text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">You send</th>
                    <th className="pb-3 font-medium">Fee</th>
                    <th className="pb-3 font-medium">Rate</th>
                    <th className="pb-3 font-medium">Recipient gets</th>
                  </tr>
                </thead>
                <tbody>
                  {corridors.map((c, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 font-medium">{c.amount} {c.from}</td>
                      <td className="py-3 text-muted-foreground">{c.fee} {c.from}</td>
                      <td className="py-3 text-accent font-medium">1 {c.from} = {c.rate} {c.to}</td>
                      <td className="py-3 font-bold">{c.gets} {c.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground/60 text-center mt-4">
              Rates and fees shown are illustrative examples. Actual amounts depend on the corridor, amount, and market conditions at the time of transfer.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Real rate vs marked up */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold mb-4">Real rate vs. marked-up rate</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Most providers make money by offering you a worse exchange rate than the real one. 
                The difference between what they give you and the actual mid-market rate is their hidden profit.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                With Origin Wallet, you always get the mid-market rate. Our only revenue comes from the transparent service fee you see before confirming.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h4 className="font-bold mb-3 text-accent">Origin Wallet</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Exchange rate</span><span className="font-medium">1 USD = 0.9200 EUR (mid-market)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span className="font-medium">$4.00</span></div>
                  <div className="flex justify-between border-t border-border pt-2"><span className="font-medium">You get</span><span className="font-bold text-accent">€916.32 EUR</span></div>
                </div>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6 opacity-70">
                <h4 className="font-bold mb-3 text-muted-foreground">Traditional provider</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Exchange rate</span><span className="font-medium">1 USD = 0.8900 EUR (marked up)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Transfer fee</span><span className="font-medium">$15.00</span></div>
                  <div className="flex justify-between border-t border-border pt-2"><span className="font-medium">You get</span><span className="font-bold">€876.85 EUR</span></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                That's a difference of <strong className="text-foreground">€39.47</strong> on a $1,000 transfer.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <h2 className="text-2xl font-extrabold mb-8 text-center">Pricing FAQ</h2>
          <div className="space-y-3 max-w-2xl mx-auto">
            {[
              { q: "Are there any hidden fees?", a: "No. The service fee shown in our calculator is the only fee you'll pay. We don't mark up the exchange rate." },
              { q: "What is the mid-market rate?", a: "It's the midpoint between the buy and sell price of two currencies on the global market. It's the fairest rate, used by banks among themselves." },
              { q: "Do fees vary by currency?", a: "Fees may vary slightly depending on the currency pair and payment method. The exact fee is always shown before you confirm." },
              { q: "Is there a minimum or maximum transfer?", a: "Minimums and maximums depend on the corridor. Most routes support transfers from $10 to $1,000,000 equivalent." },
              { q: "How does Origin Wallet make money?", a: "Through the transparent service fee. That's it. We don't profit from exchange rate markups." },
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
          <p className="text-xs text-muted-foreground/60 text-center mt-8 max-w-lg mx-auto">
            All pricing information on this page is for illustrative purposes. Actual fees and rates are determined at the time of transfer and may vary.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-hero text-primary-foreground text-center">
        <div className="container-tight mx-auto">
          <h2 className="text-3xl font-extrabold mb-4">See how much you could save</h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            Try our calculator and compare with what you're currently paying.
          </p>
          <Link to="/contact">
            <Button variant="hero" size="lg">Get started <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
