import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NiumPayoutAmounts, Transfer } from "@/services/moneyMovementService";
import { SgdLocalAmountBreakdown } from "./SgdLocalAmountBreakdown";
import { ResultStep, TransferRow } from "./AccountTransfers";

const provider = { id: 7, code: "nium", name: "Nium", status: "active", supports_transfers: true };
const amounts: NiumPayoutAmounts = {
  source_currency: "USD", destination_currency: "SGD", source_amount: "10.00000000",
  total_wallet_debit: null, fx_rate: "1.32", conversion_amount: "13.15", transfer_fee: null, beneficiary_credit: null,
  fx_lock_expires_at: "2036-10-30T10:10:00.000Z",
};
const transfer: Transfer = {
  id: 1, user_id: 9, provider_id: 7, transfer_no: "TEST-SGD", transfer_type: "payout",
  source_currency: "USD", target_currency: "SGD", source_amount: "10", target_amount: "999", fee_amount: 0,
  fx_rate: "999", fee_currency: "USD", status: "submission_unknown", payout_amounts: amounts,
};

describe("SGD payout amount distinctions", () => {
  it("shows separately observed uncapped charges without confirming an all-in price or zero fees", () => {
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...amounts, actual_debit: {
      state: "unexpected_charges_reconciled", currency: "USD", principal_debit: "10", observed_charge_debit: "1.25",
      observed_total_debit: "11.25", pilot_charge_exposure: "uncapped", pilot_additional_charges_observed: true,
      pilot_charge_ceiling_breached: null,
    } }} />);
    expect(screen.getByText("Observed additional NIUM charges")).toBeVisible();
    expect(screen.getByText("USD 1.25")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("no verified ceiling");
    expect(screen.getByText("Unavailable — fees not confirmed")).toBeVisible();
    expect(screen.queryByText("USD 0.00")).not.toBeInTheDocument();
  });
  afterEach(() => vi.useRealTimers());
  it("keeps completed payout debit unknown until financial evidence arrives", () => {
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...amounts, actual_debit: { state: "awaiting_evidence" } }} />);
    expect(screen.getByText("Awaiting financial evidence")).toBeVisible();
    expect(screen.getByText(/Unresolved reservations remain held/)).toBeVisible();
    expect(screen.queryByText("USD 0.00")).not.toBeInTheDocument();
  });

  it("displays observed debit after FX expiry without treating missing fees as zero", () => {
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...amounts, fx_lock_expires_at: "2000-01-01T00:00:00Z",
      actual_debit: { state: "unexpected_charges_reconciled", currency: "USD", observed_total_debit: "11.25" } }} />);
    expect(screen.getByText("USD 11.25")).toBeVisible();
    expect(screen.getByText(/Additional charges may appear later/)).toBeVisible();
    expect(screen.getByText("Unavailable — provider confirmation pending")).toBeVisible();
  });
  it("shows only explicit backend conversion evidence and keeps fee, total debit and final credit unknown", () => {
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={amounts} />);
    expect(screen.getByText("USD 10.00")).toBeVisible();
    expect(screen.getByText("1.32 SGD per USD")).toBeVisible();
    expect(screen.getByText(amounts.fx_lock_expires_at!)).toBeVisible();
    expect(screen.getByText("SGD 13.15")).toBeVisible();
    expect(screen.getByText("Unavailable — fees not confirmed")).toBeVisible();
    expect(screen.getByText("Unavailable — provider confirmation pending")).toBeVisible();
    expect(screen.getByText("Unavailable — final credit not confirmed")).toBeVisible();
    expect(screen.queryByText("SGD 13.20")).not.toBeInTheDocument();
    expect(screen.queryByText("USD 0.00")).not.toBeInTheDocument();
  });

  it("preserves the supplied nine-decimal rate and never acquires holds while rendering", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const props = { ...amounts, fx_rate: "1.275939120", conversion_amount: null };
    const view = render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={props} />);
    view.rerender(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...props }} />);
    expect(screen.getByText("1.275939120 SGD per USD")).toBeVisible();
    expect(screen.getByText("SGD amount unavailable — FX confirmation pending")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it.each([
    { source_amount: "11" }, { source_currency: "SGD" }, { destination_currency: "USD" },
    { source_amount: "10.00000001" },
  ])("hides FX evidence mismatched to the current funding amount or currency: %j", (overrides) => {
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...amounts, ...overrides }} />);
    expect(screen.queryByText("1.32 SGD per USD")).not.toBeInTheDocument();
    expect(screen.queryByText("SGD 13.15")).not.toBeInTheDocument();
    expect(screen.getByText("SGD amount unavailable — FX confirmation pending")).toBeVisible();
  });

  it.each(["0", "1.25"])("displays an explicit backend-confirmed fee, including zero: %s", (fee) => {
    // Presentation fixture only; this does not verify the customer's NIUM fee plan.
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...amounts, transfer_fee: { amount: fee, currency: "USD" } }} />);
    expect(screen.getByText(`USD ${Number(fee).toFixed(2)}`)).toBeVisible();
    expect(screen.queryByText("Unavailable — provider confirmation pending")).not.toBeInTheDocument();
    expect(screen.getByText("Unavailable — fees not confirmed")).toBeVisible();
    expect(screen.getByText("Unavailable — final credit not confirmed")).toBeVisible();
  });

  it("does not display zero or invalid rate as a valid conversion rate", () => {
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...amounts, fx_rate: 0 }} />);
    expect(screen.getByText("Unavailable pending provider confirmation")).toBeVisible();
  });

  it.each([null, "invalid", "2020-01-01T00:00:00Z"])("hides conversion evidence without a current lock expiry: %s", (expiry) => {
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...amounts, fx_lock_expires_at: expiry }} />);
    expect(screen.queryByText("1.32 SGD per USD")).not.toBeInTheDocument();
    expect(screen.queryByText("SGD 13.15")).not.toBeInTheDocument();
  });

  it("removes the rate and conversion amount when the displayed lock expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T10:00:00Z"));
    render(<SgdLocalAmountBreakdown sourceAmount="10" amounts={{ ...amounts, fx_lock_expires_at: "2026-10-30T10:00:02Z" }} />);
    expect(screen.getByText("1.32 SGD per USD")).toBeVisible();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText("1.32 SGD per USD")).not.toBeInTheDocument();
    expect(screen.queryByText("SGD 13.15")).not.toBeInTheDocument();
    expect(screen.getByText("Expired — a new FX lock and review are required")).toBeVisible();
  });

  it("keeps request status and list free of placeholder amounts and offers no duplicate submission", () => {
    const onSubmit = vi.fn();
    render(<>
      <ResultStep transfer={transfer} provider={provider} submitting={false} onSubmitToProvider={onSubmit} onNewPayment={vi.fn()} />
      <TransferRow transfer={transfer} provider={provider} submitting={false} syncing={false} canceling={false}
        onSubmit={onSubmit} onSync={vi.fn()} onCancel={vi.fn()} />
    </>);
    expect(screen.getAllByText("SGD 13.15")).toHaveLength(2);
    expect(screen.queryByText(/999/)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Do not submit again");
    expect(screen.queryByRole("button", { name: /^Submit/ })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not expose Submit while provider authorization is unavailable", () => {
    render(<>
      <ResultStep transfer={{ ...transfer, status: "approved" }} submitting={false} onSubmitToProvider={vi.fn()} onNewPayment={vi.fn()} />
      <TransferRow transfer={{ ...transfer, status: "approved" }} submitting={false} syncing={false} canceling={false}
        onSubmit={vi.fn()} onSync={vi.fn()} onCancel={vi.fn()} />
    </>);
    expect(screen.queryByRole("button", { name: /^Submit/ })).not.toBeInTheDocument();
  });

  it("leaves dispatch to independent Admin approval with no second customer Submit", () => {
    render(<ResultStep transfer={{ ...transfer, status: "approval_required" }} provider={provider}
      submitting={false} onSubmitToProvider={vi.fn()} onNewPayment={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Admin Approve & submit initiates the NIUM payout");
    expect(screen.queryByText(/submitted automatically once approved/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Submit/ })).not.toBeInTheDocument();
  });
});
