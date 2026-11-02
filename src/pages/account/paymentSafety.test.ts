import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Beneficiary, Transfer } from "@/services/moneyMovementService";
import { canCancelPayment, canLeavePayment, claimPaymentIdentity, clearPaymentIdentity, paymentFingerprint,
  isBlockedDraft, leaveBlockedDraftSession, paymentPresentation, readPaymentIdentity, rememberPaymentTransfer } from "./paymentSafety";

const beneficiary: Beneficiary = { id: 9, provider_id: 10, full_name: "Synthetic payee", beneficiary_type: "individual",
  country_code: "SG", currency: "SGD", payout_method: "LOCAL", status: "active", account_number: "1234567890",
  edit_fields: { routing: [{ type: "BANK CODE", value: "123" }] } };
const instruction = { providerId: "10", beneficiaryId: "9", transferType: "payout", sourceCurrency: "USD",
  targetCurrency: "SGD", sourceAmount: "5", purposeCode: "TRUTHFUL", referenceText: "Sensitive invoice text" };
const saved = (reference: string, overrides: Partial<Transfer> = {}): Transfer => ({ id: 50, transfer_no: "SYNTHETIC-50",
  provider_id: 10, beneficiary_id: 9, transfer_type: "payout", source_currency: "USD", target_currency: "SGD",
  source_amount: "5", client_reference: reference, status: "draft", ...overrides });

