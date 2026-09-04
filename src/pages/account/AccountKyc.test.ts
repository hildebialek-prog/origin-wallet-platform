import { describe, expect, it } from "vitest";
import { assertFilingDocumentEvidence, buildFilingDocumentPayload } from "./AccountKyc";

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
