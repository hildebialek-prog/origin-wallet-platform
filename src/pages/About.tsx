import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, Heart, Eye, Users, ArrowRight, Download } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const About = () => {
  return (
    <div>
      {/* Hero */}
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-tight mx-auto text-center">
          <motion.div {...fadeUp}>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Our story</h1>
            <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
              Origin Wallet was built on a simple belief: moving money across borders should be transparent, fair, and accessible to everyone.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why we exist */}
      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl font-extrabold mb-6 text-center">Why we exist</h2>
            <div className="text-muted-foreground space-y-4 leading-relaxed text-lg max-w-2xl mx-auto">
              <p>
                For decades, sending money internationally has been expensive, slow, and opaque. Banks and traditional providers 
                hide their fees in exchange rate markups, making it nearly impossible to know the true cost of a transfer.
              </p>
              <p>
                We started Origin Wallet to change that. We believe everyone — whether you're sending money home to family, 
                paying a supplier abroad, or managing a global business — deserves to see exactly what they're paying.
              </p>
              <p>
                Our name reflects our philosophy: going back to the <strong className="text-foreground">origin</strong> of fair finance. 
                Building something from the ground up with transparency as the foundation, not an afterthought.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Mission & values</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Target, title: "Transparency", desc: "Every fee, every rate, every step — visible to you before you decide." },
              { icon: Heart, title: "Fairness", desc: "The real exchange rate for everyone. No tiered pricing or hidden markups." },
              { icon: Eye, title: "Simplicity", desc: "Moving money should be as easy as sending a message. We keep it simple." },
              { icon: Users, title: "Accessibility", desc: "Built for everyone — from individuals to enterprises, in 170+ countries." },
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

      {/* Timeline */}
      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Our journey</h2>
          </motion.div>

          <div className="space-y-8 max-w-xl mx-auto">
            {[
              { year: "2022", title: "The idea", desc: "Frustrated by hidden bank fees, our founders set out to build a better way to move money globally." },
              { year: "2023", title: "Building the foundation", desc: "Development begins on the Origin Wallet platform. Early testing with a small group of users." },
              { year: "2024", title: "Platform launch", desc: "Origin Wallet launches with support for 50+ currencies and transparent pricing from day one." },
              { year: "2025", title: "Growing globally", desc: "Expanding coverage, launching business features, and growing our user base across continents." },
              { year: "2026", title: "Looking ahead", desc: "Continuing to build the most transparent, fair, and accessible money platform in the world." },
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

      {/* Team */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Leadership</h2>
            <p className="text-muted-foreground">The team behind Origin Wallet.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Team Member", role: "CEO & Co-Founder" },
              { name: "Team Member", role: "CTO & Co-Founder" },
              { name: "Team Member", role: "Head of Product" },
              { name: "Team Member", role: "Head of Compliance" },
            ].map((person, i) => (
              <motion.div key={i} {...fadeUp} className="bg-card rounded-2xl border border-border p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold">{person.name}</h3>
                <p className="text-sm text-muted-foreground">{person.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Press kit */}
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

      {/* Parent company */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-tight mx-auto text-center">
          <motion.div {...fadeUp}>
            <p className="text-muted-foreground text-sm mb-2">Origin Wallet is a platform by</p>
            <p className="text-xl font-bold mb-4">KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY</p>
            <Link to="/contact">
              <Button variant="hero" size="lg">Get in touch <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
