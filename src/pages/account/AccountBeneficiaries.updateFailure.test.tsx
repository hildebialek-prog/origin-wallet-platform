import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountBeneficiaries from "./AccountBeneficiaries";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  updateBeneficiary: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 9 }, token: "test-token" }),
}));

vi.mock("@/components/ui/use-toast", () => ({ toast: mocks.toast }));

vi.mock("@/services/fxOrderService", () => ({
  getProviders: vi.fn().mockResolvedValue({
    data: [{ id: 7, code: "nium", name: "Nium", status: "active", supports_beneficiaries: true }],
  }),
}));

vi.mock("@/services/moneyMovementService", () => ({
  getBeneficiaries: vi.fn().mockResolvedValue([{
    id: 42,
    user_id: 9,
    provider_id: 7,
    beneficiary_type: "business",
    full_name: "Original Vendor",
    company_name: "Original Vendor",
    country_code: "HK",
    currency: "USD",
    bank_name: "HSBC Hong Kong",
    account_number: "1234567890",
    swift_bic: "HSBCHKHHHKH",
    address_line1: "1 Harbour Road",
    city: "Hong Kong",
    postal_code: "999077",
    status: "active",
    raw_data: { nium: { payoutMethod: "SWIFT", bankAccountType: "CURRENT" } },
  }]),
  createBeneficiary: vi.fn(),
  updateBeneficiary: mocks.updateBeneficiary,
  deleteBeneficiary: vi.fn(),
}));

describe("beneficiary edit failure", () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.updateBeneficiary.mockReset();
  });

  it("shows the API message while keeping the edited form open and reusable", async () => {
    const message = "Unable to update beneficiary with the selected provider. Review the details and try again.";
    mocks.updateBeneficiary.mockRejectedValue(new Error(message));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { container } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AccountBeneficiaries />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await screen.findAllByText("Original Vendor");
    fireEvent.click(container.querySelector("svg.lucide-pencil")?.closest("button") as HTMLButtonElement);

    const vendorName = (await screen.findByText("Vendor's name")).parentElement?.querySelector("input") as HTMLInputElement;
    fireEvent.change(vendorName, { target: { value: "Edited Vendor" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to add accounts" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(mocks.toast).toHaveBeenCalledWith({
      variant: "destructive",
      title: "Beneficiary update failed",
      description: message,
    });
    expect(screen.getByText("Edit vendor")).toBeVisible();
    expect(screen.getAllByText("Edited Vendor")[0]).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
  });
});
