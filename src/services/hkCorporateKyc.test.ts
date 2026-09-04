import { describe, expect, it } from "vitest";
import {
  buildHkCorporateFullFields,
  hkAnnualTurnoverOptions,
  hkEmployeeCountOptions,
  hkIntendedUseOptions,
} from "./hkCorporateKyc";

describe("HK Corporate enum labels", () => {
  it("keeps Nium codes as values while displaying customer-friendly labels", () => {
    expect(hkAnnualTurnoverOptions).toEqual([
      { label: "Less than 1 million USD", value: "HK008" },
      { label: "1 - 5 million USD", value: "HK011" },
    ]);
    expect(hkEmployeeCountOptions.map(({ value }) => value)).toEqual(["EM006", "EM008"]);
    expect(hkIntendedUseOptions).toContainEqual({
      label: "International business payments",
      value: "IU002",
    });
  });
});

describe("HK Corporate Full serializer", () => {
  it("serializes factual answers into the required provider source contract", () => {
    const fields = buildHkCorporateFullFields({
      tradeName: " Test Trading ", sameBusinessAddress: true,
      businessAddress: { addressLine1: "", city: "", state: "", postalCode: "", countryCode: "" },
      consentAt: "2026-09-04T08:30:00.000Z", isMultiLayeredCompany: false,
      bank: { accountName: "Test Trading", accountNumber: "0001", bankCountry: "hk", bankName: "Test Bank", currency: "hkd", routingType: "swift", routingValue: "TESTHKHH" },
      deviceDescriptor: "Origin Wallet web", industry: "manufacturing", operatingCountries: ["HK"],
      monthlyVolume: "10000_50000_usd", averageTransactionValue: "ATVHK03", monthlyTransactions: "ATC02",
      transactionCountries: ["HK"], annualTurnover: "HK008", totalEmployees: "EM006", intendedUses: ["IU001", "IU003"],
    });

    expect(fields.applicantDeclarationTimeStamp).toBe("2026-09-04 08:30:00");
    expect(fields.natureOfBusiness.industryCodes).toEqual(["IS138"]);
    expect(fields.expectedAccountUsage.credit.monthlyTransactionVolume).toBe("MVHK03");
    expect(fields.expectedAccountUsage.intendedUses).toEqual(["IU001", "IU003"]);
    expect(fields.sizeOfBusiness).toEqual({ annualTurnover: "HK008", totalEmployees: "EM006" });
    expect(fields.bankAccountDetails.routingCodes).toEqual([{ type: "SWIFT", value: "TESTHKHH" }]);
    expect(fields.addresses).toEqual({ isBusinessAddressSameAsRegisteredAddress: true });
  });
});
