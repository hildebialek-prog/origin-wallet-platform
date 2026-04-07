import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownToLine, ArrowRight, CheckCircle2, ChevronRight, Send, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";

export const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export interface PersonalFeature {
  id: string;
  icon: LucideIcon;
  title: string;
  navLabel: string;
  navDescription: string;
  heroTitle: string;
  heroDescription: string;
  sectionDescription: string;
  benefits: string[];
  steps: string[];
  faqs: Array<{ q: string; a: string }>;
}

export const personalFeatures: PersonalFeature[] = [
  {
    id: "send",
    icon: Send,
    title: "Send money internationally",
    navLabel: "Send money",
    navDescription: "Transfer internationally",
    heroTitle: "Send money internationally with more clarity",
    heroDescription:
      "Transfer money across borders with transparent pricing, clearer FX visibility, and a guided personal transfer experience.",
    sectionDescription:
      "Origin Wallet helps individuals create and manage international transfers with a cleaner flow from quote to payout.",
    benefits: [
      "Transparent pricing before confirmation",
      "Clear transfer status tracking",
      "Designed for personal cross-border transfers",
      "A simpler flow for repeat payments",
    ],
    steps: [
      "Enter the amount and choose your currencies",
      "Review the transfer details and fees",
      "Fund your transfer using the available funding method",
      "Track the transfer until completion",
    ],
    faqs: [
      {
        q: "How long does a transfer take?",
        a: "Timing can vary by route, currency, and compliance review, but the transfer flow is designed to keep status updates visible throughout the process.",
      },
      {
        q: "Can I see fees before sending?",
        a: "Yes. The transfer flow is designed to show fees and transfer details before you confirm the payment.",
      },
      {
        q: "Can I cancel a transfer?",
        a: "Cancellation depends on the transfer stage. If processing has not started yet, support may still be able to help.",
      },
    ],
  },
  {
    id: "wallet",
    icon: Wallet,
    title: "Multi-currency wallet",
    navLabel: "Multi-currency wallet",
    navDescription: "Hold and convert currencies",
    heroTitle: "Hold and manage money across currencies",
    heroDescription:
      "Use a multi-currency wallet experience to manage balances, review conversions, and organize personal money movement more easily.",
    sectionDescription:
      "The wallet experience is designed for people who need a simpler view of balances, conversions, and cross-currency activity in one place.",
    benefits: [
      "A unified view of balances and currency activity",
      "Designed for multi-currency use cases",
      "Cleaner conversion and wallet management flows",
      "Built for personal international finance needs",
    ],
    steps: [
      "Open your wallet dashboard",
      "Add or receive funds into available balances",
      "Review conversions between supported currencies",
      "Use wallet balances for transfers or future spending flows",
    ],
    faqs: [
      {
        q: "What is a multi-currency wallet?",
        a: "It is a wallet experience designed to help you view, manage, and move money across multiple currencies from one place.",
      },
      {
        q: "Can I convert between currencies?",
        a: "The product is designed to support conversion flows with rate visibility before confirmation, subject to feature availability.",
      },
      {
        q: "Who is this wallet for?",
        a: "It is intended for people managing personal money movement across currencies, borders, and international payment needs.",
      },
    ],
  },
  {
    id: "receive",
    icon: ArrowDownToLine,
    title: "Receive money",
    navLabel: "Receive money",
    navDescription: "Get paid from anywhere",
    heroTitle: "Receive money with a simpler international flow",
    heroDescription:
      "Get paid through a cleaner receiving experience built for people who work, earn, and operate across borders.",
    sectionDescription:
      "Origin Wallet is designed to support inbound money movement for individuals who need clearer receiving flows and better visibility once funds arrive.",
    benefits: [
      "A simpler experience for inbound payments",
      "Useful for freelancers and international earners",
      "Designed to work alongside wallet balances",
      "Clearer visibility into received funds",
    ],
    steps: [
      "Get your receiving details where available",
      "Share them with the sender",
      "Track when funds arrive",
      "Hold, review, or use the funds in your wallet flow",
    ],
    faqs: [
      {
        q: "Who can use receive-money features?",
        a: "These flows are designed for individuals who need to collect funds from abroad or receive international personal income.",
      },
      {
        q: "Do funds go straight into the wallet?",
        a: "Receiving flows are designed to connect with the wallet experience where supported, so balances and activity stay easier to manage.",
      },
      {
        q: "Can I use received funds later?",
        a: "Yes. The overall product flow is designed so received balances can support future wallet or transfer activity where available.",
      },
    ],
  },
];

const personalHeroMeta: Record<
  string,
  {
    eyebrow: string;
    audience: string;
    focus: string;
    note: string;
  }
> = {
  send: {
    eyebrow: "Cross-border transfers",
    audience: "For people moving money to family, partners, or personal accounts abroad.",
    focus: "Pricing clarity, step-by-step visibility, and a calmer transfer flow.",
    note: "Built to present international sending as a guided experience rather than a confusing sequence of payment steps.",
  },
  wallet: {
    eyebrow: "Multi-currency balances",
    audience: "For people managing multiple currencies as part of work, travel, or international life.",
    focus: "Balance visibility, conversion review, and simpler wallet organization.",
    note: "Framed as a personal finance hub for holding and reviewing money across currencies in one place.",
  },
  receive: {
    eyebrow: "Inbound money movement",
    audience: "For freelancers, remote workers, and internationally connected earners.",
    focus: "Receiving clarity, balance visibility, and smoother follow-on wallet usage.",
    note: "Positioned to make incoming funds feel easier to understand and easier to manage once they arrive.",
  },
};

