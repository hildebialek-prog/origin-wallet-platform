import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, AlertTriangle, Server, CheckCircle2, ChevronRight, ArrowRight } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const Security = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto text-center">
          <motion.div {...fadeUp}>
            <Shield className="w-16 h-16 text-accent mx-auto mb-6" />
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
              Security you can trust
            </h1>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
              Protecting your money and data is our top priority. Here's how we keep everything safe.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Security Principles */}
      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Our security principles</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              We follow industry best practices to keep your funds and personal information safe.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: "Encryption at rest & in transit", desc: "All data is encrypted using AES-256 encryption at rest and TLS 1.3 for data in transit. Your information is never stored in plain text." },
              { icon: Eye, title: "Privacy by design", desc: "We collect only the data we need and give you full control over your information. We never sell your data to third parties." },
              { icon: AlertTriangle, title: "Fraud prevention", desc: "Real-time monitoring systems watch for suspicious activity around the clock. Unusual transactions are flagged and reviewed immediately." },
              { icon: Server, title: "Infrastructure security", desc: "Our systems run on enterprise-grade infrastructure with redundancy, regular backups, and disaster recovery procedures." },
              { icon: Shield, title: "Access controls", desc: "Strict role-based access controls ensure only authorized personnel can access sensitive systems. All access is logged and audited." },
              { icon: CheckCircle2, title: "Regular testing", desc: "We conduct regular security assessments and work with independent security researchers to identify and fix vulnerabilities." },
            ].map((item) => (
              <motion.div key={item.title} {...fadeUp} className="bg-card rounded-2xl border border-border p-8">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Dashboard (Visual only) */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Trust dashboard</h2>
            <p className="text-muted-foreground">Real-time overview of our security posture.</p>
          </motion.div>

          <motion.div {...fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { label: "System status", value: "Operational", color: "text-accent" },
              { label: "Encryption", value: "AES-256 / TLS 1.3", color: "text-accent" },
              { label: "Last security audit", value: "Q4 2025", color: "text-foreground" },
              { label: "Uptime (30 days)", value: "99.97%", color: "text-accent" },
            ].map((item) => (
              <div key={item.label} className="bg-card rounded-2xl border border-border p-6 text-center">
                <div className="text-sm text-muted-foreground mb-2">{item.label}</div>
                <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                <div className="w-2 h-2 rounded-full bg-accent mx-auto mt-3" />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Compliance */}
      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp}>
            <h2 className="text-2xl font-extrabold mb-6 text-center">Compliance & verification</h2>
            <div className="text-muted-foreground space-y-4 leading-relaxed max-w-2xl mx-auto">
              <p>
                Origin Wallet operates with a commitment to regulatory compliance. Depending on the services used and your jurisdiction, 
                verification steps may apply as required by our partners and local regulations.
              </p>
              <p>
                We may ask you to verify your identity before processing certain transactions. This is a standard practice 
                designed to prevent fraud, money laundering, and other financial crimes.
              </p>
              <p>
                Our compliance team continuously monitors regulatory developments to ensure our practices meet or exceed 
                applicable requirements.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security FAQ */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-tight mx-auto">
          <h2 className="text-2xl font-extrabold mb-8 text-center">Security FAQ</h2>
          <div className="space-y-3 max-w-2xl mx-auto">
            {[
              { q: "How is my data protected?", a: "All personal and financial data is encrypted using AES-256 at rest and TLS 1.3 in transit. We follow strict data handling procedures." },
              { q: "What happens if there's a security incident?", a: "We have a dedicated incident response team. In the event of a security incident, affected users will be notified promptly with clear information and next steps." },
              { q: "Do you share my data with third parties?", a: "We never sell your data. We share information only with trusted partners necessary to process your transactions, and only as required." },
              { q: "How do I report a security concern?", a: "You can report security concerns through our contact page. We take all reports seriously and investigate promptly." },
            ].map((faq, i) => (
              <details key={i} className="bg-card rounded-xl border border-border group">
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

      {/* CTA */}
      <section className="section-padding bg-hero text-primary-foreground text-center">
        <div className="container-tight mx-auto">
          <h2 className="text-3xl font-extrabold mb-4">Your security is our priority</h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            Have questions about how we protect your money and data? Get in touch.
          </p>
          <Link to="/contact">
            <Button variant="hero" size="lg">Contact us <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Security;