beforeEach(() => {
  localStorage.clear(); vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("navigator", { locks: { request: async (_name: string, callback: () => unknown) => callback() } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("durable payment identity", () => {
  it("retains the same reference and preparation across reload and equivalent decimal formatting", async () => {
    const hash = await paymentFingerprint(instruction, beneficiary);
    expect(await paymentFingerprint({ ...instruction, sourceAmount: "5.00000000" }, beneficiary)).toBe(hash);
    const first = await claimPaymentIdentity("12", 10, 9, hash);
    rememberPaymentTransfer("12", first, saved(first.clientReference));
    const reopened = await claimPaymentIdentity("12", 10, 9, hash);
    expect(reopened).toEqual({ ...first, transferId: 50 });
    const stored = localStorage.getItem("ow-payment-identity-v1:12")!;
    expect(stored).not.toContain(beneficiary.account_number);
    expect(stored).not.toContain(instruction.referenceText);
    expect(stored).not.toMatch(/review_token|consent|raw_data|authorization/);
  });
  it.each(["amount", "purpose", "reference", "account", "account_type", "routing", "corridor", "provider"])("rejects a changed %s without replacing the original identity", async (change) => {
    const first = await claimPaymentIdentity("12", 10, 9, await paymentFingerprint(instruction, beneficiary));
    const form = { ...instruction, ...(change === "amount" ? { sourceAmount: "10" } : {}),
      ...(change === "purpose" ? { purposeCode: "DIFFERENT" } : {}), ...(change === "reference" ? { referenceText: "other" } : {}) };
    const payee = { ...beneficiary, ...(change === "account" ? { account_number: "different" } : {}),
      ...(change === "corridor" ? { payout_method: "SWIFT" } : {}), ...(change === "provider" ? { provider_id: 11 } : {}),
      ...(change === "account_type" ? { edit_fields: { ...beneficiary.edit_fields, bank_account_type: "Savings" } } : {}),
      ...(change === "routing" ? { edit_fields: { ...beneficiary.edit_fields, routing: [{ type: "BANK CODE", value: "456" }] } } : {}) };
    await expect(claimPaymentIdentity("12", payee.provider_id, 9, await paymentFingerprint(form, payee))).rejects.toThrow(/changed/);
    expect(readPaymentIdentity("12")).toEqual(first);
  });
  it("never discards corrupt or unavailable storage to mint another reference", async () => {
    localStorage.setItem("ow-payment-identity-v1:12", "broken");
    await expect(claimPaymentIdentity("12", 10, 9, "a".repeat(64))).rejects.toThrow(/unreadable/);
    localStorage.clear();
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    await expect(claimPaymentIdentity("12", 10, 9, "a".repeat(64))).rejects.toThrow(/Storage unavailable/);
    write.mockRestore();
  });
  it("requires Web Locks to allocate a new reference and still permits a retained identity", async () => {
    const first = await claimPaymentIdentity("12", 10, 9, "a".repeat(64));
    vi.stubGlobal("navigator", {});
    expect(await claimPaymentIdentity("12", 10, 9, "a".repeat(64))).toEqual(first);
    await expect(claimPaymentIdentity("other-user", 10, 9, "a".repeat(64))).rejects.toThrow(/Web Locks/);
  });
  it("rejects mismatched saved transfers and retains an accepted identity until explicit release", async () => {
    const first = await claimPaymentIdentity("12", 10, 9, await paymentFingerprint(instruction, beneficiary));
    expect(() => rememberPaymentTransfer("12", first, saved(first.clientReference, { provider_id: 999 }))).toThrow(/does not match/);
    rememberPaymentTransfer("12", first, saved(first.clientReference, { status: "approval_required" }));
    expect(readPaymentIdentity("12")?.clientReference).toBe(first.clientReference);
    clearPaymentIdentity("12", first);
    const separate = await claimPaymentIdentity("12", 10, 9, await paymentFingerprint(instruction, beneficiary));
    expect(separate.clientReference).not.toBe(first.clientReference);
  });
});

describe("status presentation and edit safety", () => {
  it.each(["locking", "lock_unknown", "submitting", "submission_unknown", "pending", "provider_pending"])("blocks cancellation and retry of a draft during %s", (state) => {
    const transfer = saved("OW-saved", { payout_workflow: { state } });
    expect(canCancelPayment(transfer)).toBe(false); expect(canLeavePayment(transfer)).toBe(false);
    expect(paymentPresentation(transfer).title).toBe("Payment outcome needs review");
    expect(isBlockedDraft(transfer)).toBe(true);
  });
  it.each([
    ["submission_unknown", "Payment outcome needs review"], ["submitting", "Payment outcome needs review"],
    ["pending", "Payment processing"], ["failed", "Payment failed"], ["cancelled", "Payment cancelled"],
    ["approval_required", "Payment awaiting Admin processing"], ["completed", "Payment completed"],
  ])("presents %s accurately", (status, title) => expect(paymentPresentation(saved("OW-saved", { status })).title).toBe(title));
});

describe("leaving a blocked draft wizard", () => {
  it("releases only the matching user's wizard pointer under the same identity lock", async () => {
    const identity = await claimPaymentIdentity("12", 10, 9, "a".repeat(64));
    const transfer = saved(identity.clientReference, { payout_workflow: { state: "lock_unknown" } });
    rememberPaymentTransfer("12", identity, transfer);
    localStorage.setItem("unrelated-session", "keep");
    const other = await claimPaymentIdentity("other-user", 10, 9, "b".repeat(64));
    const request = vi.spyOn(navigator.locks, "request");
    await leaveBlockedDraftSession("12", transfer);
    expect(request).toHaveBeenCalledWith("ow-payment-identity-v1:12", expect.any(Function));
    expect(readPaymentIdentity("12")).toBeNull();
    expect(readPaymentIdentity("other-user")).toEqual(other);
    expect(localStorage.getItem("unrelated-session")).toBe("keep");
    expect(transfer.payout_workflow?.state).toBe("lock_unknown");
    const next = await claimPaymentIdentity("12", 10, 9, identity.fingerprint);
    expect(next.clientReference).not.toBe(identity.clientReference);
    expect(next.preparationId).not.toBe(identity.preparationId);
    expect(next.transferId).toBeUndefined();
  });
  it("can leave a blocked draft opened from history when no wizard identity is active", async () => {
    await leaveBlockedDraftSession("12", saved("OW-history", { payout_workflow: { state: "pending" } }));
    expect(readPaymentIdentity("12")).toBeNull();
  });
  it("does not clear another tab's identity or bypass unavailable browser coordination", async () => {
    const active = await claimPaymentIdentity("12", 10, 9, "a".repeat(64));
    const old = saved("OW-old", { payout_workflow: { state: "lock_unknown" } });
    await expect(leaveBlockedDraftSession("12", old)).rejects.toThrow(/Another payment is active/);
    expect(readPaymentIdentity("12")).toEqual(active);
    vi.stubGlobal("navigator", {});
    await expect(leaveBlockedDraftSession("12", old)).rejects.toThrow(/Web Locks/);
    expect(readPaymentIdentity("12")).toEqual(active);
  });
  it.each([
    saved("OW-healthy"), saved("OW-accepted", { status: "approval_required", payout_workflow: { state: "lock_unknown" } }),
    saved("OW-unsaved", { id: 0, payout_workflow: { state: "lock_unknown" } }),
  ])("rejects an ineligible transfer without clearing the active identity ($client_reference)", async (transfer) => {
    const identity = await claimPaymentIdentity("12", 10, 9, "a".repeat(64));
    await expect(leaveBlockedDraftSession("12", transfer)).rejects.toThrow(/Only a blocked saved draft/);
    expect(readPaymentIdentity("12")).toEqual(identity);
  });
});
