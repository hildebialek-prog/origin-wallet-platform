import { ApiRequestError } from "@/services/apiClient";
import type { Beneficiary, Transfer } from "@/services/moneyMovementService";

// Local identifiers and a digest only. Never store consent, tokens, bank details or provider evidence.
export interface PaymentIdentity {
  version: 1;
  providerId: number;
  beneficiaryId: number;
  clientReference: string;
  preparationId: string;
  fingerprint: string;
  transferId?: number;
}
const key = (userId: string) => `ow-payment-identity-v1:${userId}`;

export function readPaymentIdentity(userId: string): PaymentIdentity | null {
  const raw = localStorage.getItem(key(userId));
  if (raw === null) return null;
  let value: PaymentIdentity;
  try { value = JSON.parse(raw); } catch { throw new Error("Saved payment identity is unreadable. Contact support before creating another payment."); }
  if (!value || value.version !== 1 || !Number.isInteger(value.providerId) || !Number.isInteger(value.beneficiaryId)
    || typeof value.clientReference !== "string" || !value.clientReference.trim() || value.clientReference.length > 100
    || !/^[\da-f-]{36}$/i.test(value.preparationId)
    || !/^[\da-f]{64}$/.test(value.fingerprint)
    || (value.transferId !== undefined && !Number.isInteger(value.transferId))) {
    throw new Error("Saved payment identity is invalid. Contact support before creating another payment.");
  }
  return value;
}

export function writePaymentIdentity(userId: string, identity: PaymentIdentity) {
  localStorage.setItem(key(userId), JSON.stringify(identity));
}

export function clearPaymentIdentity(userId: string, identity: PaymentIdentity) {
  const current = readPaymentIdentity(userId);
  if (current?.clientReference !== identity.clientReference) throw new Error("Another payment is active. Reopen its saved status.");
  localStorage.removeItem(key(userId));
}

