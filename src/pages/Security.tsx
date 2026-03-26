import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

const Security = () => {
  return (
    <div>
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto text-center">
          <motion.div {...fadeUp}>
            <Shield className="mx-auto mb-6 h-16 w-16 text-accent" />
            <h1 className="mb-4 text-4xl font-extrabold sm:text-5xl">
              Security and control designed into the platform
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-primary-foreground/70">
              Origin Wallet is being designed around secure product flows, access controls,
              operational monitoring, and provider-aware compliance expectations for modern
              financial operations.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-extrabold">Our security principles</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              The platform approach is built around secure handling of financial workflows,
              role-based access, and clearer control points across provider-connected systems.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Lock,
                title: "Encryption at rest and in transit",
                desc: "Sensitive information is intended to be protected through encrypted storage practices and secure transport.",
              },
              {
                icon: Eye,
                title: "Privacy by design",
                desc: "We aim to collect only the operational data required for platform workflows, reviews, and regulated partner requirements.",
              },
              {
                icon: AlertTriangle,
                title: "Risk monitoring",
                desc: "Operational monitoring and review states are designed to help identify unusual activity, exceptions, and workflow risks.",
              },
              {
                icon: Server,
                title: "Infrastructure security",
                desc: "Platform services are designed around resilient infrastructure, environment separation, and controlled operational changes.",
              },
              {
                icon: Shield,
                title: "Access controls",
                desc: "Role-based permissions, auditability, and restricted system access help protect sensitive operational workflows.",
              },
              {
                icon: CheckCircle2,
                title: "Review posture",
                desc: "Security posture is strengthened through continuous review, hardening, and improvement of platform behavior over time.",
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
              { label: "Encryption", value: "AES-256 / TLS 1.3", color: "text-accent" },
              { label: "Access model", value: "Role-based controls", color: "text-foreground" },
              { label: "Monitoring", value: "Continuous", color: "text-accent" },
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
            {[
              {
                q: "How is platform data protected?",
                a: "Sensitive data is intended to be handled through encrypted transport, controlled storage practices, and role-based access restrictions.",
              },
              {
                q: "What happens if there is a security incident?",
                a: "Operational security events are expected to follow internal review, escalation, and response procedures appropriate to the severity of the issue.",
              },
              {
                q: "Do you share data with third parties?",
                a: "Platform workflows may require data sharing with trusted service providers and regulated partners where needed to support the financial operation.",
              },
              {
                q: "How do I report a security concern?",
                a: "Security concerns can be reported through our contact page so the appropriate team can review and respond.",
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
        </div>
      </section>
    </div>
  );
};

export default Security;
