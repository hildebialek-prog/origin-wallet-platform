import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, MapPin, MessageCircle, HelpCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  company: z.string().trim().max(100).optional(),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div>
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-tight mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Get in touch</h1>
            <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto leading-relaxed">
              Contact us about Origin Wallet product flows, platform capabilities, partnership
              conversations, or operational questions related to cross-border financial workflows.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-primary-foreground/80">
              {[
                "Partnership enquiries",
                "Product and workflow questions",
                "Security and platform follow-up",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/12 bg-white/5 px-4 py-2 backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide mx-auto">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card rounded-2xl border border-border p-12 text-center"
                  >
                    <CheckCircle2 className="w-16 h-16 text-accent mx-auto mb-6" />
                    <h2 className="text-2xl font-extrabold mb-3">Message captured</h2>
                    <p className="text-muted-foreground mb-6">
                      Thank you for reaching out. Our team will review your message and follow up using the contact details you provided.
                    </p>
                    <Button variant="hero" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", company: "", subject: "", message: "" }); }}>
                      Send another message
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    className="bg-card rounded-2xl border border-border p-8 space-y-5"
                  >
                    <h2 className="text-xl font-bold mb-2">Send us a message</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Use this form for partnership requests, product questions, or general
                      platform enquiries.
                    </p>
                    {[
                      { field: "name", label: "Name *", type: "text", placeholder: "Your full name" },
                      { field: "email", label: "Email *", type: "email", placeholder: "your@email.com" },
                      { field: "company", label: "Company", type: "text", placeholder: "Your company (optional)" },
                      { field: "subject", label: "Subject *", type: "text", placeholder: "How can we help?" },
                    ].map(({ field, label, type, placeholder }) => (
                      <div key={field}>
                        <label className="text-sm font-medium mb-1.5 block">{label}</label>
                        <input
                          type={type}
                          value={form[field as keyof typeof form]}
                          onChange={(e) => handleChange(field, e.target.value)}
                          placeholder={placeholder}
                          className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
                            errors[field] ? "border-destructive" : "border-border"
                          }`}
                        />
                        {errors[field] && <p className="text-destructive text-xs mt-1">{errors[field]}</p>}
                      </div>
                    ))}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Message *</label>
                      <textarea
                        rows={5}
                        value={form.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        placeholder="Tell us more..."
                        className={`w-full px-4 py-3 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent resize-none transition-colors ${
                          errors.message ? "border-destructive" : "border-border"
                        }`}
                      />
                      {errors.message && <p className="text-destructive text-xs mt-1">{errors.message}</p>}
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full sm:w-auto">
                      Send message <Send className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-2xl border border-border p-8">
                <div className="flex items-center gap-2 font-extrabold text-lg mb-2">
                  <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-accent-foreground text-xs font-black">O</div>
                  ORIGIN WALLET
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Origin Wallet is operated by KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY, a
                  technology company based in Ha Noi, Viet Nam, building provider-connected
                  financial workflows and cross-border product experiences.
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-8">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-accent" />
                  <h3 className="font-bold">Company details</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">Legal entity:</strong> CONG TY CO PHAN CONG NGHE KHOI NGUYEN
                  </p>
                  <p>
                    <strong className="text-foreground">International name:</strong> KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY
                  </p>
                  <p>
                    <strong className="text-foreground">Tax ID:</strong> 0111409165
                  </p>
                  <p>
                    <strong className="text-foreground">Email:</strong> info@khoinguyentechnology.com
                  </p>
                  <p>
                    <strong className="text-foreground">Address:</strong> So 23 ngach 157/6 Duc Giang, To 18, Phuong Viet Hung, Ha Noi, Viet Nam
                  </p>
                  <p>
                    <strong className="text-foreground">Company website:</strong> khoinguyentechnology.com
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-8">
                <h3 className="font-bold mb-4">Quick links</h3>
                <div className="space-y-3">
                  {[
                    { icon: HelpCircle, label: "Help center", href: "/help" },
                    { icon: MessageCircle, label: "FAQs", href: "/help" },
                    { icon: Shield, label: "Security", href: "/security" },
                    { icon: MapPin, label: "Legal & policies", href: "/policies" },
                  ].map((link) => (
                    <Link key={link.label} to={link.href} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <link.icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
