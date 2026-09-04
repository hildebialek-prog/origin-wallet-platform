import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCorporateSubdivisionOptions } from "@/services/kycService";
import { AddressFields, assertFilingDocumentEvidence, buildFilingDocumentPayload, readPersistedAddress } from "./AccountKyc";

vi.mock("@/services/kycService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/kycService")>()),
  getCorporateSubdivisionOptions: vi.fn(),
}));

describe("related-person address subdivisions", () => {
  beforeEach(() => vi.mocked(getCorporateSubdivisionOptions).mockReset());

  const renderAddress = (countryCode: string, state: string, onChange = vi.fn(), subdivisionOptions: { label: string; value: string }[] = [], remote = false) => {
    render(createElement(AddressFields, {
      title: "Authorized representative address",
      countryCode,
      addressLine1: "1 Test Street",
      city: "Test City",
      state,
      postalCode: "100000",
      onChange,
      subdivisionOptions,
      ...(remote ? { token: "token", userId: 11, region: "HK" } : {}),
    }));

    return onChange;
  };

  it("renders a dropdown when US isoState options are returned", async () => {
    vi.mocked(getCorporateSubdivisionOptions).mockResolvedValue({ values: [{ label: "Alaska", value: "US-AK" }] });
    renderAddress("US", "", vi.fn(), [], true);

    await waitFor(() => expect(screen.getByRole("option", { name: "Alaska" })).toHaveValue("US-AK"));
    expect(getCorporateSubdivisionOptions).toHaveBeenCalledWith({ token: "token", userId: 11, region: "HK", countryCode: "US" });
  });

  it("renders free text when HK isoState is unsupported", async () => {
    vi.mocked(getCorporateSubdivisionOptions).mockResolvedValue({ values: [] });
    renderAddress("HK", "Kowloon City", vi.fn(), [], true);

    await waitFor(() => expect(screen.getByDisplayValue("Kowloon City")).toHaveAttribute("type", "text"));
  });

  it("renders a selector only for a backend-confirmed subdivision category", () => {
    renderAddress("VN", "VN-70", vi.fn(), [{ label: "Phu Yen", value: "VN-70" }]);

    const stateField = document.querySelector('[data-kyc-field="address-state"]');
    expect(stateField).not.toBeNull();
    const selector = within(stateField as HTMLElement).getByRole("combobox") as HTMLSelectElement;

    expect(selector.value).toBe("VN-70");
    expect(selector.selectedOptions[0]?.textContent).toBe("Phu Yen");
    expect(within(stateField as HTMLElement).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("stores a backend-confirmed subdivision code", () => {
    const onChange = renderAddress("VN", "", vi.fn(), [{ label: "Phu Yen", value: "VN-70" }]);
    const stateField = document.querySelector('[data-kyc-field="address-state"]');
    fireEvent.change(within(stateField as HTMLElement).getByRole("combobox"), { target: { value: "VN-70" } });
    expect(onChange).toHaveBeenCalledWith("state", "VN-70");
  });

  it("keeps free text when no Nium subdivision category is confirmed", () => {
    renderAddress("HK", "Kowloon City");
    expect(screen.getByDisplayValue("Kowloon City")).toHaveAttribute("type", "text");
  });

  it("unknown subdivision capability falls back to text input", () => {
    renderAddress("VN", "Phu Yen");

    expect(screen.getByDisplayValue("Phu Yen")).toHaveAttribute("type", "text");
    expect(document.querySelector('[data-kyc-field="address-state"]')).toBeNull();
  });

  it.each([
    ["registered business", { country: "VN", state: "Phu Yen", city: "Phu Yen" }],
    ["business", { countryCode: "VN", state: "Phu Yen", city: "Phu Yen" }],
    ["authorized representative", { country_code: "VN", state: "Phu Yen", city: "Phu Yen" }],
    ["beneficial owner", { country: "VN", state: "Phu Yen", city: "Phu Yen" }],
  ])("hydrates an existing %s address state", (_label, address) => {
    const persisted = readPersistedAddress(address);
    renderAddress(persisted.countryCode, persisted.state);

    expect(screen.getByDisplayValue("Phu Yen")).toHaveAttribute("type", "text");
  });

  it("editing a persisted state updates the address payload value", () => {
    const onChange = renderAddress("VN", "Phu Yen");

    fireEvent.change(screen.getByDisplayValue("Phu Yen"), { target: { value: "Ho Chi Minh City" } });

    expect(onChange).toHaveBeenCalledWith("state", "Ho Chi Minh City");
  });

  it("keeps an empty persisted state empty", () => {
    const persisted = readPersistedAddress({ country: "VN", state: "", city: "Phu Yen" });
    renderAddress(persisted.countryCode, persisted.state);

    const stateField = screen.getAllByRole("textbox").find((input) => (input as HTMLInputElement).value === "");
    expect(stateField).toBeDefined();
  });
});

describe("HK KYB filing document evidence", () => {
  it("preserves uploaded NNC1 evidence and metadata in the submission document", () => {
    const document = buildFilingDocumentPayload({
      filingDocumentType: "nnc1",
      filingDocumentUrl: "/api/kyc-documents/11/nnc1",
      filingDocumentIssuedAt: "2026-09-01",
      isMostRecentFiling: true,
    }, "HK", {
      file_hash: "a".repeat(64),
      file_path: "kyc/11/nnc1.pdf",
      storage_disk: "kyc_private",
      original_name: "nnc1.pdf",
      mime_type: "application/pdf",
      file_size: 1234,
      metadata: { upload_source: "kyc_document_endpoint" },
    });

    expect(document).toMatchObject({
      type: "nnc1",
      file_url: "/api/kyc-documents/11/nnc1",
      file_hash: "a".repeat(64),
      file_path: "kyc/11/nnc1.pdf",
      storage_disk: "kyc_private",
      metadata: {
        upload_source: "kyc_document_endpoint",
        is_most_recent_filing: true,
      },
    });
  });

  it.each(["nar1", "nnc1"] as const)("accepts complete uploaded %s evidence", (type) => {
    expect(() => assertFilingDocumentEvidence([{
      type,
      file_url: `/api/kyc-documents/11/${type}`,
      file_hash: "a".repeat(64),
      file_path: `kyc/11/${type}.pdf`,
      storage_disk: "kyc_private",
    }], type)).not.toThrow();
  });

  it.each(["file_hash", "file_path", "storage_disk"] as const)(
    "rejects a filing document missing %s",
    (field) => {
      const document = {
        type: "nnc1",
        file_url: "/api/kyc-documents/11/nnc1",
        file_hash: "a".repeat(64),
        file_path: "kyc/11/nnc1.pdf",
        storage_disk: "kyc_private",
        [field]: null,
      };

      expect(() => assertFilingDocumentEvidence([document], "nnc1")).toThrow(
        "Uploaded filing document metadata is missing. Please re-upload the NAR1/NNC1 document.",
      );
    },
  );

  it("uses the selected filing type instead of accepting evidence under another key", () => {
    expect(() => assertFilingDocumentEvidence([{
      type: "nar1",
      file_url: "/api/kyc-documents/11/nar1",
      file_hash: "a".repeat(64),
      file_path: "kyc/11/nar1.pdf",
      storage_disk: "kyc_private",
    }], "nnc1")).toThrow(
      "Uploaded filing document metadata is missing. Please re-upload the NAR1/NNC1 document.",
    );
  });
});
