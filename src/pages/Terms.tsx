import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";

const sections: LegalSection[] = [
  {
    title: "Introduction",
    paragraphs: [
      "HONG KONG MACHINING GROUP CO., LIMITED (\"we\", \"us\", or the \"Company\") operates the Origin Wallet platform (\"Origin Wallet\"). These Terms & Conditions govern your access to and use of the Origin Wallet website, applications, interfaces, and services that reference these Terms. By accessing or using them, you agree to these Terms and any service-specific terms presented to you.",
      "Origin Wallet is a technology platform for payment and multi-currency workflows. Certain financial or payment functions are delivered or supported by third-party providers. The features available to you may depend on your location, account status, eligibility, and the providers involved in a particular service.",
    ],
  },
  {
    title: "Eligibility and Account",
    paragraphs: [
      "You must have the legal capacity to enter into a binding agreement and meet any age, location, identity, business, or other eligibility requirements communicated for the relevant service. If you use the services for an organisation, you confirm that you are authorised to act for it.",
      "You must provide complete and accurate information, keep it current, and protect your account credentials. We may request information or documents reasonably needed to verify identity, assess eligibility, support a transaction, or meet operational and legal requirements.",
    ],
  },
  {
    title: "Use of the Website and Services",
    paragraphs: [
      "You may use the website and services only for lawful purposes and in accordance with these Terms. Product descriptions, availability, estimates, and demonstrations on the public website do not guarantee that a feature or service will be available for a particular user, transaction, currency, corridor, or jurisdiction.",
    ],
  },
  {
    title: "User Responsibilities",
    paragraphs: [
      "You are responsible for instructions submitted through your account, for reviewing transaction details before confirmation, and for ensuring that recipients and payment details are correct. Notify us promptly if you suspect unauthorised access, compromised credentials, or an error in information you supplied.",
      "You are also responsible for complying with laws and contractual obligations applicable to your activities, including any tax, reporting, record-keeping, import, export, or payment obligations that apply to you.",
    ],
  },
  {
    title: "Transactions and Payment Services",
    paragraphs: [
      "A transaction may be subject to verification, limits, cut-off times, currency availability, provider acceptance, recipient-bank processing, and other operational checks. A displayed quote or estimated delivery time may change until a transaction is accepted and confirmed by the relevant provider.",
      "The relevant provider may decline, delay, cancel, reverse, or request additional information about a transaction under its applicable terms. The Company may restrict platform access or relay provider requests and transaction-status information where appropriate. Where available, status information will be provided through the platform or support channels.",
    ],
  },
  {
    title: "Fees and Charges",
    paragraphs: [
      "Applicable fees, exchange rates, and other charges will be shown or otherwise communicated before you confirm a transaction where the service supports that disclosure. Third parties, including banks or payment networks, may impose separate charges that are outside our control.",
      "Public pricing examples and calculator outputs are illustrative unless expressly identified as a final quote.",
    ],
  },
  {
    title: "Prohibited Activities",
    paragraphs: ["You must not use the website or services to:"],
    items: [
      "break any applicable law, regulation, court order, or third-party right;",
      "engage in fraud, deception, money laundering, sanctions evasion, or other unlawful conduct;",
      "send funds for goods, services, persons, or activities that the relevant service does not support;",
      "interfere with security, access controls, networks, or the normal operation of the platform;",
      "misrepresent your identity, authority, transaction purpose, or source or destination of funds; or",
      "copy, scrape, reverse engineer, or misuse the platform except where applicable law expressly permits it.",
    ],
  },
  {
    title: "Third-Party Services",
    paragraphs: [
      "Origin Wallet integrates with Nium as a third-party financial and payment platform/provider under the Company's commercial relationship with Nium. Relevant functions may also depend on banks, payment networks, identity-verification providers, technology vendors, or other third parties. Their separate terms may apply, and their availability, processing decisions, and service performance may affect your use of Origin Wallet.",
      "We are not responsible for a third party's independent products, websites, or actions, but this does not limit any responsibility we have under applicable law for the services we provide to you.",
    ],
  },
  {
    title: "Intellectual Property",
    paragraphs: [
      "The website, software, branding, text, graphics, and other platform content are protected by applicable intellectual-property rights and may be owned by or licensed to the Company or relevant rights holders. We grant you a limited, revocable, non-exclusive, non-transferable right to use the services for their intended purpose while these Terms apply.",
    ],
  },
  {
    title: "Privacy",
    paragraphs: [
      "Our Privacy Policy explains how information is collected, used, disclosed, retained, and protected when you interact with Origin Wallet. Please review it alongside these Terms.",
    ],
  },
  {
    title: "Disclaimers",
    paragraphs: [
      "The website and services are provided on an 'as available' basis. To the extent permitted by law, we do not promise uninterrupted availability or that all information will always be complete, current, or error-free. Nothing in these Terms excludes warranties or rights that cannot lawfully be excluded.",
    ],
  },
  {
    title: "Limitation of Liability",
    paragraphs: [
      "To the extent permitted by applicable law, the Company will not be liable for indirect, incidental, special, or consequential loss arising from use of the website or services, or for loss caused solely by events outside our reasonable control. Any limitation will apply only to the extent lawful and will not exclude liability that cannot legally be limited, including liability arising from fraud or wilful misconduct.",
    ],
  },
  {
    title: "Suspension and Termination",
    paragraphs: [
      "We may restrict, suspend, or terminate access where reasonably necessary to protect users or the platform, investigate suspected misuse, respond to a provider or legal requirement, address unpaid amounts, or manage material risk. You may stop using the services, subject to completing or resolving outstanding transactions, fees, or obligations.",
    ],
  },
  {
    title: "Changes to These Terms",
    paragraphs: [
      "We may update these Terms to reflect service, operational, legal, or security changes. The revised version and its Last Updated date will be posted here. Where a change materially affects your use of a service, we will provide additional notice when reasonably practicable or required.",
    ],
  },
  {
    title: "Governing Law and Dispute Resolution",
    paragraphs: [
      "The governing law, forum, and dispute-resolution process applicable to a service are determined by the relevant agreement or service-specific terms presented to you. These Terms do not independently designate a governing law or dispute forum where one has not been confirmed in those documents. Contact us first if you have a concern so we can try to resolve it promptly.",
    ],
  },
];

const Terms = () => (
  <LegalPage
    title="Terms & Conditions"
    description="Read the terms governing access to and use of the Origin Wallet website and available payment and multi-currency services."
    path="/terms"
    introduction="Please read these Terms carefully before accessing or using Origin Wallet."
    sections={sections}
  />
);

export default Terms;
