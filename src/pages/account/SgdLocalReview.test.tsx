import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import SgdLocalReview from "./SgdLocalReview";
import type { TransferReview } from "@/services/moneyMovementService";
import { ApiRequestError } from "@/services/apiClient";

const api = vi.hoisted(() => ({ reviewTransfer: vi.fn(), createTransfer: vi.fn() }));
vi.mock("@/services/moneyMovementService", () => api);
const onSubmitted = vi.fn();
const props = { userId: "12", token: "customer-token", providerId: 10, beneficiaryId: 9, sourceAmount: "5",
  purposeCode: "TRUTHFUL", referenceText: "INV-NEW", preparationReference: "new-instruction",
  validationError: "", onSubmitted };
const terms = (): TransferReview => ({ id: 50, transfer_no: "SYNTHETIC-50", provider_id: 10, beneficiary_id: 9,
  transfer_type: "payout", target_currency: "SGD", status: "draft", purpose_code: "TRUTHFUL", reference_text: "INV-NEW",
  client_reference: "new-instruction", payout_workflow: { state: "locked", dispatch_allowed: false,
    dispatch_owner: "checker_approval", customer_accepted_at: null, recovery_required: false },
  review_token: "bound-review", source_amount: "5.00000000",
  source_currency: "USD", destination_currency: "SGD", fx_rate: "1.32",
  fx_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), conversion_amount: null,
  terms: { currency: "USD", fee_amount: "0",
    total_wallet_debit: "5", expires_at: new Date(Date.now() + 15 * 60_000).toISOString() } });
