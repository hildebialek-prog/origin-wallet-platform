import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, personalFeatures } from "@/pages/personal/personal-content";

const Personal = () => {
  return (
    <div>
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
            <span className="mb-4 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Personal
            </span>
            <h1 className="mb-5 text-4xl font-extrabold sm:text-5xl lg:text-6xl">
              Personal money movement, shaped for cross-border life
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-primary-foreground/72">
              Explore the personal side of Origin Wallet across sending, wallet management,
              and receiving flows. Each experience is designed to feel clearer, calmer, and
              easier to navigate within a broader cross-border financial platform.
            </p>
            <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-sm text-primary-foreground/80">
              {[
                "Consumer journeys",
                "Cross-border transfers",
                "Wallet and receive flows",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/12 bg-white/5 px-4 py-2 backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/contact">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Get started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="hero-outline" size="lg" className="w-full sm:w-auto">
                  Compare pricing
                </Button>
              </Link>
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
                Explore Personal
              </p>
              <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
                Three focused journeys instead of one crowded page
              </h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Choose the flow that matches how you use money across borders, then go deeper
              into the details, benefits, and common questions for that experience.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            {personalFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <motion.article
                  key={feature.id}
                  {...fadeUp}
                  className="group rounded-[28px] border border-border bg-card p-7 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_-42px_rgba(15,23,42,0.75)]"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                    <Icon className="h-7 w-7 text-accent" />
                  </div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-accent/80">
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
                    to={`/personal/${feature.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-accent"
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

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div {...fadeUp}>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-accent">
              Designed For Clarity
            </p>
            <h2 className="mb-4 text-3xl font-extrabold text-foreground sm:text-4xl">
              A calmer way to present international personal finance
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Instead of stacking every feature into one long marketing page, the personal
              area now separates the experience into dedicated journeys for sending, holding,
              and receiving money while still fitting into the platform's broader cross-border
              operating story.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="rounded-[28px] border border-border bg-background p-8 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.6)]"
          >
            <h3 className="mb-5 text-xl font-extrabold text-foreground">What you can explore</h3>
            <div className="space-y-4">
              {personalFeatures.map((feature, index) => (
                <div key={feature.id} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
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

export default Personal;
