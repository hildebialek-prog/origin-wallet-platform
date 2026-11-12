import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Beneficiary } from "@/services/moneyMovementService";
import { DetailsStep, PaymentSummary, PayeeStep, ReviewStep } from "./AccountTransfers";
import { beneficiaryTransferOption, NIUM_SG_SGD_LOCAL_UNAVAILABLE } from "./transferForm";

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

  it("permits a Dynamic check for SG while preserving its unavailable legacy admission", () => {
    const onSelect = vi.fn();
    render(<MemoryRouter><PayeeStep search="" onSearchChange={vi.fn()} beneficiaries={[localBeneficiary]}
      providerById={new Map([[7, niumProvider]])} loading={false} onSelect={onSelect} /></MemoryRouter>);
    const button = screen.getByText("SG Individual").closest("button");
    expect(button).toBeEnabled();
    expect(screen.getByText("Dynamic availability and recipient currencies will be checked after selection.")).toBeVisible();
    fireEvent.click(button!);
    expect(onSelect).toHaveBeenCalledWith(localBeneficiary);
    expect(beneficiaryTransferOption(localBeneficiary, niumProvider)).toMatchObject({ selectable: false, reason: NIUM_SG_SGD_LOCAL_UNAVAILABLE });
  });

  it("selects an explicitly bound preparation-only SGD beneficiary without claiming payout admission", () => {
    const payee: Beneficiary = { ...localBeneficiary, payout_admission: {
      allowed: false, reason: "financial_terms_unverified", preparation_allowed: true, fx_lock_enabled: true,
      beneficiary_id: localBeneficiary.id, provider_id: localBeneficiary.provider_id, source_currency: "USD",
      destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL",
    } };
    const onSelect = vi.fn();
    render(<MemoryRouter><PayeeStep search="" onSearchChange={vi.fn()} beneficiaries={[payee]}
      providerById={new Map([[7, niumProvider]])} loading={false} onSelect={onSelect} /></MemoryRouter>);
    const button = screen.getByText("SG Individual").closest("button");
    expect(button).toBeEnabled();
    expect(screen.getByText("Payment terms and fees must be verified before Submit.")).toBeVisible();
    fireEvent.click(button!);
    expect(onSelect).toHaveBeenCalledWith(payee);
    expect(payee.payout_admission?.allowed).toBe(false);
  });

  it("shows USD funding, SGD destination, unavailable FX and unknown fees on details", () => {
    render(<DetailsStep form={form} selectedProvider={niumProvider} selectedBeneficiary={localBeneficiary}
      sourceCurrencies={["USD"]} effectiveSourceAmount={1} onBack={vi.fn()} onContinue={vi.fn()} onChange={vi.fn()}
      onSourceCurrencyChange={vi.fn()} purposeOptions={[]} purposeCodesLoading={false} purposeCodesFailed={true} onPurposeChange={vi.fn()} />);
    expect(screen.getByText("USD source amount")).toBeVisible();
    expect(screen.getByText("SGD conversion amount")).toBeVisible();
    expect(screen.getByText("Unavailable pending provider confirmation")).toBeVisible();
    expect(screen.getByText("SGD amount unavailable — FX confirmation pending")).toBeVisible();
    expect(screen.getByText("Provider fees must be verified before Submit.")).toBeVisible();
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
    expect(screen.getAllByText("FX lock expiry")).toHaveLength(2);
    expect(screen.getAllByText("USD total wallet debit")).toHaveLength(2);
    expect(screen.getAllByText("Provider fees must be verified before Submit")).toHaveLength(2);
    expect(screen.getAllByText("SGD")).toHaveLength(2);
    expect(screen.queryByText(/SHA/)).not.toBeInTheDocument();
  });
});

describe("Move funds payee list", () => {
  it("allows valid Nium recipients to request Dynamic checks without assuming corridor or method support", () => {
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
    expect(screen.getByText("Missing Method Recipient").closest("button")).toBeEnabled();
    expect(screen.getByText("US Recipient").closest("button")).toBeEnabled();
    expect(screen.getAllByText("Dynamic availability and recipient currencies will be checked after selection.")).toHaveLength(2);
    expect(beneficiaryTransferOption(beneficiary({ payout_method: null }), niumProvider).selectable).toBe(false);
    expect(beneficiaryTransferOption(beneficiary({ country_code: "US" }), niumProvider).selectable).toBe(false);
  });
});
