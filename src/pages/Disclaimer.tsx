import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";

const sections: LegalSection[] = [
  { title: "General Information", paragraphs: ["HONG KONG MACHINING GROUP CO., LIMITED operates the Origin Wallet platform. Information on the Origin Wallet website is provided for general product and business information. It is not a complete description of every feature, condition, risk, or requirement. Service-specific terms and the information presented during a transaction take precedence where they differ from general website content."] },
  { title: "No Financial or Investment Advice", paragraphs: ["Nothing on this website is financial, investment, tax, legal, accounting, or other professional advice, and no website content is a recommendation to enter into a transaction or use a particular currency, payment method, or provider. Consider your circumstances and obtain independent advice where appropriate."] },
  { title: "Service Availability", paragraphs: ["Origin Wallet provides a platform experience using services supported by Nium, a third-party financial and payment platform/provider, under the Company's commercial relationship with Nium. Applicable financial or payment functions are subject to Nium's terms and availability. Products, currencies, corridors, payment methods, integrations, and features shown on the website may not be available to every user or in every location. Availability may depend on eligibility, verification, provider coverage, operational capacity, applicable requirements, and risk controls."] },
  { title: "Third-Party Information", paragraphs: ["Some information may be supplied by banks, payment networks, market-data sources, technology providers, or other third parties. We take reasonable care when presenting such information but cannot independently guarantee that third-party information is always complete, current, or error-free."] },
  { title: "Transaction Information", paragraphs: ["Rates, fees, delivery estimates, calculator results, and other transaction examples shown before a confirmed quote are illustrative. Actual outcomes may vary because of market movements, timing, payment method, provider or recipient-bank charges, verification, cut-off times, and other transaction-specific factors. Review the final details presented before confirming an instruction."] },
  { title: "No Guarantee", paragraphs: ["We work to keep the website useful, secure, and available, but do not guarantee uninterrupted access, a particular processing time, or that every website statement will remain current at all times. Any warranties or rights that cannot lawfully be excluded remain unaffected."] },
  { title: "Limitation of Liability", paragraphs: ["To the extent permitted by applicable law, HONG KONG MACHINING GROUP CO., LIMITED is not responsible for indirect, incidental, special, or consequential loss resulting from reliance on general website information, external events beyond its reasonable control, or independent third-party services. This Disclaimer does not exclude or limit responsibility that cannot lawfully be excluded or limited, including responsibility arising from fraud or wilful misconduct."] },
  { title: "External Links", paragraphs: ["Links to external websites are provided for convenience or context. A link does not imply endorsement or control. External sites may change without notice and are governed by their own terms, security practices, and privacy notices. You should assess them before providing information or relying on their content."] },
  { title: "Changes to This Disclaimer", paragraphs: ["We may update this Disclaimer when our website, services, or relevant requirements change. The current version and its Last Updated date will be published on this page."] },
  { title: "Contact Information", paragraphs: ["If you have questions about website information, a displayed feature, or this Disclaimer, contact support@originwallet.asia or use the contact page. For a specific transaction, include the relevant reference where it is safe to do so, but do not send passwords or other account credentials."] },
];

const Disclaimer = () => (
  <LegalPage
    title="Disclaimer"
    description="Review important information about Origin Wallet website content, service availability, transaction examples, and third-party information."
    path="/disclaimer"
    introduction="This Disclaimer explains the limits and context of information presented on the Origin Wallet website."
    sections={sections}
  />
);

export default Disclaimer;
