import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountRfi from "./AccountRfi";

const mocks = vi.hoisted(() => ({
  getCustomerRfis: vi.fn(),
  uploadCustomerRfiDocument: vi.fn(),
  saveCustomerRfiDraft: vi.fn(),
  submitCustomerRfi: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 41 }, token: "customer-test-token" }),
}));

vi.mock("@/services/rfiService", () => ({
  getCustomerRfis: mocks.getCustomerRfis,
  uploadCustomerRfiDocument: mocks.uploadCustomerRfiDocument,
  saveCustomerRfiDraft: mocks.saveCustomerRfiDraft,
  submitCustomerRfi: mocks.submitCustomerRfi,
}));

const cases = [
  {
    id: 101,
    status: "OPEN",
    submission_state: "sent_to_user",
    contract_gate: "provider_contract_unconfirmed",
    evidence: { remarks: "Provide the current incorporation record.", template: { name: "Certificate of Incorporation", documentType: "businessRegistrationDocument", requiredFields: [{ fieldLabel: "Incorporation certificate", type: "document" }] } },
    documents: [],
  },
  {
    id: 102,
    status: "OPEN",
    submission_state: "sent_to_user",
    contract_gate: "provider_contract_unconfirmed",
    evidence: { remarks: "Explain and evidence the individual's accumulated wealth.", template: { name: "Personal Source of Wealth", documentType: "otherDocument", requiredFields: [{ fieldLabel: "Source of wealth evidence", type: "document" }] } },
    documents: [],
  },
  {
    id: 103,
    status: "OPEN",
    submission_state: "sent_to_user",
    contract_gate: "provider_contract_unconfirmed",
    evidence: { remarks: "Provide evidence for the funds used by the individual.", template: { name: "Personal Source of Funds", documentType: "otherDocument", requiredFields: [{ fieldLabel: "Source of funds evidence", type: "document" }] } },
    documents: [],
  },
  {
    id: 104,
    status: "OPEN",
    submission_state: "sent_to_user",
    contract_gate: "provider_contract_unconfirmed",
    evidence: { remarks: "Provide supporting evidence for the company's funds and wealth.", template: { name: "Company Source of Funds and Source of Wealth", documentType: "otherDocument", requiredFields: [{ fieldLabel: "Company financial evidence", type: "document" }] } },
    documents: [],
  },
];

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><AccountRfi /></QueryClientProvider>);
};

const requestCard = (name: string) => {
  return within(screen.getByRole("region", { name: `${name} information request` }));
};

describe("AccountRfi", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getCustomerRfis.mockResolvedValue({ data: cases });
    mocks.saveCustomerRfiDraft.mockResolvedValue({});
    mocks.submitCustomerRfi.mockResolvedValue({});
  });

  it("displays four separate requests with the original remarks and document requirements", async () => {
    renderPage();

    for (const item of cases) {
      expect(await screen.findByRole("heading", { name: item.evidence.template.name })).toBeVisible();
      expect(screen.getByText(item.evidence.remarks)).toBeVisible();
      expect(screen.getByText(item.evidence.template.requiredFields[0].fieldLabel)).toBeVisible();
    }
    expect(screen.getAllByText(/This does not submit anything directly to Nium\./)).toHaveLength(4);
  });

  it("uploads privately and explicitly associates one document with both personal SOW and SOF", async () => {
    mocks.uploadCustomerRfiDocument.mockResolvedValue({ document: { id: 501, original_name: "shared-financial-evidence.pdf", status: "private" } });
    renderPage();
    await screen.findByRole("heading", { name: "Personal Source of Wealth" });

    const file = new File(["synthetic fixture"], "shared-financial-evidence.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Upload Corporate RFI supporting document"), { target: { files: [file] } });
    expect(await screen.findAllByText("shared-financial-evidence.pdf")).toHaveLength(4);
    expect(mocks.uploadCustomerRfiDocument).toHaveBeenCalledWith(41, "customer-test-token", file);

    fireEvent.click(requestCard("Personal Source of Wealth").getByRole("checkbox", { name: "shared-financial-evidence.pdf" }));
    fireEvent.click(requestCard("Personal Source of Funds").getByRole("checkbox", { name: "shared-financial-evidence.pdf" }));
    fireEvent.click(requestCard("Personal Source of Wealth").getByRole("button", { name: "Save draft" }));
    fireEvent.click(requestCard("Personal Source of Funds").getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(mocks.saveCustomerRfiDraft).toHaveBeenCalledWith(41, 102, "customer-test-token", [501], "");
      expect(mocks.saveCustomerRfiDraft).toHaveBeenCalledWith(41, 103, "customer-test-token", [501], "");
    });
  });

  it("saves selected documents before submitting them to Origin Wallet", async () => {
    mocks.getCustomerRfis.mockResolvedValue({ data: [{ ...cases[0], documents: [{ id: 601, original_name: "incorporation-record.pdf", status: "private" }] }] });
    renderPage();
    await screen.findByRole("heading", { name: "Certificate of Incorporation" });
    const card = requestCard("Certificate of Incorporation");

    fireEvent.click(card.getByRole("button", { name: "Submit to Origin Wallet" }));

    await waitFor(() => expect(mocks.saveCustomerRfiDraft).toHaveBeenCalledWith(41, 101, "customer-test-token", [601], ""));
    await waitFor(() => expect(mocks.submitCustomerRfi).toHaveBeenCalledWith(41, 101, "customer-test-token"));
  });

  it("shows a revision request and permits a corrected resubmission", async () => {
    mocks.getCustomerRfis.mockResolvedValue({ data: [{ ...cases[2], submission_state: "revision_requested", revision_reason: "Please provide a statement showing the account holder name.", documents: [{ id: 701, original_name: "replacement-statement.pdf", status: "private" }] }] });
    renderPage();

    expect(await screen.findByText("Revision requested")).toBeVisible();
    expect(screen.getByText("Please provide a statement showing the account holder name.")).toBeVisible();
    fireEvent.click(requestCard("Personal Source of Funds").getByRole("button", { name: "Submit to Origin Wallet" }));

    await waitFor(() => expect(mocks.submitCustomerRfi).toHaveBeenCalledWith(41, 103, "customer-test-token"));
  });

  it("shows loading, query failure, and upload failure states safely", async () => {
    mocks.getCustomerRfis.mockImplementation(() => new Promise(() => undefined));
    const loading = renderPage();
    expect(screen.getByText("Loading requests...")).toBeVisible();
    loading.unmount();

    mocks.getCustomerRfis.mockRejectedValue(new Error("Forbidden"));
    const failedQuery = renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load your information requests.");
    failedQuery.unmount();

    mocks.getCustomerRfis.mockResolvedValue({ data: cases });
    mocks.uploadCustomerRfiDocument.mockRejectedValue(new Error("The document could not be uploaded securely."));
    renderPage();
    await screen.findByRole("heading", { name: "Certificate of Incorporation" });
    fireEvent.change(screen.getByLabelText("Upload Corporate RFI supporting document"), { target: { files: [new File(["safe"], "safe-fixture.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("The document could not be uploaded securely.");
  });
});
