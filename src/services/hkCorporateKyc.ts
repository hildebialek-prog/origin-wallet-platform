import type { HkCorporateFullFields } from "@/services/kycService";

export const hkIndustryCodes: Record<string, string> = {
  wholesale_distribution: "IS140",
  manufacturing: "IS138",
  ecommerce: "IS164",
  logistics: "IS144",
  technology: "IS152",
  professional_services: "IS156",
  import_export: "IS140",
  other: "IS164",
};

export const hkMonthlyVolumeCodes: Record<string, string> = {
  under_10000_usd: "MVHK01",
  "10000_50000_usd": "MVHK03",
  "50000_100000_usd": "MVHK05",
  "100000_500000_usd": "MVHK07",
  "500000_1000000_usd": "MVHK09",
  over_1000000_usd: "MVHK10",
};

export const hkAverageTransactionValueOptions = [
  { label: "Under 1,000 USD", value: "ATVHK01" },
  { label: "1,000 - 5,000 USD", value: "ATVHK03" },
  { label: "5,000 - 25,000 USD", value: "ATVHK05" },
  { label: "25,000 USD or more", value: "ATVHK06" },
];

export const hkMonthlyTransactionOptions = [
  { label: "1 - 10", value: "ATC01" },
  { label: "11 - 50", value: "ATC02" },
  { label: "51 or more", value: "ATC03" },
];

export const hkAnnualTurnoverOptions = [
  { label: "Less than 1 million USD", value: "HK008" },
  { label: "1 - 5 million USD", value: "HK011" },
] as const;

export const hkEmployeeCountOptions = [
  { label: "1 - 10 employees", value: "EM006" },
  { label: "11 - 50 employees", value: "EM008" },
] as const;

export const hkIntendedUseOptions = [
  { label: "Receive business payments", value: "IU001" },
  { label: "International business payments", value: "IU002" },
  { label: "Pay suppliers and business expenses", value: "IU003" },
] as const;

export type HkCorporateSerializerInput = {
  tradeName: string;
  sameBusinessAddress: boolean;
  businessAddress: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  };
  consentAt: string;
  isMultiLayeredCompany: boolean;
  bank: {
    accountName: string;
    accountNumber: string;
    bankCountry: string;
    bankName: string;
    currency: string;
    routingType: string;
    routingValue: string;
  };
  deviceDescriptor: string;
  industry: string;
  operatingCountries: string[];
  monthlyVolume: string;
  averageTransactionValue: string;
  monthlyTransactions: string;
  transactionCountries: string[];
  annualTurnover: string;
  totalEmployees: string;
  intendedUses: string[];
};

export const niumDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 19).replace("T", " ");
};

export const buildHkCorporateFullFields = (input: HkCorporateSerializerInput): HkCorporateFullFields => ({
  tradeName: input.tradeName.trim(),
  addresses: {
    isBusinessAddressSameAsRegisteredAddress: input.sameBusinessAddress,
    ...(!input.sameBusinessAddress
      ? {
          businessAddress: {
            address_line1: input.businessAddress.addressLine1.trim(),
            city: input.businessAddress.city.trim(),
            state: input.businessAddress.state.trim() || null,
            postal_code: input.businessAddress.postalCode.trim(),
            country_code: input.businessAddress.countryCode.trim().toUpperCase(),
          },
        }
      : {}),
  },
  applicantDeclaration: true,
  applicantDeclarationTimeStamp: niumDateTime(input.consentAt),
  isMultiLayeredCompany: input.isMultiLayeredCompany,
  bankAccountDetails: {
    accountName: input.bank.accountName.trim(),
    accountNumber: input.bank.accountNumber.trim(),
    bankCountry: input.bank.bankCountry.trim().toUpperCase(),
    bankName: input.bank.bankName.trim(),
    currency: input.bank.currency.trim().toUpperCase(),
    routingCodes: [{ type: input.bank.routingType.trim().toUpperCase(), value: input.bank.routingValue.trim() }],
  },
  deviceDescriptor: input.deviceDescriptor.trim().slice(0, 255),
  natureOfBusiness: {
    industryCodes: [hkIndustryCodes[input.industry]],
    operatingCountries: input.operatingCountries,
  },
  expectedAccountUsage: {
    credit: {
      averageTransactionValue: input.averageTransactionValue,
      monthlyTransactionVolume: hkMonthlyVolumeCodes[input.monthlyVolume],
      monthlyTransactions: input.monthlyTransactions,
      topTransactionCountries: input.transactionCountries,
    },
    debit: {
      averageTransactionValue: input.averageTransactionValue,
      monthlyTransactionVolume: hkMonthlyVolumeCodes[input.monthlyVolume],
      monthlyTransactions: input.monthlyTransactions,
      topTransactionCountries: input.transactionCountries,
    },
    intendedUses: input.intendedUses,
  },
  sizeOfBusiness: {
    annualTurnover: input.annualTurnover,
    totalEmployees: input.totalEmployees,
  },
});
