import type { Beneficiary, TransferPayload } from "@/services/moneyMovementService";
import type { ProviderSummary, PurposeCodeOption } from "@/services/fxOrderService";
import { normalizeStatus } from "@/lib/status";

export const NIUM_HK_USD_SWIFT_CONFIG = {
  providerCode: "nium",
  destinationCountry: "HK",
  sourceCurrency: "USD",
  destinationCurrency: "USD",
  payoutMethod: "SWIFT",
  purposes: [{ code: "IR01811", label: "Business payment (IR01811)" }],
  sourceOfFunds: ["Corporate Account"],
  swiftFeeTypes: ["SHA"],
} as const;

export type TransferPayloadValues = {
  providerId: string;
  beneficiaryId: string;
  sourceBankAccountId: string;
  transferType: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  fxRate: string;
  feeAmount: string;
  feeCurrency: string;
  purposeCode: string;
  referenceText: string;
  clientReference: string;
  providerCode: string;
  beneficiaryName: string;
};

export const isNiumProvider = (providerCode?: string | null) =>
  providerCode?.trim().toLowerCase() === NIUM_HK_USD_SWIFT_CONFIG.providerCode;

export const purposeOptionsForProvider = (providerCode?: string | null) =>
  isNiumProvider(providerCode) ? NIUM_HK_USD_SWIFT_CONFIG.purposes : [];

export const shouldFetchNiumPurposeCodes = (providerCode?: string | null) => isNiumProvider(providerCode);

export const purposeOptionsForTransferProvider = (
  providerCode: string | null | undefined,
  niumPurposeOptions: PurposeCodeOption[],
): readonly PurposeCodeOption[] =>
  isNiumProvider(providerCode) ? niumPurposeOptions : purposeOptionsForProvider(providerCode);

export const createClientReference = () => `OW-${crypto.randomUUID()}`;

