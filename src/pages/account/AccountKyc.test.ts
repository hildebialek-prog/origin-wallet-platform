import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCorporateSubdivisionOptions } from "@/services/kycService";
import { AddressFields, ApplicantCorrectionCard, assertFilingDocumentEvidence, BiometricKycCard, buildFilingDocumentPayload, isValidWebsite, readPersistedAddress, validBeneficialOwnerOwnership } from "./AccountKyc";

vi.mock("@/services/kycService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/kycService")>()),
  getCorporateSubdivisionOptions: vi.fn(),
}));

describe("biometric KYC action", () => {
  it("opens the current biometric KYC URL without rendering it as text", () => {
    const url = "https://idv.nium.com/prod/jumio/start?referenceNumber=current";
    render(createElement(BiometricKycCard, { biometricKyc: { status: "retry", url } }));

    expect(screen.getByRole("link", { name: /continue kyc/i })).toHaveAttribute("href", url);
    expect(screen.queryByText(url)).not.toBeInTheDocument();
    expect(screen.getByText("Biometric verification")).toBeVisible();
    expect(screen.getByText("Retry")).toBeVisible();
  });

  it("renders no action when no current biometric KYC URL is available", () => {
    render(createElement(BiometricKycCard, { biometricKyc: null }));

    expect(screen.queryByRole("link", { name: /continue kyc/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Biometric verification")).not.toBeInTheDocument();
  });
});

describe("applicant KYC correction", () => {
  const current = {
    legal_name: "NGUYEN THANH PHUONG",
    first_name: "THANH PHUONG",
    last_name: "NGUYEN",
    date_of_birth: "1990-01-01",
  };

  it("only shows the correction action when backend confirms eligibility", () => {
    const { rerender } = render(createElement(ApplicantCorrectionCard, {
      state: { eligible: false, reason: "Not eligible" },
      onSubmit: vi.fn(),
    }));
    expect(screen.queryByRole("button", { name: /request applicant correction/i })).not.toBeInTheDocument();

    rerender(createElement(ApplicantCorrectionCard, {
      state: { eligible: true, current_values: current, correction_version: 1, source_fingerprint: "a".repeat(64) },
      onSubmit: vi.fn(),
    }));
    expect(screen.getByRole("button", { name: /request applicant correction/i })).toBeVisible();
  });

  it("submits only the four allowed applicant fields", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(createElement(ApplicantCorrectionCard, {
      state: { eligible: true, current_values: current, correction_version: 1, source_fingerprint: "a".repeat(64) },
      onSubmit,
    }));

    fireEvent.click(screen.getByRole("button", { name: /request applicant correction/i }));
    fireEvent.change(screen.getByDisplayValue("THANH PHUONG"), { target: { value: "THANH PHUONG AN" } });
    const submit = screen.getByRole("button", { name: /submit correction for review/i });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      ...current,
      first_name: "THANH PHUONG AN",
    }));
  });

  it("shows proposed values as read-only while review is pending", () => {
    render(createElement(ApplicantCorrectionCard, {
      state: {
        eligible: false,
        correction: {
          id: 10,
          correction_version: 1,
          status: "submitted",
          before_values: current,
          proposed_values: { ...current, last_name: "NGUYEN VAN" },
          provider_update: { allowed: false, reason: "Nium Customer Update is disabled; this correction cannot be approved yet." },
        },
      },
      onSubmit: vi.fn(),
    }));

    expect(screen.getByText(/awaiting review/i)).toBeVisible();
    expect(screen.getByText(/waiting for provider support: nium customer update is disabled/i)).toBeVisible();
    expect(screen.getByText("NGUYEN VAN")).toBeVisible();
    expect(screen.queryByRole("button", { name: /request applicant correction/i })).not.toBeInTheDocument();
  });

  it("shows the previous review reason while allowing the next correction version", () => {
    render(createElement(ApplicantCorrectionCard, {
      state: {
        eligible: true,
        current_values: current,
        correction_version: 2,
        source_fingerprint: "b".repeat(64),
        latest_resolved_correction: {
          id: 10,
          correction_version: 1,
          status: "needs_more_info",
          before_values: current,
          proposed_values: { ...current, last_name: "NGUYEN VAN" },
          review_note: "Surname does not match the passport.",
        },
      },
      onSubmit: vi.fn(),
    }));

    expect(screen.getByText("Surname does not match the passport.")).toBeVisible();
    expect(screen.getByText(/correction version 1/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /request applicant correction/i })).toBeVisible();
  });

  it("enforces an admin-scoped field and passport request in the correction form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(createElement(ApplicantCorrectionCard, {
      state: {
        eligible: false, current_values: current, correction_version: 1, source_fingerprint: "a".repeat(64),
        correction: {
          id: 11, correction_version: 1, status: "requested", before_values: current, proposed_values: current,
          requested_fields: ["first_name"], requested_document_types: ["passport"],
          request_instruction: "Correct given names and upload passport.", request_origin: "admin",
        },
      },
      onSubmit,
    }));

    expect(screen.getByText("Correct given names and upload passport.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /update requested kyc information/i }));
    expect(screen.getByDisplayValue("NGUYEN THANH PHUONG")).toBeDisabled();
    expect(screen.getByDisplayValue("THANH PHUONG")).not.toBeDisabled();
    const file = new File(["passport"], "passport.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Passport document"), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Passport Number"), { target: { value: "P1234567" } });
    fireEvent.change(screen.getByLabelText("Issuing Country"), { target: { value: "HK" } });
    fireEvent.change(screen.getByLabelText("Passport Expiry Date"), { target: { value: "2099-12-31" } });
    fireEvent.change(screen.getByDisplayValue("THANH PHUONG"), { target: { value: "THANH PHUONG AN" } });
    const submit = screen.getByRole("button", { name: /submit correction for review/i });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      { ...current, first_name: "THANH PHUONG AN" },
      file,
      { document_number: "P1234567", issuing_country_code: "HK", expires_at: "2099-12-31" },
    ));
  });

  it("submits a passport-only request without full-form field validation", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const incompleteCurrent = { ...current, first_name: "", last_name: "" };
    render(createElement(ApplicantCorrectionCard, {
      state: {
        eligible: false, current_values: incompleteCurrent, correction_version: 1, source_fingerprint: "a".repeat(64),
        correction: {
          id: 12, correction_version: 1, status: "requested", before_values: incompleteCurrent, proposed_values: incompleteCurrent,
          requested_fields: [], requested_document_types: ["passport"],
          request_instruction: "Upload a new passport.", request_origin: "admin",
        },
      },
      onSubmit,
    }));

    fireEvent.click(screen.getByRole("button", { name: /update requested kyc information/i }));
    const file = new File(["passport"], "passport.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Passport document"), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Passport Number"), { target: { value: "P7654321" } });
    fireEvent.change(screen.getByLabelText("Issuing Country"), { target: { value: "SG" } });
    fireEvent.change(screen.getByLabelText("Passport Expiry Date"), { target: { value: "2099-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: /submit correction for review/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      incompleteCurrent,
      file,
      { document_number: "P7654321", issuing_country_code: "SG", expires_at: "2099-12-31" },
    ));
  });

  it("does not submit a requested passport correction without complete passport metadata", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(createElement(ApplicantCorrectionCard, {
      state: {
        eligible: false, current_values: current, correction_version: 1, source_fingerprint: "a".repeat(64),
        correction: {
          id: 13, correction_version: 1, status: "requested", before_values: current, proposed_values: current,
          requested_fields: [], requested_document_types: ["passport"], request_instruction: "Upload passport.",
        },
      },
      onSubmit,
    }));

    fireEvent.click(screen.getByRole("button", { name: /update requested kyc information/i }));
    fireEvent.change(screen.getByLabelText("Passport document"), {
      target: { files: [new File(["passport"], "passport.pdf", { type: "application/pdf" })] },
    });
    const submit = screen.getByRole("button", { name: /submit correction for review/i });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);

    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });
});

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

describe("KYB website and UBO validation", () => {
  it.each([["", false], ["abc", false], ["www.google.com", false], ["google.com", false], ["https://google.com", true], ["http://example.hk", true]] as const)("validates website %s", (value, valid) => {
    expect(isValidWebsite(value)).toBe(valid);
  });

  it("rejects UBO ownership totals above 100", () => {
    expect(validBeneficialOwnerOwnership([{ ownershipPercentage: "60" }, { ownershipPercentage: "41" }])).toBe(false);
    expect(validBeneficialOwnerOwnership([{ ownershipPercentage: "60" }, { ownershipPercentage: "40" }])).toBe(true);
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