export async function paymentFingerprint(instruction: {
  providerId: string; beneficiaryId: string; transferType: string; sourceCurrency: string;
  targetCurrency: string; sourceAmount: string; purposeCode: string; referenceText: string;
}, beneficiary: Beneficiary): Promise<string> {
  if (!crypto.subtle) throw new Error("A secure browser connection is required to protect payment identity.");
  // Explicit receiving-account projection, independent of provider raw data and response property order.
  const receivingAccount = [beneficiary.id, beneficiary.provider_id, beneficiary.beneficiary_type,
    beneficiary.full_name, beneficiary.company_name, beneficiary.country_code, beneficiary.currency,
    beneficiary.payout_method, beneficiary.bank_name, beneficiary.bank_code, beneficiary.branch_code,
    beneficiary.account_number, beneficiary.iban, beneficiary.swift_bic, beneficiary.address_line1,
    beneficiary.address_line2, beneficiary.city, beneficiary.state, beneficiary.postal_code,
    beneficiary.edit_fields?.bank_account_type,
    [...(beneficiary.edit_fields?.routing ?? [])].sort((a, b) => a.type.localeCompare(b.type)).map(({ type, value }) => [type, value]),
  ];
  const amount = instruction.sourceAmount.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  const input = [instruction.providerId, instruction.beneficiaryId, instruction.transferType,
    instruction.sourceCurrency, instruction.targetCurrency, amount, instruction.purposeCode, instruction.referenceText, receivingAccount];
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function claimPaymentIdentity(userId: string, providerId: number, beneficiaryId: number, fingerprint: string) {
  const claim = () => {
    const existing = readPaymentIdentity(userId);
    if (existing) {
      if (existing.fingerprint !== fingerprint || existing.providerId !== providerId || existing.beneficiaryId !== beneficiaryId) {
        throw new Error("Payment details or receiving account changed. Reopen the saved payment; cancel a safe draft before editing, or explicitly start a separate payment after its outcome is known.");
      }
      return existing;
    }
    const identity: PaymentIdentity = { version: 1, providerId, beneficiaryId, fingerprint,
      clientReference: `OW-${crypto.randomUUID()}`, preparationId: crypto.randomUUID() };
    writePaymentIdentity(userId, identity); // Storage failure blocks the write to the API.
    return identity;
  };
  if (navigator.locks) return navigator.locks.request(key(userId), claim);
  // A read/then-write localStorage fallback could allocate two references in competing tabs.
  // Existing identities can still be replayed; allocating a new one requires browser coordination.
  if (readPaymentIdentity(userId)) return claim();
  throw new Error("This browser cannot safely coordinate a new payment. Use a secure browser with Web Locks support.");
}

export function belongsToIdentity(transfer: Transfer, identity: PaymentIdentity) {
  return Number.isInteger(transfer.id) && transfer.provider_id === identity.providerId
    && transfer.beneficiary_id === identity.beneficiaryId && transfer.client_reference === identity.clientReference
    && (identity.transferId === undefined || identity.transferId === transfer.id);
}

export function rememberPaymentTransfer(userId: string, identity: PaymentIdentity, transfer: Transfer) {
  if (!belongsToIdentity(transfer, identity)) throw new Error("The saved transfer does not match this payment instruction.");
  const current = readPaymentIdentity(userId);
  if (!current || current.clientReference !== identity.clientReference) throw new Error("Payment identity changed. Reopen the saved payment.");
  const updated = { ...current, transferId: transfer.id };
  writePaymentIdentity(userId, updated);
  return updated;
}

export function structuredTransfer(failure: unknown): Transfer | null {
  const value = failure instanceof ApiRequestError ? failure.payload?.transfer : null;
  return value && typeof value === "object" && Number.isInteger((value as Transfer).id) ? value as Transfer : null;
}

export function paymentUncertain(transfer: Transfer) {
  return transfer.payout_workflow?.recovery_required === true
    || ["locking", "lock_unknown", "submitting", "submission_unknown"].includes(transfer.payout_workflow?.state ?? "")
    || (transfer.status === "draft" && ["pending", "processing", "submitted", "sent", "provider_pending"].includes(transfer.payout_workflow?.state ?? ""))
    || ["locking", "lock_unknown", "submitting", "submission_unknown"].includes(transfer.status);
}

export function isBlockedDraft(transfer: Transfer) {
  return Number.isInteger(transfer.id) && transfer.id > 0 && transfer.status === "draft" && paymentUncertain(transfer);
}

// Release only the browser's active wizard pointer. The saved transfer and its operation keys
// remain owned by the backend; this action must never call a transfer or recovery API.
export async function leaveBlockedDraftSession(userId: string, transfer: Transfer) {
  if (!isBlockedDraft(transfer)) throw new Error("Only a blocked saved draft can be left with this action.");
  if (!navigator.locks) throw new Error("Use a secure browser with Web Locks support to start a new transfer safely.");
  await navigator.locks.request(key(userId), () => {
    const current = readPaymentIdentity(userId);
    if (!current) return;
    if (!belongsToIdentity(transfer, current)) throw new Error("Another payment is active. Reopen its saved status before starting a new transfer.");
    clearPaymentIdentity(userId, current);
  });
}

export function canLeavePayment(transfer: Transfer) {
  return !paymentUncertain(transfer)
    && ["approval_required", "approved", "pending", "processing", "submitted", "sent", "provider_pending", "completed", "failed", "cancelled", "rejected"].includes(transfer.status);
}

export function canCancelPayment(transfer: Transfer) {
  return !paymentUncertain(transfer) && ["draft", "approval_required", "approved"].includes(transfer.status);
}

export function paymentPresentation(transfer: Transfer | null) {
  if (!transfer) return { title: "Payment status unavailable", message: "Refresh the saved instruction before continuing." };
  if (isBlockedDraft(transfer)) return { title: "Payment outcome needs review", message: "This transfer remains pending investigation because a provider operation is pending or its outcome is unknown. Do not retry or submit this transfer. Start New Transfer opens a separate payment and leaves this transfer unchanged in Transfer activity." };
  if (paymentUncertain(transfer)) return { title: "Payment outcome needs review", message: "An operation may still be in progress. Do not create or submit another instruction. Refresh status or use the available recovery actions." };
  switch (transfer.status) {
    case "completed": return { title: "Payment completed", message: "The backend reports this payment completed." };
    case "failed": return { title: "Payment failed", message: "Review the saved failure and reconciliation status before deciding on another payment." };
    case "cancelled": case "rejected": return { title: `Payment ${transfer.status}`, message: "This instruction is closed. Review its saved status before starting another payment." };
    case "approval_required": case "approved": return { title: "Payment awaiting Admin processing", message: "Your instruction is saved. Independent Admin approval owns payout submission. Customer acceptance does not execute a payout." };
    case "draft": return { title: "Payment draft saved", message: "Customer consent has not been confirmed. Reopen the same draft to review it; do not create another reference to retry." };
    case "pending": case "processing": case "submitted": case "sent": case "provider_pending":
      return { title: "Payment processing", message: "The saved payment is pending. Final payout completion has not been confirmed." };
    default: return { title: "Payment status needs review", message: "Refresh the saved instruction before continuing." };
  }
}
