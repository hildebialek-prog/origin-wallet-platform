import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildPayload, emptyForm, NiumRoutingFields, ReviewBeneficiaryStep, type BeneficiaryForm } from "./AccountBeneficiaries";
import { clearRoutingInputs, matchesNiumRequirements, normalizeBeneficiaryErrors, routingSlots, schemaErrors } from "./beneficiaryRequirements";
import { swiftRequirements } from "@/test/beneficiaryFixtures";
import type { NiumBeneficiaryRequirements } from "@/services/moneyMovementService";

const form = (overrides: Partial<BeneficiaryForm> = {}): BeneficiaryForm => ({
  ...emptyForm, providerId: "7", fullName: " Vendor ", bankName: " Bank ", accountNumber: " 123456 ",
  confirmAccountNumber: "123456", routingValue: " HSBCHKHHHKH ", addressLine1: " Road ", city: " City ", postalCode: "123456",
  ...overrides,
});
const multiple: NiumBeneficiaryRequirements = {
  ...swiftRequirements, routing_code_types: ["IFSC", "SWIFT"], fields: [
    { name: "routingCodeType1", required: true, allowed_values: ["IFSC", "SWIFT"] },
    { name: "routingCodeValue1", required: true },
    { name: "routingCodeType2", required: false }, { name: "routingCodeValue2", required: false },
  ],
};

const RoutingForm = ({ requirements }: { requirements: NiumBeneficiaryRequirements }) => {
  const [values, setValues] = useState(form({ routingValue: "" }));
  return <NiumRoutingFields form={values} requirements={requirements} errors={{}} onChange={setValues} />;
};

