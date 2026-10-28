import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LifecycleState } from "@/lib/virtualAccountLifecycle";
import { operationContext, virtualAccount } from "@/test/virtualAccountFixtures";
import AccountVirtualAccounts from "./AccountVirtualAccounts";

const mocks = vi.hoisted(() => ({ state: null as LifecycleState | null, refresh: vi.fn(), getProviders: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "41" }, token: "test-token" }) }));
vi.mock("@/hooks/useVirtualAccountOperation", () => ({ useVirtualAccountOperation: () => ({ state: mocks.state, blocked: false, pollingPaused: "", refresh: mocks.refresh }) }));
vi.mock("@/services/fxOrderService", () => ({ getProviders: mocks.getProviders }));

const setup = (path = "/account/virtual-accounts") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const page = () => <MemoryRouter initialEntries={[path]}><QueryClientProvider client={client}><AccountVirtualAccounts /></QueryClientProvider></MemoryRouter>;
  const view = render(page());
  return { ...view, refreshView: () => view.rerender(page()) };
};

describe("VA list and live banking details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviders.mockResolvedValue({ data: [] });
    mocks.state = { scope: { ...operationContext, version: 2, generation: 0, operations: [], legacy: [] },
      accounts: [virtualAccount({ account_type: "GLOBAL", detail: { account_name: "Example account", bank_name: "Example bank", bank_address: "Example address",
        routing_code_type: "SWIFT", routing_code_value: "BANKUSXX", routing_code_type_2: "ACH", routing_code_value_2: "123456789",
        provider_account_type: "GLOBAL", provider_account_category: "COLLECTION_ACCOUNT" } })],
      providerAccountId: 7, ready: true, checking: false, submitting: false, authorizationPaused: false, error: "" };
  });

  it("renders both actual routing pairs, account details and GLOBAL without an invented mapping", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "View banking details for USD account 87" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("SWIFT BANKUSXX")).toBeVisible();
    expect(dialog.getByText("ACH 123456789")).toBeVisible();
    for (const value of ["Example account", "Example bank", "Example address", "reference-one", "VA-ONE", "COLLECTION_ACCOUNT"]) {
      expect(dialog.getByText(value)).toBeVisible();
    }
    expect(dialog.getAllByText("GLOBAL")).toHaveLength(2);
    expect(dialog.queryByText(/WIRES|Intermediary/i)).not.toBeInTheDocument();
  });

  it("keeps an open modal synchronized by VA ID as enrichment and bank fields refresh", () => {
    mocks.state.accounts[0].enrichment = { status: "pending", next_attempt_at: null, updated_at: null };
    const { refreshView } = setup();
    expect(screen.getByText("assigned")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View banking details for USD account 87" }));
    expect(within(screen.getByRole("dialog")).getByText("Banking details pending.")).toBeVisible();
    mocks.state = { ...mocks.state, accounts: [virtualAccount({ detail: { bank_name: "Refreshed bank", routing_code_type_2: "BIC", routing_code_value_2: "NEWCODE" },
      enrichment: { status: "complete", next_attempt_at: null, updated_at: "2026-10-28T00:01:00Z" } })] };
    refreshView();
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Refreshed bank")).toBeVisible();
    expect(dialog.getByText("BIC NEWCODE")).toBeVisible();
    expect(dialog.getByText("Banking details complete.")).toBeVisible();
    expect(dialog.queryByText("Example bank")).not.toBeInTheDocument();
  });

  it.each(["pending", "running", "complete", "exhausted"] as const)("shows %s enrichment independently of assignment", (status) => {
    mocks.state.accounts[0].enrichment = { status, next_attempt_at: null, updated_at: null };
    setup();
    expect(screen.getByText("assigned")).toBeVisible();
    if (status === "exhausted") expect(screen.getByText(/could not be completed automatically.*new VA assignment is not needed/)).toBeVisible();
    else expect(screen.getByText(status === "pending" ? "Banking details pending." : status === "running" ? "Banking details are updating." : "Banking details complete.")).toBeVisible();
  });

  it.each([null, undefined])("keeps legacy details readable with enrichment %s", (enrichment) => {
    mocks.state.accounts[0].enrichment = enrichment;
    setup();
    fireEvent.click(screen.getByRole("button", { name: "View banking details for USD account 87" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(/Enrichment tracking unavailable/)).toBeVisible();
    expect(dialog.getByText("Example bank")).toBeVisible();
  });

  it("renders legacy pending VAs in the pending view without reporting assignment", () => {
    mocks.state.accounts = [virtualAccount({ status: "pending", provider_payment_id: null, enrichment: null })];
    setup("/account/virtual-accounts?tab=pending");
    expect(screen.getByText("pending")).toBeVisible();
    expect(screen.queryByText("assigned")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View banking details for USD account 87" })).toBeEnabled();
  });

  it.each([
    [false, "", "Loading virtual accounts..."],
    [false, "Unable to read status", "Virtual accounts could not be refreshed"],
    [true, "", "No virtual accounts in this view"],
  ] as const)("distinguishes ready=%s and error=%s", (ready, error, message) => {
    mocks.state = { ...mocks.state, accounts: [], ready, error };
    setup();
    expect(screen.getByText(message)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
