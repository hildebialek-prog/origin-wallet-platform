import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { z } from "zod";
import {
  CheckCircle2,
  HelpCircle,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import { toast } from "@/components/ui/use-toast";
import {
  ContactSubmissionError,
  submitContactMessage,
  type ContactFormRequest,
} from "@/services/contactService";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.string().trim().email("Please enter a valid email").max(255),
  company: z.string().trim().max(255).optional(),
  subject: z.string().trim().min(1, "Subject is required").max(255),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

const emptyForm = {
  name: "",
  email: "",
  company: "",
  subject: "",
  message: "",
};

const Contact = () => {
  const contactSchemaData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Origin Wallet",
    url: "https://khoinguyenoriginwallet.com/contact",
    description:
      "Contact Origin Wallet for product enquiries, partnerships, support, security follow-up, and cross-border payment workflow discussions.",
    mainEntity: {
      "@type": "Organization",
      name: "Origin Wallet",
      email: "info@khoinguyentechnology.com",
      url: "https://khoinguyenoriginwallet.com/",
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "info@khoinguyentechnology.com",
          availableLanguage: ["en", "vi"],
        },
      ],
    },
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload: ContactFormRequest = {
        name: result.data.name,
        email: result.data.email,
        subject: result.data.subject,
        message: result.data.message,
        ...(result.data.company?.trim() ? { company: result.data.company.trim() } : {}),
      };

      const response = await submitContactMessage(payload);

      setForm(emptyForm);
      setSubmitted(true);

      toast({
        title: "Message sent",
        description: response.message || "Contact message submitted successfully.",
      });
    } catch (error) {
      if (error instanceof ContactSubmissionError && error.status === 422 && error.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(error.errors).forEach(([field, messages]) => {
          if (messages?.length) {
            fieldErrors[field] = messages[0];
          }
        });
        setErrors(fieldErrors);
      }

      toast({
        variant: "destructive",
        title: "Send failed",
        description:
          error instanceof ContactSubmissionError
            ? error.message || "Send message failed, please try again."
            : "Send message failed, please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Seo
        title="Contact Origin Wallet | Sales, Partnerships & Support"
        description="Contact Origin Wallet for product enquiries, partnerships, support, security follow-up, and cross-border payment workflow discussions."
        path="/contact"
        image="/content/banner.jpg"
        schema={contactSchemaData}
      />
      <section className="bg-hero text-primary-foreground section-padding">
        <div className="container-tight mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-4 text-4xl font-extrabold sm:text-5xl">Get in touch</h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-primary-foreground/70">
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
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-border bg-card p-12 text-center"
                  >
                    <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-accent" />
                    <h2 className="mb-3 text-2xl font-extrabold">Message captured</h2>
                    <p className="mb-6 text-muted-foreground">
                      Thank you for reaching out. Our team will review your message and follow up
                      using the contact details you provided.
                    </p>
                    <Button
                      variant="hero"
                      onClick={() => {
                        setSubmitted(false);
                        setForm(emptyForm);
                      }}
                    >
                      Send another message
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={(event) => void handleSubmit(event)}
                    className="space-y-5 rounded-2xl border border-border bg-card p-8"
                  >
                    <h2 className="mb-2 text-xl font-bold">Send us a message</h2>
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
                        <label className="mb-1.5 block text-sm font-medium">{label}</label>
                        <input
                          type={type}
                          value={form[field as keyof typeof form]}
                          onChange={(e) => handleChange(field, e.target.value)}
                          placeholder={placeholder}
                          disabled={isSubmitting}
                          className={`w-full rounded-xl border bg-background px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-70 ${
                            errors[field] ? "border-destructive" : "border-border"
                          }`}
                        />
                        {errors[field] && (
                          <p className="mt-1 text-xs text-destructive">{errors[field]}</p>
                        )}
                      </div>
                    ))}

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Message *</label>
                      <textarea
                        rows={5}
                        value={form.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        placeholder="Tell us more..."
                        disabled={isSubmitting}
                        className={`w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-70 ${
                          errors.message ? "border-destructive" : "border-border"
                        }`}
                      />
                      {errors.message && (
                        <p className="mt-1 text-xs text-destructive">{errors.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          Sending...
                          <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          Send message <Send className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-8">
                <div className="mb-2 flex items-center gap-2 text-lg font-extrabold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-black text-accent-foreground">
                    O
                  </div>
                  ORIGIN WALLET
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Origin Wallet is operated by KHOI NGUYEN TECHNOLOGY JOINT STOCK COMPANY, a
                  technology company based in Ha Noi, Viet Nam, building provider-connected
                  financial workflows and cross-border product experiences.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-8">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent" />
                  <h3 className="font-bold">Company details</h3>
                </div>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Legal entity:</strong> CONG TY CO PHAN CONG
                    NGHE KHOI NGUYEN
                  </p>
                  <p>
                    <strong className="text-foreground">International name:</strong> KHOI NGUYEN
                    TECHNOLOGY JOINT STOCK COMPANY
                  </p>
                  <p>
                    <strong className="text-foreground">Tax ID:</strong> 0111409165
                  </p>
                  <p>
                    <strong className="text-foreground">Email:</strong>{" "}
                    info@khoinguyentechnology.com
                  </p>
                  <p>
                    <strong className="text-foreground">Address:</strong> So 23 ngach 157/6 Duc
                    Giang, To 18, Phuong Viet Hung, Ha Noi, Viet Nam
                  </p>
                  <p>
                    <strong className="text-foreground">Company website:</strong>{" "}
                    khoinguyentechnology.com
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-8">
                <h3 className="mb-4 font-bold">Quick links</h3>
                <div className="space-y-3">
                  {[
                    { icon: HelpCircle, label: "Help center", href: "/help" },
                    { icon: MessageCircle, label: "FAQs", href: "/help" },
                    { icon: Shield, label: "Security", href: "/security" },
                    { icon: MapPin, label: "Legal & policies", href: "/policies" },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  ))}
                </div>
                <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
                  See also:{" "}
                  <Link to="/business" className="text-foreground hover:underline">
                    business payments
                  </Link>
                  {", "}
                  <Link to="/pricing" className="text-foreground hover:underline">
                    pricing visibility
                  </Link>
                  {", "}
                  <Link to="/security" className="text-foreground hover:underline">
                    platform security
                  </Link>
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
