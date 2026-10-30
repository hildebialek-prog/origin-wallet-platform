import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/services/apiClient";
import { swiftRequirements } from "@/test/beneficiaryFixtures";
import AccountBeneficiaries from "./AccountBeneficiaries";

const mocks = vi.hoisted(() => ({ methods: vi.fn(), requirements: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "9" }, token: "test-token" }) }));
vi.mock("@/services/fxOrderService", () => ({ getProviders: vi.fn(async () => ({ data: [
  { id: 7, code: "nium", name: "Nium", status: "active", supports_beneficiaries: true },
] })) }));
vi.mock("@/services/moneyMovementService", () => ({
  getBeneficiaryPayoutMethods: mocks.methods, getBeneficiaryRequirements: mocks.requirements,
  getBeneficiaries: mocks.list, createBeneficiary: mocks.create, updateBeneficiary: mocks.update, deleteBeneficiary: vi.fn(),
}));

const renderPage = () => render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: {
  queries: { retry: false }, mutations: { retry: false },
} })}><AccountBeneficiaries /></QueryClientProvider></MemoryRouter>);
const change = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const select = async (label: string, option: string) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "ArrowDown" });
  fireEvent.keyDown(await screen.findByRole("option", { name: option }), { key: "Enter" });
};
const openBank = async () => {
  renderPage();
  await waitFor(() => expect(screen.queryByText("Beneficiary rail is not ready yet.")).not.toBeInTheDocument());
  fireEvent.click(screen.getAllByRole("button", { name: "Add beneficiary" })[0]);
  change(/Vendor's name/, "Fixture Person");
  await select("Country or region", "SG - Singapore");
  await select("Vendor legal type", "Individual");
  fireEvent.click(screen.getByRole("button", { name: "Continue to add accounts" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await select("Currency", "SGD");
};

describe("SGD Local beneficiary create and registered edit", () => {
  const scroll = HTMLElement.prototype.scrollIntoView;
  beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
  afterAll(() => { HTMLElement.prototype.scrollIntoView = scroll; });
  beforeEach(() => {
    mocks.list.mockReset().mockResolvedValue([]);
    mocks.create.mockReset().mockResolvedValue({ id: 1 });
    mocks.update.mockReset();
    mocks.methods.mockReset().mockImplementation(async (params) => {
      if (params.countryCode === "SG" && (params.currency !== "SGD" || params.beneficiaryType !== "individual")) {
        throw new ApiRequestError("Unsupported", 422, undefined, { code: "beneficiary_corridor_unsupported" });
      }
      return { provider_id: Number(params.providerId), beneficiary_type: params.beneficiaryType,
        country_code: params.countryCode, currency: params.currency, payout_methods: params.countryCode === "SG" ? ["LOCAL"] : ["SWIFT"] };
    });
    // Synthetic UI metadata, not an authentic SG validation-schema fixture.
    mocks.requirements.mockReset().mockImplementation(async (params) => ({
      ...swiftRequirements, dimensions: { destinationCountry: params.countryCode, destinationCurrency: params.currency,
        payoutMethod: params.payoutMethod, beneficiaryAccountType: params.beneficiaryType === "individual" ? "INDIVIDUAL" : "CORPORATE", customerType: "CORPORATE" },
    }));
  });

  it("discovers LOCAL, retains SWIFT routing and reviews and creates the exact selected SG corridor", async () => {
    await openBank();
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    expect(screen.getByRole("combobox", { name: "Payout method" })).toHaveTextContent("Local bank transfer");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Payout method" }), { key: "ArrowDown" });
    expect(await screen.findByRole("option", { name: "Local bank transfer" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "SWIFT" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("option", { name: "Local bank transfer" }), { key: "Enter" });
    change(/^Bank name/, "Fixture Bank");
    change(/^Account number/, "123456789");
    change(/^Confirm account number/, "123456789");
    change(/^SWIFT \/ BIC/, "DBSSSGSG");
    change(/^Address \(/, "1 Fixture Road");
    change(/^City/, "Singapore");
    change(/^Postcode/, "123456");
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(screen.getByText("Review vendor details")).toBeVisible();
    expect(screen.getByText("SG - Singapore")).toBeVisible();
    expect(screen.getByText("LOCAL (Local bank transfer)")).toBeVisible();
    expect(screen.getByText("DBSSSGSG")).toBeVisible();
    expect(screen.getByText("123456789")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Create beneficiary" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0].payload).toMatchObject({ country_code: "SG", currency: "SGD", beneficiary_type: "individual",
      raw_data: { nium: { payoutMethod: "LOCAL", routingInfo: [{ type: "SWIFT", value: "DBSSSGSG" }] } } });
    const sgRequests = mocks.requirements.mock.calls.filter(([params]) => params.currency === "SGD");
    expect(sgRequests.length).toBeGreaterThan(0);
    expect(sgRequests.every(([params]) => params.payoutMethod === "LOCAL")).toBe(true);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("waits for authoritative method discovery before any requirements request", async () => {
    mocks.methods.mockImplementation(() => new Promise(() => {}));
    await openBank();
    expect(screen.getByText(/Loading supported beneficiary requirements/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeDisabled();
    expect(mocks.requirements).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("prefers verified LOCAL for a new SG/SGD Individual even when both bank methods are supported", async () => {
    mocks.methods.mockImplementation(async (params) => ({ provider_id: Number(params.providerId), beneficiary_type: params.beneficiaryType,
      country_code: params.countryCode, currency: params.currency, payout_methods: ["SWIFT", "LOCAL"] }));
    await openBank();
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    expect(screen.getByRole("combobox", { name: "Payout method" })).toHaveTextContent("Local bank transfer");
    expect(mocks.requirements.mock.calls.filter(([params]) => params.currency === "SGD").every(([params]) => params.payoutMethod === "LOCAL")).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiRequestError("unsupported", 422, undefined, { code: "beneficiary_corridor_unsupported" }), /This beneficiary corridor is not supported/],
    [new ApiRequestError("schema", 502, undefined, { code: "beneficiary_schema_unavailable" }), /NIUM validation requirements could not be verified/],
    [new ApiRequestError("network", 0), /Cannot connect to the beneficiary service/],
  ])("distinguishes requirements errors and prevents creation (%s)", async (error, message) => {
    mocks.requirements.mockRejectedValue(error);
    await openBank();
    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects discovery metadata for a different currency instead of guessing a method", async () => {
    mocks.methods.mockImplementation(async (params) => ({ provider_id: Number(params.providerId), beneficiary_type: params.beneficiaryType,
      country_code: params.countryCode, currency: "EUR", payout_methods: ["LOCAL"] }));
    await openBank();
    expect(await screen.findByText(/Beneficiary requirements are unavailable/)).toBeVisible();
    expect(mocks.requirements).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeDisabled();
  });

  it("explains a corridor-discovery failure and retries without creating or changing a beneficiary", async () => {
    let unavailable = true;
    mocks.methods.mockImplementation(async (params) => {
      if (params.currency === "SGD" && unavailable) {
        throw new ApiRequestError("Unavailable", 502, undefined, { code: "beneficiary_corridors_unavailable" });
      }
      return { provider_id: Number(params.providerId), beneficiary_type: params.beneficiaryType,
        country_code: params.countryCode, currency: params.currency, payout_methods: params.currency === "SGD" ? ["LOCAL"] : ["SWIFT"] };
    });
    await openBank();
    expect(await screen.findByText(/Supported payout methods could not be verified/)).toBeVisible();
    change(/^Account number/, "123456789");
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeDisabled();
    expect(mocks.requirements.mock.calls.some(([params]) => params.currency === "SGD")).toBe(false);
    unavailable = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry requirements" }));
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    expect(screen.getByLabelText(/^Account number/)).toHaveValue("123456789");
    expect(screen.getByRole("combobox", { name: "Payout method" })).toHaveTextContent("Local bank transfer");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("keeps a registered USD/SWIFT edit unchanged when country or currency conversion is attempted", async () => {
    mocks.list.mockResolvedValue([{ id: 42, provider_id: 7, user_id: 9, is_registered: true, beneficiary_type: "business",
      full_name: "Saved Vendor", country_code: "HK", currency: "USD", payout_method: "SWIFT", status: "active", account_number: "123456789" }]);
    const { container } = renderPage();
    await screen.findAllByText("Saved Vendor");
    fireEvent.click(container.querySelector("svg.lucide-pencil")!.closest("button")!);
    await screen.findByText("Edit vendor");
    await select("Country or region", "SG - Singapore");
    expect(screen.getByText(/cannot be converted to another country/)).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Country or region" })).toHaveTextContent("HK - Hong Kong");
    fireEvent.click(screen.getByRole("button", { name: "Continue to add accounts" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await select("Currency", "SGD");
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveTextContent("USD");
    expect(screen.getByRole("combobox", { name: "Payout method" })).toHaveTextContent("SWIFT");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.methods.mock.calls.every(([params]) => params.countryCode === "HK" && params.currency === "USD")).toBe(true);
  });
});
