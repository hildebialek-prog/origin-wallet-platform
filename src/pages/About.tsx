import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, Heart, Eye, Users, ArrowRight, Download, User, CreditCard, Globe, Shield, Smartphone, Wallet, Banknote, RefreshCw } from "lucide-react";
import content1 from "/content/content1.jpg";
import content2 from "/content/content2.jpg";
import content3 from "/content/content3.jpg";

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
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-muted-foreground space-y-4 leading-relaxed text-lg">
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
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <img 
                  src={content1} 
                  alt="Why we exist" 
                  className="rounded-2xl shadow-xl w-full h-auto object-cover"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission & Values */}
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

      {/* Seamless Payments Section */}
      <section className="section-padding bg-background">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Seamless Global Payments</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Send and receive money anywhere in the world with just a few taps. Fast, secure, and transparent.
            </p>
          </motion.div>

          {/* Payment Feature 1: Card Payments */}
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
                    <h3 className="text-xl font-bold">Card Payments</h3>
                    <p className="text-muted-foreground text-sm">Visa, Mastercard & more</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Instant funding from any debit/credit card</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Secure 3D authentication</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Support for 150+ currencies</span>
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
              <img 
                src={content3} 
                alt="Card Payments" 
                className="rounded-2xl shadow-xl w-full h-auto object-cover"
              />
            </motion.div>
          </div>

          {/* Payment Feature 2: Bank Transfers */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img 
                src={content1} 
                alt="Bank Transfers" 
                className="rounded-2xl shadow-xl w-full h-auto object-cover"
              />
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
                    <h3 className="text-xl font-bold">Bank Transfers</h3>
                    <p className="text-muted-foreground text-sm">Direct to bank accounts</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <span>SWIFT & local bank transfers</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <span>Low fees, always transparent</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <span>Track transfers in real-time</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Payment Feature 3: Mobile Wallets */}
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
                    <h3 className="text-xl font-bold">Mobile Wallets</h3>
                    <p className="text-muted-foreground text-sm">Pay your way</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Apple Pay & Google Pay integration</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>QR code payments</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Contactless NFC payments</span>
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
              <img 
                src={content2} 
                alt="Mobile Payments" 
                className="rounded-2xl shadow-xl w-full h-auto object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Why choose Origin Wallet?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Experience the future of international payments with these advantages.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Globe, title: "170+ Countries", desc: "Send money to over 170 countries worldwide with extensive coverage.", color: "blue" },
              { icon: Shield, title: "Bank-Grade Security", desc: "Your funds are protected with industry-leading encryption and security.", color: "green" },
              { icon: RefreshCw, title: "Real-Time Exchange", desc: "Get live exchange rates with no markups or hidden spreads.", color: "purple" },
              { icon: Wallet, title: "Multi-Currency Wallet", desc: "Hold and manage multiple currencies in one secure wallet.", color: "orange" },
              { icon: CreditCard, title: "Virtual Cards", desc: "Create virtual cards for online shopping with full control.", color: "pink" },
              { icon: Users, title: "24/7 Support", desc: "Our support team is available around the clock to help you.", color: "cyan" },
            ].map((feature, i) => (
              <motion.div 
                key={feature.title} 
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 dark:bg-${feature.color}-900/30 flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
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
                <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-muted flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
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
      <section className="section-padding bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container-tight mx-auto">
          <motion.div {...fadeUp} className="text-center">
            {/* Company Logo */}
            <div className="mb-6">
              <img 
                src="/logo/knt-logo.svg" 
                alt="KNT - Khoi Nguyen Technology" 
                className="h-20 w-auto mx-auto"
              />
            </div>
            
            <p className="text-blue-100 text-sm mb-2 uppercase tracking-wider">Powered by</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              CÔNG TY CỔ PHẦN CÔNG NGHỆ KHỞI NGUYÊN
            </h2>
            <p className="text-blue-100 text-lg mb-6">
              Khoi Nguyen Technology Joint Stock Company
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">2022</div>
                <div className="text-blue-200 text-sm">Năm thành lập</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">170+</div>
                <div className="text-blue-200 text-sm">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">50+</div>
                <div className="text-blue-200 text-sm">Tiền tệ</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">1M+</div>
                <div className="text-blue-200 text-sm">Users</div>
              </div>
            </div>
            
            <Link to="/contact">
              <Button variant="secondary" size="lg" className="gap-2">
                Contact us <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
