import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { swiftRequirements } from "@/test/beneficiaryFixtures";
import { ApiRequestError } from "@/services/apiClient";
import AccountBeneficiaries from "./AccountBeneficiaries";

const mocks = vi.hoisted(() => ({ methods: vi.fn(), requirements: vi.fn(), create: vi.fn(), providerCode: "nium" }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "9" }, token: "test-token" }) }));
vi.mock("@/services/fxOrderService", () => ({ getProviders: vi.fn(async () => ({ data: [
  { id: 7, code: mocks.providerCode, name: "Nium", status: "active", supports_beneficiaries: true },
] })) }));
vi.mock("@/services/moneyMovementService", () => ({
  getBeneficiaries: vi.fn().mockResolvedValue([]), getBeneficiaryRequirements: mocks.requirements,
  getBeneficiaryPayoutMethods: mocks.methods,
  createBeneficiary: mocks.create, updateBeneficiary: vi.fn(), deleteBeneficiary: vi.fn(),
}));

const change = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const openBank = async () => {
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <AccountBeneficiaries />
  </QueryClientProvider></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText("Beneficiary rail is not ready yet.")).not.toBeInTheDocument());
  fireEvent.click(screen.getAllByRole("button", { name: "Add beneficiary" })[0]);
  change(/Vendor's name/, " Vendor ");
  fireEvent.click(screen.getByRole("button", { name: "Continue to add accounts" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
};
const fillBank = () => {
  change(/^Bank name/, " Bank ");
  change(/^Account number/, " 123456789 ");
  change(/^Confirm account number/, "123456789");
};
const fillSwift = () => {
  fillBank();
  change(/^SWIFT \/ BIC/, " HSBCHKHHHKH ");
  change(/^Address \(/, " Road ");
  change(/^City/, " City ");
  change(/^Postcode/, "123456");
};

describe("corridor-aware beneficiary wizard", () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
  afterAll(() => { HTMLElement.prototype.scrollIntoView = originalScrollIntoView; });
  beforeEach(() => {
    mocks.providerCode = "nium";
    mocks.methods.mockReset().mockImplementation(async (params) => ({
      provider_id: Number(params.providerId), beneficiary_type: params.beneficiaryType,
      country_code: params.countryCode, currency: params.currency, payout_methods: ["SWIFT"],
    }));
    mocks.requirements.mockReset().mockResolvedValue(swiftRequirements);
    mocks.create.mockReset().mockResolvedValue({ id: 1 });
  });

  it.each(["NIUM", "Nium"])("loads validated requirements for provider code %s instead of showing the legacy form", async (code) => {
    mocks.providerCode = code;
    await openBank();
    await waitFor(() => expect(mocks.requirements).toHaveBeenCalled());
    expect(screen.queryByLabelText(/^Bank code|^Branch code/)).not.toBeInTheDocument();
    expect(await screen.findByLabelText(/^SWIFT \/ BIC/)).toBeRequired();
  });

  it("reviews and submits the exact supported SWIFT routing payload", async () => {
    await openBank();
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    expect(screen.queryByLabelText(/^Bank code|^Branch code/)).not.toBeInTheDocument();
    fillSwift();
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(screen.getByText("Review vendor details")).toBeVisible();
    expect(screen.getByText("HSBCHKHHHKH")).toBeVisible();
    expect(screen.getByText("123456789")).toBeVisible();
    expect(screen.queryByText("Bank code")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create beneficiary" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const payload = mocks.create.mock.calls[0][0].payload;
    expect(payload).toMatchObject({ full_name: "Vendor", bank_name: "Bank", account_number: "123456789", swift_bic: "HSBCHKHHHKH",
      raw_data: { nium: { payoutMethod: "SWIFT", routingInfo: [{ type: "SWIFT", value: "HSBCHKHHHKH" }] } } });
    expect(payload).not.toHaveProperty("bank_code");
    expect(payload).not.toHaveProperty("branch_code");
    expect(mocks.requirements).toHaveBeenCalledWith(expect.objectContaining({ countryCode: "HK", currency: "USD", beneficiaryType: "business", payoutMethod: "SWIFT" }));
  });

  it("blocks review on a schema failure and permits retry without losing bank details", async () => {
    mocks.requirements.mockRejectedValueOnce(new Error("Lookup unavailable"));
    await openBank();
    await screen.findByText(/Beneficiary requirements are unavailable/);
    fillBank();
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry requirements" }));
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    expect(screen.getByLabelText(/^Account number/)).toHaveValue(" 123456789 ");
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeEnabled();
  });

  it("blocks review while requirements are still loading", async () => {
    let resolve: (value: typeof swiftRequirements) => void;
    mocks.requirements.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await openBank();
    expect(screen.getByText(/Loading supported beneficiary requirements/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeDisabled();
    await waitFor(() => expect(mocks.requirements).toHaveBeenCalled());
    resolve!(swiftRequirements);
    await screen.findByLabelText(/^SWIFT \/ BIC/);
  });

  it("requires a supported routing choice and shows field errors before review", async () => {
    mocks.requirements.mockResolvedValue({ ...swiftRequirements, routing_code_types: ["SWIFT", "IFSC"], fields: [
      { name: "routingCodeType1", required: true, allowed_values: ["SWIFT", "IFSC"] },
      { name: "routingCodeValue1", required: true },
    ] });
    await openBank();
    await screen.findByLabelText(/^Routing type/);
    fillBank();
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(screen.getByLabelText(/^Routing type/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Review vendor details")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Routing type/), { target: { value: "IFSC" } });
    change(/^IFSC code/, "HDFC0001234");
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(screen.getByText("Review vendor details")).toBeVisible();
    expect(screen.getByText("HDFC0001234")).toBeVisible();
  });

  it.each([
    ["raw V3 data without a schema", { routingCodeType: "SWIFT" }],
    ["malformed schema", { ...swiftRequirements, fields: null }],
    ["another corridor", { ...swiftRequirements, dimensions: { ...swiftRequirements.dimensions, destinationCurrency: "EUR" } }],
  ])("blocks review for %s instead of assuming HK/USD has valid metadata", async (_label, response) => {
    mocks.requirements.mockResolvedValue(response);
    await openBank();
    await screen.findByText(/Beneficiary requirements are unavailable/);
    expect(screen.queryByLabelText(/^SWIFT \/ BIC|^Bank code|^Branch code/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("explains an unsupported corridor and blocks review", async () => {
    mocks.requirements.mockRejectedValue(new ApiRequestError("Unsupported corridor", 422));
    await openBank();
    expect(await screen.findByText(/This beneficiary corridor is not supported/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue to review" })).toBeDisabled();
    expect(screen.queryByLabelText(/^Bank code|^Branch code/)).not.toBeInTheDocument();
  });

  it.each(["", "invalid"])("shows missing or invalid SWIFT errors beneath the input (value: %s)", async (code) => {
    await openBank();
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    fillSwift();
    change(/^SWIFT \/ BIC/, code);
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    const input = screen.getByLabelText("SWIFT / BIC (Required)");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)).toHaveTextContent(/required|format/);
    expect(screen.getByText(/NIUM requires the bank's SWIFT\/BIC/)).toBeVisible();
    expect(screen.queryByText("Review vendor details")).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each(["swift_bic", "raw_data.nium.routingInfo.0.value"])("places backend %s errors directly beneath SWIFT/BIC", async (field) => {
    mocks.create.mockRejectedValue(new ApiRequestError("Invalid routing", 422, { [field]: ["Use the bank's current SWIFT code."] }));
    await openBank();
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    fillSwift();
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    fireEvent.click(screen.getByRole("button", { name: "Create beneficiary" }));
    const input = await screen.findByLabelText(/^SWIFT \/ BIC/);
    expect(input).toHaveAccessibleDescription("Use the bank's current SWIFT code.");
  });

  it("reloads requirements and clears routing when the payment method changes, retaining account details", async () => {
    mocks.methods.mockImplementation(async (params) => ({
      provider_id: Number(params.providerId), beneficiary_type: params.beneficiaryType,
      country_code: params.countryCode, currency: params.currency, payout_methods: ["SWIFT", "LOCAL"],
    }));
    mocks.requirements.mockImplementation(async (params) => params.payoutMethod === "LOCAL" ? {
      ...swiftRequirements, dimensions: { ...swiftRequirements.dimensions, payoutMethod: "LOCAL" }, routing_code_types: ["IFSC"],
      fields: [{ name: "routingCodeType1", required: true, allowed_values: ["IFSC"] }, { name: "routingCodeValue1", required: true }],
    } : swiftRequirements);
    await openBank();
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    fillSwift();
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Payout method" }), { key: "ArrowDown" });
    fireEvent.keyDown(await screen.findByRole("option", { name: "Local bank transfer" }), { key: "Enter" });
    const routing = await screen.findByLabelText(/^IFSC code/);
    expect(routing).toHaveValue("");
    expect(screen.queryByLabelText(/^SWIFT \/ BIC/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Account number/)).toHaveValue(" 123456789 ");
    expect(screen.getByLabelText(/^Bank name/)).toHaveValue(" Bank ");
    expect(mocks.requirements).toHaveBeenLastCalledWith(expect.objectContaining({ payoutMethod: "LOCAL" }));
  });

  it("returns authoritative backend field errors to the editable bank step", async () => {
    mocks.create.mockRejectedValue(new ApiRequestError("Invalid routing", 422, { routingCodeValue1: ["Use the bank's current SWIFT code."] }));
    await openBank();
    await screen.findByLabelText(/^SWIFT \/ BIC/);
    fillSwift();
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    fireEvent.click(screen.getByRole("button", { name: "Create beneficiary" }));
    expect(await screen.findByLabelText(/^SWIFT \/ BIC/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^Account number/)).toHaveValue(" 123456789 ");
  });
});
