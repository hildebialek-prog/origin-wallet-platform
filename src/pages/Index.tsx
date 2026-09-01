import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Seo from "@/components/Seo";
import {
  ArrowRight,
  Globe,
  Wallet,
  Building2,
  Send,
  Shield,
  CreditCard,
  TrendingUp,
  Users,
  ChevronDown,
  Layers3,
  Network,
  Workflow,
  BadgeCheck,
} from "lucide-react";

const heroBg = "/content/banner.jpg";
const featureImg1 = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop";
const featureImg2 = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop";
const featureImg3 = "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop";
const ctaBg = "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1920&h=800&fit=crop";
const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.7 },
};

const useCases = [
  {
    quote: "A unified workflow for managing supplier payments, collections, balances, and international treasury operations in one platform layer.",
    name: "SMEs",
    role: "Cross-border operations and finance teams",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  {
    quote: "Embedded payout and collection flows designed for platforms that need to move money across merchants, sellers, vendors, or partners.",
    name: "eCommerce Platforms",
    role: "Marketplace and payout orchestration",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  },
  {
    quote: "API-led financial operations for software teams building embedded finance, reconciliation, and payment experiences.",
    name: "SaaS Platforms",
    role: "API and integration-led finance workflows",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
  },
];

const partnerHighlights = [
  {
    id: "origin-wallet",
    label: "Primary Infrastructure",
    name: "Origin Wallet",
    badge: "Provider Rail",
    title: "Origin Wallet routes payment infrastructure through one operating layer",
    description:
      "Origin Wallet provides one operating layer for customer onboarding, wallets, balances, FX quotes, beneficiaries, transfers, and operational sync.",
    tags: [
      "Wallet accounts",
      "Quotes and transfers",
      "Single infrastructure rail",
    ],
    points: [
      "Use supported provider infrastructure through one platform experience.",
      "Keep KYC/KYB, beneficiaries, virtual accounts, FX, and transfers aligned to one account model.",
      "Reduce operational risk by keeping API keys, webhooks, and sync jobs scoped to one integration.",
    ],
    accentClassName: "text-accent",
    iconWrapClassName: "border border-[#10162B] bg-[#0B1022] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    badgeWrapClassName:
      "inline-flex items-center gap-4 rounded-[26px] border border-white/70 bg-white/92 px-5 py-4 shadow-sm backdrop-blur",
    logoSlotClassName: "min-h-[78px] min-w-[260px] rounded-[20px] px-5",
    textWrapClassName: "pr-3",
    logo: (
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black tracking-tight text-white">Origin</span>
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
          Live rail
        </span>
      </div>
    ),
  },
];

const Index = () => {
  const seoSchema = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "HONG KONG MACHINING GROUP CO., LIMITED",
      alternateName: ["Origin Wallet", "Origin Wallet Global Payments"],
      url: "https://hongkongmachininggroup.com/",
      logo: "https://originwallet.asia/logo/logo.jpg",
      image: "https://originwallet.asia/content/banner.jpg",
      description:
        "HONG KONG MACHINING GROUP CO., LIMITED operates the Origin Wallet platform for multi-currency wallets, international transfers, and business payment workflows.",
      brand: {
        "@type": "Brand",
        name: "Origin Wallet",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Origin Wallet",
      alternateName: "Origin Wallet Global Payments",
      url: "https://originwallet.asia/",
      description:
        "Origin Wallet helps businesses and individuals manage global payments, balances, and financial workflows.",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://originwallet.asia/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <div>
      <Seo
        title="Origin Wallet | Global Payments Platform"
        description="Origin Wallet is a global payments platform for multi-currency wallets, international transfers, business payments, and financial operations."
        path="/"
        image="/content/banner.jpg"
        schema={seoSchema}
        pageName="Origin Wallet"
      />
      <section className="relative flex min-h-screen items-center overflow-hidden bg-[#020908]">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center right",
          }}
        />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(2,9,8,0.97)_0%,rgba(2,18,15,0.93)_34%,rgba(2,18,15,0.66)_62%,rgba(2,9,8,0.28)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#020908] to-transparent" />

        <div className="relative z-20 container-wide mx-auto px-4 py-32 sm:px-6 lg:px-8 lg:py-40">
          <motion.div {...fadeUp} className="max-w-5xl">
            <span className="mb-8 inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200 shadow-[0_18px_60px_-34px_rgba(16,185,129,0.9)]">
              Origin Wallet Global Payments Platform
            </span>
            <h1 className="max-w-5xl text-5xl font-black leading-[0.9] text-white drop-shadow-[0_10px_34px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl xl:text-8xl">
              Move money globally with one
              <span className="block text-emerald-300">Origin Wallet.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-medium leading-8 text-white/90 drop-shadow-[0_8px_28px_rgba(0,0,0,0.58)] sm:text-xl">
              Manage global payments, multi-currency balances, international transfers, virtual accounts,
              beneficiaries, and financial operations through a unified platform designed with security considerations.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="rounded-full px-8 text-base shadow-[0_18px_50px_-22px_rgba(16,185,129,0.95)]">
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="hero-outline" size="lg" className="rounded-full border-white/40 px-8 text-base text-white hover:bg-white hover:text-slate-950">
                  Contact sales
                </Button>
              </Link>
            </div>

            <div className="mt-12 max-w-3xl border-l-2 border-emerald-300 bg-black/20 py-1 pl-5 backdrop-blur-[1px]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">
                Built for operational finance teams
              </p>
              <p className="mt-3 text-base font-medium leading-7 text-white/80">
                One account experience for collections, payouts, FX workflow, customer onboarding, and
                API-led payment operations.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="flex flex-col items-center gap-2 text-white/60">
              <span className="text-xs uppercase tracking-widest">Scroll</span>
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-background py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8">
            {partnerHighlights.map((partner, partnerIndex) => (
              <motion.div
                key={partner.id}
                {...fadeUp}
                transition={{ duration: 0.7, delay: partnerIndex * 0.08 }}
                className="grid gap-8 overflow-hidden rounded-[32px] border border-accent/15 bg-[linear-gradient(135deg,rgba(7,89,133,0.08),rgba(249,115,22,0.12))] p-8 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.65)] lg:grid-cols-[1.2fr_0.8fr] lg:p-10"
              >
                <div>
                  <div className={`mb-5 ${partner.badgeWrapClassName}`}>
                    <div className={`flex items-center justify-center ${partner.logoSlotClassName} ${partner.iconWrapClassName}`}>
                      {partner.logo}
                    </div>
                    <div className={partner.textWrapClassName}>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        {partner.label}
                      </p>
                      <p className="text-lg font-bold text-foreground">{partner.name}</p>
                    </div>
                  </div>
                  <span className={`mb-4 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/80 px-4 py-2 text-sm font-semibold backdrop-blur ${partner.accentClassName}`}>
                    <BadgeCheck className="h-4 w-4" />
                    {partner.badge}
                  </span>
                  <h2 className="max-w-3xl text-3xl font-black leading-tight text-foreground sm:text-4xl">
                    {partner.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                    {partner.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-foreground/80">
                    {partner.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-background/80 px-4 py-2"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <Link to="/contact">
                      <Button variant="hero" size="lg">
                        Contact our team <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/about">
                      <Button variant="outline" size="lg">
                        Learn more
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 self-stretch">
                  {partner.points.map((point, index) => (
                    <motion.div
                      key={point}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.12 }}
                      className="rounded-[24px] border border-white/60 bg-white/80 p-6 backdrop-blur"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10">
                        <Building2 className={`h-5 w-5 ${partner.accentClassName}`} />
                      </div>
                      <p className="text-base leading-7 text-foreground">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 relative group overflow-hidden rounded-2xl aspect-[16/10]">
              <img src={featureImg1} alt="Global finance operations" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded mb-3">
                  Platform Overview
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Cross-border payments with clearer pricing and simpler operations
                </h3>
                <p className="text-white/80 max-w-lg">
                  A practical platform experience for international transfers, wallets, and global business payments.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <motion.div {...fadeUp} className="relative group overflow-hidden rounded-xl aspect-[16/9]">
                <img src={featureImg2} alt="Business finance workflows" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="inline-block px-2 py-1 bg-accent text-white text-xs font-semibold rounded mb-2">
                    Business
                  </span>
                  <h4 className="text-lg font-bold text-white">Operate across currencies with more visibility and control</h4>
                </div>
              </motion.div>

              <motion.div {...fadeUp} className="relative group overflow-hidden rounded-xl aspect-[16/9]">
                <img src={featureImg3} alt="Personal finance use cases" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="inline-block px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded mb-2">
                    Personal
                  </span>
                  <h4 className="text-lg font-bold text-white">Move money internationally with a simpler user experience</h4>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
              How It Works
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Why choose Origin Wallet for global payments
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Origin Wallet is designed to unify payment connectivity, operational visibility,
              multi-currency wallet management, and cross-border money movement inside one platform flow.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Our platform is designed to drive cross-border transaction volume by simplifying
              financial operations for businesses and software-led teams.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                icon: Layers3,
                step: "01",
                title: "Activate account setup",
                desc: "Bring onboarding, wallet, quote, beneficiary, and transfer operations into one operating layer.",
              },
              {
                icon: Workflow,
                step: "02",
                title: "View balances and workflows",
                desc: "Review balances, recipient activity, and operational payment steps through a clearer platform interface.",
              },
              {
                icon: Network,
                step: "03",
                title: "Send and receive payments",
                desc: "Support outbound and inbound money movement with structured workflows for teams, users, and embedded finance operations.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12 }}
                className="rounded-[28px] border border-border bg-card p-7 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                    <item.icon className="h-7 w-7 text-accent" />
                  </div>
                  <span className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-3 text-2xl font-extrabold">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground py-12 md:py-16">
        <div className="container-wide mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "Global", label: "Reach", icon: Globe },
              { value: "Multi", label: "Currency", icon: Wallet },
              { value: "Secure", label: "Platform", icon: Shield },
              { value: "Business", label: "& Personal", icon: Users },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <stat.icon className="w-6 h-6 text-accent" />
                </div>
                <div className="text-4xl md:text-5xl font-black">{stat.value}</div>
                <div className="text-primary-foreground/70 uppercase tracking-wider text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mb-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
              What We Offer
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Origin Wallet Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Origin Wallet provides cross-border finance tooling for modern individuals, businesses, and
              integration-led platforms.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Send, title: "International Transfers", desc: "Move money across borders with clearer pricing and a guided transfer flow.", color: "bg-blue-500", href: "/personal/send" },
              { icon: Wallet, title: "Multi-Currency Wallet", desc: "View and manage provider-supported multi-currency balances through the Origin Wallet interface.", color: "bg-green-500", href: "/personal/wallet" },
              { icon: Building2, title: "Business Payments", desc: "Support supplier payments, treasury workflows, and distributed business operations.", color: "bg-purple-500", href: "/business" },
              { icon: CreditCard, title: "Virtual Cards", desc: "Support digital spending workflows with clearer visibility and controls.", color: "bg-orange-500", href: "/personal" },
              { icon: TrendingUp, title: "FX Tools", desc: "Review rates and conversion details before confirming international transfers.", color: "bg-pink-500", href: "/pricing" },
              { icon: Shield, title: "Origin Wallet Infrastructure", desc: "Coordinate onboarding, balances, and payment workflows through supported provider infrastructure.", color: "bg-indigo-500", href: "/business/api" },
            ].map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:border-accent/30 transition-all"
              >
                <div className={`w-14 h-14 rounded-xl ${service.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{service.desc}</p>
                <Link to={service.href} className="inline-flex items-center gap-1 text-accent font-medium mt-4 hover:gap-2 transition-all">
                  Learn more <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src={ctaBg} alt="Global business background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary/90" />
        </div>
        <div className="relative z-10 container-wide mx-auto px-4 text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
              Build unified financial operations on Origin Wallet
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Our platform supports API-based connections for provider-connected balance and payment workflows.
            </p>
            <p className="mx-auto mb-8 max-w-3xl text-sm leading-7 text-white/65">
              Built around a single infrastructure rail so onboarding, account setup, webhooks,
              rates, beneficiaries, and transfers can stay aligned to the same operating model.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact">
                <Button variant="hero" size="lg">Request Access</Button>
              </Link>
              <Link to="/business/api">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
                  Book Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
              Who We Serve
            </span>
            <h2 className="text-4xl md:text-5xl font-black">Built for modern cross-border use cases</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-card rounded-2xl border border-border p-8 relative"
              >
                <div className="text-accent text-6xl font-serif absolute top-4 left-6 opacity-20">"</div>
                <p className="text-foreground relative z-10 mb-6 leading-relaxed italic">
                  {item.quote}
                </p>
                <div className="flex items-center gap-3">
                  <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-narrow mx-auto">
          <motion.div {...fadeUp} className="text-center">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
              Start Today
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Ready to Go Global?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Explore a more transparent way to manage cross-border payments, balances, and
              Origin Wallet financial workflows.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact">
                <Button variant="hero" size="lg" className="text-base px-10">
                  Request Access <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/business/api">
                <Button variant="outline" size="lg" className="text-base px-10">
                  Book Demo
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <Link to="/business" className="hover:text-foreground hover:underline">
                Origin Wallet Business
              </Link>
              <Link to="/personal" className="hover:text-foreground hover:underline">
                Origin Wallet Personal
              </Link>
              <Link to="/pricing" className="hover:text-foreground hover:underline">
                Origin Wallet Pricing
              </Link>
              <Link to="/help" className="hover:text-foreground hover:underline">
                Origin Wallet Help Center
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
