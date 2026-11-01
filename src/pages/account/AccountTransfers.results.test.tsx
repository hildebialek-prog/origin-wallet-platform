import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Transfer } from "@/services/moneyMovementService";
import { ResultStep, TransferRow } from "./AccountTransfers";

const provider = { id: 10, code: "nium", name: "Nium", status: "active", supports_transfers: true };
const transfer: Transfer = { id: 50, transfer_no: "SYNTHETIC-50", provider_id: 10, beneficiary_id: 9, transfer_type: "payout",
  source_currency: "USD", target_currency: "SGD", source_amount: "5", status: "draft" };
describe("saved payment result presentation", () => {
  it.each([
    ["draft", "Payment draft saved"], ["pending", "Payment processing"], ["submission_unknown", "Payment outcome needs review"],
    ["failed", "Payment failed"], ["cancelled", "Payment cancelled"], ["completed", "Payment completed"],
  ])("shows %s as its actual outcome", (status, title) => {
    render(<ResultStep transfer={{ ...transfer, status }} provider={provider} submitting={false}
      onSubmitToProvider={vi.fn()} onNewPayment={vi.fn()} />);
    expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Submit payment/ })).not.toBeInTheDocument();
    if (["draft", "submission_unknown"].includes(status)) expect(screen.getByRole("button", { name: "Start a separate payment" })).toBeDisabled();
  });
  it("does not present a lock_unknown draft as a successful request", () => {
    render(<ResultStep transfer={{ ...transfer, payout_workflow: { state: "lock_unknown" } }} provider={provider}
      submitting={false} onSubmitToProvider={vi.fn()} onNewPayment={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Payment outcome needs review" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start a separate payment" })).toBeDisabled();
  });
  it.each([true, false])("gates activity reconciliation by capability %s without external_transfer_id", (allowed) => {
    render(<TransferRow transfer={{ ...transfer, status: "submission_unknown", payout_workflow: { state: "submitting", can_reconcile_status: allowed } }}
      provider={provider} submitting={false} syncing={false} canceling={false} onSubmit={vi.fn()} onSync={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Sync" })).toHaveProperty("disabled", !allowed);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
