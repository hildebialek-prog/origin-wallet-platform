import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessFeatures, fadeUp } from "@/pages/business/business-content";

const Business = () => {
  return (
    <div>
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
            <span className="mb-4 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Business
            </span>
            <h1 className="mb-5 text-4xl font-extrabold sm:text-5xl lg:text-6xl">
              Unified financial workflows across multiple providers
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-primary-foreground/72">
              Explore business journeys built around supplier payments, collections, payout
              operations, and integration-led financial workflows with clearer provider
              orchestration and operational visibility.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/contact">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Talk to sales
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="hero-outline" size="lg" className="w-full sm:w-auto">
                  Compare pricing
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-primary-foreground/80">
              {[
                "Multi-provider connectivity",
                "API-led finance workflows",
                "Balances, payouts, and collections",
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
          <motion.div
            {...fadeUp}
            className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-accent">
                Explore Business
              </p>
              <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
                Four business journeys mapped to real operating workflows
              </h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Each page is shaped around a specific business use case, so the platform reads
              more like a finance operations product than a generic payment brochure.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            {businessFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <motion.article
                  key={feature.id}
                  {...fadeUp}
                  className="group rounded-[28px] border border-border bg-card p-7 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_-42px_rgba(15,23,42,0.75)]"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
                    {feature.navLabel}
                  </p>
                  <h3 className="mb-3 text-2xl font-extrabold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mb-6 text-base leading-relaxed text-muted-foreground">
                    {feature.sectionDescription}
                  </p>

                  <div className="mb-7 space-y-3">
                    {feature.benefits.slice(0, 3).map((benefit) => (
                      <div key={benefit} className="flex items-start gap-3 text-sm text-foreground/85">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to={`/business/${feature.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    View this flow
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <motion.div {...fadeUp}>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              How It Works
            </p>
            <h2 className="mb-4 text-3xl font-extrabold text-foreground sm:text-4xl">
              A clearer operating model for cross-border finance teams
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              The business experience is designed to connect provider onboarding, balance
              visibility, payment execution, and finance workflow reviews into one cleaner
              platform layer.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect providers",
                desc: "Set up provider relationships and onboarding entry points from one business experience.",
              },
              {
                step: "02",
                title: "View balances and workflows",
                desc: "Monitor balances, statuses, and operational steps with better visibility.",
              },
              {
                step: "03",
                title: "Send and receive payments",
                desc: "Run payouts, collections, and recipient flows through structured finance journeys.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-[26px] border border-border bg-card p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.45)]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-extrabold text-foreground">{item.title}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <motion.div {...fadeUp}>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              Who We Serve
            </p>
            <h2 className="mb-4 text-3xl font-extrabold text-foreground sm:text-4xl">
              Built for teams with real cross-border workflow complexity
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              The business platform is positioned for teams that need more than a basic wallet:
              companies, platforms, and product-led operators coordinating payments across
              multiple corridors, providers, and internal workflows.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "SMEs",
                desc: "Supplier payments, finance operations, and treasury visibility across markets.",
              },
              {
                title: "eCommerce",
                desc: "Merchant flows, payouts, and recipient management across international corridors.",
              },
              {
                title: "SaaS",
                desc: "Platform experiences that need API integrations and provider-connected finance workflows.",
              },
            ].map((segment) => (
              <div
                key={segment.title}
                className="rounded-[24px] border border-border bg-background p-6 shadow-[0_16px_50px_-38px_rgba(15,23,42,0.55)]"
              >
                <h3 className="mb-2 text-lg font-extrabold text-foreground">{segment.title}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{segment.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <motion.div {...fadeUp}>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              Built For Operational Teams
            </p>
            <h2 className="mb-4 text-3xl font-extrabold text-foreground sm:text-4xl">
              A business section that now reads like a finance platform
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              The business area now separates outbound payments, inbound collections,
              payout workflows, and integration capabilities into clearer journeys that are
              easier to understand, present, and review with partners.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="rounded-[28px] border border-border bg-background p-8 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.6)]"
          >
            <h3 className="mb-5 text-xl font-extrabold text-foreground">Business flow map</h3>
            <div className="space-y-4">
              {businessFeatures.map((feature, index) => (
                <div key={feature.id} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{feature.navLabel}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.navDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Business;
