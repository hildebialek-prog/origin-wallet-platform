import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountVirtualAccountRequest from "./AccountVirtualAccountRequest";

const mocks = vi.hoisted(() => ({
  getProviderReference: vi.fn(),
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
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getProviderReference.mockResolvedValue([{ code: "nium", name: "Nium", status: "active" }]);
  });

  it("retries a restored operation with its original parameters and clears it only after success", async () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(savedOperation));
    mocks.requestVirtualAccount.mockResolvedValue({
      message: "Assigned",
      operation_id: "operation-one",
      virtual_account: {},
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Confirm and request" }));

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

    fireEvent.click(await screen.findByRole("button", { name: "Confirm and request" }));

    expect(await screen.findByText("Provider outcome unknown")).toBeVisible();
    expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null")).toEqual(savedOperation);
  });
});
