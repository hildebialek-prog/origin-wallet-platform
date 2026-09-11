import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCcw,
  Search,
  SendHorizonal,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProviderLogo } from "@/components/account/ProviderLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { getNiumPurposeCodes, getProviders, type ProviderSummary, type PurposeCodeOption } from "@/services/fxOrderService";
import { getProviderDisplayName, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";
import {
  cancelTransfer,
  createTransfer,
  getBalances,
  getBeneficiaries,
  getTransfers,
  submitTransfer,
  syncTransferStatus,
  type Balance,
  type Beneficiary,
  type Transfer,
} from "@/services/moneyMovementService";
import {
  currencyOptions,
  formatAmount,
  formatDateTime,
  statusBadgeClassName,
  toNumber,
} from "@/lib/money";
import { isVerifiedKycStatus, normalizeStatus } from "@/lib/status";
import {
  buildTransferPayload,
  beneficiaryTransferOption,
  createClientReference,
  isNiumProvider,
  isTransferAmountInput,
  purposeOptionsForProvider,
  purposeOptionsForTransferProvider,
  recipientAmountPresentation,
  shouldFetchNiumPurposeCodes,
  validateTransferConfiguration,
  validateTransferAmount,
} from "./transferForm";

type WizardStep = "payee" | "details" | "review" | "result";

type TransferForm = {
  providerId: string;
  beneficiaryId: string;
  transferType: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  purposeCode: string;
  referenceText: string;
};

const defaultForm: TransferForm = {
  providerId: "",
  beneficiaryId: "",
  transferType: "payout",
  sourceCurrency: "USD",
  targetCurrency: "",
  sourceAmount: "",
  purposeCode: "",
  referenceText: "",
};

const wizardSteps: { key: WizardStep; label: string }[] = [
  { key: "payee", label: "Choose payee" },
  { key: "details", label: "Payment details" },
  { key: "review", label: "Review" },
  { key: "result", label: "Submit" },
];

const canSubmitProvider = (status?: string | null) => ["draft", "approved"].includes(normalizeStatus(status));
const canCancel = (status?: string | null) => ["draft", "approval_required", "approved"].includes(normalizeStatus(status));
const canSync = (status?: string | null) =>
  ["pending", "processing", "submitted", "sent", "provider_pending"].includes(normalizeStatus(status));

const AccountTransfers = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransferForm>(defaultForm);
  const [step, setStep] = useState<WizardStep>("payee");
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [createdTransfer, setCreatedTransfer] = useState<Transfer | null>(null);

  const providersQuery = useQuery({
    queryKey: ["money-providers"],
    enabled: !!token,
    queryFn: async () => {
      const payload = await getProviders();
      return payload.data.filter((provider) => provider.status === "active");
    },
  });

  const beneficiariesQuery = useQuery({
    queryKey: ["money-beneficiaries", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBeneficiaries({ userId: user?.id as string, token: token as string }),
  });

  const balancesQuery = useQuery({
    queryKey: ["money-balances", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBalances({ userId: user?.id as string, token: token as string }),
  });

  const transfersQuery = useQuery({
    queryKey: ["money-transfers", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getTransfers({ userId: user?.id as string, token: token as string }),
  });

  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const transferProviders = providers.filter((provider) => provider.supports_transfers);
  const beneficiaries = useMemo(() => beneficiariesQuery.data ?? [], [beneficiariesQuery.data]);
  const balances = balancesQuery.data ?? [];
  const transfers = transfersQuery.data ?? [];

  const providerById = useMemo(() => {
    const map = new Map<number, ProviderSummary>();
    providers.forEach((provider) => map.set(provider.id, provider));
    return map;
  }, [providers]);

  const beneficiaryById = useMemo(() => {
    const map = new Map<number, Beneficiary>();
    beneficiaries.forEach((beneficiary) => map.set(beneficiary.id, beneficiary));
    return map;
  }, [beneficiaries]);

  const selectedProvider = transferProviders.find((provider) => String(provider.id) === form.providerId) ?? null;
  const selectedBeneficiary = beneficiaryById.get(Number(form.beneficiaryId)) ?? null;
  const providerBalances = balances.filter((balance) => String(balance.provider_id) === form.providerId);
  const balanceCurrencies = Array.from(new Set(providerBalances.map((balance) => balance.currency))).sort();
  const sourceCurrencies = isNiumProvider(selectedProvider?.code) ? ["USD"] : balanceCurrencies.length ? balanceCurrencies : currencyOptions;
  const selectedBalance = providerBalances.find((balance) => balance.currency === form.sourceCurrency);
  const effectiveSourceAmount = toNumber(form.sourceAmount);
  const niumPurposeCodesEnabled = !!user?.id && !!token && shouldFetchNiumPurposeCodes(selectedProvider?.code);
  const purposeCodesQuery = useQuery({
    queryKey: ["nium-purpose-codes", user?.id, token],
    enabled: niumPurposeCodesEnabled,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => (await getNiumPurposeCodes({ userId: user?.id as string, token: token as string })).data,
  });
  const niumPurposeOptions = useMemo<PurposeCodeOption[]>(() => purposeCodesQuery.data ?? [], [purposeCodesQuery.data]);
  const purposeOptions = useMemo(
    () => purposeOptionsForTransferProvider(selectedProvider?.code, niumPurposeOptions),
    [niumPurposeOptions, selectedProvider?.code],
  );
  const selectedPurpose = purposeOptions.find((purpose) => purpose.code === form.purposeCode);
  const verifiedForTransfers = isVerifiedKycStatus(user?.kycStatus);

  useEffect(() => {
    const purposeCodeIsCompatible = purposeOptions.some((purpose) => purpose.code === form.purposeCode);
    if (isNiumProvider(selectedProvider?.code)) {
      if (form.purposeCode && !purposeCodeIsCompatible) setForm((current) => ({ ...current, purposeCode: "" }));
    } else if (!purposeCodeIsCompatible && (purposeOptions.length > 0 || form.purposeCode)) {
      setForm((current) => ({ ...current, purposeCode: purposeOptions[0]?.code ?? "" }));
    }
  }, [form.purposeCode, purposeOptions, selectedProvider?.code]);

  const filteredBeneficiaries = beneficiaries.filter((beneficiary) => {
    const provider = providerById.get(beneficiary.provider_id);
    if (!beneficiaryTransferOption(beneficiary, provider).visible) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      beneficiary.full_name,
      beneficiary.company_name,
      beneficiary.email,
      beneficiary.currency,
      beneficiary.country_code,
      beneficiary.account_number,
      beneficiary.iban,
      beneficiary.swift_bic,
      getProviderDisplayName(provider),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const refreshTransfers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["money-transfers", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["money-transactions", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["money-balances", user?.id] }),
    ]);
  };

  const resetPayment = () => {
    setForm(defaultForm);
    setSearch("");
    setFormError("");
    setCreatedTransfer(null);
    setStep("payee");
  };

  const pickBeneficiary = (beneficiary: Beneficiary) => {
    const providerId = String(beneficiary.provider_id);
    const provider = providerById.get(beneficiary.provider_id);
    const nextBalance = balances.find(
      (balance) => String(balance.provider_id) === providerId && (!isNiumProvider(provider?.code) || balance.currency === "USD"),
    );
    setForm({
      ...form,
      providerId,
      beneficiaryId: String(beneficiary.id),
      sourceCurrency: nextBalance?.currency ?? form.sourceCurrency,
      targetCurrency: beneficiary.currency,
      purposeCode: isNiumProvider(provider?.code) ? "" : purposeOptionsForProvider(provider?.code)[0]?.code ?? "",
    });
    setFormError("");
    setStep("details");
  };

  const updateSourceCurrency = (currency: string) => setForm({ ...form, sourceCurrency: currency });

  const validateDetails = () => {
    if (!verifiedForTransfers) return "KYC/KYB must be approved before creating transfers.";
    if (!selectedProvider) return "Transfer rail is not available yet.";
    if (!selectedBeneficiary) return "Select a beneficiary before continuing.";
    const amountValidation = validateTransferAmount(form.sourceAmount);
    if (amountValidation) return amountValidation;
    const corridorValidation = validateTransferConfiguration({
      provider: selectedProvider,
      beneficiary: selectedBeneficiary,
      sourceCurrency: form.sourceCurrency,
      targetCurrency: form.targetCurrency,
      purposeCode: form.purposeCode,
    });
    if (corridorValidation) return corridorValidation;
    if (effectiveSourceAmount <= 0) return "Enter a sending amount.";
    if (!selectedBalance) return "No synced wallet balance is available for the selected source currency.";
    if (toNumber(selectedBalance.available_balance) < effectiveSourceAmount) return "Available balance is not enough for this payment.";
    if (!form.purposeCode) return "Select a payment purpose.";
    return "";
  };

  const continueToReview = () => {
    const validation = validateDetails();
    if (validation) {
      setFormError(validation);
      return;
    }

    setFormError("");
    setStep("review");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const validation = validateDetails();
      if (validation) throw new Error(validation);

      return createTransfer({
        userId: user?.id as string,
        token: token as string,
        payload: buildTransferPayload({
          providerId: form.providerId,
          sourceBankAccountId: "",
          beneficiaryId: form.beneficiaryId,
          transferType: form.transferType,
          sourceCurrency: form.sourceCurrency,
          targetCurrency: form.targetCurrency,
          sourceAmount: effectiveSourceAmount,
          targetAmount: 0,
          fxRate: "",
          feeAmount: "0",
          feeCurrency: "USD",
          purposeCode: form.purposeCode,
          referenceText: form.referenceText,
          clientReference: createClientReference(),
          providerCode: selectedProvider?.code ?? "",
          beneficiaryName: selectedBeneficiary?.full_name ?? "",
        }),
      });
    },
    onSuccess: async (transfer) => {
      setCreatedTransfer(transfer);
      setFormError("");
      setStep("result");
      await refreshTransfers();
      toast({
        title: "Payment request created",
        description:
          transfer.status === "approval_required"
            ? "Admin approval is required before submission."
            : `${transfer.transfer_no} is ready for submission.`,
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to create transfer.";
      setFormError(message);
      toast({ variant: "destructive", title: "Transfer failed", description: message });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (transferId: number) => submitTransfer({ userId: user?.id as string, token: token as string, transferId }),
    onSuccess: async (payload) => {
      setCreatedTransfer(payload.transfer);
      await refreshTransfers();
      toast({ title: "Transfer submitted", description: payload.message || "Submission completed." });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Submit failed",
        description: error instanceof Error ? error.message : "Unable to submit transfer.",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (transferId: number) => syncTransferStatus({ userId: user?.id as string, token: token as string, transferId }),
    onSuccess: refreshTransfers,
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unable to sync transfer status.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (transferId: number) => cancelTransfer({ userId: user?.id as string, token: token as string, transferId }),
    onSuccess: refreshTransfers,
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Cancel failed",
        description: error instanceof Error ? error.message : "Unable to cancel transfer.",
      });
    },
  });

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[2.2rem] font-bold tracking-[-0.04em] text-[#0f2442] sm:text-[3rem] dark:text-white">
              Move funds
            </h1>
            <p className="mt-2 max-w-3xl text-[1.02rem] leading-7 text-[#62708a] dark:text-gray-400">
              Send a single payment with balance, beneficiary, approval, and submission checks.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void refreshTransfers()}
            disabled={transfersQuery.isFetching}
            className="h-11 rounded-full border-[#d7d7d2] bg-white px-6 text-[1rem] font-semibold text-[#0f2442] hover:bg-[#f0f4fa] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
          >
            {transfersQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {!verifiedForTransfers && (
          <Notice
            title="KYC/KYB approval is required before transfers."
            description={
              <>
                Current status is {user?.kycStatus || "pending"}.{" "}
                <Link to="/account/kyc" className="font-semibold underline underline-offset-4">
                  Review KYC/KYB
                </Link>
              </>
            }
          />
        )}

        {transferProviders.length === 0 && (
          <Notice
            title="Transfer rail is not ready yet."
            description={
              <>
                Complete account setup before moving funds.{" "}
                <Link to="/account/integrations" className="font-semibold underline underline-offset-4">
                  Manage integrations
                </Link>
              </>
            }
          />
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
            <CardContent className="p-0">
              <div className="border-b border-[#e4e9f2] px-5 py-5 sm:px-7 dark:border-white/10">
                <PaymentStepper currentStep={step} />
              </div>

              <div className="min-h-[560px] px-5 py-7 sm:px-7 lg:px-10">
                {formError ? (
                  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                    <AlertCircle className="mr-2 inline h-4 w-4" />
                    {formError}
                  </div>
                ) : null}

                {step === "payee" && (
                  <PayeeStep
                    search={search}
                    onSearchChange={setSearch}
                    beneficiaries={filteredBeneficiaries}
                    providerById={providerById}
                    loading={beneficiariesQuery.isLoading || providersQuery.isLoading}
                    onSelect={pickBeneficiary}
                  />
                )}

                {step === "details" && (
                  <DetailsStep
                    form={form}
                    selectedProvider={selectedProvider}
                    selectedBeneficiary={selectedBeneficiary}
                    selectedBalance={selectedBalance}
                    sourceCurrencies={sourceCurrencies}
                    effectiveSourceAmount={effectiveSourceAmount}
                    onBack={() => setStep("payee")}
                    onContinue={continueToReview}
                    onChange={setForm}
                    onSourceCurrencyChange={updateSourceCurrency}
                    purposeOptions={purposeOptions}
                    purposeCodesLoading={niumPurposeCodesEnabled && purposeCodesQuery.isLoading}
                    purposeCodesFailed={niumPurposeCodesEnabled && purposeCodesQuery.isError}
                  />
                )}

                {step === "review" && (
                  <ReviewStep
                    form={form}
                    provider={selectedProvider}
                    beneficiary={selectedBeneficiary}
                    balance={selectedBalance}
                    effectiveSourceAmount={effectiveSourceAmount}
                    purposeLabel={selectedPurpose?.label ?? form.purposeCode}
                    creating={createMutation.isPending}
                    onBack={() => setStep("details")}
                    onSubmit={() => createMutation.mutate()}
                  />
                )}

                {step === "result" && (
                  <ResultStep
                    transfer={createdTransfer}
                    provider={createdTransfer ? providerById.get(createdTransfer.provider_id) : selectedProvider}
                    beneficiary={
                      createdTransfer?.beneficiary ??
                      (createdTransfer ? beneficiaryById.get(Number(createdTransfer.beneficiary_id)) : selectedBeneficiary)
                    }
                    submitting={submitMutation.isPending}
                    onSubmitToProvider={() => createdTransfer && submitMutation.mutate(createdTransfer.id)}
                    onNewPayment={resetPayment}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <PaymentSummary
              provider={selectedProvider}
              beneficiary={selectedBeneficiary}
              balance={selectedBalance}
              sourceAmount={effectiveSourceAmount}
              form={form}
            />

            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#0f2442] dark:text-white">
                  <Clock3 className="h-5 w-5 text-[#16a34a]" />
                  Transfer activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transfers.length > 0 ? (
                  <div className="divide-y divide-[#e8edf5] dark:divide-white/5">
                    {transfers.slice(0, 5).map((transfer) => (
                      <TransferRow
                        key={transfer.id}
                        transfer={transfer}
                        provider={providerById.get(transfer.provider_id)}
                        beneficiary={beneficiaryById.get(Number(transfer.beneficiary_id))}
                        submitting={submitMutation.isPending}
                        syncing={syncMutation.isPending}
                        canceling={cancelMutation.isPending}
                        onSubmit={() => submitMutation.mutate(transfer.id)}
                        onSync={() => syncMutation.mutate(transfer.id)}
                        onCancel={() => cancelMutation.mutate(transfer.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center">
                    <p className="text-[1rem] font-semibold text-[#0f2442] dark:text-white">
                      {transfersQuery.isLoading ? "Loading transfers..." : "No transfers yet"}
                    </p>
                    <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
                      Created transfer requests will appear here with approval and submission status.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PayeeStep = ({
  search,
  onSearchChange,
  beneficiaries,
  providerById,
  loading,
  onSelect,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  beneficiaries: Beneficiary[];
  providerById: Map<number, ProviderSummary>;
  loading: boolean;
  onSelect: (beneficiary: Beneficiary) => void;
}) => (
  <div className="mx-auto max-w-3xl space-y-7">
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] sm:text-3xl dark:text-white">
        Who are you sending money to?
      </h2>
      <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
        Search approved recipients by name, email, country, account, or currency.
      </p>
    </div>

    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a879c]" />
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search payee's name, email, currency"
        className="h-14 rounded-2xl border-[#d7d7d2] bg-white pl-12 text-base shadow-sm dark:border-white/10 dark:bg-[#10141b]"
      />
    </div>

    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#7a879c]">
        <span>All recipients</span>
        <Link to="/account/beneficiaries" className="normal-case tracking-normal text-[#16a34a]">
          Manage beneficiaries
        </Link>
      </div>

      {beneficiaries.length > 0 ? (
        <div className="divide-y divide-[#e8edf5] rounded-2xl border border-[#d7d7d2] bg-white dark:divide-white/5 dark:border-white/10 dark:bg-[#10141b]">
          {beneficiaries.map((beneficiary) => {
            const provider = providerById.get(beneficiary.provider_id);
            const eligibility = beneficiaryTransferOption(beneficiary, provider);
            return (
              <button
                key={beneficiary.id}
                type="button"
                onClick={() => onSelect(beneficiary)}
                disabled={!eligibility.selectable}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-[#f3fdf9] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent dark:hover:bg-white/5 dark:disabled:hover:bg-transparent"
              >
                <ProviderLogo
                  provider={provider}
                  className="h-11 w-11 shrink-0 rounded-xl"
                  imageClassName="p-1"
                  fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-[#0f2442] dark:text-white">{beneficiary.full_name}</p>
                    <Badge className={statusBadgeClassName(beneficiary.status)}>{beneficiary.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-[#62708a] dark:text-gray-400">
                    {beneficiarySubtitle(beneficiary, provider)}
                  </p>
                  {!eligibility.selectable ? (
                    <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">{eligibility.reason}</p>
                  ) : null}
                </div>
                <Badge className="border-[#d7d7d2] bg-[#f3fdf9] text-[#0f2442] dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <span translate="no">{beneficiary.currency}</span>
                </Badge>
                <ArrowRight className="h-5 w-5 text-[#62708a]" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c9d3e2] bg-[#f9fbfe] px-6 py-12 text-center dark:border-white/10 dark:bg-white/5">
          <UserPlus className="mx-auto h-9 w-9 text-[#16a34a]" />
          <p className="mt-4 font-semibold text-[#0f2442] dark:text-white">
            {loading ? "Loading beneficiaries..." : "No usable beneficiary found"}
          </p>
          <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
            Only active Nium HK beneficiaries receiving USD by SWIFT are currently available for transfers.
          </p>
          <Button asChild className="mt-5 h-11 rounded-full bg-[#16a34a] px-6 text-white hover:bg-[#15803d]">
            <Link to="/account/beneficiaries">Add beneficiary</Link>
          </Button>
        </div>
      )}
    </div>
  </div>
);

export const DetailsStep = ({
  form,
  selectedProvider,
  selectedBeneficiary,
  selectedBalance,
  sourceCurrencies,
  effectiveSourceAmount,
  onBack,
  onContinue,
  onChange,
  onSourceCurrencyChange,
  purposeOptions,
  purposeCodesLoading,
  purposeCodesFailed,
}: {
  form: TransferForm;
  selectedProvider: ProviderSummary | null;
  selectedBeneficiary: Beneficiary | null;
  selectedBalance?: Balance;
  sourceCurrencies: string[];
  effectiveSourceAmount: number;
  onBack: () => void;
  onContinue: () => void;
  onChange: (form: TransferForm) => void;
  onSourceCurrencyChange: (currency: string) => void;
  purposeOptions: readonly PurposeCodeOption[];
  purposeCodesLoading: boolean;
  purposeCodesFailed: boolean;
}) => {
  const providerPurposeOptions = purposeOptions;

  return (
  <div className="mx-auto max-w-3xl space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] sm:text-3xl dark:text-white">
        Complete payment details
      </h2>
      <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
        Enter the USD transfer amount. The final credited amount is determined during processing.
      </p>
    </div>

    <SelectedPayee provider={selectedProvider} beneficiary={selectedBeneficiary} onChangePayee={onBack} />

    <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#10141b]">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
        <WalletCards className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Available balance:{" "}
          <strong>{selectedBalance ? formatAmount(selectedBalance.available_balance, selectedBalance.currency) : "No synced balance"}</strong>
        </span>
      </div>

      <div className="mt-5 space-y-5">
        <div className="max-w-md">
          <AmountField
            label="Transfer amount"
            value={form.sourceAmount}
            currency={form.sourceCurrency}
            currencies={sourceCurrencies}
            onAmountChange={(value) => onChange({ ...form, sourceAmount: value })}
            onCurrencyChange={onSourceCurrencyChange}
          />
        </div>

        <div className="rounded-2xl border border-[#e1e7f0] bg-[#f3fdf9] px-4 py-3 text-sm text-[#62708a] dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
          Estimated recipient amount: <strong className="text-[#0f2442] dark:text-white">Determined during processing</strong>
          <span className="ml-2">Provider and intermediary bank fees may apply (SHA).</span>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#10141b]">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Payment purpose"
          value={form.purposeCode}
          selectedLabel={providerPurposeOptions.find((purpose) => purpose.code === form.purposeCode)?.label}
          onChange={(value) => onChange({ ...form, purposeCode: value })}
        >
          {providerPurposeOptions.map((purpose) => (
            <SelectItem key={purpose.code} value={purpose.code}>
              {purpose.label}
            </SelectItem>
          ))}
        </FormSelect>
        {purposeCodesLoading ? <p className="text-xs text-[#62708a]">Loading payment purposes...</p> : null}
        {purposeCodesFailed ? <p className="text-xs text-red-600">Payment purposes are temporarily unavailable.</p> : null}

        <FormInput
          label="Payment reference"
          value={form.referenceText}
          onChange={(value) => onChange({ ...form, referenceText: value })}
          placeholder="INV-2026-001, PO-12345"
        />
      </div>

      <p className="mt-4 text-xs text-[#7a879c]">
        Document upload, payment scheduling, and recipient notifications are unavailable for this transfer rail.
      </p>
    </div>

    <WizardActions
      backLabel="Back"
      nextLabel="Review payment"
      onBack={onBack}
      onNext={onContinue}
    />
  </div>
  );
};

const ReviewStep = ({
  form,
  provider,
  beneficiary,
  balance,
  effectiveSourceAmount,
  purposeLabel,
  creating,
  onBack,
  onSubmit,
}: {
  form: TransferForm;
  provider: ProviderSummary | null;
  beneficiary: Beneficiary | null;
  balance?: Balance;
  effectiveSourceAmount: number;
  purposeLabel: string;
  creating: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) => (
  <div className="mx-auto max-w-3xl space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] sm:text-3xl dark:text-white">
        Review before submitting
      </h2>
      <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
        Confirm payee, funding source, amount, fee, reference, and account readiness before creating the live request.
      </p>
    </div>

    <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#10141b]">
      <SectionTitle icon={<Building2 className="h-5 w-5" />} title="Recipient" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ReviewItem label="Beneficiary" value={beneficiary?.full_name ?? "-"} />
        <ReviewItem label="Infrastructure" value={provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME} />
        <ReviewItem label="Bank" value={beneficiary?.bank_name || beneficiary?.swift_bic || "-"} />
        <ReviewItem label="Account / IBAN" value={maskAccount(beneficiary?.account_number || beneficiary?.iban)} />
      </div>
    </div>

    <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#10141b]">
      <SectionTitle icon={<WalletCards className="h-5 w-5" />} title="Payment" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ReviewItem label="Transfer amount" value={formatAmount(effectiveSourceAmount, form.sourceCurrency)} />
        <ReviewItem label="Estimated recipient amount" value={recipientAmountPresentation(provider?.code) ?? "-"} />
        <ReviewItem label="Provider fee" value="Calculated during processing" />
        <ReviewItem label="Fee handling" value="Provider and intermediary bank fees may apply (SHA)" />
        <ReviewItem label="Funding source" value="Nium wallet balance" />
        <ReviewItem label="Available balance" value={balance ? formatAmount(balance.available_balance, balance.currency) : "No synced balance"} />
        <ReviewItem label="Purpose" value={purposeLabel} />
        <ReviewItem label="Reference" value={form.referenceText || "-"} />
      </div>
    </div>

    <WizardActions
      backLabel="Back"
      nextLabel="Create payment request"
      loading={creating}
      onBack={onBack}
      onNext={onSubmit}
    />
  </div>
);

const ResultStep = ({
  transfer,
  provider,
  beneficiary,
  submitting,
  onSubmitToProvider,
  onNewPayment,
}: {
  transfer: Transfer | null;
  provider?: ProviderSummary | null;
  beneficiary?: Beneficiary | null;
  submitting: boolean;
  onSubmitToProvider: () => void;
  onNewPayment: () => void;
}) => (
  <div className="mx-auto max-w-2xl space-y-6 text-center">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
      <CheckCircle2 className="h-8 w-8" />
    </div>
    <div>
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] sm:text-3xl dark:text-white">
        Payment request created
      </h2>
      <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
        The request is saved in Origin Wallet. Submit it when approval rules allow.
      </p>
    </div>

    {transfer ? (
      <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 text-left shadow-sm dark:border-white/10 dark:bg-[#10141b]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a879c]">Transfer number</p>
            <p className="mt-1 font-semibold text-[#0f2442] dark:text-white">{transfer.transfer_no}</p>
          </div>
          <Badge className={statusBadgeClassName(transfer.status)}>{transfer.status}</Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ReviewItem label="Infrastructure" value={provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME} />
          <ReviewItem label="Beneficiary" value={beneficiary?.full_name ?? `Beneficiary #${transfer.beneficiary_id}`} />
          <ReviewItem label="Transfer amount" value={formatAmount(transfer.source_amount, transfer.source_currency)} />
          <ReviewItem
            label="Estimated recipient amount"
            value={recipientAmountPresentation(provider?.code) ?? formatAmount(transfer.target_amount, transfer.target_currency)}
          />
          <ReviewItem
            label="Provider fee"
            value={isNiumProvider(provider?.code) ? "Calculated during processing" : formatAmount(transfer.fee_amount, transfer.fee_currency)}
          />
          <ReviewItem label="Created" value={formatDateTime(transfer.created_at)} />
        </div>

        {transfer.status === "approval_required" ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Admin approval is required before this payment can be submitted.
          </div>
        ) : null}

        {transfer.failure_reason ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {transfer.failure_reason}
          </div>
        ) : null}
      </div>
    ) : null}

    <div className="flex flex-col justify-center gap-3 sm:flex-row">
      <Button
        className="h-12 rounded-full bg-[#16a34a] px-7 text-white hover:bg-[#15803d]"
        disabled={!transfer || !canSubmitProvider(transfer.status) || submitting}
        onClick={onSubmitToProvider}
      >
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-2 h-4 w-4" />}
        Submit payment
      </Button>
      <Button
        variant="outline"
        className="h-12 rounded-full border-[#d7d7d2] bg-white px-7 text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b] dark:text-white"
        onClick={onNewPayment}
      >
        New payment
      </Button>
    </div>
  </div>
);

const PaymentSummary = ({
  provider,
  beneficiary,
  balance,
  sourceAmount,
  form,
}: {
  provider: ProviderSummary | null;
  beneficiary: Beneficiary | null;
  balance?: Balance;
  sourceAmount: number;
  form: TransferForm;
}) => (
  <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
    <CardHeader>
      <CardTitle className="text-lg text-[#0f2442] dark:text-white">Payment summary</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 text-sm">
      <SummaryLine label="Infrastructure" value={provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME} />
      <SummaryLine label="Payee" value={beneficiary?.full_name ?? "Not selected"} />
      <SummaryLine label="Funding" value={isNiumProvider(provider?.code) ? "Nium wallet balance" : "Provider funding account"} />
      <SummaryLine label="Available" value={balance ? formatAmount(balance.available_balance, balance.currency) : "No synced balance"} />
      <SummaryLine label="Transfer amount" value={sourceAmount > 0 ? formatAmount(sourceAmount, form.sourceCurrency) : "-"} />
      <SummaryLine label="Estimated recipient amount" value={recipientAmountPresentation(provider?.code) ?? "-"} />
      <SummaryLine label="Provider fee" value="Calculated during processing" />
      <SummaryLine label="Fee handling" value="Provider and intermediary bank fees may apply (SHA)" />
    </CardContent>
  </Card>
);

const TransferRow = ({
  transfer,
  provider,
  beneficiary,
  submitting,
  syncing,
  canceling,
  onSubmit,
  onSync,
  onCancel,
}: {
  transfer: Transfer;
  provider?: ProviderSummary;
  beneficiary?: Beneficiary;
  submitting: boolean;
  syncing: boolean;
  canceling: boolean;
  onSubmit: () => void;
  onSync: () => void;
  onCancel: () => void;
}) => (
  <div className="space-y-4 px-5 py-5">
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-[#0f2442] dark:text-white">{transfer.transfer_no}</p>
          <Badge className={statusBadgeClassName(transfer.status)}>{transfer.status}</Badge>
        </div>
        <p className="mt-1 text-xs text-[#62708a] dark:text-gray-400">
          Created {formatDateTime(transfer.created_at)}
        </p>
      </div>

      <div className="grid gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <ProviderLogo
            provider={provider}
            className="h-8 w-8 rounded-lg"
            imageClassName="p-0.5"
            fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-[#0f2442] dark:text-white">{provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME}</p>
            <p className="truncate text-xs text-[#62708a] dark:text-gray-400">
              {transfer.beneficiary?.full_name || beneficiary?.full_name || `Beneficiary #${transfer.beneficiary_id}`}
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-[#f3fdf9] px-3 py-2 dark:bg-white/5">
          <p className="font-semibold text-[#0f2442] dark:text-white">
            {formatAmount(transfer.source_amount, transfer.source_currency)}
          </p>
          <p className="text-xs text-[#62708a] dark:text-gray-400">
            {recipientAmountPresentation(provider?.code) ?? `Receives ${formatAmount(transfer.target_amount, transfer.target_currency)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!canSubmitProvider(transfer.status) || submitting}
          onClick={onSubmit}
          className="rounded-full bg-[#16a34a] px-4 text-white hover:bg-[#15803d]"
        >
          {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="mr-2 h-3.5 w-3.5" />}
          Submit
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!canSync(transfer.status) || syncing}
          onClick={onSync}
          className="rounded-full border-[#d7d7d2] bg-white px-4 dark:border-white/10 dark:bg-[#10141b] dark:text-white"
        >
          {syncing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="mr-2 h-3.5 w-3.5" />}
          Sync
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!canCancel(transfer.status) || canceling}
          onClick={onCancel}
          className="rounded-full border-red-200 bg-white px-4 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:bg-[#10141b] dark:text-red-300"
        >
          {canceling ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-2 h-3.5 w-3.5" />}
          Cancel
        </Button>
      </div>
    </div>
  </div>
);

const PaymentStepper = ({ currentStep }: { currentStep: WizardStep }) => {
  const currentIndex = wizardSteps.findIndex((item) => item.key === currentStep);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold text-[#62708a]">
        <span>Single payment</span>
        <span>{Math.round(((currentIndex + 1) / wizardSteps.length) * 100)}%</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {wizardSteps.map((item, index) => {
          const active = index === currentIndex;
          const complete = index < currentIndex;
          return (
            <div key={item.key} className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  complete
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-[#16a34a] text-white"
                      : "bg-[#eef2f8] text-[#62708a] dark:bg-white/5"
                }`}
              >
                {complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              <span className={`min-w-0 text-sm font-semibold ${active ? "text-[#0f2442] dark:text-white" : "text-[#62708a]"}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#e4e9f2] dark:bg-white/10">
        <div
          className="h-full rounded-full bg-[#16a34a] transition-all"
          style={{ width: `${((currentIndex + 1) / wizardSteps.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

const Notice = ({ title, description }: { title: string; description: ReactNode }) => (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm">{description}</p>
      </div>
    </div>
  </div>
);

const SelectedPayee = ({
  provider,
  beneficiary,
  onChangePayee,
}: {
  provider: ProviderSummary | null;
  beneficiary: Beneficiary | null;
  onChangePayee: () => void;
}) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-[#d7d7d2] bg-[#f3fdf9] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
    <div className="flex min-w-0 items-center gap-3">
      <ProviderLogo
        provider={provider ?? undefined}
        className="h-11 w-11 shrink-0 rounded-xl"
        imageClassName="p-1"
        fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#0f2442] dark:text-white">
          To: {beneficiary?.full_name ?? "No beneficiary selected"}
        </p>
        <p className="truncate text-sm text-[#62708a] dark:text-gray-400">
          {beneficiary ? beneficiarySubtitle(beneficiary, provider ?? undefined) : "Choose a recipient to continue"}
        </p>
      </div>
    </div>
    <Button
      variant="outline"
      className="h-10 rounded-full border-[#d7d7d2] bg-white text-[#16a34a] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b]"
      onClick={onChangePayee}
    >
      Change
    </Button>
  </div>
);

export const AmountField = ({
  label,
  value,
  currency,
  currencies,
  onAmountChange,
  onCurrencyChange,
}: {
  label: string;
  value: string;
  currency: string;
  currencies: string[];
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="grid h-12 grid-cols-[minmax(0,1fr)_112px] overflow-hidden rounded-xl border border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#10141b]">
      <Input
        type="text"
        value={value}
        inputMode="decimal"
        pattern="[0-9]+(?:\.[0-9]{1,8})?"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          if (isTransferAmountInput(event.target.value)) onAmountChange(event.target.value);
        }}
        placeholder="Enter an amount"
        className="h-12 rounded-none border-0 bg-transparent focus-visible:ring-0"
      />
      <Select value={currency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="h-12 rounded-none border-0 border-l border-[#d7d7d2] bg-[#f3fdf9] focus:ring-0 dark:border-white/10 dark:bg-white/5">
          <SelectValue>
            <span translate="no">{currency}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map((item) => (
            <CurrencySelectItem key={item} value={item} />
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

const FormInput = ({
  label,
  value,
  inputMode,
  type = "text",
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  inputMode?: "decimal" | "numeric" | "text";
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input
      type={type}
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#10141b]"
    />
  </div>
);

const FormSelect = ({
  label,
  value,
  selectedLabel,
  onChange,
  children,
}: {
  label: string;
  value: string;
  selectedLabel?: ReactNode;
  onChange: (value: string) => void;
  children: ReactNode;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#10141b]">
        <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
          {value ? selectedLabel : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  </div>
);

const WizardActions = ({
  backLabel,
  nextLabel,
  loading,
  onBack,
  onNext,
}: {
  backLabel: string;
  nextLabel: string;
  loading?: boolean;
  onBack: () => void;
  onNext: () => void;
}) => (
  <div className="flex flex-col justify-center gap-3 sm:flex-row">
    <Button
      variant="outline"
      className="h-12 rounded-full border-[#d7d7d2] bg-white px-7 text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b] dark:text-white"
      onClick={onBack}
      disabled={loading}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {backLabel}
    </Button>
    <Button
      className="h-12 rounded-full bg-[#16a34a] px-8 text-white hover:bg-[#15803d]"
      onClick={onNext}
      disabled={loading}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {nextLabel}
      {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
    </Button>
  </div>
);

const SectionTitle = ({ icon, title }: { icon: ReactNode; title: string }) => (
  <div className="flex items-center gap-2 font-semibold text-[#0f2442] dark:text-white">
    <span className="text-[#16a34a]">{icon}</span>
    {title}
  </div>
);

const ReviewItem = ({ label, value }: { label: string; value?: ReactNode }) => (
  <div className="rounded-xl bg-[#f3fdf9] px-4 py-3 dark:bg-white/5">
    <p className="text-xs font-medium text-[#62708a] dark:text-gray-400">{label}</p>
    <p className="mt-1 break-words font-semibold text-[#0f2442] dark:text-white">{value || "-"}</p>
  </div>
);

const SummaryLine = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-[#e8edf5] pb-3 last:border-0 last:pb-0 dark:border-white/5">
    <span className="text-[#62708a] dark:text-gray-400">{label}</span>
    <span className="max-w-[190px] text-right font-semibold text-[#0f2442] dark:text-white">{value}</span>
  </div>
);

const CurrencySelectItem = ({ value }: { value: string }) => (
  <SelectItem value={value}>
    <span translate="no">{value}</span>
  </SelectItem>
);

const beneficiarySubtitle = (beneficiary: Beneficiary, provider?: ProviderSummary) =>
  [
    getProviderDisplayName(provider),
    beneficiary.email,
    beneficiary.country_code,
    beneficiary.account_number ? maskAccount(beneficiary.account_number) : null,
    beneficiary.iban ? maskAccount(beneficiary.iban) : null,
  ]
    .filter(Boolean)
    .join(" · ");

const maskAccount = (value?: string | number | null) => {
  const text = String(value ?? "");
  if (!text) return "-";
  if (text.length <= 4) return text;
  return `${"*".repeat(Math.min(6, text.length - 4))}${text.slice(-4)}`;
};

export default AccountTransfers;
