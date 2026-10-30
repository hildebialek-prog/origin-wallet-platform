import { ApiRequestError } from "@/services/apiClient";
import type { NiumBeneficiaryPayoutMethods } from "@/services/moneyMovementService";

export const matchesPayoutMethods = (metadata: NiumBeneficiaryPayoutMethods, form: {
  providerId: string; beneficiaryType: string; countryCode: string; currency: string;
}) => metadata?.provider_id === Number(form.providerId) && metadata.beneficiary_type === form.beneficiaryType &&
  metadata.country_code === form.countryCode && metadata.currency === form.currency &&
  Array.isArray(metadata.payout_methods) && metadata.payout_methods.length > 0 &&
  metadata.payout_methods.every((method) => method === "LOCAL" || method === "SWIFT");

export const beneficiaryRequirementsError = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    if (error.status === 0) return "Cannot connect to the beneficiary service. Check your connection and retry. If it continues, contact support; network or browser access restrictions may be involved.";
    if (error.payload?.code === "beneficiary_corridor_unsupported" || error.status === 422) {
      return "This beneficiary corridor is not supported. Change the country, currency or payout method.";
    }
    if (error.payload?.code === "beneficiary_schema_unavailable") {
      return "NIUM validation requirements could not be verified. Retry; if this continues, contact support before saving.";
    }
    if (error.payload?.code === "beneficiary_corridors_unavailable") {
      return "Supported payout methods could not be verified. Retry before continuing.";
    }
  }
  return "Beneficiary requirements are unavailable. Check the country, currency and payout method, then retry before continuing.";
};