export const validateTransferAmount = (value: string, maximumFractionDigits = 8) => {
  const normalized = value.trim();
  const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${maximumFractionDigits}})?$`);
  if (!pattern.test(normalized) || !Number.isFinite(Number(normalized)) || Number(normalized) <= 0) {
    return "Enter a valid positive amount with no more than 8 decimal places.";
  }

  return "";
};

export const isTransferAmountInput = (value: string, maximumFractionDigits = 8) =>
  new RegExp(`^\\d*(?:\\.\\d{0,${maximumFractionDigits}})?$`).test(value);

export const recipientAmountPresentation = (providerCode?: string | null) =>
  isNiumProvider(providerCode) ? "Determined during processing" : null;

export const buildTransferPayload = (values: TransferPayloadValues): TransferPayload => {
  const nium = isNiumProvider(values.providerCode);
  const providerMetadata = nium
    ? {
        nium: {
          sourceOfFunds: NIUM_HK_USD_SWIFT_CONFIG.sourceOfFunds[0],
          payout: { swiftFeeType: NIUM_HK_USD_SWIFT_CONFIG.swiftFeeTypes[0] },
        },
      }
    : {};

  return {
    provider_id: Number(values.providerId),
    source_bank_account_id: nium ? null : values.sourceBankAccountId ? Number(values.sourceBankAccountId) : null,
    beneficiary_id: Number(values.beneficiaryId),
    transfer_type: values.transferType,
    source_currency: values.sourceCurrency,
    target_currency: values.targetCurrency,
    source_amount: values.sourceAmount,
    target_amount: nium ? null : values.targetAmount > 0 ? values.targetAmount : null,
    fx_rate: nium ? null : values.fxRate ? Number(values.fxRate) : null,
    fee_amount: nium ? 0 : values.feeAmount ? Number(values.feeAmount) : 0,
    fee_currency: nium ? NIUM_HK_USD_SWIFT_CONFIG.sourceCurrency : values.feeCurrency,
    purpose_code: values.purposeCode,
    reference_text: values.referenceText.trim() || null,
    client_reference: values.clientReference,
    raw_data: {
      source: "origin_wallet_web",
      flow: "customer_single_payment",
      provider_code: values.providerCode,
      beneficiary_name: values.beneficiaryName,
      ...providerMetadata,
    },
  };
};

const beneficiaryPayoutMethod = (beneficiary: Beneficiary | null) => {
  return beneficiary?.payout_method ?? "";
};

export const isNiumBeneficiaryAvailable = (beneficiary: Beneficiary) =>
  normalizeStatus(beneficiary.status) === "active" &&
  beneficiary.country_code === NIUM_HK_USD_SWIFT_CONFIG.destinationCountry &&
  beneficiary.currency === NIUM_HK_USD_SWIFT_CONFIG.destinationCurrency &&
  beneficiaryPayoutMethod(beneficiary) === NIUM_HK_USD_SWIFT_CONFIG.payoutMethod;

export const validateNiumTransferConfiguration = ({ provider, beneficiary, sourceCurrency, targetCurrency, purposeCode, purposeOptions }: {
  provider: ProviderSummary;
  beneficiary: Beneficiary;
  sourceCurrency: string;
  targetCurrency: string;
  purposeCode: string;
  purposeOptions?: readonly PurposeCodeOption[];
}) => {
  if (!isNiumProvider(provider.code)) return "";
  const config = NIUM_HK_USD_SWIFT_CONFIG;
  if (sourceCurrency !== config.sourceCurrency) return "Nium transfers currently require source currency USD.";
  if (targetCurrency !== config.destinationCurrency || beneficiary.currency !== config.destinationCurrency || beneficiary.country_code !== config.destinationCountry) {
    return "This Nium beneficiary corridor is not currently available. Select an active HK beneficiary receiving USD.";
  }
  if (beneficiaryPayoutMethod(beneficiary) !== config.payoutMethod) return "The Nium beneficiary payout method must be SWIFT.";
  const supportedPurposes = purposeOptions ?? config.purposes;
  if (!purposeCode || !supportedPurposes.some((purpose) => purpose.code === purposeCode)) return "Select a supported Nium payment purpose.";
  return "";
};

// These checks improve UX only. The API remains authoritative for authenticated ownership,
// provider/beneficiary association, active/clear/reconciled provider accounts, fees, corridor,
// currency, amount and purpose/source-of-funds/SWIFT-fee allowlists, idempotency, and submission.
export const validateTransferConfiguration = ({ provider, beneficiary, sourceCurrency, targetCurrency, purposeCode, purposeOptions }: {
  provider: ProviderSummary | null;
  beneficiary: Beneficiary | null;
  sourceCurrency: string;
  targetCurrency: string;
  purposeCode: string;
  purposeOptions?: readonly PurposeCodeOption[];
}) => {
  if (!provider?.supports_transfers) return "The selected provider does not support transfers.";
  if (!beneficiary || normalizeStatus(beneficiary.status) !== "active") return "The selected beneficiary must be active.";
  if (beneficiary.provider_id !== provider.id) return "The selected beneficiary is not associated with this provider.";
  if (!isNiumProvider(provider.code)) return "This provider transfer rail is not currently available.";
  return validateNiumTransferConfiguration({ provider, beneficiary, sourceCurrency, targetCurrency, purposeCode, purposeOptions });
};

export const beneficiaryTransferOption = (beneficiary: Beneficiary, provider?: ProviderSummary) => {
  if (normalizeStatus(beneficiary.status) !== "active") {
    return { visible: false, selectable: false, reason: "The selected beneficiary must be active." };
  }

  if (!provider) {
    return { visible: true, selectable: false, reason: "Transfer rail is not available yet." };
  }

  const reason = validateTransferConfiguration({
    provider,
    beneficiary,
    sourceCurrency: NIUM_HK_USD_SWIFT_CONFIG.sourceCurrency,
    targetCurrency: beneficiary.currency,
    purposeCode: NIUM_HK_USD_SWIFT_CONFIG.purposes[0].code,
  });

  return { visible: true, selectable: reason === "", reason };
};
