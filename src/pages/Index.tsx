import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
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
  Play,
  Layers3,
  Network,
  Workflow,
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
    quote: "API-led financial operations for software teams building embedded finance, reconciliation, and provider-connected payment experiences.",
    name: "SaaS Platforms",
    role: "API and integration-led finance workflows",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
  },
];

const Index = () => {
  return (
    <div>
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30 z-10" />

        <div className="relative z-20 container-wide mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-4xl">
            <motion.div {...fadeUp}>
              <span className="inline-block px-4 py-1.5 bg-accent text-white text-sm font-semibold rounded-full mb-6">
                Multi-Provider Financial Platform
              </span>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-[0.95] mb-8">
                UNIFIED
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-400">
                  GLOBAL PAYMENTS
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-white/80 max-w-2xl leading-relaxed mb-10">
                A unified platform for managing global payments, balances, and financial operations across multiple providers through clearer workflows and secure APIs.
              </p>
              <div className="mb-10 flex flex-wrap gap-3 text-sm text-white/75">
                {[
                  "Multi-provider connectivity",
                  "Secure API integrations",
                  "Wallets, balances, and transfers",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/15 bg-white/8 px-4 py-2 backdrop-blur-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <Link to="/contact">
                  <Button variant="hero" size="lg" className="text-base px-8">
                    <Play className="w-4 h-4 mr-2" /> Contact Us
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="hero-outline" size="lg" className="text-base px-8">
                    Explore Platform
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

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
              Connect providers, manage operations, move money
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Origin Wallet is designed to unify provider connectivity, operational visibility,
              and cross-border money movement inside one platform flow.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                icon: Layers3,
                step: "01",
                title: "Connect providers",
                desc: "Bring multiple global financial providers into one operating layer with provider-aware onboarding and integration flows.",
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
            <h2 className="text-4xl md:text-5xl font-black mb-4">Our Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Cross-border finance tooling for modern individuals and businesses.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Send, title: "International Transfers", desc: "Move money across borders with clearer pricing and a guided transfer flow.", color: "bg-blue-500", href: "/personal/send" },
              { icon: Wallet, title: "Multi-Currency Wallet", desc: "Hold and manage multiple currencies in one secure wallet experience.", color: "bg-green-500", href: "/personal/wallet" },
              { icon: Building2, title: "Business Payments", desc: "Support supplier payments, treasury workflows, and distributed business operations.", color: "bg-purple-500", href: "/business" },
              { icon: CreditCard, title: "Virtual Cards", desc: "Support digital spending workflows with clearer visibility and controls.", color: "bg-orange-500", href: "/personal" },
              { icon: TrendingUp, title: "FX Tools", desc: "Review rates and conversion details before confirming international transfers.", color: "bg-pink-500", href: "/pricing" },
              { icon: Shield, title: "Provider Orchestration", desc: "Coordinate onboarding, balances, and payment workflows across multiple financial providers.", color: "bg-indigo-500", href: "/business/api" },
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
              Build unified financial operations across providers
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Our platform integrates with multiple global financial providers via secure APIs to support cross-border wallets, balances, and payment workflows.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact">
                <Button variant="hero" size="lg">Get Started</Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
                  Our Story
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
              Explore a more transparent way to manage international transfers and multi-currency operations.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact">
                <Button variant="hero" size="lg" className="text-base px-10">
                  Contact Our Team <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg" className="text-base px-10">
                  View Pricing
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
