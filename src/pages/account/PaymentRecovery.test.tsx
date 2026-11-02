import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Transfer } from "@/services/moneyMovementService";
import { ApiRequestError } from "@/services/apiClient";
import PaymentRecovery from "./PaymentRecovery";

const api = vi.hoisted(() => ({ getTransfer: vi.fn(), syncTransferStatus: vi.fn(), cancelTransfer: vi.fn(),
  requestSgdRecoveryReview: vi.fn(), recoverSgdCapturedOutcome: vi.fn() }));
vi.mock("@/services/moneyMovementService", () => api);
const unknown: Transfer = { id: 50, transfer_no: "SYNTHETIC-50", provider_id: 10, beneficiary_id: 9,
  transfer_type: "payout", source_currency: "USD", target_currency: "SGD", source_amount: "5", status: "submission_unknown",
  payout_workflow: { state: "submitting", recovery_kind: "provider_reference_missing", can_request_recovery_review: true,
    can_recover_captured_outcome: true, can_reconcile_status: false, dispatch_allowed: false } };
const resume = vi.fn();
function Harness({ initial = unknown }: { initial?: Transfer }) {
  const [transfer, setTransfer] = useState(initial);
  return <PaymentRecovery userId="12" token="customer-token" transfer={transfer} onUpdated={setTransfer} onResume={resume} />;
}
beforeEach(() => { vi.resetAllMocks(); api.getTransfer.mockResolvedValue(unknown); });

describe("saved payment recovery", () => {
  it("offers cancellation rather than reusing a draft when the backend explicitly denies replacement review", () => {
    const draft = { ...unknown, status: "draft", payout_workflow: { state: "draft", can_refresh_review: false } };
    render(<Harness initial={draft} />);
    expect(screen.queryByRole("button", { name: "Review saved instruction" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel saved instruction before editing" })).toBeEnabled();
    expect(api.getTransfer).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });
  it("honors a fresh denial of draft re-review before resuming the saved instruction", async () => {
    const draft = { ...unknown, status: "draft", payout_workflow: { state: "draft", can_refresh_review: true } };
    api.getTransfer.mockResolvedValue({ ...draft, payout_workflow: { ...draft.payout_workflow, can_refresh_review: false } });
    render(<Harness initial={draft} />);
    fireEvent.click(screen.getByRole("button", { name: "Review saved instruction" }));
    await screen.findByRole("alert");
    expect(resume).not.toHaveBeenCalled();
    expect(api.cancelTransfer).not.toHaveBeenCalled();
  });
  it("performs no automatic operation and blocks blind reconciliation, cancellation and review", () => {
    render(<Harness />);
    expect(api.getTransfer).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Reconcile status" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancel saved|Review saved/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit/ })).not.toBeInTheDocument();
  });
  it.each(["submission_unknown", "completed"])("uses the backend reconciliation capability for %s without an external reference", async (status) => {
    const transfer = { ...unknown, status, payout_workflow: { ...unknown.payout_workflow!, can_reconcile_status: true } };
    api.getTransfer.mockResolvedValue(transfer); api.syncTransferStatus.mockResolvedValue({ transfer });
    render(<Harness initial={transfer} />);
    fireEvent.click(screen.getByRole("button", { name: "Reconcile status" }));
    await waitFor(() => expect(api.syncTransferStatus).toHaveBeenCalledExactlyOnceWith({ userId: "12", token: "customer-token", transferId: 50 }));
    expect(api.getTransfer).toHaveBeenCalledTimes(1);
    expect(api.recoverSgdCapturedOutcome).not.toHaveBeenCalled();
  });
  it("refuses an action if a fresh capability was revoked", async () => {
    const stale = { ...unknown, payout_workflow: { ...unknown.payout_workflow!, can_reconcile_status: true } };
    render(<Harness initial={stale} />);
    fireEvent.click(screen.getByRole("button", { name: "Reconcile status" }));
    await screen.findByRole("alert");
    expect(api.syncTransferStatus).not.toHaveBeenCalled();
  });
  it("recovers saved evidence before reconciliation without another instruction or dispatch", async () => {
    const recovered = { ...unknown, payout_workflow: { ...unknown.payout_workflow!, can_recover_captured_outcome: false, can_reconcile_status: true } };
    api.recoverSgdCapturedOutcome.mockResolvedValue(recovered);
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Recover captured outcome" });
    fireEvent.click(button); fireEvent.click(button);
    await screen.findByRole("button", { name: "Reconcile status" });
    expect(api.recoverSgdCapturedOutcome).toHaveBeenCalledTimes(1);
    expect(api.syncTransferStatus).not.toHaveBeenCalled();
  });
  it.each(["locking", "lock_unknown"])("requests a local recovery review for %s without repeating FX", async (state) => {
    const locked = { ...unknown, status: "draft", payout_workflow: { ...unknown.payout_workflow!, state,
      recovery_kind: "fx_outcome_unknown" } };
    api.getTransfer.mockResolvedValue(locked);
    api.requestSgdRecoveryReview.mockResolvedValue({ ...locked, payout_workflow: { ...locked.payout_workflow,
      recovery_review_requested_at: "2026-10-31T00:00:00Z" } });
    render(<Harness initial={locked} />);
    fireEvent.click(screen.getByRole("button", { name: "Request recovery review" }));
    await screen.findByText(/Recovery review requested:/);
    expect(screen.getByRole("button", { name: "Request recovery review" })).toBeDisabled();
    expect(api.cancelTransfer).not.toHaveBeenCalled(); expect(resume).not.toHaveBeenCalled();
  });
  it("preserves a structured failed recovery response", async () => {
    api.recoverSgdCapturedOutcome.mockRejectedValue(new ApiRequestError("Evidence unavailable", 422, undefined, {
      transfer: { ...unknown, status: "failed" },
    }));
    render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Recover captured outcome" }));
    await screen.findByText("Evidence unavailable");
    expect(screen.getByText(/Saved payment #50: failed/)).toBeVisible();
  });
  it("reopens an expired approval for explicit review only when the fresh backend permits it", async () => {
    const expired = { ...unknown, status: "approved", payout_workflow: { state: "approved", can_refresh_review: true } };
    api.getTransfer.mockResolvedValue(expired);
    render(<Harness initial={expired} />);
    fireEvent.click(screen.getByRole("button", { name: "Review saved instruction" }));
    await waitFor(() => expect(resume).toHaveBeenCalledWith(expired));
    expect(api.syncTransferStatus).not.toHaveBeenCalled(); expect(api.cancelTransfer).not.toHaveBeenCalled();
  });
});
