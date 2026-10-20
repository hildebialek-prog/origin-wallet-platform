import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AccountVirtualAccountRequest from "./AccountVirtualAccountRequest";

const mocks = vi.hoisted(() => ({
  getProviderReference: vi.fn(),
  getProviderIntegrations: vi.fn(),
  requestVirtualAccount: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 41 }, token: "customer-test-token" }),
}));

vi.mock("@/services/providerAccountService", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/providerAccountService")>();
  return {
    ...original,
    getProviderReference: mocks.getProviderReference,
    getProviderIntegrations: mocks.getProviderIntegrations,
    requestVirtualAccount: mocks.requestVirtualAccount,
  };
});

vi.mock("@/components/ui/use-toast", () => ({ toast: mocks.toast }));

const storageKey = "origin-wallet:virtual-account-operation:41";
const savedOperation = {
  version: 1,
  operationId: "operation-one",
  request: {
    providerCode: "nium",
    currency: "USD",
    accountCategory: "COLLECTION_ACCOUNT",
    accountType: "WIRES",
  },
};

const integration = (canRequest: boolean, reason: string | null = null) => ({
  provider: { id: 1, code: "nium", name: "Nium", status: "active" },
  provider_account: canRequest ? { id: 7, status: "active", provider_status: "clear" } : null,
  integration_link: null,
  integration_request: null,
  link_available: true,
  can_connect: false,
  can_request_connect: false,
  request_pending: false,
  can_request_virtual_account: canRequest,
  virtual_account_eligibility_reason: reason,
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AccountVirtualAccountRequest />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe("AccountVirtualAccountRequest", () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    window.sessionStorage.clear();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getProviderReference.mockResolvedValue([{ code: "nium", name: "Nium", status: "active" }]);
    mocks.getProviderIntegrations.mockResolvedValue([integration(true)]);
  });

  it("retries a restored operation with its original parameters and clears it only after success", async () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(savedOperation));
    mocks.requestVirtualAccount.mockResolvedValue({
      message: "Assigned",
      operation_id: "operation-one",
      virtual_account: {},
    });
    renderPage();

    await screen.findByText(/Account ready for virtual account requests/i);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and request" }));

    await waitFor(() => {
      expect(mocks.requestVirtualAccount).toHaveBeenCalledWith({
        userId: 41,
        token: "customer-test-token",
        providerCode: "nium",
        currency: "USD",
        accountCategory: "COLLECTION_ACCOUNT",
        accountType: "WIRES",
        operationId: "operation-one",
      });
      expect(window.sessionStorage.getItem(storageKey)).toBeNull();
    });
  });

  it("keeps an unresolved operation after an API error", async () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(savedOperation));
    mocks.requestVirtualAccount.mockRejectedValue(new Error("Provider outcome unknown"));
    renderPage();

    await screen.findByText(/Account ready for virtual account requests/i);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and request" }));

    expect(await screen.findByText("Provider outcome unknown")).toBeVisible();
    expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null")).toEqual(savedOperation);
  });

  it("fails closed for pending KYB and never submits", async () => {
    mocks.getProviderIntegrations.mockResolvedValue([integration(false, "kyb_approval_pending")]);
    renderPage();

    expect(await screen.findByText(/KYB approval pending/i)).toBeVisible();
    const submit = screen.getByRole("button", { name: "Confirm and request" });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("fails closed when account verification is incomplete", async () => {
    mocks.getProviderIntegrations.mockResolvedValue([integration(false, "account_verification_incomplete")]);
    renderPage();

    expect(await screen.findByText(/Account setup or verification incomplete/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("fails closed while eligibility is loading and after an eligibility error", async () => {
    let rejectEligibility: (error: Error) => void = () => undefined;
    mocks.getProviderIntegrations.mockReturnValue(new Promise((_, reject) => {
      rejectEligibility = reject;
    }));
    renderPage();

    expect(await screen.findByText(/Checking virtual account eligibility/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();

    rejectEligibility(new Error("Eligibility unavailable"));
    expect(await screen.findByText(/Account setup or verification incomplete/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeDisabled();
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("preserves a restored operation while ineligible and enables the same operation after eligibility changes", async () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(savedOperation));
    mocks.getProviderIntegrations.mockResolvedValueOnce([integration(false, "kyb_approval_pending")]);
    const firstRender = renderPage();

    expect(await screen.findByText(/KYB approval pending/i)).toBeVisible();
    expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null")).toEqual(savedOperation);
    firstRender.unmount();

    mocks.getProviderIntegrations.mockResolvedValueOnce([integration(true)]);
    renderPage();
    expect(await screen.findByText(/Account ready for virtual account requests/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm and request" })).toBeEnabled();
    expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null")).toEqual(savedOperation);
  });

  it("does not let resume-original bypass failed eligibility", async () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(savedOperation));
    mocks.getProviderIntegrations.mockResolvedValue([integration(false, "kyb_approval_pending")]);
    renderPage();
    await screen.findByText(/KYB approval pending/i);

    const currencySelect = screen.getAllByRole("combobox")[0];
    fireEvent.keyDown(currencySelect, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "EUR" }));

    const resume = await screen.findByRole("button", { name: "Resume original request" });
    expect(resume).toBeDisabled();
    fireEvent.click(resume);
    expect(mocks.requestVirtualAccount).not.toHaveBeenCalled();
    expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null")).toEqual(savedOperation);
  });
});
