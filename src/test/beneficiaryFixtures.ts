import type { NiumBeneficiaryRequirements } from "@/services/moneyMovementService";

export const swiftRequirements: NiumBeneficiaryRequirements = {
  dimensions: { destinationCountry: "HK", destinationCurrency: "USD", payoutMethod: "SWIFT", beneficiaryAccountType: "CORPORATE", customerType: "CORPORATE" },
  routing_code_types: ["SWIFT"],
  fields: [
    { name: "routingCodeType1", required: true, allowed_values: ["SWIFT"] },
    { name: "routingCodeValue1", required: true, pattern: "^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$" },
    { name: "beneficiaryAccountNumber", required: true },
    { name: "beneficiaryBankName", required: true },
    { name: "beneficiaryAddress", required: true },
    { name: "beneficiaryCity", required: true },
    { name: "beneficiaryPostcode", required: true },
  ],
};
