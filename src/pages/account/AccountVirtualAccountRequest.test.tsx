import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LifecycleState } from "@/lib/virtualAccountLifecycle";
import { safeProjection } from "@/lib/virtualAccountOperation";
import { eligibleIntegration, operationContext, serverOperation, vaRequest } from "@/test/virtualAccountFixtures";
import AccountVirtualAccountRequest from "./AccountVirtualAccountRequest";

const mocks = vi.hoisted(() => ({
  getProviderReference: vi.fn(), getProviderIntegrations: vi.fn(), submit: vi.fn(), refresh: vi.fn(), toast: vi.fn(),
  state: null as LifecycleState | null, blocked: false,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "41" }, token: "test-token" }) }));
vi.mock("@/hooks/useVirtualAccountOperation", () => ({ useVirtualAccountOperation: () => ({ state: mocks.state, blocked: mocks.blocked, submit: mocks.submit, refresh: mocks.refresh, pollingPaused: "" }) }));
vi.mock("@/services/providerAccountService", async (original) => ({ ...await original<typeof import("@/services/providerAccountService")>(), getProviderReference: mocks.getProviderReference, getProviderIntegrations: mocks.getProviderIntegrations }));
vi.mock("@/components/ui/use-toast", () => ({ toast: mocks.toast }));

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const page = () => <MemoryRouter><QueryClientProvider client={client}><AccountVirtualAccountRequest /></QueryClientProvider></MemoryRouter>;
  const view = render(page());
  return { ...view, refreshPage: () => view.rerender(page()) };
};

