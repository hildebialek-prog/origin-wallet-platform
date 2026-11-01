import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Beneficiary } from "@/services/moneyMovementService";
import { swiftRequirements } from "@/test/beneficiaryFixtures";
import AccountBeneficiaries from "./AccountBeneficiaries";

const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), requirements: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "9" }, token: "test-token" }) }));
vi.mock("@/services/fxOrderService", () => ({ getProviders: vi.fn(async () => ({ data: [
  { id: 7, code: "nium", name: "Nium", status: "active", supports_beneficiaries: true },
] })) }));
vi.mock("@/services/moneyMovementService", () => ({
  getBeneficiaries: mocks.list, createBeneficiary: mocks.create, updateBeneficiary: mocks.update,
  deleteBeneficiary: vi.fn(), getBeneficiaryRequirements: mocks.requirements,
  getBeneficiaryPayoutMethods: vi.fn(async (params) => ({ provider_id: Number(params.providerId),
    beneficiary_type: params.beneficiaryType, country_code: params.countryCode, currency: params.currency,
    payout_methods: params.countryCode === "SG" ? ["LOCAL"] : ["SWIFT"],
  })),
}));

const renderPage = () => render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: {
  queries: { retry: false }, mutations: { retry: false },
} })}><AccountBeneficiaries /></QueryClientProvider></MemoryRouter>);
const change = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const select = async (label: string, option: string) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "ArrowDown" });
  fireEvent.keyDown(await screen.findByRole("option", { name: option }), { key: "Enter" });
};
const bankStep = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Continue to add accounts" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByLabelText(/^SWIFT \/ BIC/);
};
const saveReview = async (label: "Create beneficiary" | "Save changes") => {
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to review" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
  expect(screen.getByText("Review vendor details")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(screen.queryByText("Review vendor details")).not.toBeInTheDocument());
};

