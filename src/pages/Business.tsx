import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Building2, Send, Users, Code, Shield, ArrowRight, CheckCircle2, ChevronRight, BarChart3 } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const modules = [
  {
    icon: Send,
    title: "Pay suppliers globally",
    desc: "Send payments to suppliers and contractors in 170+ countries. Transparent fees, real exchange rates, no surprises.",
    useCases: ["Manufacturing payments", "Freelancer invoices", "Service provider settlements", "Recurring vendor payments"],
    benefits: ["Save up to 6x vs traditional banks", "Pay in recipient's local currency", "Track all payments centrally", "Set up recurring payments"],
    steps: ["Enter supplier details and amount", "Review transparent fee breakdown", "Confirm and send payment", "Supplier receives funds in 1–2 days"],
  },
  {
    icon: BarChart3,
    title: "Receive international payments",
    desc: "Get paid by clients worldwide using local account details. Funds land in your multi-currency wallet without conversion fees.",
    useCases: ["Client invoice payments", "Marketplace payouts", "International sales revenue", "Cross-border collections"],
    benefits: ["Local account details in multiple currencies", "No incoming wire fees", "Automatic reconciliation", "Real-time notifications"],
    steps: ["Get your local account details", "Share with clients or embed in invoices", "Receive funds without conversion", "Hold or convert when rates are favorable"],
  },
  {
    icon: Users,
    title: "Batch payments & payouts",
    desc: "Pay hundreds of recipients in one go. Upload a file or use our API. Perfect for payroll, affiliate payouts, and refunds.",
    useCases: ["International payroll", "Affiliate commissions", "Marketplace seller payouts", "Dividend distributions", "Mass refunds"],
    benefits: ["Pay up to 1,000 recipients per batch", "Multiple currencies in one batch", "Detailed payment tracking", "Error handling and retry"],
    steps: ["Prepare your payment file (CSV/Excel)", "Upload and validate recipients", "Review total cost and fees", "Confirm and process the batch"],
  },
  {
    icon: Code,
    title: "API & integrations",
    desc: "Connect Origin Wallet to your systems. Automate payments, check rates, and manage transfers programmatically.",
    useCases: ["ERP integration", "Accounting automation", "E-commerce payouts", "Custom payment workflows"],
    benefits: ["RESTful API with comprehensive docs", "Webhooks for real-time updates", "Sandbox environment for testing", "Dedicated integration support"],
    steps: ["Request API access", "Explore docs and test in sandbox", "Integrate with your systems", "Go live with production credentials"],
  },
  {
    icon: Shield,
    title: "Roles & permissions",
    desc: "Control who can do what. Set up approval workflows, spending limits, and role-based access for your team.",
    useCases: ["Multi-level approval flows", "Department budgets", "Audit compliance", "Team onboarding"],
    benefits: ["Admin, approver, and viewer roles", "Custom approval thresholds", "Activity audit logs", "SSO integration support"],
    steps: ["Invite team members", "Assign roles and permissions", "Set up approval workflows", "Monitor with audit logs"],
  },
];

const Business = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-wide mx-auto text-center">
          <motion.div {...fadeUp}>
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/20 text-accent rounded-full mb-4">
              Business
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
              Global payments, simplified
            </h1>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-8">
              Pay suppliers, receive payments, and manage international finances — with full transparency and control.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/contact">
                <Button variant="hero" size="lg">Talk to sales <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
              <Link to="/pricing">
                <Button variant="hero-outline" size="lg">See pricing</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Modules */}
      {modules.map((mod, idx) => (
        <section key={mod.title} className={`section-padding ${idx % 2 === 0 ? "bg-background" : "bg-surface-subtle"}`}>
          <div className="container-wide mx-auto">
            <motion.div {...fadeUp} className="grid lg:grid-cols-2 gap-12 items-start">
              <div className={idx % 2 === 1 ? "lg:order-2" : ""}>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <mod.icon className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-3xl font-extrabold mb-4">{mod.title}</h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{mod.desc}</p>

                <h4 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Use cases</h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  {mod.useCases.map((uc) => (
                    <span key={uc} className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">{uc}</span>
                  ))}
                </div>

                <h4 className="font-bold mb-3">Benefits</h4>
                <ul className="space-y-2 mb-6">
                  {mod.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="flex gap-3">
                  <Link to="/contact"><Button size="sm">Contact sales</Button></Link>
                  <Link to="/pricing"><Button variant="outline" size="sm">View pricing</Button></Link>
                </div>
              </div>

              <div className={`bg-card rounded-2xl border border-border p-8 ${idx % 2 === 1 ? "lg:order-1" : ""}`}>
                <h4 className="font-bold mb-4">How it works</h4>
                <div className="space-y-4">
                  {mod.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <p className="text-muted-foreground pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="section-padding bg-hero text-primary-foreground text-center">
        <div className="container-tight mx-auto">
          <h2 className="text-3xl font-extrabold mb-4">Ready to streamline your business payments?</h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            Talk to our team about how Origin Wallet can save you time and money on international payments.
          </p>
          <Link to="/contact">
            <Button variant="hero" size="lg">Talk to sales <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Business;
