import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import {
  Target,
  Heart,
  Eye,
  Users,
  ArrowRight,
  Download,
  CreditCard,
  Globe,
  Shield,
  Smartphone,
  Wallet,
  Banknote,
  RefreshCw,
} from "lucide-react";
import content1 from "/content/content1.jpg";
import content2 from "/content/content2.jpg";
import content3 from "/content/content3.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const featureToneClasses = {
  blue: {
    wrapper: "bg-blue-100 dark:bg-blue-900/30",
    icon: "text-blue-600 dark:text-blue-400",
  },
  green: {
    wrapper: "bg-green-100 dark:bg-green-900/30",
    icon: "text-green-600 dark:text-green-400",
  },
  purple: {
    wrapper: "bg-purple-100 dark:bg-purple-900/30",
    icon: "text-purple-600 dark:text-purple-400",
  },
  orange: {
    wrapper: "bg-orange-100 dark:bg-orange-900/30",
    icon: "text-orange-600 dark:text-orange-400",
  },
  pink: {
    wrapper: "bg-pink-100 dark:bg-pink-900/30",
    icon: "text-pink-600 dark:text-pink-400",
  },
  cyan: {
    wrapper: "bg-cyan-100 dark:bg-cyan-900/30",
    icon: "text-cyan-600 dark:text-cyan-400",
  },
} as const;

