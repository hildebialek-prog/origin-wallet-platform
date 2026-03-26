import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, CheckCircle2, ChevronRight, Code, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export interface BusinessFeature {
  id: string;
  icon: LucideIcon;
  title: string;
  navLabel: string;
  navDescription: string;
  heroTitle: string;
  heroDescription: string;
  sectionDescription: string;
  useCases: string[];
  benefits: string[];
  steps: string[];
  faqs: Array<{ q: string; a: string }>;
}

export const businessFeatures: BusinessFeature[] = [
  {
    id: "suppliers",
    icon: Send,
    title: "Pay suppliers globally",
    navLabel: "Pay suppliers",
    navDescription: "Global supplier payments",
    heroTitle: "Pay suppliers with more structure and visibility",
    heroDescription:
      "Support outbound supplier and contractor payments through a cleaner business flow designed around clarity, control, and operational review.",
    sectionDescription:
      "This workflow is designed for businesses that need a better way to manage supplier payments across borders without presenting the process as a black box.",
    useCases: [
      "Supplier settlements",
      "Contractor invoices",
      "Recurring vendor payments",
      "Cross-border procurement",
    ],
    benefits: [
      "Clearer payment review before execution",
      "Better visibility into operational status",
      "A more structured workflow for finance teams",
      "Designed for cross-border supplier use cases",
    ],
    steps: [
      "Create the supplier payment request",
      "Review payment details and fee visibility",
      "Confirm the transaction internally",
      "Track the payment through completion",
    ],
    faqs: [
      {
        q: "Who is this flow designed for?",
        a: "It is designed for companies managing outbound supplier, vendor, or contractor payments across borders.",
      },
      {
        q: "Can teams review payments before sending?",
        a: "Yes. The business flow is positioned around review, visibility, and operational clarity before execution.",
      },
      {
        q: "Can I use this for recurring suppliers?",
        a: "Yes. The workflow is well suited to repeat supplier relationships and ongoing cross-border payables processes.",
      },
    ],
  },
  {
    id: "receive",
    icon: BarChart3,
    title: "Receive international payments",
    navLabel: "Receive payments",
    navDescription: "Get paid internationally",
    heroTitle: "Support inbound payments with a clearer business flow",
    heroDescription:
      "Present a more organized receiving experience for businesses collecting international funds, client payments, or cross-border revenue.",
    sectionDescription:
      "This page is designed around inbound money movement for businesses that need better visibility into collections, payment arrival, and treasury review.",
    useCases: [
      "Client invoice payments",
      "International revenue collection",
      "Marketplace inflows",
      "Cross-border customer receipts",
    ],
    benefits: [
      "A clearer way to present collections workflows",
      "Improved visibility when funds arrive",
      "Designed for cross-border revenue operations",
      "Useful for finance and treasury review",
    ],
    steps: [
      "Access the available receiving details",
      "Share payment instructions with counterparties",
      "Track inbound payment progress",
      "Review and reconcile received funds",
    ],
    faqs: [
      {
        q: "What kind of businesses is this for?",
        a: "It is positioned for businesses that invoice internationally or receive revenue from overseas counterparties.",
      },
      {
        q: "Is this only for one-off payments?",
        a: "No. The flow can also support repeated inbound activity where a business wants cleaner visibility into collections.",
      },
      {
        q: "Can finance teams reconcile incoming funds?",
        a: "That is part of the intended operational story, with the product positioned to make inbound payment review easier to follow.",
      },
    ],
  },
  {
    id: "batch-payments",
    icon: Users,
    title: "Batch payments and payouts",
    navLabel: "Batch payments",
    navDescription: "Pay multiple recipients",
    heroTitle: "Handle recipient-heavy payouts with more control",
    heroDescription:
      "Present batch payment operations as a more organized workflow for payroll-style disbursements, marketplace payouts, and multi-recipient finance activity.",
    sectionDescription:
      "This flow is meant for teams that need to coordinate payments to many recipients while keeping the process easier to understand and review.",
    useCases: [
      "Marketplace payouts",
      "Affiliate settlements",
      "Payroll-style disbursements",
      "Multi-recipient refunds",
    ],
    benefits: [
      "Built for recipient-heavy operations",
      "A more structured batch review flow",
      "Clearer payout process communication",
      "Designed for finance and operations teams",
    ],
    steps: [
      "Prepare the payout batch",
      "Validate recipients and totals",
      "Review the payout run before approval",
      "Track the processing outcome across recipients",
    ],
    faqs: [
      {
        q: "When is batch payout flow useful?",
        a: "It is useful when a business needs to pay multiple recipients as part of one coordinated finance operation.",
      },
      {
        q: "Can this support operational review?",
        a: "Yes. The page is designed to communicate a more controlled batch process rather than a loose or manual payout experience.",
      },
      {
        q: "Is this only for payroll?",
        a: "No. It also fits affiliates, marketplaces, refunds, and other multi-recipient disbursement use cases.",
      },
    ],
  },
  {
    id: "api",
    icon: Code,
    title: "API and integrations",
    navLabel: "API & integrations",
    navDescription: "Connect your systems",
    heroTitle: "Connect finance workflows into your systems",
    heroDescription:
      "Show how business payment operations can connect to internal systems through integration-led flows, provider connectivity, automation, and cleaner operational design.",
    sectionDescription:
      "This page is aimed at businesses that want a more connected operating model across payments, reconciliation, internal tooling, or product-led finance workflows with a clearer multi-provider platform story.",
    useCases: [
      "ERP and finance tooling",
      "Internal operations platforms",
      "Marketplace payout orchestration",
      "Custom treasury workflows",
      "Embedded finance product experiences",
    ],
    benefits: [
      "Better positioning for integration-led buyers",
      "A clearer automation story",
      "Designed for operational system connectivity",
      "Useful for product and engineering review",
      "Stronger multi-provider platform positioning",
    ],
    steps: [
      "Review the relevant business workflow",
      "Align the integration model with your systems",
      "Plan the implementation and operational steps",
      "Prepare the path toward production readiness",
    ],
    faqs: [
      {
        q: "Who is this page meant for?",
        a: "It is meant for teams evaluating how payment operations connect with internal systems, workflows, or software products.",
      },
      {
        q: "Does this imply a live production API for every feature?",
        a: "No. The page positions the integration story clearly, while feature availability can still depend on environment and capability readiness.",
      },
      {
        q: "Is this useful for partner conversations?",
        a: "Yes. It helps present the product as a more structured platform rather than only a generic payments website.",
      },
    ],
  },
];

