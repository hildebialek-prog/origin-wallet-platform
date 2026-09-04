import { describe, expect, it } from "vitest";
import { buildHkCorporateFullFields } from "./hkCorporateKyc";

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
