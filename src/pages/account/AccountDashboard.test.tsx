import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { multiCurrencyVirtualAccounts } from "@/test/multiCurrencyVirtualAccountFixtures";
import AccountDashboard from "./AccountDashboard";

const mocks = vi.hoisted(() => ({ getVirtualAccounts: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "41", name: "Test Customer", status: "active" }, token: "test-token", onboarding: null }) }));
vi.mock("@/services/kycService", () => ({ getKycProfile: vi.fn().mockResolvedValue({ kyc_profile: null }) }));
vi.mock("@/services/fxOrderService", () => ({ getProviders: vi.fn().mockResolvedValue({ data: [{ id: 1, code: "nium", name: "Nium", status: "active" }] }) }));
vi.mock("@/services/providerAccountService", () => ({ getVirtualAccounts: mocks.getVirtualAccounts }));
vi.mock("@/services/moneyMovementService", () => ({
  getBalances: vi.fn().mockResolvedValue([]), getBeneficiaries: vi.fn().mockResolvedValue([]),
  getTransactions: vi.fn().mockResolvedValue([{ id: 1, currency: "CNY", amount: "25.00", description: "Synthetic receipt", created_at: "2026-10-29T00:00:00Z" }]),
}));

it("keeps USD, EUR and CNY Home VA cards distinct and preserves the Recent Activity currency flag", async () => {
  mocks.getVirtualAccounts.mockResolvedValue(multiCurrencyVirtualAccounts.slice(0, 3));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter><QueryClientProvider client={client}><AccountDashboard /></QueryClientProvider></MemoryRouter>);
  for (const [index, flag] of ["us", "eu", "cn"].entries()) {
    const account = multiCurrencyVirtualAccounts[index];
    const card = within((await screen.findByText(account.provider_payment_id!)).closest("a")!);
    expect(card.getByText(account.currency)).toBeVisible();
    expect(card.getByText(account.currency).closest(".currency-badge")?.querySelector("img")).toHaveAttribute("src", `/src/assets/flags/${flag}.svg`);
    expect(card.getByText(`Ref: ${account.virtual_account_reference}`)).toBeVisible();
  }
  const activity = (await screen.findByText(/Synthetic receipt/)).closest("li")!;
  expect(activity.querySelector(".currency-avatar img")).toHaveAttribute("src", "/src/assets/flags/cn.svg");
  expect(mocks.getVirtualAccounts).toHaveBeenCalledExactlyOnceWith({ userId: "41", token: "test-token", providerCode: "nium" });
});