describe("NIUM beneficiary requirements", () => {
  it("shows only SWIFT/BIC for a SWIFT-only corridor", () => {
    render(<RoutingForm requirements={swiftRequirements} />);
    expect(screen.getByLabelText(/SWIFT \/ BIC/)).toBeRequired();
    expect(screen.queryByLabelText(/Bank code|Branch code|Routing type/)).not.toBeInTheDocument();
  });

  it("requires an explicit selection when the schema permits multiple routing types", () => {
    render(<RoutingForm requirements={multiple} />);
    const type = screen.getByLabelText(/^Routing type/);
    expect(type).toHaveValue("");
    expect(screen.getAllByRole("option", { name: "IFSC", hidden: true })).toHaveLength(2);
    fireEvent.change(type, { target: { value: "IFSC" } });
    expect(screen.getByLabelText(/IFSC code/)).toBeRequired();
    const values = form({ routingType: "" });
    expect(schemaErrors(values, buildPayload(values, false, multiple), multiple)).toHaveProperty("routingCodeType1");
  });

  it("does not submit legacy bank or branch codes retained from another corridor", () => {
    const payload = buildPayload(form({ bankCode: "unsupported-bank", branchCode: "unsupported-branch", swiftBic: "stale-swift" }), false, swiftRequirements);
    expect(payload).not.toHaveProperty("bank_code");
    expect(payload).not.toHaveProperty("branch_code");
    expect(payload.swift_bic).toBe("HSBCHKHHHKH");
    expect(payload.raw_data?.nium).toMatchObject({ routingInfo: [{ type: "SWIFT", value: "HSBCHKHHHKH" }] });
    expect(payload.raw_data?.nium).not.toHaveProperty("bankAccountType");
  });

  it("keeps relevant account, IBAN, secondary routing and schema details in the payload and Review", () => {
    const requirements: NiumBeneficiaryRequirements = { ...multiple, fields: [...multiple.fields,
      { name: "beneficiaryBankAccountType", required: true, allowed_values: ["CURRENT"] },
      { name: "beneficiaryAlias", required: false },
    ] };
    const values = form({ routingType: "IFSC", routingValue: "HDFC0001234", secondaryRoutingType: "SWIFT", secondaryRoutingValue: "HDFCINBB",
      iban: " IBAN-123 ", schemaValues: { beneficiaryAlias: " Vendor alias ", staleField: "must-not-submit" } });
    const payload = buildPayload(values, false, requirements);
    expect(payload.account_number).toBe("123456");
    expect(payload.iban).toBe("IBAN-123");
    expect(payload.raw_data?.nium).toMatchObject({ beneficiaryBankAccountType: "CURRENT", additionalFields: { beneficiaryAlias: "Vendor alias" },
      routingInfo: [{ type: "IFSC", value: "HDFC0001234" }, { type: "SWIFT", value: "HDFCINBB" }] });
    expect(payload.raw_data?.nium).not.toHaveProperty("additionalFields.staleField");
    render(<ReviewBeneficiaryStep payload={payload} requirements={requirements} saving={false} editing={false} onBack={() => {}} onSave={() => {}} />);
    for (const value of ["HDFC0001234", "HDFCINBB", "123456", "IBAN-123", "Vendor alias"]) expect(screen.getByText(value)).toBeVisible();
    expect(screen.queryByText("staleField")).not.toBeInTheDocument();
  });

  it("validates required fields, patterns, lengths and allowed values before review", () => {
    const requirements = { ...swiftRequirements, fields: [...swiftRequirements.fields, { name: "beneficiaryBankName", required: true, min_length: 3, allowed_values: ["Approved Bank"] }] };
    const values = form({ city: "", routingValue: "invalid", bankName: "A" });
    expect(schemaErrors(values, buildPayload(values, false, requirements), requirements)).toMatchObject({
      beneficiaryCity: expect.any(String), routingCodeValue1: expect.any(String), beneficiaryBankName: expect.any(String),
    });
  });

  it("intersects schema routing choices with the supported corridor", () => {
    const requirements = { ...swiftRequirements, fields: [{ name: "routingCodeType1", required: true, allowed_values: ["IFSC"] }] };
    expect(routingSlots(requirements)[0].types).toEqual([]);
    const values = form();
    expect(schemaErrors(values, buildPayload(values, false, requirements), requirements)).toHaveProperty("routingCodeType1");
  });

  it("honors explicitly optional routing on other corridors", () => {
    const requirements = { ...multiple, fields: [
      { name: "routingCodeType1", required: false, allowed_values: ["IFSC", "SWIFT"] },
      { name: "routingCodeValue1", required: false },
    ] };
    const values = form({ routingValue: "" });
    expect(routingSlots(requirements)[0].required).toBe(false);
    expect(schemaErrors(values, buildPayload(values, false, requirements), requirements)).toEqual({});
  });

  it("requires SWIFT/BIC for a confirmed SWIFT-only corridor even if optional schema flags are returned", () => {
    const requirements = { ...swiftRequirements, fields: [
      { name: "routingCodeType1", required: false }, { name: "routingCodeValue1", required: false },
    ] };
    const values = form({ routingValue: "" });
    expect(routingSlots(requirements)[0].required).toBe(true);
    expect(schemaErrors(values, buildPayload(values, false, requirements), requirements)).toHaveProperty("routingCodeValue1");
  });

  it("accepts only complete schema metadata matching the selected form dimensions", () => {
    expect(matchesNiumRequirements(swiftRequirements, form())).toBe(true);
    for (const value of [undefined, { routingCodeType: "SWIFT" }, { ...swiftRequirements, fields: null },
      { ...swiftRequirements, dimensions: { ...swiftRequirements.dimensions, destinationCurrency: "EUR" } },
      { ...swiftRequirements, fields: [{ name: "routingCodeValue1", required: "true" }] }]) {
      expect(matchesNiumRequirements(value, form())).toBe(false);
    }
  });

  it("clears all routing values without discarding beneficiary identity or account details", () => {
    const before = form({ routingType: "SWIFT", routingValue: "HDFCINBB", secondaryRoutingType: "IFSC", secondaryRoutingValue: "HDFC0001234",
      bankCode: "legacy-bank", branchCode: "legacy-branch", swiftBic: "legacy-swift", iban: "IBAN-123",
      schemaValues: { beneficiaryBankCode: "bank", beneficiaryBranchCode: "branch", beneficiaryAlias: "Vendor" } });
    const cleared = clearRoutingInputs(before);
    expect(cleared).toMatchObject({ routingType: "", routingValue: "", secondaryRoutingType: "", secondaryRoutingValue: "",
      bankCode: "", branchCode: "", swiftBic: "", fullName: before.fullName, accountNumber: before.accountNumber,
      confirmAccountNumber: before.confirmAccountNumber, iban: "IBAN-123", schemaValues: { beneficiaryAlias: "Vendor" } });
    expect(cleared.schemaValues).not.toHaveProperty("beneficiaryBankCode");
    expect(cleared.schemaValues).not.toHaveProperty("beneficiaryBranchCode");
  });

  it("maps backend validation paths to the routing inputs, including a secondary SWIFT code", () => {
    const values = form({ routingType: "IFSC", secondaryRoutingType: "SWIFT" });
    expect(normalizeBeneficiaryErrors({ swift_bic: ["Invalid SWIFT code"],
      "raw_data.nium.routingInfo.0.type": ["Unsupported type"],
      "raw_data.nium.additionalFields.beneficiaryAlias": ["Invalid alias"], bank_name: ["Bank is required"],
    }, values, multiple)).toEqual({ routingCodeValue2: "Invalid SWIFT code", routingCodeType1: "Unsupported type",
      beneficiaryAlias: "Invalid alias", beneficiaryBankName: "Bank is required" });
  });

  it("hides optional routing slots that have no supported schema choices", () => {
    const requirements = { ...swiftRequirements, fields: [...swiftRequirements.fields,
      { name: "routingCodeType2", required: false, allowed_values: ["IFSC"] },
      { name: "routingCodeValue2", required: false },
    ] };
    expect(routingSlots(requirements)).toHaveLength(1);
    expect(schemaErrors(form(), buildPayload(form(), false, requirements), requirements)).toEqual({});
  });

  it("rejects unsupported routing selections instead of silently changing them", () => {
    const values = form({ routingType: "IFSC", routingValue: "HDFC0001234" });
    expect(schemaErrors(values, buildPayload(values, false, swiftRequirements), swiftRequirements)).toHaveProperty("routingCodeType1");
  });

  it("validates account-type enums using the exact NIUM payload casing", () => {
    const requirements = { ...swiftRequirements, fields: [...swiftRequirements.fields,
      { name: "beneficiaryAccountType", required: true, allowed_values: ["Corporate"] },
    ] };
    expect(schemaErrors(form(), buildPayload(form(), false, requirements), requirements)).toEqual({});
  });

  it("fails closed when a provider validation pattern cannot be interpreted", () => {
    const requirements = { ...swiftRequirements, fields: [{ name: "routingCodeValue1", required: true, pattern: "[" }] };
    expect(schemaErrors(form(), buildPayload(form(), false, requirements), requirements).routingCodeValue1).toContain("unavailable");
  });
});
