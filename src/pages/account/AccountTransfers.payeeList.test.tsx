import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Beneficiary } from "@/services/moneyMovementService";
import { PayeeStep } from "./AccountTransfers";

const niumProvider = {
  id: 7,
  code: "nium",
  name: "Nium",
  status: "active",
  supports_transfers: true,
};

const beneficiary = (overrides: Partial<Beneficiary>): Beneficiary => ({
  id: 1,
  user_id: 9,
  provider_id: 7,
  beneficiary_type: "business",
  full_name: "Eligible HK Recipient",
  country_code: "HK",
  currency: "USD",
  payout_method: "SWIFT",
  status: "active",
  ...overrides,
});

describe("Move funds payee list", () => {
  it("shows active recipients, disables unsupported ones with reasons, and omits failed recipients", () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <PayeeStep
          search=""
          onSearchChange={vi.fn()}
          beneficiaries={[
            beneficiary({}),
            beneficiary({ id: 2, full_name: "Missing Method Recipient", payout_method: null }),
            beneficiary({ id: 3, full_name: "US Recipient", country_code: "US" }),
          ]}
          providerById={new Map([[niumProvider.id, niumProvider]])}
          loading={false}
          onSelect={onSelect}
        />
      </MemoryRouter>,
    );

    const eligibleButton = screen.getByText("Eligible HK Recipient").closest("button") as HTMLButtonElement;
    expect(eligibleButton).toBeEnabled();
    fireEvent.click(eligibleButton);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(screen.getByText("Missing Method Recipient").closest("button")).toBeDisabled();
    expect(screen.getByText("The Nium beneficiary payout method must be SWIFT.")).toBeVisible();
    expect(screen.getByText("US Recipient").closest("button")).toBeDisabled();
    expect(screen.getByText("This Nium beneficiary corridor is not currently available. Select an active HK beneficiary receiving USD.")).toBeVisible();
  });
});