const businessHeroMeta: Record<
  string,
  {
    eyebrow: string;
    buyer: string;
    focus: string;
    note: string;
  }
> = {
  suppliers: {
    eyebrow: "Outbound business payments",
    buyer: "Best for finance teams managing international suppliers, contractors, and recurring payables.",
    focus: "Operational review, clearer payment communication, and stronger control before execution.",
    note: "Framed as a structured payable workflow instead of a generic send-money feature.",
  },
  receive: {
    eyebrow: "Inbound collections",
    buyer: "Best for businesses collecting revenue, invoices, or international customer payments.",
    focus: "Collections visibility, treasury review, and clearer inbound payment communication.",
    note: "Positioned to help businesses explain how money comes in, not just how money goes out.",
  },
  "batch-payments": {
    eyebrow: "Recipient-heavy operations",
    buyer: "Best for teams coordinating payroll-style disbursements, marketplace payouts, or multi-recipient runs.",
    focus: "Batch review, recipient handling, and a cleaner payout operations story.",
    note: "Built to read like an operational system flow rather than a loose manual process.",
  },
  api: {
    eyebrow: "Systems and automation",
    buyer: "Best for product, engineering, and operations teams evaluating workflow connectivity.",
    focus: "Automation story, systems alignment, and a more partner-friendly integration narrative.",
    note: "Useful when the site needs to feel more platform-led and less like a generic brochure.",
  },
};

export const BusinessFeaturePage = ({ feature }: { feature: BusinessFeature }) => {
  const Icon = feature.icon;
  const heroMeta = businessHeroMeta[feature.id];

  return (
    <div>
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <span className="mb-4 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Business
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
                    Talk to sales
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
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/90">
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
                  <p className="text-sm leading-relaxed text-primary-foreground/78">{heroMeta.buyer}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/45">
                    Workflow focus
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
          <motion.div {...fadeUp} className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mb-4 text-3xl font-extrabold">{feature.title}</h2>
              <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
                {feature.sectionDescription}
              </p>

              <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Use cases
              </h4>
              <div className="mb-6 flex flex-wrap gap-2">
                {feature.useCases.map((useCase) => (
                  <span
                    key={useCase}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {useCase}
                  </span>
                ))}
              </div>

              <h4 className="mb-3 font-bold">Benefits</h4>
              <ul className="mb-6 space-y-2">
                {feature.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <Link to="/contact">
                  <Button size="sm">Contact sales</Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" size="sm">View pricing</Button>
                </Link>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-8">
                <h4 className="mb-4 font-bold">How it works</h4>
                <div className="space-y-4">
                  {feature.steps.map((step, index) => (
                    <div key={step} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface-subtle p-8">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Review lens
                </p>
                <h4 className="mb-3 text-xl font-extrabold text-foreground">
                  A more legible business workflow
                </h4>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  This page is designed to explain one operating scenario clearly, which makes
                  the business section read more like a platform with defined workflows and less
                  like a broad marketing summary.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Buyer</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">Ops and finance</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Story</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">Workflow-led</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Style</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">Structured and clear</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-tight mx-auto">
          <h2 className="mb-8 text-center text-2xl font-extrabold">Common questions</h2>
          <div className="mx-auto max-w-2xl space-y-3">
            {feature.faqs.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-medium">
                  {faq.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-hero section-padding text-center text-primary-foreground">
        <div className="container-tight mx-auto">
          <h2 className="mb-4 text-3xl font-extrabold">Ready to explore this business workflow?</h2>
          <p className="mx-auto mb-8 max-w-md text-primary-foreground/72">
            Talk to our team about how this flow can fit your operating model and cross-border finance needs.
          </p>
          <Link to="/contact">
            <Button variant="hero" size="lg">
              Talk to sales
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
