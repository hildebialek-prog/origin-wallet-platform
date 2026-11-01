import { describe, expect, it } from "vitest";
import type { Beneficiary } from "@/services/moneyMovementService";
import { swiftRequirements } from "@/test/beneficiaryFixtures";
import {
  applyCountryChange,
  buildPayload,
  buildUpdatePayload,
  emptyForm,
  toForm,
  validateBankForm,
  type BeneficiaryForm,
} from "./AccountBeneficiaries";

const form = (overrides: Partial<BeneficiaryForm> = {}): BeneficiaryForm => ({
  ...emptyForm,
  providerId: "7",
  fullName: "HK MACHINING LIMITED",
  companyName: "HK MACHINING LIMITED",
  bankName: "HSBC HONG KONG",
  accountNumber: "1234567890",
  confirmAccountNumber: "1234567890",
  swiftBic: "HSBCHKHHHKH",
  addressLine1: "GOLDEN DRAGON INDUSTRIAL CTR",
  city: "Hong Kong",
  postalCode: "999077",
  ...overrides,
});

describe("beneficiary form contract", () => {
  it("serializes the proven HK/USD/SWIFT payload with provider codes", () => {
    expect(buildPayload(form())).toEqual({
      provider_id: 7,
      beneficiary_type: "business",
      full_name: "HK MACHINING LIMITED",
      company_name: "HK MACHINING LIMITED",
      email: null,
      phone: null,
      country_code: "HK",
      currency: "USD",
      bank_name: "HSBC HONG KONG",
      bank_code: null,
      branch_code: null,
      account_number: "1234567890",
      iban: null,
      swift_bic: "HSBCHKHHHKH",
      address_line1: "GOLDEN DRAGON INDUSTRIAL CTR",
      address_line2: null,
      city: "Hong Kong",
      state: null,
      postal_code: "999077",
      raw_data: {
        origin: { account_route: "bank", vendor_type: "supplier" },
        nium: {
          payoutMethod: "SWIFT",
          bankAccountType: "CURRENT",
          remitterBeneficiaryRelationship: "supplier",
        },
      },
    });
  });

  it("leaves corridor restrictions to the provider metadata instead of country rules", () => {
    expect(validateBankForm(form({ payoutMethod: "LOCAL" }))).toBe("");
    expect(validateBankForm(form({ countryCode: "VN", currency: "VND", payoutMethod: "LOCAL", swiftBic: "" }))).toBe("");
  });

  it("preserves an explicitly selected currency when country changes", () => {
    expect(applyCountryChange(form({ countryCode: "VN", currency: "USD", payoutMethod: "LOCAL" }), "HK")).toMatchObject({
      countryCode: "HK",
      currency: "USD",
      payoutMethod: "LOCAL",
    });
  });

  it("omits phone country codes and verification without explicit capability", () => {
    const payload = buildPayload(form({ phone: "", verifyBeforeCreate: "true" }));
    expect(payload.raw_data?.origin).not.toHaveProperty("phone_country_code");
    expect(payload.raw_data?.nium).not.toHaveProperty("beneficiaryContactCountryCode");
    expect(payload.raw_data?.nium).not.toHaveProperty("verify_before_create");
  });

  it("rejects a missing or mismatched account confirmation", () => {
    expect(validateBankForm(form({ confirmAccountNumber: "" }))).toContain("Confirm the account number");
    expect(validateBankForm(form({ confirmAccountNumber: "9876543210" }))).toContain("do not match");
  });

  it("restores existing edit values without changing the saved corridor", () => {
    const beneficiary = {
      id: 12,
      user_id: 9,
      provider_id: 7,
      beneficiary_type: "business",
      full_name: "HK MACHINING LIMITED",
      company_name: "HK MACHINING LIMITED",
      phone: "12345678",
      country_code: "HK",
      currency: "USD",
      payout_method: "SWIFT",
      bank_name: "HSBC HONG KONG",
      account_number: "1234567890",
      swift_bic: "HSBCHKHHHKH",
      address_line1: "GOLDEN DRAGON INDUSTRIAL CTR",
      city: "Hong Kong",
      postal_code: "999077",
      status: "active",
      edit_fields: { account_route: "bank", relationship: "contractor", bank_account_type: "CHECKING", contact_country_code: "+852" },
    } satisfies Beneficiary;

    expect(toForm(beneficiary)).toMatchObject({
      providerId: "7",
      countryCode: "HK",
      currency: "USD",
      payoutMethod: "SWIFT",
      bankAccountType: "CHECKING",
      confirmAccountNumber: "1234567890",
      vendorType: "contractor",
      transactionDocumentName: "",
    });
  });

  it("does not save defaults for fields absent from the response, or replay internal metadata", () => {
    const beneficiary: Beneficiary = { id: 12, user_id: 9, provider_id: 7, beneficiary_type: "business",
      full_name: "Original", country_code: "HK", currency: "USD", payout_method: "SWIFT", status: "active" };
    const opened = toForm(beneficiary);
    expect(buildUpdatePayload(opened, beneficiary, true)).toEqual({});
    expect(buildUpdatePayload({ ...opened, email: "new@example.test" }, beneficiary, true)).toEqual({ email: "new@example.test" });
    expect(buildUpdatePayload({ ...opened, bankAccountType: "SAVINGS" }, beneficiary)).toEqual({ raw_data: { nium: { bankAccountType: "SAVINGS" } } });
    expect(buildUpdatePayload({ ...opened, phone: "12345678" }, beneficiary)).toEqual({ phone: "12345678" });
    const withPhone = { ...beneficiary, phone: "12345678", edit_fields: { contact_country_code: "65" } };
    expect(buildUpdatePayload({ ...toForm(withPhone), phone: "" }, withPhone)).toEqual({ phone: null });
    expect(buildUpdatePayload({ ...opened, phoneCountryCode: "+65" }, beneficiary)).toEqual({ raw_data: {
      nium: { beneficiaryContactCountryCode: "+65" }, origin: { phone_country_code: "+65" },
    } });
  });

  it("uses safe fields over untrusted legacy metadata on an API response", () => {
    const beneficiary = { id: 12, user_id: 9, provider_id: 7, beneficiary_type: "business", full_name: "Original",
      country_code: "HK", currency: "USD", payout_method: "SWIFT", status: "active",
      edit_fields: { bank_account_type: "SAVINGS", relationship: "Vendor" },
      raw_data: { nium: { bankAccountType: "PRIVATE", remitterBeneficiaryRelationship: "PRIVATE" } } };
    expect(toForm(beneficiary)).toMatchObject({ bankAccountType: "SAVINGS", vendorType: "Vendor" });
  });

  it("retains typed bank and branch routing and clears only explicitly removed form values", () => {
    const beneficiary: Beneficiary = { id: 12, user_id: 9, provider_id: 7, beneficiary_type: "individual",
      full_name: "SG Recipient", country_code: "SG", currency: "SGD", payout_method: "LOCAL", status: "active",
      account_number: "123456789", bank_code: "123", branch_code: "456", phone: "12345678", edit_fields: {
        routing: [{ type: "BANK", value: "123" }, { type: "BRANCH", value: "456" }],
        bank_account_type: "Savings", contact_country_code: "65", relationship: "Family",
        additional_fields: { beneficiaryAlias: "Saved alias" },
      } };
    const requirements = { ...swiftRequirements, dimensions: { ...swiftRequirements.dimensions,
      destinationCountry: "SG", destinationCurrency: "SGD", payoutMethod: "LOCAL", beneficiaryAccountType: "INDIVIDUAL" },
    routing_code_types: ["BANK", "BRANCH"], fields: [
      { name: "routingCodeType1", required: true, allowed_values: ["BANK", "BRANCH"] },
      { name: "routingCodeValue1", required: true },
      { name: "routingCodeType2", required: false, allowed_values: ["BANK", "BRANCH"] },
      { name: "routingCodeValue2", required: false },
      { name: "beneficiaryAlias", required: false },
      { name: "beneficiaryBankAccountType", required: false },
    ] };
    const opened = toForm(beneficiary);
    expect(opened).toMatchObject({ routingType: "BANK", routingValue: "123", secondaryRoutingType: "BRANCH",
      secondaryRoutingValue: "456", bankCode: "123", branchCode: "456", bankAccountType: "Savings", phoneCountryCode: "65", vendorType: "Family" });
    expect(toForm({ ...beneficiary, beneficiary_type: "personal" }).beneficiaryType).toBe("personal");
    expect(buildUpdatePayload(opened, beneficiary, false, requirements)).toEqual({});
    expect(buildUpdatePayload({ ...opened, bankName: "Edited Bank" }, beneficiary, false, requirements)).toEqual({ bank_name: "Edited Bank" });
    expect(buildUpdatePayload({ ...opened, secondaryRoutingType: "", secondaryRoutingValue: "", schemaValues: {} }, beneficiary, false, requirements))
      .toEqual({ raw_data: { nium: { routingInfo: [{ type: "BANK", value: "123" }], additionalFields: { beneficiaryAlias: null } } } });
  });
});
