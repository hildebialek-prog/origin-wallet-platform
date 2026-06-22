import { type FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Check,
  CheckCircle2,
  Facebook,
  Linkedin,
  Loader2,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { ContactSubmissionError, submitContactMessage, type ContactFormRequest } from "@/services/contactService";

type ContactMethod = "whatsapp" | "telegram" | "email" | "facebook" | "linkedin";

type WizardForm = {
  hasOffshoreEntity: "" | "yes" | "no";
  offshoreCountry: string;
  businessType: string;
  monthlyVolume: string;
  gateways: string[];
  providers: string;
  contactMethod: ContactMethod | "";
  contactDetails: string;
  workEmail: string;
};

const emptyWizardForm: WizardForm = {
  hasOffshoreEntity: "",
  offshoreCountry: "",
  businessType: "",
  monthlyVolume: "",
  gateways: [],
  providers: "",
  contactMethod: "",
  contactDetails: "",
  workEmail: "",
};

const questions = [
  "Do you have an offshore legal entity?",
  "What type of business do you operate?",
  "What is your average monthly payment processing volume?",
  "Are you currently using any payment gateways?",
  "Who are your current payment processing or banking providers?",
  "What is your preferred contact method?",
] as const;

const gateways = ["Stripe", "PayPal", "Shopify Payments", "Adyen", "Checkout.com", "Not using any", "Other"];

const contactMethods: Array<{
  value: ContactMethod;
  label: string;
  placeholder: string;
  icon: typeof MessageCircle;
  iconClassName: string;
}> = [
  {
    value: "whatsapp",
    label: "WhatsApp",
    placeholder: "+84 phone number",
    icon: MessageCircle,
    iconClassName: "text-emerald-500",
  },
  {
    value: "telegram",
    label: "Telegram",
    placeholder: "@username or phone",
    icon: Send,
    iconClassName: "text-sky-500",
  },
  {
    value: "email",
    label: "Email",
    placeholder: "name@company.com",
    icon: Mail,
    iconClassName: "text-emerald-600",
  },
  {
    value: "facebook",
    label: "Facebook",
    placeholder: "Facebook profile or page URL",
    icon: Facebook,
    iconClassName: "text-blue-600",
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    placeholder: "LinkedIn profile URL",
    icon: Linkedin,
    iconClassName: "text-blue-700",
  },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionClassName = (active: boolean) =>
  `flex min-h-[70px] items-center rounded-[14px] border bg-white px-6 text-left text-base font-semibold text-slate-950 transition hover:border-emerald-600 hover:shadow-sm ${
    active ? "border-emerald-600 ring-2 ring-emerald-600/25" : "border-slate-200"
  }`;

const inputClassName = (hasError?: boolean) =>
  `h-14 w-full rounded-[14px] border bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 ${
    hasError ? "border-red-400" : "border-slate-200"
  }`;

const textareaClassName = (hasError?: boolean) =>
  `min-h-[150px] w-full resize-none rounded-[14px] border bg-white px-4 py-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 ${
    hasError ? "border-red-400" : "border-slate-200"
  }`;

const TalkToSales = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(emptyWizardForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const schemaData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Talk to Origin Wallet sales",
      url: "https://khoinguyenoriginwallet.com/talk-to-sales",
      description:
        "Answer a few questions so Origin Wallet can recommend the right cross-border payment, FX, and API workflow for your business.",
      mainEntity: {
        "@type": "Organization",
        name: "Origin Wallet",
        email: "info@khoinguyentechnology.com",
        url: "https://khoinguyenoriginwallet.com/",
      },
    }),
    [],
  );

  const progress = Math.round(((step + 1) / questions.length) * 100);
  const currentContactMethod = contactMethods.find((method) => method.value === form.contactMethod);

  const updateForm = <Field extends keyof WizardForm>(field: Field, value: WizardForm[Field]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", submit: "" }));
  };

  const toggleGateway = (gateway: string) => {
    if (gateway === "Not using any") {
      updateForm("gateways", form.gateways.includes(gateway) ? [] : [gateway]);
      return;
    }

    const nextGateways = form.gateways.includes(gateway)
      ? form.gateways.filter((item) => item !== gateway)
      : [...form.gateways.filter((item) => item !== "Not using any"), gateway];
    updateForm("gateways", nextGateways);
  };

  const validateStep = (targetStep = step) => {
    const nextErrors: Record<string, string> = {};

    if (targetStep === 0) {
      if (!form.hasOffshoreEntity) nextErrors.hasOffshoreEntity = "Choose yes or no to continue.";
      if (form.hasOffshoreEntity === "yes" && form.offshoreCountry.trim().length < 2) {
        nextErrors.offshoreCountry = "Enter the country or jurisdiction.";
      }
    }

    if (targetStep === 1 && form.businessType.trim().length < 8) {
      nextErrors.businessType = "Describe your business in a little more detail.";
    }

    if (targetStep === 2 && form.monthlyVolume.trim().length < 2) {
      nextErrors.monthlyVolume = "Enter an estimated monthly volume.";
    }

    if (targetStep === 3 && form.gateways.length === 0) {
      nextErrors.gateways = "Select at least one option.";
    }

    if (targetStep === 4 && form.providers.trim().length < 2) {
      nextErrors.providers = "Enter provider names, or type None.";
    }

    if (targetStep === 5) {
      if (!form.contactMethod) nextErrors.contactMethod = "Choose a preferred contact method.";
      if (form.contactDetails.trim().length < 2) nextErrors.contactDetails = "Enter your contact details.";
      if (!emailPattern.test(form.workEmail.trim())) nextErrors.workEmail = "Enter a valid work email.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, questions.length - 1));
  };

  const handleBack = () => {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    setErrors({});

    const methodLabel = currentContactMethod?.label || "Not selected";
    const payload: ContactFormRequest = {
      name: `Origin Wallet sales lead - ${methodLabel}`,
      email: form.workEmail.trim(),
      company: form.offshoreCountry.trim() || "Talk to sales lead",
      subject: `Talk to sales wizard - ${methodLabel}`,
      message: [
        `Offshore legal entity: ${form.hasOffshoreEntity || "-"}`,
        `Entity incorporated in: ${form.offshoreCountry.trim() || "-"}`,
        `Business type: ${form.businessType.trim()}`,
        `Average monthly payment volume: ${form.monthlyVolume.trim()}`,
        `Current gateways: ${form.gateways.join(", ") || "-"}`,
        `Current processing/banking providers: ${form.providers.trim()}`,
        `Preferred contact method: ${methodLabel}`,
        `Preferred contact details: ${form.contactDetails.trim()}`,
        `Work email: ${form.workEmail.trim()}`,
      ].join("\n"),
    };

    try {
      const response = await submitContactMessage(payload);
      setSubmitted(true);
      toast({
        title: "Sales request sent",
        description: response.message || "Origin Wallet will review your answers and follow up.",
      });
    } catch (error) {
      if (error instanceof ContactSubmissionError && error.status === 422 && error.errors) {
        setErrors({ submit: error.message || "The request could not be submitted." });
      } else {
        setErrors({ submit: "The request could not be submitted. Please try again." });
      }

      toast({
        variant: "destructive",
        title: "Request failed",
        description:
          error instanceof ContactSubmissionError
            ? error.message || "Unable to send the sales request."
            : "Unable to send the sales request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = () => {
    setForm(emptyWizardForm);
    setErrors({});
    setStep(0);
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f2] text-slate-950">
      <Seo
        title="Talk to Sales | Origin Wallet"
        description="Answer a few questions so Origin Wallet can recommend the right cross-border payment, FX, and API workflow for your business."
        path="/talk-to-sales"
        image="/content/banner.jpg"
        schema={schemaData}
      />

      <div className="grid min-h-screen lg:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="relative flex min-h-[440px] flex-col overflow-hidden bg-[#0b1f18] px-6 py-8 text-white sm:px-10 lg:min-h-screen">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,#071611,#0f382a_58%,#10231c)]" />
          <div className="relative z-10 flex min-h-full flex-col">
            <Link to="/" className="inline-flex items-center gap-3 self-start">
              <img src="/logo/logo.jpg" alt="Origin Wallet" className="h-12 w-12 rounded-2xl object-cover" />
              <span className="text-xl font-black leading-tight tracking-normal">
                Origin
                <br />
                Wallet
              </span>
            </Link>

            <div className="mt-10 lg:mt-12">
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-200">Talk to sales</p>
              <h1 className="mt-4 max-w-[290px] text-3xl font-black leading-tight sm:text-4xl">
                Tell us about your business
              </h1>
              <p className="mt-5 max-w-[330px] text-sm leading-7 text-emerald-50/85">
                A few quick questions help our team recommend the right Origin Wallet products for your needs.
              </p>
            </div>

            <div className="mt-8 max-w-[340px] lg:mt-10">
              <div className="flex items-center justify-between text-sm">
                <span>Step {step + 1} of {questions.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-1 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ol className="mt-10 space-y-4 lg:mt-auto">
              {questions.map((question, index) => {
                const completed = submitted || index < step;
                const active = index === step && !submitted;
                return (
                  <li
                    key={question}
                    className={`flex items-center gap-3 text-sm transition ${
                      completed || active ? "text-white" : "text-white/38"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        completed
                          ? "border-emerald-400 bg-emerald-400 text-white"
                          : active
                            ? "border-white bg-white text-[#0b1f18]"
                            : "border-white/18 text-white/45"
                      }`}
                    >
                      {completed ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="max-w-[280px] leading-snug">{question}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        <main className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 lg:px-12">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[620px] text-center"
            >
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
              <h2 className="mt-6 text-3xl font-black leading-tight sm:text-4xl">Request received</h2>
              <p className="mx-auto mt-4 max-w-[520px] text-base leading-7 text-slate-600">
                Origin Wallet will review your business model, payment flow, provider needs, and launch plan,
                then follow up through your preferred contact method.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button type="button" className="rounded-full px-8" onClick={resetWizard}>
                  Send another request
                </Button>
                <Link to="/">
                  <Button type="button" variant="outline" className="rounded-full px-8">
                    Back to home
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} className="w-full max-w-[620px]">
              {errors.submit ? (
                <div className="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errors.submit}
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.2 }}
                >
                  <StepContent
                    contactMethod={currentContactMethod}
                    errors={errors}
                    form={form}
                    onGatewayToggle={toggleGateway}
                    onUpdate={updateForm}
                    step={step}
                  />
                </motion.div>
              </AnimatePresence>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-full px-6"
                  disabled={step === 0 || isSubmitting}
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {step < questions.length - 1 ? (
                  <Button type="button" className="h-12 rounded-full bg-emerald-600 px-8 text-white hover:bg-emerald-700" onClick={handleNext}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" className="h-12 rounded-full bg-emerald-600 px-8 text-white hover:bg-emerald-700" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        Submit <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                )}
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};

const StepContent = ({
  contactMethod,
  errors,
  form,
  onGatewayToggle,
  onUpdate,
  step,
}: {
  contactMethod?: (typeof contactMethods)[number];
  errors: Record<string, string>;
  form: WizardForm;
  onGatewayToggle: (gateway: string) => void;
  onUpdate: <Field extends keyof WizardForm>(field: Field, value: WizardForm[Field]) => void;
  step: number;
}) => {
  if (step === 0) {
    return (
      <section>
        <QuestionHeader
          title="Do you have an offshore legal entity?"
          description="e.g., Singapore, Cayman Islands, British Virgin Islands, Hong Kong, etc."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className={optionClassName(form.hasOffshoreEntity === "yes")}
            onClick={() => onUpdate("hasOffshoreEntity", "yes")}
          >
            Yes
          </button>
          <button
            type="button"
            className={optionClassName(form.hasOffshoreEntity === "no")}
            onClick={() => {
              onUpdate("hasOffshoreEntity", "no");
              onUpdate("offshoreCountry", "");
            }}
          >
            No
          </button>
        </div>
        <FieldError message={errors.hasOffshoreEntity} />
        {form.hasOffshoreEntity === "yes" ? (
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-emerald-700">
              Where is your business entity incorporated?
            </label>
            <input
              className={inputClassName(Boolean(errors.offshoreCountry))}
              onChange={(event) => onUpdate("offshoreCountry", event.target.value)}
              placeholder="Hong Kong"
              value={form.offshoreCountry}
            />
            <FieldError message={errors.offshoreCountry} />
          </div>
        ) : null}
      </section>
    );
  }

  if (step === 1) {
    return (
      <section>
        <QuestionHeader
          title="What type of business do you operate?"
          description="Please provide a brief description of your business. For example: eCommerce merchant, SaaS platform, trading company, agency, or marketplace."
        />
        <textarea
          className={textareaClassName(Boolean(errors.businessType))}
          onChange={(event) => onUpdate("businessType", event.target.value)}
          value={form.businessType}
        />
        <FieldError message={errors.businessType} />
      </section>
    );
  }

  if (step === 2) {
    return (
      <section>
        <QuestionHeader
          title="What is your average monthly payment processing volume?"
          description="Please specify your estimated monthly volume and payment type. For example: USD 100,000/month in supplier payouts."
        />
        <textarea
          className={textareaClassName(Boolean(errors.monthlyVolume))}
          onChange={(event) => onUpdate("monthlyVolume", event.target.value)}
          value={form.monthlyVolume}
        />
        <FieldError message={errors.monthlyVolume} />
      </section>
    );
  }

  if (step === 3) {
    return (
      <section>
        <QuestionHeader
          title="Are you currently using any payment gateways?"
          description="e.g., Stripe, PayPal, Shopify Payments, Adyen, Checkout.com, or other providers."
        />
        <div className="space-y-3">
          {gateways.map((gateway) => (
            <label
              key={gateway}
              className={`flex min-h-[54px] cursor-pointer items-center gap-4 rounded-[14px] border bg-white px-4 font-semibold transition hover:border-emerald-600 ${
                form.gateways.includes(gateway) ? "border-emerald-600 ring-2 ring-emerald-600/20" : "border-slate-200"
              }`}
            >
              <Checkbox
                checked={form.gateways.includes(gateway)}
                onCheckedChange={() => onGatewayToggle(gateway)}
                className="h-5 w-5 rounded-[4px]"
              />
              <span>{gateway}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.gateways} />
      </section>
    );
  }

  if (step === 4) {
    return (
      <section>
        <QuestionHeader
          title="Who are your current payment processing or banking providers?"
          description="List the providers you use today, or type None if you are setting this up for the first time."
        />
        <textarea
          className={textareaClassName(Boolean(errors.providers))}
          onChange={(event) => onUpdate("providers", event.target.value)}
          value={form.providers}
        />
        <FieldError message={errors.providers} />
      </section>
    );
  }

  return (
    <section>
      <QuestionHeader
        title="What is your preferred contact method?"
        description="Choose one option below and enter your contact details."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {contactMethods.map((method) => {
          const Icon = method.icon;
          return (
            <button
              key={method.value}
              type="button"
              className={optionClassName(form.contactMethod === method.value)}
              onClick={() => {
                onUpdate("contactMethod", method.value);
                if (method.value === "email" && !form.contactDetails) {
                  onUpdate("contactDetails", form.workEmail);
                }
              }}
            >
              <Icon className={`mr-3 h-5 w-5 ${method.iconClassName}`} />
              {method.label}
            </button>
          );
        })}
      </div>
      <FieldError message={errors.contactMethod} />
      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-emerald-700">
            Your {contactMethod?.label || "contact"} details
          </label>
          <div className="relative">
            <AtSign className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClassName(Boolean(errors.contactDetails))} pl-12`}
              onChange={(event) => onUpdate("contactDetails", event.target.value)}
              placeholder={contactMethod?.placeholder || "Contact details"}
              value={form.contactDetails}
            />
          </div>
          <FieldError message={errors.contactDetails} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-emerald-700">Work email for confirmation</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClassName(Boolean(errors.workEmail))} pl-12`}
              onChange={(event) => {
                onUpdate("workEmail", event.target.value);
                if (form.contactMethod === "email") onUpdate("contactDetails", event.target.value);
              }}
              placeholder="name@company.com"
              type="email"
              value={form.workEmail}
            />
          </div>
          <FieldError message={errors.workEmail} />
        </div>
      </div>
    </section>
  );
};

const QuestionHeader = ({ description, title }: { description: string; title: string }) => (
  <div className="mb-7">
    <h2 className="max-w-[620px] text-3xl font-black leading-tight tracking-normal text-slate-950 sm:text-4xl">
      {title}
    </h2>
    <p className="mt-3 max-w-[620px] text-sm leading-6 text-slate-600">{description}</p>
  </div>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-2 text-sm font-medium text-red-600">{message}</p> : null;

export default TalkToSales;