describe("safe beneficiary create, open, edit, save and reopen", () => {
  const scroll = HTMLElement.prototype.scrollIntoView;
  beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
  afterAll(() => { HTMLElement.prototype.scrollIntoView = scroll; });
  beforeEach(() => {
    mocks.list.mockReset().mockResolvedValue([]);
    mocks.create.mockReset();
    mocks.update.mockReset();
    mocks.requirements.mockReset().mockImplementation(async (params) => ({
      ...swiftRequirements, dimensions: { destinationCountry: params.countryCode, destinationCurrency: params.currency,
        payoutMethod: params.payoutMethod, beneficiaryAccountType: params.beneficiaryType === "business" ? "CORPORATE" : "INDIVIDUAL", customerType: "CORPORATE" },
      fields: [...swiftRequirements.fields,
        { name: "beneficiaryBankAccountType", required: true, allowed_values: ["Current", "Savings"] },
        { name: "beneficiaryAlias", required: false, type: "string" },
      ],
    }));
  });

  it.each([
    ["HK", "USD", "business", "SWIFT", "HSBCHKHHHKH"],
    ["SG", "SGD", "individual", "LOCAL", "DBSSSGSG"],
  ])("retains %s/%s %s %s details through a complete edit cycle", async (country, currency, type, method, bic) => {
    let stored: Beneficiary | undefined;
    const response: Beneficiary = { id: 42, user_id: 9, provider_id: 7, is_registered: true,
      beneficiary_type: type, full_name: "Fixture Recipient", company_name: type === "business" ? "Fixture Recipient" : null,
      email: "original@example.test", phone: "12345678", country_code: country, currency, payout_method: method,
      bank_name: "Fixture Bank", account_number: "123456789", swift_bic: bic, address_line1: "1 Fixture Road",
      city: "Fixture City", postal_code: "123456", status: "active", edit_fields: {
        bank_account_type: "Current", contact_country_code: "+852", relationship: "supplier", account_route: "bank",
        routing: [{ type: "SWIFT", value: bic }], additional_fields: { beneficiaryAlias: "Saved alias" },
      } };
    mocks.list.mockImplementation(async () => stored ? [stored] : []);
    mocks.create.mockImplementation(async () => { stored = response; return stored; });
    mocks.update.mockImplementation(async () => {
      stored = { ...response, email: "edited@example.test", edit_fields: { ...response.edit_fields, bank_account_type: "Savings" } };
      return stored;
    });
    const { container } = renderPage();
    await waitFor(() => expect(screen.queryByText("Beneficiary rail is not ready yet.")).not.toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: "Add beneficiary" })[0]);
    change(/Vendor's name/, "Fixture Recipient");
    change(/Email \(optional\)/, "original@example.test");
    fireEvent.change(screen.getByPlaceholderText("Vendor's phone"), { target: { value: "12345678" } });
    if (country === "SG") {
      await select("Country or region", "SG - Singapore");
      await select("Vendor legal type", "Individual");
    }
    // Enter the bank step before currency discovery is complete for a new SG beneficiary.
    fireEvent.click(screen.getByRole("button", { name: "Continue to add accounts" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    if (currency === "SGD") await select("Currency", "SGD");
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    fireEvent.change(screen.getByRole("combobox", { name: /Bank Account Type/ }), { target: { value: "Current" } });
    change(/^Bank name/, "Fixture Bank");
    change(/^Account number/, "123456789");
    change(/^Confirm account number/, "123456789");
    change(/^SWIFT \/ BIC/, bic);
    change(/^Address \(/, "1 Fixture Road");
    change(/^City/, "Fixture City");
    change(/^Postcode/, "123456");
    change(/^Alias/, "Saved alias");
    await saveReview("Create beneficiary");
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0].payload).toMatchObject({ country_code: country, currency, beneficiary_type: type,
      raw_data: { nium: { payoutMethod: method, beneficiaryBankAccountType: "Current",
        routingInfo: [{ type: "SWIFT", value: bic }], additionalFields: { beneficiaryAlias: "Saved alias" } } } });

    await screen.findAllByText("Fixture Recipient");
    fireEvent.click(container.querySelector("svg.lucide-pencil")!.closest("button")!);
    await screen.findByText("Edit vendor");
    expect(screen.getByPlaceholderText("Vendor's phone")).toHaveValue("12345678");
    expect(screen.getByRole("combobox", { name: "Country or region" })).toHaveTextContent(country);
    change(/Email \(optional\)/, "edited@example.test");
    await bankStep();
    expect(screen.getByRole("combobox", { name: "Payout method" })).toHaveTextContent(method === "LOCAL" ? "Local bank transfer" : "SWIFT");
    expect(screen.getByRole("combobox", { name: /Bank Account Type/ })).toHaveValue("Current");
    expect(screen.getByLabelText(/^SWIFT \/ BIC/)).toHaveValue(bic);
    expect(screen.getByLabelText(/^Account number/)).toHaveValue("123456789");
    expect(screen.getByLabelText(/^Alias/)).toHaveValue("Saved alias");
    fireEvent.change(screen.getByRole("combobox", { name: /Bank Account Type/ }), { target: { value: "Savings" } });
    await saveReview("Save changes");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][0].payload).toEqual({ email: "edited@example.test",
      raw_data: { nium: { beneficiaryBankAccountType: "Savings" } } });

    fireEvent.click(container.querySelector("svg.lucide-pencil")!.closest("button")!);
    await screen.findByText("Edit vendor");
    expect(screen.getByLabelText(/Email \(optional\)/)).toHaveValue("edited@example.test");
    await bankStep();
    expect(screen.getByRole("combobox", { name: /Bank Account Type/ })).toHaveValue("Savings");
    expect(screen.getByLabelText(/^SWIFT \/ BIC/)).toHaveValue(bic);
    expect(screen.getByLabelText(/^Alias/)).toHaveValue("Saved alias");
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
