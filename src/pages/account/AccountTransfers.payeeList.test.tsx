import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Beneficiary } from "@/services/moneyMovementService";
import { DetailsStep, PaymentSummary, PayeeStep, ReviewStep } from "./AccountTransfers";
import { NIUM_SG_SGD_LOCAL_UNAVAILABLE } from "./transferForm";

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

describe("SGD Local preparation", () => {
  const localBeneficiary = beneficiary({ country_code: "SG", currency: "SGD", payout_method: "LOCAL", beneficiary_type: "personal", full_name: "SG Individual" });
  const form = { providerId: "7", beneficiaryId: "1", transferType: "payout", sourceCurrency: "USD", targetCurrency: "SGD", sourceAmount: "1", purposeCode: "", referenceText: "Test reference" };

  it("shows the SG beneficiary with an unavailable reason and prevents selection", () => {
    const onSelect = vi.fn();
    render(<MemoryRouter><PayeeStep search="" onSearchChange={vi.fn()} beneficiaries={[localBeneficiary]}
      providerById={new Map([[7, niumProvider]])} loading={false} onSelect={onSelect} /></MemoryRouter>);
    const button = screen.getByText("SG Individual").closest("button");
    expect(button).toBeDisabled();
    expect(screen.getByText(NIUM_SG_SGD_LOCAL_UNAVAILABLE)).toBeVisible();
    fireEvent.click(button!);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows USD funding, SGD destination, unavailable FX and unknown fees on details", () => {
    render(<DetailsStep form={form} selectedProvider={niumProvider} selectedBeneficiary={localBeneficiary}
      sourceCurrencies={["USD"]} effectiveSourceAmount={1} onBack={vi.fn()} onContinue={vi.fn()} onChange={vi.fn()}
      onSourceCurrencyChange={vi.fn()} purposeOptions={[]} purposeCodesLoading={false} purposeCodesFailed={true} onPurposeChange={vi.fn()} />);
    expect(screen.getByText("USD source amount")).toBeVisible();
    expect(screen.getByText("SGD conversion amount")).toBeVisible();
    expect(screen.getByText("Unavailable pending provider confirmation")).toBeVisible();
    expect(screen.getByText("SGD amount unavailable — FX confirmation pending")).toBeVisible();
    expect(screen.getByText("Provider fees are not yet available.")).toBeVisible();
    expect(screen.queryByText(/SHA/)).not.toBeInTheDocument();
  });

  it("keeps review and summary consistent without fabricating recipient proceeds", () => {
    render(<>
      <ReviewStep form={form} provider={niumProvider} beneficiary={localBeneficiary} effectiveSourceAmount={1}
        purposeLabel="Unavailable" creating={false} onBack={vi.fn()} onSubmit={vi.fn()} />
      <PaymentSummary form={form} provider={niumProvider} beneficiary={localBeneficiary} sourceAmount={1} />
    </>);
    expect(screen.getAllByText("SGD amount unavailable — FX confirmation pending")).toHaveLength(2);
    expect(screen.getAllByText("Unavailable pending provider confirmation")).toHaveLength(2);
    expect(screen.getAllByText("Provider fees are not yet available")).toHaveLength(2);
    expect(screen.getAllByText("SGD")).toHaveLength(2);
    expect(screen.queryByText(/SHA/)).not.toBeInTheDocument();
  });
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
