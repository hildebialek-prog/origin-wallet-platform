import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lock,
  Server,
  Shield,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const securityFaqs = [
  {
    q: "How is platform data protected?",
    a: "Security-related responsibilities and measures may differ across Origin Wallet platform components and third-party services.",
  },
  {
    q: "What happens if there is a security incident?",
    a: "Operational security events are expected to follow internal review, escalation, and response procedures appropriate to the severity of the issue.",
  },
  {
    q: "Do you share data with third parties?",
    a: "Platform workflows may require data sharing with service providers and financial or payment partners where needed to support the relevant service.",
  },
  {
    q: "How do I report a security concern?",
    a: "Security concerns can be reported through our contact page so the appropriate team can review and respond.",
  },
];

const Security = () => {
  const securitySchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: securityFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <div>
      <Seo
        title="Origin Wallet Security | Platform Controls, Protection & Trust"
        description="Read about Origin Wallet security considerations, access management, operational review, and provider-aware platform practices."
        path="/security"
        image="/content/banner.jpg"
        schema={securitySchema}
      />
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto text-center">
          <motion.div {...fadeUp}>
            <Shield className="mx-auto mb-6 h-16 w-16 text-accent" />
            <h1 className="mb-4 text-4xl font-extrabold sm:text-5xl">
              Security and control designed into the platform
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-primary-foreground/70">
              Origin Wallet is being designed with security considerations, access restrictions,
              operational review, and provider-aware requirements for modern financial workflows.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-extrabold">Our security principles</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              The platform approach considers access restrictions, operational review, and clearer
              control points across Origin Wallet workflows.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Lock,
                title: "Security practices",
                desc: "Security-related responsibilities and measures may differ by platform component and service provider.",
              },
              {
                icon: Eye,
                title: "Privacy by design",
                desc: "We aim to collect information relevant to platform workflows, reviews, and applicable provider requirements.",
              },
              {
                icon: AlertTriangle,
                title: "Risk monitoring",
                desc: "Operational review states are designed to help surface exceptions and workflow risks.",
              },
              {
                icon: Server,
                title: "Infrastructure security",
                desc: "Specific infrastructure controls may differ across platform components and third-party providers.",
              },
              {
                icon: Shield,
                title: "Access controls",
                desc: "Access restrictions are applied according to platform roles and the capabilities available to each user.",
              },
              {
                icon: CheckCircle2,
                title: "Review posture",
                desc: "Security-related information may be updated as the platform architecture and supported workflows change.",
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                className="rounded-2xl border border-border bg-card p-8"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-extrabold">Trust dashboard</h2>
            <p className="text-muted-foreground">
              Snapshot of the platform security posture and operating model.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "System posture", value: "Operational controls", color: "text-accent" },
              { label: "Transport protection", value: "Secure connection practices", color: "text-accent" },
              { label: "Access model", value: "Access restrictions appropriate to platform roles", color: "text-foreground" },
              { label: "Monitoring", value: "Operational review", color: "text-accent" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-card p-6 text-center">
                <div className="mb-2 text-sm text-muted-foreground">{item.label}</div>
                <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                <div className="mx-auto mt-3 h-2 w-2 rounded-full bg-accent" />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp}>
            <h2 className="mb-6 text-center text-2xl font-extrabold">
              Compliance and verification
            </h2>
            <div className="mx-auto max-w-2xl space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Origin Wallet is built with an awareness that financial workflows may require
                provider-led verification, jurisdiction-specific checks, and ongoing review controls
                depending on the service used.
              </p>
              <p>
                Verification, onboarding, and transaction review steps may apply before certain
                financial actions are completed. These controls help support fraud prevention,
                compliance expectations, and partner operating requirements.
              </p>
              <p>
                Compliance and security expectations can vary by provider, jurisdiction, and
                product flow, which is why the platform is designed to surface operational states
                more clearly.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-surface-subtle">
        <div className="container-tight mx-auto">
          <h2 className="mb-8 text-center text-2xl font-extrabold">Security FAQ</h2>
          <div className="mx-auto max-w-2xl space-y-3">
            {securityFaqs.map((faq, i) => (
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
        </div>
      </section>

      <section className="bg-hero section-padding text-center text-primary-foreground">
        <div className="container-tight mx-auto">
          <h2 className="mb-4 text-3xl font-extrabold">
            Talk with us about platform security
          </h2>
          <p className="mx-auto mb-8 max-w-md text-primary-foreground/70">
            If you need more detail on security posture, operational controls, or partner-readiness,
            get in touch.
          </p>
          <Link to="/contact">
            <Button variant="hero" size="lg">
              Contact us <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-primary-foreground/75">
            <Link to="/terms" className="hover:text-white hover:underline">
              Legal & policies
            </Link>
            <Link to="/help" className="hover:text-white hover:underline">
              Help center
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Security;
