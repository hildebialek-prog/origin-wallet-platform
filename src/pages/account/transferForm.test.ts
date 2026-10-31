import { describe, expect, it, vi } from "vitest";
import type { Beneficiary } from "@/services/moneyMovementService";
import type { ProviderSummary } from "@/services/fxOrderService";
import {
  buildTransferPayload,
  beneficiaryTransferOption,
  createClientReference,
  hasSgdLocalPreparation,
  isTransferAmountInput,
  NIUM_HK_USD_SWIFT_CONFIG,
  NIUM_SG_SGD_LOCAL_UNAVAILABLE,
  payoutFeePresentation,
  recipientAmountPresentation,
  purposeOptionsForTransferProvider,
  shouldFetchNiumPurposeCodes,
  validateNiumTransferConfiguration,
  validateTransferConfiguration,
  validateTransferAmount,
} from "./transferForm";

const niumProvider: ProviderSummary = { id: 7, code: "nium", name: "Nium", status: "active", supports_transfers: true };
const otherProvider: ProviderSummary = { id: 8, code: "airwallex", name: "Airwallex", status: "active", supports_transfers: true };
const beneficiary: Beneficiary = {
  id: 42,
  user_id: 9,
  provider_id: 7,
  beneficiary_type: "business",
  full_name: "HK MACHINING LIMITED",
  country_code: "HK",
  currency: "USD",
  payout_method: "SWIFT",
  status: "active",
};

const values = (overrides = {}) => ({
  providerId: "7",
  beneficiaryId: "42",
  sourceBankAccountId: "15",
  transferType: "payout",
  sourceCurrency: "USD",
  targetCurrency: "USD",
  sourceAmount: 1250,
  targetAmount: 1250,
  fxRate: "1",
  feeAmount: "5",
  feeCurrency: "USD",
  purposeCode: "IR01811",
  referenceText: "INV-2026-001",
  clientReference: "OW-123e4567-e89b-12d3-a456-426614174000",
  providerCode: "nium",
  beneficiaryName: "HK MACHINING LIMITED",
  ...overrides,
});