const consent = async () => {
  await waitFor(() => expect(screen.getByRole("checkbox", { name: /I authorize/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("checkbox", { name: /I authorize/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /purpose is truthful/ }));
};

beforeEach(() => {
  vi.resetAllMocks();
  api.reviewTransfer.mockImplementation(async () => terms());
  api.createTransfer.mockImplementation(async () => {
    const { review_token, terms: pricing, destination_currency, fx_expires_at, conversion_amount, ...transfer } = terms();
    return { ...transfer, status: "approval_required", payout_workflow: { ...transfer.payout_workflow,
      state: "approval_required", customer_accepted_at: new Date().toISOString() } };
  });
});
afterEach(() => { vi.restoreAllMocks(); });

describe("SGD standard review", () => {
  it("prepares once in StrictMode and submits once through standard creation after consent", async () => {
    render(<StrictMode><SgdLocalReview {...props} onInspect={vi.fn()} /></StrictMode>);
    await consent();
    const submit = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer.mock.calls[0][0].payload).toMatchObject({
      source_amount: "5", target_currency: "SGD", review_token: "bound-review",
      client_reference: "new-instruction", accept_payment_terms: true, purpose_confirmed: true,
    });
    expect(screen.queryByRole("button", { name: /Lock|Refresh|Approval|Save Draft|Resume|Check saved payment/ })).not.toBeInTheDocument();
  });
  it("reports the genuine financial blocker and cannot accept unavailable terms", async () => {
    api.reviewTransfer.mockRejectedValue(new Error("Verified NIUM fees and total wallet debit are unavailable."));
    render(<SgdLocalReview {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Verified NIUM fees");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.createTransfer).not.toHaveBeenCalled();
  });
  it.each([
    { source_amount: "5.00000001" },
    { source_currency: "SGD" },
    { terms: { ...terms().terms, fee_amount: null, total_wallet_debit: null } },
    { terms: undefined },
    { terms: { ...terms().terms, fee_amount: "1", total_wallet_debit: "6" } },
  ])("blocks mismatched or unsupported financial evidence %j", async (change) => {
    api.reviewTransfer.mockResolvedValue({ ...terms(), ...change });
    render(<SgdLocalReview {...props} />);
    await screen.findByText("1.32");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /I authorize/ })).toBeDisabled();
  });
  it("blocks Submit exactly at the fifteen-minute expiry without replacing FX", async () => {
    let now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    render(<SgdLocalReview {...props} />);
    await consent();
    now += 15 * 60_000;
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 1100)); });
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer).not.toHaveBeenCalled();
  });
  it("rechecks expiry after asynchronous identity verification before accepting terms", async () => {
    let now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const verifyIdentity = vi.fn().mockResolvedValueOnce(undefined).mockImplementationOnce(async () => { now += 15 * 60_000; });
    render(<SgdLocalReview {...props} verifyIdentity={verifyIdentity} />);
    await consent();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("FX or financial terms expired before acceptance. A new review is required.");
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
  });
  it("retries uncertain acceptance using exactly the same reference and review", async () => {
    let now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    api.createTransfer.mockRejectedValueOnce(new ApiRequestError("Response lost", 0));
    render(<SgdLocalReview {...props} />);
    await consent();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Response lost");
    now += 15 * 60_000; // An identical recorded acceptance may be replayed even after terms expire.
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(api.createTransfer.mock.calls[1][0]).toEqual(api.createTransfer.mock.calls[0][0]);
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
  });
  it("does not automatically repeat preparation after an ambiguous review response", async () => {
    api.reviewTransfer.mockRejectedValue(new ApiRequestError("Review response lost", 0));
    const onInspect = vi.fn();
    render(<SgdLocalReview {...props} onInspect={onInspect} />);
    await screen.findByText("Review response lost");
    fireEvent.click(screen.getByRole("button", { name: "Check saved payment" }));
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer).not.toHaveBeenCalled();
  });
  it("retains the backend transfer and optional preparation identifiers", async () => {
    const onPrepared = vi.fn();
    render(<SgdLocalReview {...props} transferId={50} preparationId="11111111-1111-4111-8111-111111111111" onPrepared={onPrepared} />);
    await consent();
    expect(onPrepared).toHaveBeenCalledWith(expect.objectContaining({ id: 50 }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    for (const request of [api.reviewTransfer, api.createTransfer]) expect(request.mock.calls[0][0].payload).toMatchObject({
      transfer_id: 50, preparation_id: "11111111-1111-4111-8111-111111111111",
    });
  });
  it("blocks a 409 without generating a new review or retrying acceptance", async () => {
    api.createTransfer.mockRejectedValue(new ApiRequestError("Reviewed instruction changed", 409));
    render(<SgdLocalReview {...props} />); await consent();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Reviewed instruction changed");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer).toHaveBeenCalledTimes(1);
  });
  it.each(["locking", "lock_unknown"])("keeps a structured %s failure for saved recovery", async (state) => {
    const saved = { ...terms(), payout_workflow: { state, recovery_required: true } };
    api.reviewTransfer.mockRejectedValue(new ApiRequestError("Check saved instruction", 422, undefined, { transfer: saved }));
    const onRecovery = vi.fn();
    render(<SgdLocalReview {...props} onRecovery={onRecovery} />);
    await screen.findByText("Check saved instruction");
    expect(onRecovery).toHaveBeenCalledWith(saved);
    expect(api.createTransfer).not.toHaveBeenCalled();
  });
  it("preserves submission_unknown from a structured acceptance failure", async () => {
    const saved = { ...terms(), status: "submission_unknown", payout_workflow: { state: "submitting", recovery_required: true } };
    api.createTransfer.mockRejectedValue(new ApiRequestError("Recover saved instruction", 422, undefined, { transfer: saved }));
    const onRecovery = vi.fn();
    render(<SgdLocalReview {...props} onRecovery={onRecovery} />); await consent();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Recover saved instruction");
    expect(onRecovery).toHaveBeenCalledWith(saved);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });
  it("rechecks the receiving account before acceptance and blocks changed identity", async () => {
    const verifyIdentity = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValue(new Error("Receiving account changed"));
    render(<SgdLocalReview {...props} verifyIdentity={verifyIdentity} />); await consent();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Receiving account changed");
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });
  it("clears consent and ignores an old review response after payment details change", async () => {
    let resolveOld!: (value: TransferReview) => void;
    api.reviewTransfer.mockImplementationOnce(() => new Promise<TransferReview>((resolve) => { resolveOld = resolve; }));
    const view = render(<SgdLocalReview {...props} />);
    view.rerender(<SgdLocalReview {...props} sourceAmount="6" />);
    await waitFor(() => expect(api.reviewTransfer).toHaveBeenCalledTimes(2));
    await act(async () => resolveOld(terms()));
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /I authorize/ })).not.toBeChecked();
  });
});
