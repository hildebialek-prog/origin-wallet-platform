import type { VirtualAccount } from "@/services/providerAccountService";

// Synthetic display fixtures only. They do not describe NIUM provisioning support.
export const multiCurrencyVirtualAccounts: VirtualAccount[] = [
  ["USD", "SWIFT", "TESTUSXX", "ACH", "111000111"],
  ["EUR", "IBAN", "TEST-EUR-IBAN-002", "BIC", "TESTEUXX"],
  ["CNY", "SWIFT", "TESTCNXX", "CNAPS", "222000222"],
  ["HKD", "SWIFT", "TESTHKXX", "BANK", "333"],
  ["SGD", "SWIFT", "TESTSGXX", "BANK", "444"],
  ["GBP", "IBAN", "TEST-GBP-IBAN-006", "SORT", "55-55-55"],
].map(([currency, type, value, type2, value2], index) => ({
  id: 101 + index,
  user_provider_account_id: 7,
  provider_payment_id: `SYNTHETIC-${currency}-ACCOUNT-${index}`,
  virtual_account_reference: `SYNTHETIC-${currency}-REFERENCE-${index}`,
  currency,
  account_category: "COLLECTION_ACCOUNT",
  account_type: "GLOBAL",
  status: "assigned",
  detail: {
    account_name: `Synthetic ${currency} Holder`,
    bank_name: `Synthetic ${currency} Bank`,
    bank_address: `Synthetic ${currency} Bank Address`,
    routing_code_type: type,
    routing_code_value: value,
    routing_code_type_2: type2,
    routing_code_value_2: value2,
  },
}));