const About = () => {
  return (
    <div>
      <Seo
        title="About Origin Wallet | Cross-Border Payments Platform & Company Information"
        description="Learn about Origin Wallet, our cross-border payments platform, mission, product direction, and company operating information."
        path="/about"
        image="/content/content1.jpg"
      />
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-tight mx-auto text-center">
          <motion.div {...fadeUp}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              About The Platform
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Built as a clearer financial operations layer</h1>
            <p className="text-primary-foreground/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Origin Wallet is being built as a multi-provider financial platform for managing
              cross-border payments, balances, onboarding workflows, and operational visibility
              through cleaner product flows and secure integrations.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl font-extrabold mb-6 text-center">Why we exist</h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-muted-foreground space-y-4 leading-relaxed text-lg">
                <p>
                  Cross-border money movement is still fragmented across different providers,
                  disconnected operational tools, and opaque workflows. Teams often manage
                  onboarding, balances, transfers, and exceptions across too many separate systems.
                </p>
                <p>
                  We started Origin Wallet to make those financial operations easier to understand
                  and easier to run, whether the end experience is built for individuals,
                  businesses, or integration-led platforms.
                </p>
                <p>
                  Our approach is simple: connect provider capabilities into one clearer platform
                  experience, then build product flows that improve transparency, usability, and
                  control from the start.
                </p>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <img src={content1} alt="Why we exist" className="rounded-2xl shadow-xl w-full h-auto object-cover" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <img src={content2} alt="Background" className="w-full h-full object-cover" />
        </div>
        <div className="container-wide mx-auto relative">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Mission & values</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Target, title: "Operational clarity", desc: "Teams should be able to understand provider flows, status, and next actions without guesswork." },
              { icon: Heart, title: "Trust by design", desc: "Legal identity, security, and product behavior should feel credible before a transaction even starts." },
              { icon: Eye, title: "Visibility", desc: "Balances, quotes, transfers, and onboarding states should be easier to review and communicate." },
              { icon: Users, title: "Platform usability", desc: "Built to support users, operators, and partner-facing workflows across a shared financial stack." },
            ].map((v) => (
              <motion.div key={v.title} {...fadeUp} className="bg-card rounded-2xl border border-border p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <v.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-bold mb-2">{v.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              How It Works
            </p>
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              One platform layer across multiple provider workflows
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Connect providers",
                desc: "Bring provider onboarding and connection journeys into one clearer platform entry point.",
              },
              {
                title: "View balances and workflows",
                desc: "See balances, status changes, and operational steps with better visibility across products and providers.",
              },
              {
                title: "Move money with more structure",
                desc: "Support quotes, transfers, beneficiaries, and finance actions through simpler guided flows.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ delay: index * 0.1 }}
                className="rounded-[28px] border border-border bg-card p-7 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.45)]"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <h3 className="mb-3 text-xl font-extrabold text-foreground">{item.title}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <motion.div {...fadeUp}>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              Who We Serve
            </p>
            <h2 className="mb-4 text-3xl font-extrabold text-foreground sm:text-4xl">
              Designed for operationally complex cross-border use cases
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Origin Wallet is positioned around the needs of businesses and platforms that need
              more than a simple end-user wallet. The focus is on structured financial workflows,
              provider connectivity, and better operating visibility.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "SMEs",
                desc: "Cross-border operating teams handling supplier payments, collections, and treasury visibility.",
              },
              {
                title: "eCommerce",
                desc: "Platforms and merchants coordinating payouts, recipient management, and international money movement.",
              },
              {
                title: "SaaS",
                desc: "Integration-led products that need finance workflows, APIs, and clearer orchestration across providers.",
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

      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Global payment experience</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Product directions built around cross-border transfers, provider connectivity, and operational clarity.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 md:order-1"
            >
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Provider-connected wallet flows</h3>
                    <p className="text-muted-foreground text-sm">Flexible funding and balance layers</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Guided funding and payment setup flows across provider journeys</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Support for secure onboarding and account connection experiences</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Designed for multi-currency balance and payment experiences</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 md:order-2"
            >
              <img src={content3} alt="Wallet funding" className="rounded-2xl shadow-xl w-full h-auto object-cover" />
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img src={content1} alt="Bank transfer flows" className="rounded-2xl shadow-xl w-full h-auto object-cover" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center">
                    <Banknote className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Structured transfer operations</h3>
                    <p className="text-muted-foreground text-sm">Cross-border execution visibility</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <span>International and local transfer workflows with clearer status handling</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <span>Pricing, fees, and review steps surfaced before confirmation</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <span>Status tracking throughout the transfer and exception lifecycle</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 md:order-1"
            >
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Integration-ready product journeys</h3>
                    <p className="text-muted-foreground text-sm">Modern customer and operator experiences</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Modern digital payment experiences designed around product clarity</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Interface patterns for customer onboarding and provider connection flows</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Clearer product flows for operators, customers, and partner reviews</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 md:order-2"
            >
              <img src={content2} alt="Digital payment experience" className="rounded-2xl shadow-xl w-full h-auto object-cover" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Why choose Origin Wallet?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A platform direction focused on trust, usability, and operational clarity.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Globe, title: "Global Reach", desc: "Cross-border payment experiences for customers and businesses operating internationally.", color: "blue" },
              { icon: Shield, title: "Security", desc: "Encryption, access controls, and operational safeguards designed for sensitive financial workflows.", color: "green" },
              { icon: RefreshCw, title: "FX Visibility", desc: "Clearer rate and pricing views across international payment flows.", color: "purple" },
              { icon: Wallet, title: "Multi-Currency Wallet", desc: "A central place to manage balances and cross-currency workflows.", color: "orange" },
              { icon: CreditCard, title: "Virtual Cards", desc: "Support digital spending workflows with clearer visibility and controls.", color: "pink" },
              { icon: Users, title: "Customer Support", desc: "Support channels designed to help users navigate international payment workflows.", color: "cyan" },
            ].map((feature, i) => {
              const tone = featureToneClasses[feature.color as keyof typeof featureToneClasses];

              return (
                <motion.div
                  key={feature.title}
                  {...fadeUp}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow"
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tone.wrapper}`}>
                    <feature.icon className={`h-6 w-6 ${tone.icon}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Product journey</h2>
          </motion.div>

          <div className="space-y-8 max-w-xl mx-auto">
            {[
              { year: "01", title: "Concept", desc: "Identify the need for clearer and more transparent cross-border money movement." },
              { year: "02", title: "Foundation", desc: "Design the core wallet, onboarding, and international payment experience." },
              { year: "03", title: "Platform buildout", desc: "Expand the product with business workflows, integrations, and operational tooling." },
              { year: "04", title: "Partner readiness", desc: "Strengthen controls, onboarding flows, and infrastructure to support external integrations." },
              { year: "05", title: "Scale", desc: "Continue improving the platform experience for cross-border customers and operational teams." },
            ].map((item, i) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                    {item.year}
                  </div>
                  {i < 4 && <div className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="pb-6">
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <p className="text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-tight mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-2xl font-extrabold mb-4">Press kit</h2>
            <p className="text-muted-foreground mb-6">
              Download our brand assets, logos, and press materials.
            </p>
            <Button variant="outline" disabled className="gap-2">
              <Download className="w-4 h-4" />
              Download press kit (coming soon)
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-[#0d1220] text-white">
        <div className="container-tight mx-auto">
          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(82,98,255,0.28),transparent_40%),linear-gradient(160deg,#131a2d_0%,#0d1220_55%,#111827_100%)] px-8 py-12 shadow-[0_24px_80px_rgba(6,10,24,0.45)] md:px-12 md:py-14"
          >
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 flex justify-center">
                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
                  <img src="/logo/knt-logo.svg" alt="KNT" className="h-12 w-auto" />
                </div>
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#9fb0ff]">
                Platform Operator
              </p>
              <h2 className="text-3xl font-black tracking-[-0.03em] text-white md:text-5xl">
                Origin Wallet
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Origin Wallet is a cross-border finance experience built by <span className="font-semibold text-white">KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY</span>, focused on transparent product flows, operational clarity, and modern digital financial experiences.
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
                We are currently onboarding early users and expanding provider integrations to
                support a stronger multi-provider financial operations platform over time,
                including workflows designed around providers such as Airwallex, Wise, and
                Currenxie where available.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
              {[
                {
                  label: "Legal entity",
                  value: "KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY",
                  tone: "text-[#9fb0ff]",
                },
                {
                  label: "Tax ID",
                  value: "0111409165",
                  tone: "text-white",
                },
                {
                  label: "Registered address",
                  value: "Viet Hung Ward, Ha Noi, Viet Nam",
                  tone: "text-white",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-sm"
                >
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {item.label}
                  </div>
                  <div className={`mt-3 text-lg font-semibold leading-7 ${item.tone}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link to="/contact">
                <Button
                  size="lg"
                  className="gap-2 rounded-full bg-white px-7 text-[#111827] hover:bg-slate-100"
                >
                  Contact us <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