describe("VA request page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.blocked = false;
    mocks.state = { scope: { ...operationContext, version: 2, generation: 0, operations: [], legacy: [] },
      accounts: [], providerAccountId: 7, ready: true, checking: false, submitting: false, authorizationPaused: false, error: "" };
    mocks.getProviderReference.mockResolvedValue([{ id: 1, code: "nium", name: "Nium", status: "active" }]);
    mocks.getProviderIntegrations.mockResolvedValue([eligibleIntegration()]);
    mocks.submit.mockResolvedValue({ providerAccountId: 7, operationId: "operation-one", request: null,
      submission: "acknowledged", server: safeProjection(serverOperation({ status: "assigned", virtual_account_id: 87 })), virtualAccountId: 87 });
  });

  it("passes the displayed account precondition and ignores duplicate clicks", async () => {
    renderPage();
    await screen.findByText(/Account ready for virtual account requests/);
    const button = screen.getByRole("button", { name: "Confirm and request" });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.submit).toHaveBeenCalledWith({ providerCode: "nium", currency: "USD", accountCategory: "SELF_FUNDING_ACCOUNT", accountType: "WIRES" }, 7);
    await screen.findByRole("button", { name: "Prepare another VA request" });
    expect(button).toBeDisabled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Virtual account assigned" }));
  });

  it("defaults new requests to the confirmed USD self-funding Wires corridor", async () => {
    renderPage();
    await screen.findByText(/Account ready for virtual account requests/);
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("USD");
    expect(screen.getByRole("combobox", { name: "Account category" })).toHaveTextContent("Self-funding account");
    expect(screen.getByRole("combobox", { name: "Account type" })).toHaveTextContent("Wires");
    expect(screen.getByText(/USD self-funding requests use JPM_SG with Wires intent/)).toBeVisible();
  });

  it.each([
    ["allocation_paused", /New virtual account requests are paused/],
    ["allocation_testing_only", /awaiting Production approval/],
    ["allocation_production_disabled", /awaiting Production approval/],
    ["allocation_cutover_required", /awaiting operational readiness/],
    ["allocation_unavailable", /currently unavailable/],
    [undefined, /currently unavailable/],
  ] as const)("shows allocation reason %s while keeping saved status checks available", async (reason, message) => {
    mocks.getProviderIntegrations.mockResolvedValue([{ ...eligibleIntegration(), virtual_account_allocation_reason: reason }]);
    renderPage();
    await screen.findByText(message);
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it.each([
    ["account_restricted", /provider account is restricted/],
    ["account_security_review", /provider account requires a security review/],
    ["account_verification_incomplete", /Customer or wallet verification is incomplete/],
  ] as const)("shows the disabled account reason %s", async (reason, message) => {
    mocks.getProviderIntegrations.mockResolvedValue([{ ...eligibleIntegration(false), virtual_account_eligibility_reason: reason }]);
    renderPage();
    await screen.findByText(message);
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it.each(["pending", "unknown", "manual_review", "failed"] as const)("retains %s and exposes GET status checking without a retry/reset action", async (status) => {
    mocks.state.scope.operations = [{ providerAccountId: 7, operationId: "operation-one", request: null,
      submission: "discovered", server: safeProjection(serverOperation({ status })), virtualAccountId: null }];
    mocks.blocked = true;
    renderPage();
    await screen.findByText(/Account ready for virtual account requests/);
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Start a separate|Resume original/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.submit).not.toHaveBeenCalled();
    if (status === "failed") expect(screen.getByText(/Provider rejection is not established/)).toBeVisible();
  });

  it("preserves incomplete legacy tracking and blocks another assignment", async () => {
    mocks.state.scope.legacy = [{ sourceKey: "old", operationId: "legacy-key", request: null }];
    mocks.blocked = true;
    renderPage();
    expect(await screen.findByText(/lacks verified API and account identity/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("still blocks ineligible accounts while retained operations remain readable", async () => {
    mocks.getProviderIntegrations.mockResolvedValue([eligibleIntegration(false)]);
    mocks.state.scope.operations = [{ providerAccountId: 7, operationId: "operation-one", request: null,
      submission: "discovered", server: safeProjection(serverOperation()), virtualAccountId: null }];
    mocks.blocked = true;
    renderPage();
    await screen.findByText(/KYB approval pending/);
    expect(screen.getByText(/Assignment pending/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("blocks while eligibility loads or cannot be read", async () => {
    mocks.getProviderIntegrations.mockRejectedValue(new Error("Eligibility unavailable"));
    renderPage();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    await screen.findByText(/Account setup or verification incomplete/);
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
  });

  it("restores delayed recovery and preserves the same request through status rerenders", async () => {
    const scope = mocks.state.scope;
    const request = { ...vaRequest, currency: "EUR", accountCategory: "COLLECTION_ACCOUNT", accountType: "WIRES" };
    const retained = { providerAccountId: 7, operationId: "saved-operation", request,
      submission: "uncertain" as const, server: null, virtualAccountId: null };
    mocks.state = { ...mocks.state, scope: null, ready: false };
    mocks.blocked = true;
    const { refreshPage } = renderPage();
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("USD");

    mocks.state = { ...mocks.state, scope: { ...scope, generation: 1, operations: [retained] }, ready: true };
    refreshPage();
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("EUR");
      expect(screen.getByRole("combobox", { name: "Account category" })).toHaveTextContent("Collection account");
      expect(screen.getByRole("combobox", { name: "Account type" })).toHaveTextContent("Wires");
    });
    fireEvent.change(screen.getByLabelText("Account alias (local reference only)"), { target: { value: "Local alias" } });

    mocks.state = { ...mocks.state, scope: { ...mocks.state.scope, operations: [{ ...retained, request: { ...request },
      server: safeProjection(serverOperation({ operation_id: "saved-operation", currency: "EUR", status: "unknown" })) }] } };
    refreshPage();
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("EUR");
    expect(screen.getByRole("combobox", { name: "Account category" })).toHaveTextContent("Collection account");
    expect(screen.getByRole("combobox", { name: "Account type" })).toHaveTextContent("Wires");
    expect(screen.getByLabelText("Account alias (local reference only)")).toHaveValue("Local alias");
    expect(screen.getByText(/saved-operation · Account 7/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    expect(mocks.state.scope.operations).toHaveLength(1);
    expect(mocks.state.scope.operations[0].request).toEqual(request);
    expect(mocks.submit).not.toHaveBeenCalled();

    // Once reconciliation resolves the operation, keep the displayed parameters for review.
    mocks.state = { ...mocks.state, scope: { ...mocks.state.scope, operations: [{ ...retained,
      server: safeProjection(serverOperation({ operation_id: "saved-operation", currency: "EUR", status: "assigned", virtual_account_id: 87 })), virtualAccountId: 87 }] } };
    mocks.blocked = false;
    refreshPage();
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("EUR");
    expect(screen.getByRole("combobox", { name: "Account category" })).toHaveTextContent("Collection account");
    expect(screen.getByRole("combobox", { name: "Account type" })).toHaveTextContent("Wires");
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("restores the retained parameters and identity on remount without submitting again", async () => {
    const retained = { providerAccountId: 7, operationId: "saved-operation", request: { ...vaRequest, currency: "EUR", accountType: "WIRES" },
      submission: "uncertain" as const, server: null, virtualAccountId: null };
    mocks.state.scope.operations = [retained];
    mocks.state.scope.generation = 1;
    mocks.blocked = true;
    const first = renderPage();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("EUR"));
    first.unmount();

    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("EUR");
      expect(screen.getByRole("combobox", { name: "Account type" })).toHaveTextContent("Wires");
    });
    expect(screen.getByText(/saved-operation · Account 7/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.state.scope.operations).toEqual([retained]);
    expect(mocks.state.scope.generation).toBe(1);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
