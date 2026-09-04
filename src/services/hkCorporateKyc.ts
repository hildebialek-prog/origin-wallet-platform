import type { HkCorporateFullFields } from "@/services/kycService";

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
    industryCodes: [input.industry],
    operatingCountries: input.operatingCountries,
  },
  expectedAccountUsage: {
    credit: {
      averageTransactionValue: input.averageTransactionValue,
      monthlyTransactionVolume: input.monthlyVolume,
      monthlyTransactions: input.monthlyTransactions,
      topTransactionCountries: input.transactionCountries,
    },
    debit: {
      averageTransactionValue: input.averageTransactionValue,
      monthlyTransactionVolume: input.monthlyVolume,
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
