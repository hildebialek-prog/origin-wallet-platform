import type { BeneficiaryPayload, NiumBeneficiaryRequirements } from "@/services/moneyMovementService";
import type { BeneficiaryForm } from "./AccountBeneficiaries";

export const schemaFormFields: Record<string, keyof BeneficiaryForm> = {
  beneficiaryName: "fullName", beneficiaryEmail: "email", beneficiaryContactNumber: "phone",
  beneficiaryContactCountryCode: "phoneCountryCode", beneficiaryAddress: "addressLine1",
  beneficiaryCity: "city", beneficiaryState: "state", beneficiaryPostcode: "postalCode",
  beneficiaryAccountNumber: "accountNumber", beneficiaryBankName: "bankName",
  beneficiaryBankAccountType: "bankAccountType", remitterBeneficiaryRelationship: "vendorType",
};
const fixedFields = ["clientLegalEntity", "destinationCountry", "destinationCurrency", "payoutMethod", "beneficiaryAccountType", "customerType", "beneficiaryCountryCode"];
export const extraSchemaFields = (requirements: NiumBeneficiaryRequirements) => requirements.fields.filter(
  (field) => !schemaFormFields[field.name] && !fixedFields.includes(field.name) && !field.name.startsWith("routingCode")
    && !(requirements.routing_code_types.length === 1 && requirements.routing_code_types[0] === "SWIFT" && ["beneficiaryBankCode", "beneficiaryBranchCode"].includes(field.name)),
);
export const fieldLabel = (name: string) => name.split(".").pop()!.replace(/^beneficiary/, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

export const routingSlots = (requirements: NiumBeneficiaryRequirements) => [1, 2].flatMap((slot) => {
  const typeField = requirements.fields.find((f) => f.name === `routingCodeType${slot}`);
  const valueField = requirements.fields.find((f) => f.name === `routingCodeValue${slot}`);
  if (slot === 1 ? !requirements.routing_code_types.length && !typeField && !valueField : !typeField && !valueField) return [];
  const types = requirements.routing_code_types.filter((type) => !typeField?.allowed_values || typeField.allowed_values.includes(type));
  if (!types.length && !typeField?.required && !valueField?.required) return [];
  const required = !!typeField?.required || !!valueField?.required || (slot === 1 && !typeField && !valueField);
  return [{ slot, types, required }];
});

export const routingEntries = (form: BeneficiaryForm, requirements: NiumBeneficiaryRequirements) => routingSlots(requirements).map(({ slot, types, required }) => {
  const selectedType = slot === 1 ? form.routingType : form.secondaryRoutingType;
  const value = (slot === 1 ? form.routingValue : form.secondaryRoutingValue).trim();
  const type = selectedType || (types.length === 1 && (required || value) ? types[0] : "");
  return { slot, type, value, types, required };
});

export const applyNiumRequirements = (payload: BeneficiaryPayload, form: BeneficiaryForm, requirements: NiumBeneficiaryRequirements): BeneficiaryPayload => {
  // Remove legacy routing values, including values retained from a previous corridor.
  const { bank_code: _bank, branch_code: _branch, swift_bic: _swift, ...base } = payload;
  const entries = routingEntries(form, requirements).filter((entry) => entry.value);
  const nium = { ...(payload.raw_data?.nium as Record<string, unknown>) };
  delete nium.bankAccountType;
  if (requirements.fields.some((f) => f.name === "beneficiaryBankAccountType")) {
    nium.beneficiaryBankAccountType = form.bankAccountType.trim();
  }
  nium.routingInfo = entries.map(({ type, value }) => ({ type, value }));
  nium.additionalFields = Object.fromEntries(extraSchemaFields(requirements).flatMap((field) => {
    const value = form.schemaValues[field.name]?.trim();
    return value ? [[field.name, value]] : [];
  }));
  return {
    ...base,
    ...(entries.some((e) => e.type === "SWIFT") ? { swift_bic: entries.find((e) => e.type === "SWIFT")!.value } : {}),
    raw_data: { ...payload.raw_data, nium },
  };
};

export const providerValues = (payload: BeneficiaryPayload, requirements: NiumBeneficiaryRequirements): Record<string, unknown> => {
  const nium = payload.raw_data?.nium as Record<string, unknown>;
  const values: Record<string, unknown> = {
    ...requirements.dimensions, clientLegalEntity: "HK", beneficiaryCountryCode: payload.country_code,
    beneficiaryAccountType: ["company", "business", "corporate"].includes(payload.beneficiary_type.toLowerCase()) ? "Corporate" : "Individual",
    beneficiaryName: ["company", "business", "corporate"].includes(payload.beneficiary_type.toLowerCase()) ? payload.company_name || payload.full_name : payload.full_name,
    beneficiaryEmail: payload.email, beneficiaryContactNumber: payload.phone,
    beneficiaryContactCountryCode: nium.beneficiaryContactCountryCode,
    beneficiaryAddress: payload.address_line1, beneficiaryCity: payload.city, beneficiaryState: payload.state,
    beneficiaryPostcode: payload.postal_code, beneficiaryAccountNumber: payload.account_number || payload.iban,
    beneficiaryBankName: payload.bank_name, beneficiaryBankAccountType: nium.beneficiaryBankAccountType,
    remitterBeneficiaryRelationship: nium.remitterBeneficiaryRelationship,
    ...(nium.additionalFields as Record<string, string>),
  };
  (nium.routingInfo as { type: string; value: string }[]).forEach((entry, i) => {
    values[`routingCodeType${i + 1}`] = entry.type;
    values[`routingCodeValue${i + 1}`] = entry.value;
  });
  return values;
};

export const schemaErrors = (form: BeneficiaryForm, payload: BeneficiaryPayload, requirements: NiumBeneficiaryRequirements): Record<string, string> => {
  const errors: Record<string, string> = {};
  const values = providerValues(payload, requirements);
  const extraNames = new Set(extraSchemaFields(requirements).map((field) => field.name));
  for (const entry of routingEntries(form, requirements)) {
    if ((entry.required || entry.type || entry.value) && !entry.types.includes(entry.type)) errors[`routingCodeType${entry.slot}`] = "Select a supported routing type.";
    if ((entry.required || entry.type) && !entry.value) errors[`routingCodeValue${entry.slot}`] = "Enter the routing code for this payment method.";
    if (entry.types.length === 0) errors[`routingCodeType${entry.slot}`] = "No routing type is supported by both the corridor and schema.";
  }
  for (const field of requirements.fields) {
    let value = values[field.name];
    if (field.required && (value === undefined || value === null || value === "")) {
      errors[field.name] = "This field is required for the selected payment method.";
      continue;
    }
    if (value === undefined || value === null || value === "") continue;
    if (extraNames.has(field.name)) {
      if (field.type === "boolean" && (value === "true" || value === "false")) value = value === "true";
      if (field.type === "integer" && typeof value === "string" && /^-?\d+$/.test(value)) value = Number(value);
      if (field.type === "number" && typeof value === "string" && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && Number.isFinite(Number(value))) value = Number(value);
    }
    if (field.allowed_values && !field.allowed_values.includes(value)) errors[field.name] = "Select a value supported by this payment method.";
    if (typeof value === "string") {
      if (field.min_length !== undefined && [...value].length < field.min_length) errors[field.name] = `Enter at least ${field.min_length} characters.`;
      if (field.max_length !== undefined && [...value].length > field.max_length) errors[field.name] = `Enter no more than ${field.max_length} characters.`;
      if (field.pattern) {
        try { if (!new RegExp(field.pattern, "u").test(value)) errors[field.name] = "Enter the format required for this payment method."; }
        catch { errors[field.name] = "Validation is unavailable for this field. Retry requirements lookup."; }
      }
    }
    const validType = !field.type || (field.type === "string" && typeof value === "string") || (field.type === "boolean" && typeof value === "boolean")
      || (field.type === "number" && typeof value === "number") || (field.type === "integer" && typeof value === "number" && Number.isInteger(value));
    if (!validType) errors[field.name] = "Enter a value of the type required for this payment method.";
  }
  return errors;
};
