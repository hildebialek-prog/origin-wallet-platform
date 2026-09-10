import { describe, expect, it, vi } from "vitest";
import type { Beneficiary } from "@/services/moneyMovementService";
import type { ProviderSummary } from "@/services/fxOrderService";
import {
  buildTransferPayload,
  createClientReference,
  NIUM_HK_USD_SWIFT_CONFIG,
  recipientAmountPresentation,
  validateNiumTransferConfiguration,
  validateTransferConfiguration,
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
  status: "active",
  raw_data: { nium: { payoutMethod: "SWIFT" } },
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

  it("blocks providers without transfer capability", () => {
    expect(validateTransferConfiguration({
      provider: { ...niumProvider, supports_transfers: false },
      beneficiary,
      sourceCurrency: "USD",
      targetCurrency: "USD",
      purposeCode: "IR01811",
    })).toContain("does not support transfers");
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
});
