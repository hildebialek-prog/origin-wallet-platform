import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCorporateSubdivisionOptions } from "@/services/kycService";
import { AddressFields, assertFilingDocumentEvidence, buildFilingDocumentPayload } from "./AccountKyc";

vi.mock("@/services/kycService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/kycService")>()),
  getCorporateSubdivisionOptions: vi.fn(),
}));

describe("related-person address subdivisions", () => {
  beforeEach(() => vi.mocked(getCorporateSubdivisionOptions).mockReset());

  const renderAddress = (countryCode: string, state: string, onChange = vi.fn(), remote = false) => {
    render(createElement(AddressFields, {
      title: "Authorized representative address",
      countryCode,
      addressLine1: "1 Test Street",
      city: "Test City",
      state,
      postalCode: "100000",
      onChange,
      ...(remote ? { token: "token", userId: 11 } : {}),
    }));

    return onChange;
  };

  it("renders configured Vietnam subdivisions as a selector and displays an existing code", () => {
    renderAddress("VN", "VN-70");

    const stateField = document.querySelector('[data-kyc-field="address-state"]');
    expect(stateField).not.toBeNull();
    const selector = within(stateField as HTMLElement).getByRole("combobox") as HTMLSelectElement;

    expect(selector.value).toBe("VN-70");
    expect(selector.selectedOptions[0]?.textContent).toBe("Phu Yen");
    expect(within(stateField as HTMLElement).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("loads Vietnam constants and submits the Nium code", async () => {
    vi.mocked(getCorporateSubdivisionOptions).mockResolvedValue({ values: [{ label: "Phu Yen", value: "VN-70" }] });
    const onChange = renderAddress("VN", "", vi.fn(), true);

    await waitFor(() => expect(screen.getByRole("option", { name: "Phu Yen" })).toBeInTheDocument());
    const stateField = document.querySelector('[data-kyc-field="address-state"]');
    fireEvent.change(within(stateField as HTMLElement).getByRole("combobox"), { target: { value: "VN-70" } });
    expect(onChange).toHaveBeenCalledWith("state", "VN-70");
  });

  it("uses a Hong Kong code returned by Nium", async () => {
    vi.mocked(getCorporateSubdivisionOptions).mockResolvedValue({ values: [{ label: "Kowloon City", value: "HK-KKC" }] });
    const onChange = renderAddress("HK", "", vi.fn(), true);

    await waitFor(() => expect(screen.getByRole("option", { name: "Kowloon City" })).toHaveValue("HK-KKC"));
    const stateField = document.querySelector('[data-kyc-field="address-state"]');
    fireEvent.change(within(stateField as HTMLElement).getByRole("combobox"), { target: { value: "HK-KKC" } });
    expect(onChange).toHaveBeenCalledWith("state", "HK-KKC");
  });

  it("keeps free text when Nium returns no subdivisions", async () => {
    vi.mocked(getCorporateSubdivisionOptions).mockResolvedValue({ values: [] });
    renderAddress("ZZ", "Custom State", vi.fn(), true);

    await waitFor(() => expect(screen.getByDisplayValue("Custom State")).toHaveAttribute("type", "text"));
  });

  it("stores the subdivision code selected by the user", () => {
    const onChange = renderAddress("VN", "");
    const stateField = document.querySelector('[data-kyc-field="address-state"]');

    fireEvent.change(within(stateField as HTMLElement).getByRole("combobox"), { target: { value: "VN-70" } });

    expect(onChange).toHaveBeenCalledWith("state", "VN-70");
  });

  it("renders Hong Kong subdivisions and stores the selected district code", () => {
    const onChange = renderAddress("HK", "");
    const stateField = document.querySelector('[data-kyc-field="address-state"]');
    const selector = within(stateField as HTMLElement).getByRole("combobox");

    expect(within(selector).getByRole("option", { name: "Central and Western" })).toHaveValue("HK-HCW");
    fireEvent.change(selector, { target: { value: "HK-HCW" } });

    expect(onChange).toHaveBeenCalledWith("state", "HK-HCW");
  });

  it("keeps a text input for countries without configured subdivisions", () => {
    renderAddress("GB", "Greater London");

    expect(screen.getByDisplayValue("Greater London")).toHaveAttribute("type", "text");
    expect(document.querySelector('[data-kyc-field="address-state"]')).toBeNull();
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
