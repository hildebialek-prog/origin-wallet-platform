import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Layers3,
  Network,
  RefreshCw,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CurrencyCalculator from "@/components/CurrencyCalculator";
import useExchangeRates from "@/hooks/useExchangeRates";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const corridorExamples = [
  { from: "USD", to: "EUR", amount: 1000 },
  { from: "GBP", to: "VND", amount: 500 },
  { from: "EUR", to: "USD", amount: 2000 },
  { from: "USD", to: "JPY", amount: 5000 },
  { from: "AUD", to: "GBP", amount: 1000 },
];

const Pricing = () => {
  const { loading, lastUpdated, getCorridorData, refreshRates } = useExchangeRates();

  const formatLiveTimestamp = (value: string | null) => {
    if (!value) return "Loading...";
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div>
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto text-center">
          <motion.div {...fadeUp}>
            <h1 className="mb-4 text-4xl font-extrabold sm:text-5xl">
              Pricing visibility across global payment workflows
            </h1>
            <p className="mx-auto mb-4 max-w-3xl text-lg leading-relaxed text-primary-foreground/70">
              Origin Wallet is designed to surface pricing, rates, and transfer outcomes more
              clearly across provider-connected financial workflows. The examples below are
              illustrative and intended to show how fee visibility should feel inside the product.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-primary-foreground/80">
              {[
                "Illustrative pricing views",
                "Provider-aware workflow design",
                "Balances, quotes, and transfers",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/12 bg-white/5 px-4 py-2 backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl">
            <h2 className="mb-4 text-center text-3xl font-extrabold">
              How pricing visibility works
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Origin Wallet is designed to show transfer economics in a clearer, more structured
                way before a payment is submitted.
              </p>
              <p>
                Public examples on this page are based on live reference rates and are shown as
                illustrative pricing previews. Final provider quotes, fees, and outcomes depend on
                the corridor, provider, timing, and workflow used at execution time.
              </p>
              <p>
                The goal is simple: make rates, fees, and recipient outcomes easier to review across
                global payment workflows instead of hiding the commercial logic behind unclear steps.
              </p>
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="mb-16 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Layers3,
                title: "Quote visibility",
                desc: "See pricing inputs, fees, and expected outcomes in one structured review flow.",
              },
              {
                icon: Network,
                title: "Provider context",
                desc: "Pricing behavior can vary by provider, corridor, and transfer configuration.",
              },
              {
                icon: Workflow,
                title: "Operational clarity",
                desc: "Teams should be able to understand rates before they move money, not after.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-border bg-card p-7 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.45)]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-extrabold text-foreground">{item.title}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp} className="mb-16 flex justify-center">
            <CurrencyCalculator expanded />
          </motion.div>

          <motion.div {...fadeUp}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-center text-2xl font-extrabold">
                Illustrative live reference rates
              </h3>
              <div className="flex items-center gap-2">
                {loading ? (
                  <span className="text-sm text-muted-foreground">Updating...</span>
                ) : (
                  <button
                    onClick={refreshRates}
                    className="flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </button>
                )}
              </div>
            </div>
            <p className="mx-auto mb-2 max-w-lg text-center text-muted-foreground">
              Here are example corridors shown with live reference rates and an illustrative fee
              model.
            </p>
            <p className="mb-6 text-center text-xs text-muted-foreground">
              Last updated: {formatLiveTimestamp(lastUpdated)} (auto refresh every 1m)
            </p>

            <div className="overflow-x-auto">
              <table className="mx-auto w-full max-w-3xl text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">You send</th>
                    <th className="pb-3 font-medium">Illustrative fee</th>
                    <th className="pb-3 font-medium">Reference rate</th>
                    <th className="pb-3 font-medium">Recipient gets</th>
                  </tr>
                </thead>
                <tbody>
                  {corridorExamples.map((c, i) => {
                    const data = getCorridorData(c.from, c.to, c.amount);

                    return (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-3 font-medium">
                          {c.amount.toLocaleString()} {c.from}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {data ? `${data.fee} ${c.from}` : <span className="text-muted-foreground/50">--</span>}
                        </td>
                        <td className="py-3 font-medium text-accent">
                          1 {c.from} ={" "}
                          {data ? `${data.rate} ${c.to}` : <span className="text-muted-foreground/50">--</span>}
                        </td>
                        <td className="py-3 font-bold">
                          {data ? `${data.gets} ${c.to}` : <span className="text-muted-foreground/50">--</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground/70">
              Rates shown are live reference rates used for illustrative pricing examples. Final
              provider quotes and transfer outcomes depend on corridor, amount, provider behavior,
              and market conditions at execution time.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-extrabold">
                Clear review flow vs. opaque pricing flow
              </h2>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                The real product difference is not just the number itself, but whether a user or
                operator can understand the pricing logic before submitting a transfer.
              </p>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                Origin Wallet is being shaped around structured review states, clearer fee
                visibility, and workflow transparency so transfer economics are easier to validate
                and explain.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h4 className="mb-3 font-bold text-accent">Origin Wallet review model</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference rate</span>
                    <span className="font-medium">1 USD = 0.9200 EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Illustrative fee</span>
                    <span className="font-medium">$4.00</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-medium">Expected outcome</span>
                    <span className="font-bold text-accent">EUR 916.32</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 opacity-70">
                <h4 className="mb-3 font-bold text-muted-foreground">Opaque provider experience</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate logic</span>
                    <span className="font-medium">Not clearly surfaced</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee logic</span>
                    <span className="font-medium">Spread across multiple steps</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-medium">Operator confidence</span>
                    <span className="font-bold">Lower review clarity</span>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                The point is visibility: clearer review states help users and teams understand the
                transfer before money moves.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <h2 className="mb-8 text-center text-2xl font-extrabold">Pricing FAQ</h2>
          <div className="mx-auto max-w-2xl space-y-3">
            {[
              {
                q: "What is shown on this page?",
                a: "This page shows illustrative pricing views based on live reference rates. It is designed to demonstrate how pricing visibility works inside the platform.",
              },
              {
                q: "Do fees vary by corridor?",
                a: "Yes. Final fees and quote outcomes can vary depending on the provider, corridor, transfer type, amount, and timing.",
              },
              {
                q: "Are these final provider quotes?",
                a: "No. Final provider quotes are determined at execution time inside the authenticated transfer workflow.",
              },
              {
                q: "How does Origin Wallet make money?",
                a: "Commercial models may vary by workflow, provider setup, and product configuration. The platform is designed to surface pricing clearly rather than obscure it.",
              },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-medium">
                  {faq.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-lg text-center text-xs text-muted-foreground/60">
            Pricing information on this page is illustrative. Live reference rates do not represent
            a final provider quote, commitment to service availability, or a binding transfer
            offer.
          </p>
        </div>
      </section>

      <section className="bg-hero section-padding text-center text-primary-foreground">
        <div className="container-tight mx-auto">
          <h2 className="mb-4 text-3xl font-extrabold">
            Explore pricing visibility in context
          </h2>
          <p className="mx-auto mb-8 max-w-md text-primary-foreground/70">
            Review the calculator, compare example corridors, and talk with us about
            provider-connected financial workflows.
          </p>
          <Link to="/contact">
            <Button variant="hero" size="lg">
              Get started <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