describe("provider-aware transfer contract", () => {
  it("allows the bound SGD preparation workflow while dispatch admission remains closed", () => {
    const local: Beneficiary = { ...beneficiary, beneficiary_type: "personal", country_code: "SG", currency: "SGD", payout_method: "LOCAL",
      payout_admission: { allowed: false, reason: "financial_terms_unverified", preparation_allowed: true,
        beneficiary_id: beneficiary.id, provider_id: beneficiary.provider_id, source_currency: "USD",
        destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL" } };
    expect(beneficiaryTransferOption(local, niumProvider).selectable).toBe(true);
    expect(validateTransferConfiguration({ provider: niumProvider, beneficiary: local, sourceCurrency: "USD",
      targetCurrency: "SGD", purposeCode: "TRUTHFUL", purposeOptions: [{ code: "TRUTHFUL", label: "Truthful purpose" }],
      allowSgdPreparation: true })).toBe("");
    expect(beneficiaryTransferOption({ ...local, payout_admission: { ...local.payout_admission!, beneficiary_id: 999 } }, niumProvider).selectable).toBe(false);
  });

  it("uses backend Nium purposes only for Nium and keeps provider mappings for other rails", () => {
    const backendNiumPurposes = [
      { code: "IR004", label: "Medical Treatment" },
      { code: "IR01811", label: "General Goods Trades - Offline trade" },
    ];

    expect(shouldFetchNiumPurposeCodes("nium")).toBe(true);
    expect(shouldFetchNiumPurposeCodes("airwallex")).toBe(false);
    expect(purposeOptionsForTransferProvider("nium", backendNiumPurposes)).toEqual(backendNiumPurposes);
    expect(purposeOptionsForTransferProvider("airwallex", backendNiumPurposes)).toEqual([]);
  });

  it("accepts the explicitly selected backend Nium code and preserves it in the payload", () => {
    const purposeOptions = [
      { code: "IR004", label: "Medical Treatment" },
      { code: "IR01811", label: "General Goods Trades - Offline trade" },
    ];
    expect(validateNiumTransferConfiguration({
      provider: niumProvider,
      beneficiary,
      sourceCurrency: "USD",
      targetCurrency: "USD",
      purposeCode: "IR004",
      purposeOptions,
    })).toBe("");
    expect(buildTransferPayload(values({ purposeCode: "IR004" })).purpose_code).toBe("IR004");
    expect(validateNiumTransferConfiguration({
      provider: niumProvider,
      beneficiary,
      sourceCurrency: "USD",
      targetCurrency: "USD",
      purposeCode: "STALE_CODE",
      purposeOptions,
    })).toBe("Select a supported Nium payment purpose.");
  });

  it("does not reuse a Nium purpose for another provider", () => {
    const options = purposeOptionsForTransferProvider("airwallex", [{ code: "IR01811", label: "Nium purpose" }]);
    expect(options.some((purpose) => purpose.code === "IR01811")).toBe(false);
  });

  it("accepts valid positive monetary amounts and rejects malformed values", () => {
    expect(validateTransferAmount("1250.50")).toBe("");
    for (const value of ["", "aaaa", "12abc", "NaN", "Infinity", "0", "-1", "1.123456789", "1."]) {
      expect(validateTransferAmount(value)).toContain("valid positive amount");
    }
  });

  it("allows decimal editing but rejects alphabetic, exponent, and over-scale input", () => {
    for (const value of ["", "0", "1250", "1250.", "1250.12345678"]) {
      expect(isTransferAmountInput(value)).toBe(true);
    }
    for (const value of ["abc", "12abc", "1e3", "1.123456789", "1.2.3", "-1"]) {
      expect(isTransferAmountInput(value)).toBe(false);
      expect(validateTransferAmount(value)).toContain("valid positive amount");
    }
  });
  it("builds the exact Nium HK/USD/SWIFT API payload", () => {
    expect(buildTransferPayload(values())).toEqual({
      provider_id: 7,
      source_bank_account_id: null,
      beneficiary_id: 42,
      transfer_type: "payout",
      source_currency: "USD",
      target_currency: "USD",
      source_amount: 1250,
      target_amount: null,
      fx_rate: null,
      fee_amount: 0,
      fee_currency: "USD",
      purpose_code: "IR01811",
      reference_text: "INV-2026-001",
      client_reference: "OW-123e4567-e89b-12d3-a456-426614174000",
      raw_data: {
        source: "origin_wallet_web",
        flow: "customer_single_payment",
        provider_code: "nium",
        beneficiary_name: "HK MACHINING LIMITED",
        nium: { sourceOfFunds: "Corporate Account", payout: { swiftFeeType: "SHA" } },
      },
    });
  });

  it("omits Nium and unimplemented-action metadata for another provider", () => {
    const payload = buildTransferPayload(values({ providerId: "8", providerCode: "airwallex" }));
    expect(payload).toMatchObject({ source_bank_account_id: 15, target_amount: 1250, fx_rate: 1, fee_amount: 5 });
    expect(payload.raw_data).not.toHaveProperty("nium");
    expect(payload.raw_data).not.toHaveProperty("invoice_file_name");
    expect(payload.raw_data).not.toHaveProperty("scheduled_payment");
    expect(payload.raw_data).not.toHaveProperty("notify_recipient");
  });

  it("runs Nium corridor validation only for Nium", () => {
    expect(validateNiumTransferConfiguration({
      provider: otherProvider,
      beneficiary: { ...beneficiary, country_code: "US" },
      sourceCurrency: "EUR",
      targetCurrency: "GBP",
      purposeCode: "provider-specific-code",
    })).toBe("");
  });

  it("blocks unsupported Nium corridors", () => {
    expect(validateTransferConfiguration({
      provider: niumProvider,
      beneficiary,
      sourceCurrency: "EUR",
      targetCurrency: "USD",
      purposeCode: "IR01811",
    })).toContain("source currency USD");
  });

  it("blocks inactive beneficiaries", () => {
    expect(validateTransferConfiguration({
      provider: niumProvider,
      beneficiary: { ...beneficiary, status: "pending" },
      sourceCurrency: "USD",
      targetCurrency: "USD",
      purposeCode: "IR01811",
    })).toContain("must be active");
  });

  it("accepts only provider-verified top-level SWIFT beneficiary evidence", () => {
    expect(validateTransferConfiguration({
      provider: niumProvider,
      beneficiary,
      sourceCurrency: "USD",
      targetCurrency: "USD",
      purposeCode: "IR01811",
    })).toBe("");

    for (const unverifiedBeneficiary of [
      { ...beneficiary, payout_method: undefined, raw_data: { nium: { payoutMethod: "SWIFT" } } },
      { ...beneficiary, payout_method: null },
      { ...beneficiary, payout_method: "LOCAL" },
      { ...beneficiary, payout_method: "swift" },
      { ...beneficiary, payout_method: " SWIFT " },
    ]) {
      expect(validateTransferConfiguration({
        provider: niumProvider,
        beneficiary: unverifiedBeneficiary,
        sourceCurrency: "USD",
        targetCurrency: "USD",
        purposeCode: "IR01811",
      })).toContain("payout method must be SWIFT");
    }
  });

  it("blocks providers without transfer capability", () => {
    expect(validateTransferConfiguration({
      provider: { ...niumProvider, supports_transfers: false },
      beneficiary,
      sourceCurrency: "USD",
      targetCurrency: "USD",
      purposeCode: "IR01811",
    })).toContain("does not support transfers");
  });

  it("keeps active beneficiaries visible while disabling unsupported recipients", () => {
    expect(beneficiaryTransferOption(beneficiary, niumProvider)).toEqual({
      visible: true,
      selectable: true,
      reason: "",
    });
    expect(beneficiaryTransferOption({ ...beneficiary, payout_method: undefined }, niumProvider)).toEqual({
      visible: true,
      selectable: false,
      reason: "The Nium beneficiary payout method must be SWIFT.",
    });
    expect(beneficiaryTransferOption({ ...beneficiary, country_code: "US" }, niumProvider)).toEqual({
      visible: true,
      selectable: false,
      reason: "This Nium beneficiary corridor is not currently available. Select an active HK beneficiary receiving USD.",
    });
    expect(beneficiaryTransferOption({ ...beneficiary, status: "create_failed" }, niumProvider)).toEqual({
      visible: false,
      selectable: false,
      reason: "The selected beneficiary must be active.",
    });
  });

  it("preserves dynamic identifiers, amounts, references, and beneficiary names", () => {
    const payload = buildTransferPayload(values({
      providerId: "91",
      beneficiaryId: "812",
      sourceBankAccountId: "733",
      sourceAmount: 987.65,
      targetAmount: 432.1,
      fxRate: "9.9",
      feeAmount: "88",
      feeCurrency: "EUR",
      referenceText: "PO-DYNAMIC",
      clientReference: "OW-dynamic-uuid",
      beneficiaryName: "DYNAMIC COMPANY LIMITED",
    }));
    expect(payload).toMatchObject({
      provider_id: 91,
      beneficiary_id: 812,
      source_bank_account_id: null,
      source_amount: 987.65,
      target_amount: null,
      fx_rate: null,
      fee_amount: 0,
      fee_currency: "USD",
      reference_text: "PO-DYNAMIC",
      client_reference: "OW-dynamic-uuid",
      raw_data: { beneficiary_name: "DYNAMIC COMPANY LIMITED" },
    });
  });

  it("generates an Origin Wallet client reference from a UUID", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("123e4567-e89b-12d3-a456-426614174000");
    expect(createClientReference()).toBe("OW-123e4567-e89b-12d3-a456-426614174000");
  });

  it("models provider values as an explicit allowlisted configuration", () => {
    expect(NIUM_HK_USD_SWIFT_CONFIG).toMatchObject({
      purposes: [{ code: "IR01811" }],
      sourceOfFunds: ["Corporate Account"],
      swiftFeeTypes: ["SHA"],
    });
  });

  it("does not present an exact recipient amount for Nium", () => {
    expect(recipientAmountPresentation("nium")).toBe("Determined during processing");
    expect(recipientAmountPresentation("airwallex")).toBeNull();
  });

  it("keeps SGD Local recipients disabled until the backend route is verified", () => {
    const localBeneficiary = { ...beneficiary, country_code: "SG", currency: "SGD", payout_method: "LOCAL", beneficiary_type: "personal" };
    expect(beneficiaryTransferOption(localBeneficiary, niumProvider)).toEqual({
      visible: true, selectable: false, reason: NIUM_SG_SGD_LOCAL_UNAVAILABLE,
    });
    for (const overrides of [
      { payout_method: "SWIFT" }, { payout_method: null }, { currency: "USD" },
      { country_code: "MY" }, { beneficiary_type: "business" },
    ]) {
      expect(beneficiaryTransferOption({ ...localBeneficiary, ...overrides }, niumProvider).selectable).toBe(false);
    }
  });

  it("requires explicit backend admission bound to the exact SGD beneficiary, provider and corridor", () => {
    const local = { ...beneficiary, country_code: "SG", currency: "SGD", payout_method: "LOCAL", beneficiary_type: "personal" };
    const admission = { allowed: true, reason: null, beneficiary_id: local.id, provider_id: local.provider_id,
      source_currency: "USD", destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL" };
    // Future capability contract only: the current backend always returns allowed=false.
    expect(beneficiaryTransferOption({ ...local, payout_admission: admission }, niumProvider).selectable).toBe(true);
    for (const change of [
      { allowed: false }, { reason: "contract_verification_pending" }, { beneficiary_id: 123 }, { provider_id: 123 },
      { source_currency: "SGD" }, { destination_country: "HK" }, { destination_currency: "USD" }, { payout_method: "SWIFT" },
    ]) {
      expect(beneficiaryTransferOption({ ...local, payout_admission: { ...admission, ...change } }, niumProvider).selectable).toBe(false);
    }
    expect(beneficiaryTransferOption({ ...local, raw_data: { payout_admission: admission } }, niumProvider).selectable).toBe(false);
    expect(validateTransferConfiguration({ provider: niumProvider, beneficiary: { ...local, payout_admission: admission },
      sourceCurrency: "USD", targetCurrency: "SGD", purposeCode: "IR01811", purposeOptions: [] })).toBe("Select a supported Nium payment purpose.");
  });

  it("keeps preparation eligibility bound to the active SGD LOCAL beneficiary and backend corridor", () => {
    const local: Beneficiary = { ...beneficiary, country_code: "SG", currency: "SGD", payout_method: "LOCAL", beneficiary_type: "personal" };
    const admission = { allowed: false, reason: "financial_terms_unverified", preparation_allowed: true,
      beneficiary_id: local.id, provider_id: local.provider_id, source_currency: "USD",
      destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL" };
    expect(hasSgdLocalPreparation({ ...local, payout_admission: admission })).toBe(true);
    for (const change of [
      { preparation_allowed: false }, { beneficiary_id: 123 }, { provider_id: 123 }, { source_currency: "SGD" },
      { destination_country: "HK" }, { destination_currency: "USD" }, { payout_method: "SWIFT" },
    ]) {
      expect(hasSgdLocalPreparation({ ...local, payout_admission: { ...admission, ...change } })).toBe(false);
    }
    expect(hasSgdLocalPreparation({ ...local, status: "pending", payout_admission: admission })).toBe(false);
    expect(hasSgdLocalPreparation({ ...local, raw_data: { payout_admission: admission } })).toBe(false);
    expect(beneficiaryTransferOption({ ...local, payout_admission: admission }, { ...niumProvider, supports_transfers: false }).selectable).toBe(false);
    const config = { provider: niumProvider, beneficiary: { ...local, payout_admission: admission }, sourceCurrency: "USD",
      targetCurrency: "SGD", purposeCode: "IR01811", purposeOptions: [{ code: "IR01811", label: "Supported purpose" }] };
    expect(validateTransferConfiguration(config)).toBe(NIUM_SG_SGD_LOCAL_UNAVAILABLE);
    expect(validateTransferConfiguration({ ...config, allowSgdPreparation: true })).toBe("");
    expect(validateTransferConfiguration({ ...config, allowSgdPreparation: true, purposeOptions: [] })).toBe("Select a supported Nium payment purpose.");
    expect(validateTransferConfiguration({ ...config, allowSgdPreparation: true, sourceCurrency: "SGD" })).not.toBe("");
    expect(validateTransferConfiguration({ ...config, allowSgdPreparation: true, beneficiary: {
      ...local, payout_admission: { ...admission, beneficiary_id: 123 },
    } })).toBe(NIUM_SG_SGD_LOCAL_UNAVAILABLE);
  });

  it("preserves USD source and SGD destination without client FX values or SWIFT fee fields", () => {
    const payload = buildTransferPayload(values({ targetCurrency: "SGD" }));
    expect(payload).toMatchObject({ source_currency: "USD", target_currency: "SGD", source_amount: 1250, target_amount: null, fx_rate: null });
    expect(payload.raw_data.nium).not.toHaveProperty("payout");
    expect(recipientAmountPresentation("nium", "SGD")).toBe("SGD amount unavailable — FX confirmation pending");
    expect(payoutFeePresentation("LOCAL")).toBe("Provider fees are not yet available");
    expect(payoutFeePresentation("SWIFT")).toBe("Provider and intermediary bank fees may apply (SHA)");
  });
});
