import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LifecycleState } from "@/lib/virtualAccountLifecycle";
import { operationContext, virtualAccount } from "@/test/virtualAccountFixtures";
import { multiCurrencyVirtualAccounts } from "@/test/multiCurrencyVirtualAccountFixtures";
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


describe("Multi-currency VA presentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviders.mockResolvedValue({ data: [{ id: 1, code: "nium", name: "Nium", status: "active" }] });
    mocks.state = { scope: { ...operationContext, version: 2, generation: 0, operations: [], legacy: [] },
      accounts: multiCurrencyVirtualAccounts,
      providerAccountId: 7, ready: true, checking: false, submitting: false, authorizationPaused: false, error: "" };
  });

  it.each([
    ["USD", "us"], ["EUR", "eu"], ["CNY", "cn"], ["HKD", "hk"], ["SGD", "sg"], ["GBP", "gb"],
  ])("renders the API %s currency with the %s flag in its row and detail", (currency, flag) => {
    setup();
    const account = multiCurrencyVirtualAccounts.find((item) => item.currency === currency)!;
    const button = screen.getByRole("button", { name: `View banking details for ${currency} account ${account.id}` });
    const row = within(button.parentElement!);
    expect(row.getByText(currency)).toBeVisible();
    expect(row.getByText(currency).closest(".currency-badge")?.querySelector("img")).toHaveAttribute("src", `/src/assets/flags/${flag}.svg`);
    expect(row.getByText(account.provider_payment_id!)).toBeVisible();
    fireEvent.click(button);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(currency).closest(".currency-badge")?.querySelector("img")).toHaveAttribute("src", `/src/assets/flags/${flag}.svg`);
    for (const value of [account.provider_payment_id, account.virtual_account_reference, account.detail?.account_name,
      account.detail?.bank_name, account.detail?.bank_address,
      `${account.detail?.routing_code_type} ${account.detail?.routing_code_value}`,
      `${account.detail?.routing_code_type_2} ${account.detail?.routing_code_value_2}`]) {
      expect(dialog.getByText(value!)).toBeVisible();
    }
    for (const other of multiCurrencyVirtualAccounts.filter((item) => item.id !== account.id)) {
      expect(dialog.queryByText(other.detail!.bank_name!)).not.toBeInTheDocument();
      expect(dialog.queryByText(other.provider_payment_id!)).not.toBeInTheDocument();
    }
    expect(dialog.queryByText(/JPMorgan|Chase|JPM_SG/)).not.toBeInTheDocument();
  });

  it("keeps mixed and same-currency records separate by VA ID when switching details", () => {
    const secondUsd = { ...multiCurrencyVirtualAccounts[0], id: 200, provider_payment_id: "SECOND-USD-ACCOUNT",
      detail: { bank_name: "Second USD Bank" } };
    mocks.state.accounts = [...multiCurrencyVirtualAccounts.slice(0, 3), secondUsd];
    setup();
    expect(screen.getAllByRole("button", { name: /View banking details for/ })).toHaveLength(4);
    for (const account of mocks.state.accounts) {
      fireEvent.click(screen.getByRole("button", { name: `View banking details for ${account.currency} account ${account.id}` }));
      const dialog = within(screen.getByRole("dialog"));
      expect(dialog.getByText(account.provider_payment_id!)).toBeVisible();
      expect(dialog.getByText(account.detail!.bank_name!)).toBeVisible();
      fireEvent.click(dialog.getByRole("button", { name: "Close banking details" }));
    }
  });

  it("uses the safe unknown currency fallback and never borrows another record's bank details", () => {
    mocks.state.accounts = [multiCurrencyVirtualAccounts[0], { ...multiCurrencyVirtualAccounts[1], id: 201, currency: "XYZ", detail: null }];
    setup();
    const button = screen.getByRole("button", { name: "View banking details for XYZ account 201" });
    const row = within(button.parentElement!);
    expect(row.getByText("XYZ")).toBeVisible();
    expect(row.getByText("¤")).toHaveClass("currency-tone--neutral");
    fireEvent.click(button);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("XYZ")).toBeVisible();
    expect(dialog.getByText("¤")).toBeVisible();
    expect(dialog.getByText("Bank Name").parentElement).toHaveTextContent("Bank Name-");
    expect(dialog.getByText("Bank Address").parentElement).toHaveTextContent("Bank Address-");
    expect(dialog.queryByText(multiCurrencyVirtualAccounts[0].detail!.bank_name!)).not.toBeInTheDocument();
  });
});