export const PersonalFeaturePage = ({
  feature,
  accentClass = "bg-accent",
}: {
  feature: PersonalFeature;
  accentClass?: string;
}) => {
  const Icon = feature.icon;
  const heroMeta = personalHeroMeta[feature.id];
  const path = `/personal/${feature.id}`;
  const seoSchema = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: feature.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Origin Wallet",
          item: "https://khoinguyenoriginwallet.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Personal",
          item: "https://khoinguyenoriginwallet.com/personal",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: feature.navLabel,
          item: `https://khoinguyenoriginwallet.com${path}`,
        },
      ],
    },
  ];

  return (
    <div>
      <Seo
        title={`Origin Wallet ${feature.navLabel} | ${feature.heroTitle}`}
        description={`Origin Wallet ${feature.navLabel.toLowerCase()} experience: ${feature.heroDescription}`}
        path={path}
        image="/content/banner.jpg"
        schema={seoSchema}
        pageName={`Origin Wallet ${feature.navLabel}`}
      />
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-primary-foreground/60">
                <Link to="/" className="hover:text-white">
                  Origin Wallet
                </Link>
                <span>/</span>
                <Link to="/personal" className="hover:text-white">
                  Personal
                </Link>
                <span>/</span>
                <span className="text-primary-foreground">{feature.navLabel}</span>
              </nav>
              <span className="mb-4 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Personal
              </span>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-primary-foreground/55">
                {heroMeta.eyebrow}
              </p>
              <h1 className="mb-4 text-4xl font-extrabold sm:text-5xl">
                {feature.heroTitle}
              </h1>
              <p className="mb-8 max-w-2xl text-lg leading-relaxed text-primary-foreground/72">
                {feature.heroDescription}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/contact">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto">
                    Get started
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="hero-outline" size="lg" className="w-full sm:w-auto">
                    See pricing
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/5 p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.65)] backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accentClass}/15`}>
                  <Icon className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent/90">
                    {feature.navLabel}
                  </p>
                  <p className="text-sm text-primary-foreground/60">{feature.navDescription}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/45">
                    Best for
                  </p>
                  <p className="text-sm leading-relaxed text-primary-foreground/78">{heroMeta.audience}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/45">
                    Experience focus
                  </p>
                  <p className="text-sm leading-relaxed text-primary-foreground/78">{heroMeta.focus}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/45">
                    Product note
                  </p>
                  <p className="text-sm leading-relaxed text-primary-foreground/78">{heroMeta.note}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className={`w-14 h-14 rounded-2xl ${accentClass}/10 flex items-center justify-center mb-6`}>
                <Icon className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-3xl font-extrabold mb-4">{feature.title}</h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{feature.sectionDescription}</p>

              <h4 className="font-bold mb-3">Benefits</h4>
              <ul className="space-y-2 mb-8">
                {feature.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <Link to="/pricing"><Button variant="outline" size="sm">View fees</Button></Link>
                <Link to="/contact"><Button variant="hero" size="sm">Get started</Button></Link>
              </div>
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <Link to="/personal" className="hover:text-foreground hover:underline">
                  All personal features
                </Link>
                <Link to="/help" className="hover:text-foreground hover:underline">
                  Help center
                </Link>
                <Link to="/security" className="hover:text-foreground hover:underline">
                  Security
                </Link>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-2xl border border-border p-8">
                <h4 className="font-bold mb-4">How it works</h4>
                <div className="space-y-4">
                  {feature.steps.map((step, i) => (
                    <div key={step} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-sm font-bold text-accent">
                        {i + 1}
                      </div>
                      <p className="text-muted-foreground pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface-subtle p-8">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent/80">
                  Flow snapshot
                </p>
                <h4 className="mb-3 text-xl font-extrabold text-foreground">
                  A more focused personal workflow
                </h4>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  This page is intentionally narrower in scope, so it can explain one
                  personal use case properly instead of trying to market every feature at once.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Intent</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">More clarity</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tone</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">Calmer and simpler</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Audience</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">International users</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-tight mx-auto">
          <h2 className="text-2xl font-extrabold mb-8 text-center">Common questions</h2>
          <div className="space-y-3 max-w-2xl mx-auto">
            {feature.faqs.map((faq) => (
              <details key={faq.q} className="bg-card rounded-xl border border-border group">
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

      <section className="section-padding bg-hero text-primary-foreground text-center">
        <div className="container-tight mx-auto">
          <h2 className="text-3xl font-extrabold mb-4">Ready to get started?</h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            Explore a simpler personal finance experience for moving and managing money internationally.
          </p>
          <Link to="/contact">
            <Button variant="hero" size="lg">Contact our team <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </Link>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-primary-foreground/75">
            <Link to="/personal" className="hover:text-white hover:underline">
              Origin Wallet Personal
            </Link>
            <Link to="/pricing" className="hover:text-white hover:underline">
              Pricing visibility
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
