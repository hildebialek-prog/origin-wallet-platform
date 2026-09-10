import { describe, expect, it } from "vitest";
import type { Beneficiary } from "@/services/moneyMovementService";
import {
  applyCountryChange,
  buildPayload,
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

  it("validates LOCAL and SWIFT according to the corridor", () => {
    expect(validateBankForm(form({ payoutMethod: "LOCAL" }))).toContain("supported payout method");
    expect(validateBankForm(form({ countryCode: "VN", currency: "VND", payoutMethod: "LOCAL", swiftBic: "" }))).toBe("");
    expect(validateBankForm(form({ countryCode: "VN", currency: "USD", payoutMethod: "SWIFT", swiftBic: "" }))).toContain("SWIFT / BIC");
  });

  it("preserves an explicitly selected currency when country changes", () => {
    expect(applyCountryChange(form({ countryCode: "VN", currency: "USD", payoutMethod: "LOCAL" }), "HK")).toMatchObject({
      countryCode: "HK",
      currency: "USD",
      payoutMethod: "SWIFT",
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
      bank_name: "HSBC HONG KONG",
      account_number: "1234567890",
      swift_bic: "HSBCHKHHHKH",
      address_line1: "GOLDEN DRAGON INDUSTRIAL CTR",
      city: "Hong Kong",
      postal_code: "999077",
      status: "active",
      raw_data: {
        origin: { account_route: "bank", vendor_type: "contractor", transaction_document_name: "legacy.pdf" },
        nium: { payoutMethod: "SWIFT", bankAccountType: "CHECKING", beneficiaryContactCountryCode: "+852" },
      },
    } satisfies Beneficiary;

    expect(toForm(beneficiary)).toMatchObject({
      providerId: "7",
      countryCode: "HK",
      currency: "USD",
      payoutMethod: "SWIFT",
      bankAccountType: "CHECKING",
      confirmAccountNumber: "1234567890",
      vendorType: "contractor",
      transactionDocumentName: "legacy.pdf",
    });
  });
});
