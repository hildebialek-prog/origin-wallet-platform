import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight, Globe, Wallet, Building2, Send, Shield,
  CreditCard, TrendingUp, Users, Star, ChevronDown, Play
} from "lucide-react";

// High-quality magazine-style images
const heroBg = "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&h=1080&fit=crop";
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

const Index = () => {
  return (
    <div>
      {/* ===== HERO MAGAZINE STYLE ===== */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{ 
            backgroundImage: `url(${heroBg})`, 
            backgroundSize: "cover", 
            backgroundPosition: "center",
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30 z-10" />
        
        {/* Magazine Date */}
        <div className="absolute top-24 left-6 sm:left-12 z-20">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-white">
            <div className="text-xs uppercase tracking-widest opacity-70">Published</div>
            <div className="text-lg font-bold">March 2026</div>
          </div>
        </div>

        <div className="relative z-20 container-wide mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-4xl">
            <motion.div {...fadeUp}>
              <span className="inline-block px-4 py-1.5 bg-accent text-white text-sm font-semibold rounded-full mb-6">
                Cover Story
              </span>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-[0.95] mb-8">
                THE FUTURE
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-400">
                  OF MONEY
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-white/80 max-w-2xl leading-relaxed mb-10">
                Discover how digital wallets and borderless payments are reshaping global finance in 2026 and beyond.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/contact">
                  <Button variant="hero" size="lg" className="text-base px-8">
                    <Play className="w-4 h-4 mr-2" /> Contact Us
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="hero-outline" size="lg" className="text-base px-8">
                    Read Article
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
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

      {/* ===== MAGAZINE FEATURE STORY ===== */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Large Feature Image */}
            <div className="lg:col-span-7 relative group overflow-hidden rounded-2xl aspect-[16/10]">
              <img 
                src={featureImg1} 
                alt="Global Finance" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded mb-3">
                  In-Depth
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Breaking Down Borders: The New Era of International Payments
                </h3>
                <p className="text-white/80 max-w-lg">
                  Traditional banking is fading. Discover how fintech is making money moves instant, transparent, and accessible to everyone.
                </p>
              </div>
            </div>

            {/* Side Stories */}
            <div className="lg:col-span-5 space-y-4">
              <motion.div {...fadeUp} className="relative group overflow-hidden rounded-xl aspect-[16/9]">
                <img 
                  src={featureImg2} 
                  alt="Business" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="inline-block px-2 py-1 bg-accent text-white text-xs font-semibold rounded mb-2">
                    Business
                  </span>
                  <h4 className="text-lg font-bold text-white">Managing Multi-Currency in the Modern Age</h4>
                </div>
              </motion.div>

              <motion.div {...fadeUp} className="relative group overflow-hidden rounded-xl aspect-[16/9]">
                <img 
                  src={featureImg3} 
                  alt="Personal" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="inline-block px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded mb-2">
                    Personal
                  </span>
                  <h4 className="text-lg font-bold text-white">Your Guide to Smart International Transfers</h4>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== STATS MAGAZINE STRIP ===== */}
      <section className="bg-primary text-primary-foreground py-12 md:py-16">
        <div className="container-wide mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "170+", label: "Countries", icon: Globe },
              { value: "50+", label: "Currencies", icon: Wallet },
              { value: "4.9★", label: "Rating", icon: Star },
              { value: "99.9%", label: "Uptime", icon: Shield },
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

      {/* ===== SERVICES MAGAZINE LAYOUT ===== */}
      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          {/* Section Header */}
          <motion.div {...fadeUp} className="mb-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
              What We Offer
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Our Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Comprehensive financial solutions for the modern world
            </p>
          </motion.div>

          {/* Services Grid - Magazine Style */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Send,
                title: "International Transfers",
                desc: "Send money globally with real exchange rates and minimal fees",
                color: "bg-blue-500",
              },
              {
                icon: Wallet,
                title: "Multi-Currency Wallet",
                desc: "Hold and manage 50+ currencies in one secure wallet",
                color: "bg-green-500",
              },
              {
                icon: Building2,
                title: "Business Payments",
                desc: "Streamline supplier payments and contractor payouts worldwide",
                color: "bg-purple-500",
              },
              {
                icon: CreditCard,
                title: "Virtual Cards",
                desc: "Create virtual cards for online transactions in any currency",
                color: "bg-orange-500",
              },
              {
                icon: TrendingUp,
                title: "Rate Alerts",
                desc: "Get notified when rates hit your target for better conversions",
                color: "bg-pink-500",
              },
              {
                icon: Shield,
                title: "Bank-Grade Security",
                desc: "256-bit encryption and advanced fraud protection",
                color: "bg-indigo-500",
              },
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
                <Link to="/pricing" className="inline-flex items-center gap-1 text-accent font-medium mt-4 hover:gap-2 transition-all">
                  Learn more <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FULL WIDTH IMAGE BREAK ===== */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={ctaBg} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/90" />
        </div>
        <div className="relative z-10 container-wide mx-auto px-4 text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
              "Money Without Borders"
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Our mission is to make international finance accessible, transparent, and fair for everyone, everywhere.
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

      {/* ===== TESTIMONIALS MAGAZINE ===== */}
      <section className="section-padding bg-surface-subtle">
        <div className="container-wide mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full mb-4">
              Voices
            </span>
            <h2 className="text-4xl md:text-5xl font-black">What People Say</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "Origin Wallet changed how I manage my freelance income from international clients.",
                name: "Sarah Mitchell",
                role: "Freelance Designer",
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
              },
              {
                quote: "We've saved thousands in transfer fees since switching to Origin Wallet for supplier payments.",
                name: "David Chen",
                role: "CFO, Tech Startup",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
              },
              {
                quote: "The multi-currency wallet is perfect for my digital nomad lifestyle.",
                name: "Minh Tran",
                role: "Digital Nomad",
                avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
              },
            ].map((testimonial, i) => (
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
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-3">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA MAGAZINE STYLE ===== */}
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
              Join thousands of users who trust Origin Wallet for their international money transfers.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact">
                <Button variant="hero" size="lg" className="text-base px-10">
                  Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
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
