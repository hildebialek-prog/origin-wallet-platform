import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
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
import { getProviders, type ProviderSummary } from "@/services/fxOrderService";
import { PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";
import {
  cancelTransfer,
  createTransfer,
  getBalances,
  getBankAccounts,
  getBeneficiaries,
  getTransfers,
  submitTransfer,
  syncTransferStatus,
  type Balance,
  type BankAccount,
  type Beneficiary,
  type Transfer,
} from "@/services/moneyMovementService";
import {
  currencyOptions,
  formatAmount,
  formatDateTime,
  purposeOptions,
  statusBadgeClassName,
  toNumber,
} from "@/lib/money";
import { isVerifiedKycStatus, normalizeStatus } from "@/lib/status";

type WizardStep = "payee" | "details" | "review" | "result";

type TransferForm = {
  providerId: string;
  beneficiaryId: string;
  sourceBankAccountId: string;
  transferType: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  fxRate: string;
  feeAmount: string;
  feeCurrency: string;
  purposeCode: string;
  referenceText: string;
  invoiceFileName: string;
  notifyRecipient: boolean;
  scheduled: boolean;
  scheduledDate: string;
};

const defaultForm: TransferForm = {
  providerId: "",
  beneficiaryId: "",
  sourceBankAccountId: "",
  transferType: "payout",
  sourceCurrency: "USD",
  targetCurrency: "VND",
  sourceAmount: "",
  targetAmount: "",
  fxRate: "",
  feeAmount: "0",
  feeCurrency: "USD",
  purposeCode: "business_payment",
  referenceText: "",
  invoiceFileName: "",
  notifyRecipient: true,
  scheduled: false,
  scheduledDate: "",
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

const blockedStatuses = new Set(["failed", "rejected", "cancelled", "canceled", "inactive", "disabled"]);

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

  const bankAccountsQuery = useQuery({
    queryKey: ["money-bank-accounts", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBankAccounts({ userId: user?.id as string, token: token as string }),
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
  const bankAccounts = bankAccountsQuery.data ?? [];
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
  const selectedSourceAccount = bankAccounts.find((account) => String(account.id) === form.sourceBankAccountId) ?? null;
  const providerBalances = balances.filter((balance) => String(balance.provider_id) === form.providerId);
  const providerBankAccounts = bankAccounts.filter((account) => String(account.provider_id) === form.providerId);
  const balanceCurrencies = Array.from(new Set(providerBalances.map((balance) => balance.currency))).sort();
  const sourceCurrencies = balanceCurrencies.length ? balanceCurrencies : currencyOptions;
  const selectedBalance = providerBalances.find((balance) => balance.currency === form.sourceCurrency);
  const sourceAmountNumber = toNumber(form.sourceAmount);
  const targetAmountNumber = toNumber(form.targetAmount);
  const fxRateNumber = toNumber(form.fxRate);
  const effectiveSourceAmount =
    sourceAmountNumber > 0 ? sourceAmountNumber : targetAmountNumber > 0 && fxRateNumber > 0 ? targetAmountNumber / fxRateNumber : 0;
  const effectiveTargetAmount =
    targetAmountNumber > 0 ? targetAmountNumber : sourceAmountNumber > 0 && fxRateNumber > 0 ? sourceAmountNumber * fxRateNumber : 0;
  const selectedPurpose = purposeOptions.find((purpose) => purpose.code === form.purposeCode);
  const verifiedForTransfers = isVerifiedKycStatus(user?.kycStatus);

  const eligibleBeneficiaries = beneficiaries.filter((beneficiary) => {
    const provider = providerById.get(beneficiary.provider_id);
    const normalizedStatus = normalizeStatus(beneficiary.status);
    return provider?.supports_transfers && !blockedStatuses.has(normalizedStatus);
  });

  const filteredBeneficiaries = eligibleBeneficiaries.filter((beneficiary) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const provider = providerById.get(beneficiary.provider_id);
    return [
      beneficiary.full_name,
      beneficiary.company_name,
      beneficiary.email,
      beneficiary.currency,
      beneficiary.country_code,
      beneficiary.account_number,
      beneficiary.iban,
      beneficiary.swift_bic,
      provider?.name,
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
    const nextBalance = balances.find((balance) => String(balance.provider_id) === providerId);
    const nextBankAccount =
      bankAccounts.find((account) => String(account.provider_id) === providerId && account.is_default) ??
      bankAccounts.find((account) => String(account.provider_id) === providerId);

    setForm({
      ...form,
      providerId,
      beneficiaryId: String(beneficiary.id),
      sourceBankAccountId: nextBankAccount ? String(nextBankAccount.id) : "",
      sourceCurrency: nextBalance?.currency ?? form.sourceCurrency,
      targetCurrency: beneficiary.currency,
      feeCurrency: nextBalance?.currency ?? form.feeCurrency,
    });
    setFormError("");
    setStep("details");
  };

  const updateSourceCurrency = (currency: string) => {
    setForm({ ...form, sourceCurrency: currency, feeCurrency: currency });
  };

  const validateDetails = () => {
    if (!verifiedForTransfers) return "KYC/KYB must be approved before creating transfers.";
    if (!selectedProvider) return "Nium transfer rail is not available yet.";
    if (!selectedBeneficiary) return "Select a beneficiary before continuing.";
    if (effectiveSourceAmount <= 0) return "Enter a sending amount, or enter receiving amount together with an FX rate.";
    if (!selectedBalance) return "No synced Nium balance is available for the selected source currency.";
    if (toNumber(selectedBalance.available_balance) < effectiveSourceAmount) return "Available balance is not enough for this payment.";
    if (!form.purposeCode) return "Select a payment purpose.";
    if (form.scheduled && !form.scheduledDate) return "Select a scheduled payment date.";
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
        payload: {
          provider_id: Number(form.providerId),
          source_bank_account_id: form.sourceBankAccountId ? Number(form.sourceBankAccountId) : null,
          beneficiary_id: Number(form.beneficiaryId),
          transfer_type: form.transferType,
          source_currency: form.sourceCurrency,
          target_currency: form.targetCurrency,
          source_amount: effectiveSourceAmount,
          target_amount: effectiveTargetAmount > 0 ? effectiveTargetAmount : null,
          fx_rate: form.fxRate ? Number(form.fxRate) : null,
          fee_amount: form.feeAmount ? Number(form.feeAmount) : 0,
          fee_currency: form.feeCurrency,
          purpose_code: form.purposeCode,
          reference_text: form.referenceText.trim() || null,
          client_reference: `OW-${Date.now()}`,
          raw_data: {
            source: "origin_wallet_web",
            flow: "customer_single_payment",
            provider_code: selectedProvider?.code ?? null,
            beneficiary_name: selectedBeneficiary?.full_name ?? null,
            invoice_file_name: form.invoiceFileName || null,
            notify_recipient: form.notifyRecipient,
            scheduled_payment: form.scheduled,
            scheduled_date: form.scheduled ? form.scheduledDate : null,
          },
        },
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
            ? "Admin approval is required before Nium submission."
            : `${transfer.transfer_no} is ready for Nium submission.`,
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
      toast({ title: "Transfer submitted", description: payload.message || "Nium submission completed." });
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
              Send a single payment through Nium with balance, beneficiary, approval, and submission checks.
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
            title="Nium transfer rail is not ready yet."
            description={
              <>
                Complete Nium setup before moving funds.{" "}
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
                    selectedSourceAccount={selectedSourceAccount}
                    selectedBalance={selectedBalance}
                    sourceCurrencies={sourceCurrencies}
                    providerBankAccounts={providerBankAccounts}
                    effectiveSourceAmount={effectiveSourceAmount}
                    effectiveTargetAmount={effectiveTargetAmount}
                    onBack={() => setStep("payee")}
                    onContinue={continueToReview}
                    onChange={setForm}
                    onSourceCurrencyChange={updateSourceCurrency}
                  />
                )}

                {step === "review" && (
                  <ReviewStep
                    form={form}
                    provider={selectedProvider}
                    beneficiary={selectedBeneficiary}
                    sourceAccount={selectedSourceAccount}
                    balance={selectedBalance}
                    effectiveSourceAmount={effectiveSourceAmount}
                    effectiveTargetAmount={effectiveTargetAmount}
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
              sourceAccount={selectedSourceAccount}
              balance={selectedBalance}
              sourceAmount={effectiveSourceAmount}
              targetAmount={effectiveTargetAmount}
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
                      Created transfer requests will appear here with approval and Nium status.
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

const PayeeStep = ({
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
            return (
              <button
                key={beneficiary.id}
                type="button"
                onClick={() => onSelect(beneficiary)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-[#f3fdf9] dark:hover:bg-white/5"
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
            Add and verify a beneficiary before creating live Nium payouts.
          </p>
          <Button asChild className="mt-5 h-11 rounded-full bg-[#16a34a] px-6 text-white hover:bg-[#15803d]">
            <Link to="/account/beneficiaries">Add beneficiary</Link>
          </Button>
        </div>
      )}
    </div>
  </div>
);

const DetailsStep = ({
  form,
  selectedProvider,
  selectedBeneficiary,
  selectedSourceAccount,
  selectedBalance,
  sourceCurrencies,
  providerBankAccounts,
  effectiveSourceAmount,
  effectiveTargetAmount,
  onBack,
  onContinue,
  onChange,
  onSourceCurrencyChange,
}: {
  form: TransferForm;
  selectedProvider: ProviderSummary | null;
  selectedBeneficiary: Beneficiary | null;
  selectedSourceAccount: BankAccount | null;
  selectedBalance?: Balance;
  sourceCurrencies: string[];
  providerBankAccounts: BankAccount[];
  effectiveSourceAmount: number;
  effectiveTargetAmount: number;
  onBack: () => void;
  onContinue: () => void;
  onChange: (form: TransferForm) => void;
  onSourceCurrencyChange: (currency: string) => void;
}) => (
  <div className="mx-auto max-w-3xl space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] sm:text-3xl dark:text-white">
        Complete payment details
      </h2>
      <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
        Enter either the sending amount or receiving amount. FX rate is required when the receiving amount drives the payment.
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
        <FormSelect
          label="Funding source"
          value={form.sourceBankAccountId || "none"}
          selectedLabel={
            selectedSourceAccount
              ? sourceAccountLabel(selectedSourceAccount)
              : "Use Nium wallet balance"
          }
          onChange={(value) => onChange({ ...form, sourceBankAccountId: value === "none" ? "" : value })}
        >
          <SelectItem value="none">Use Nium wallet balance</SelectItem>
          {providerBankAccounts.map((account) => (
            <SelectItem key={account.id} value={String(account.id)}>
              {sourceAccountLabel(account)}
            </SelectItem>
          ))}
        </FormSelect>

        <div className="grid gap-4 sm:grid-cols-2">
          <AmountField
            label="You send exactly"
            value={form.sourceAmount}
            currency={form.sourceCurrency}
            currencies={sourceCurrencies}
            onAmountChange={(value) => onChange({ ...form, sourceAmount: value })}
            onCurrencyChange={onSourceCurrencyChange}
          />
          <AmountField
            label="Recipient receives"
            value={form.targetAmount}
            currency={form.targetCurrency}
            currencies={currencyOptions}
            onAmountChange={(value) => onChange({ ...form, targetAmount: value })}
            onCurrencyChange={(value) => onChange({ ...form, targetCurrency: value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput label="FX rate" value={form.fxRate} inputMode="decimal" onChange={(value) => onChange({ ...form, fxRate: value })} />
          <FormInput label="Total fee" value={form.feeAmount} inputMode="decimal" onChange={(value) => onChange({ ...form, feeAmount: value })} />
          <FormSelect
            label="Fee currency"
            value={form.feeCurrency}
            selectedLabel={<span translate="no">{form.feeCurrency}</span>}
            onChange={(value) => onChange({ ...form, feeCurrency: value })}
          >
            {currencyOptions.map((currency) => (
              <CurrencySelectItem key={currency} value={currency} />
            ))}
          </FormSelect>
        </div>

        <div className="rounded-2xl border border-[#e1e7f0] bg-[#f3fdf9] px-4 py-3 text-sm text-[#62708a] dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
          Estimated send:{" "}
          <strong className="text-[#0f2442] dark:text-white">{formatAmount(effectiveSourceAmount || form.sourceAmount, form.sourceCurrency)}</strong>
          <span className="px-2">→</span>
          estimated receive:{" "}
          <strong className="text-[#0f2442] dark:text-white">{formatAmount(effectiveTargetAmount || form.targetAmount, form.targetCurrency)}</strong>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#10141b]">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Payment purpose"
          value={form.purposeCode}
          selectedLabel={purposeOptions.find((purpose) => purpose.code === form.purposeCode)?.label}
          onChange={(value) => onChange({ ...form, purposeCode: value })}
        >
          {purposeOptions.map((purpose) => (
            <SelectItem key={purpose.code} value={purpose.code}>
              {purpose.label}
            </SelectItem>
          ))}
        </FormSelect>

        <FormInput
          label="Payment reference"
          value={form.referenceText}
          onChange={(value) => onChange({ ...form, referenceText: value })}
          placeholder="INV-2026-001, PO-12345"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Invoice or supporting document</Label>
          <label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#d7d7d2] bg-white px-4 text-sm font-medium text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b] dark:text-white">
            <FileText className="h-4 w-4 text-[#16a34a]" />
            <span className="truncate">{form.invoiceFileName || "Upload optional file"}</span>
            <input
              type="file"
              className="hidden"
              onChange={(event) => onChange({ ...form, invoiceFileName: event.target.files?.[0]?.name ?? "" })}
            />
          </label>
          <p className="text-xs text-[#7a879c]">
            File metadata is stored with the payment request until a dedicated document-upload endpoint is connected.
          </p>
        </div>

        <div className="space-y-3">
          <ToggleLine
            checked={form.notifyRecipient}
            label="Notify recipient"
            description={selectedBeneficiary?.email || "Use beneficiary contact details when available."}
            onChange={(checked) => onChange({ ...form, notifyRecipient: checked })}
          />
          <ToggleLine
            checked={form.scheduled}
            label="Schedule payment"
            description="Keep off for immediate request creation."
            onChange={(checked) => onChange({ ...form, scheduled: checked })}
          />
        </div>
      </div>

      {form.scheduled ? (
        <div className="mt-4 max-w-xs">
          <FormInput
            label="Scheduled date"
            value={form.scheduledDate}
            type="date"
            onChange={(value) => onChange({ ...form, scheduledDate: value })}
          />
        </div>
      ) : null}
    </div>

    <WizardActions
      backLabel="Back"
      nextLabel="Review payment"
      onBack={onBack}
      onNext={onContinue}
    />
  </div>
);

const ReviewStep = ({
  form,
  provider,
  beneficiary,
  sourceAccount,
  balance,
  effectiveSourceAmount,
  effectiveTargetAmount,
  purposeLabel,
  creating,
  onBack,
  onSubmit,
}: {
  form: TransferForm;
  provider: ProviderSummary | null;
  beneficiary: Beneficiary | null;
  sourceAccount: BankAccount | null;
  balance?: Balance;
  effectiveSourceAmount: number;
  effectiveTargetAmount: number;
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
        Confirm payee, funding source, amount, fee, reference, and Nium readiness before creating the live request.
      </p>
    </div>

    <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#10141b]">
      <SectionTitle icon={<Building2 className="h-5 w-5" />} title="Recipient" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ReviewItem label="Beneficiary" value={beneficiary?.full_name ?? "-"} />
        <ReviewItem label="Infrastructure" value={provider?.name ?? PRIMARY_PROVIDER_NAME} />
        <ReviewItem label="Bank" value={beneficiary?.bank_name || beneficiary?.swift_bic || "-"} />
        <ReviewItem label="Account / IBAN" value={maskAccount(beneficiary?.account_number || beneficiary?.iban)} />
      </div>
    </div>

    <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#10141b]">
      <SectionTitle icon={<WalletCards className="h-5 w-5" />} title="Payment" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ReviewItem label="You send" value={formatAmount(effectiveSourceAmount, form.sourceCurrency)} />
        <ReviewItem label="Recipient receives" value={formatAmount(effectiveTargetAmount || form.targetAmount, form.targetCurrency)} />
        <ReviewItem label="FX rate" value={form.fxRate || "-"} />
        <ReviewItem label="Total fee" value={formatAmount(form.feeAmount || 0, form.feeCurrency)} />
        <ReviewItem label="Funding source" value={sourceAccount ? sourceAccountLabel(sourceAccount) : "Nium wallet balance"} />
        <ReviewItem label="Available balance" value={balance ? formatAmount(balance.available_balance, balance.currency) : "No synced balance"} />
        <ReviewItem label="Purpose" value={purposeLabel} />
        <ReviewItem label="Reference" value={form.referenceText || "-"} />
        <ReviewItem label="Invoice" value={form.invoiceFileName || "-"} />
        <ReviewItem label="Recipient notification" value={form.notifyRecipient ? "Enabled" : "Disabled"} />
        <ReviewItem label="Schedule" value={form.scheduled ? form.scheduledDate : "Immediate request"} />
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
        The request is saved in Origin Wallet. Submit it to Nium when approval rules allow.
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
          <ReviewItem label="Infrastructure" value={provider?.name ?? PRIMARY_PROVIDER_NAME} />
          <ReviewItem label="Beneficiary" value={beneficiary?.full_name ?? `Beneficiary #${transfer.beneficiary_id}`} />
          <ReviewItem label="Send" value={formatAmount(transfer.source_amount, transfer.source_currency)} />
          <ReviewItem label="Receive" value={formatAmount(transfer.target_amount, transfer.target_currency)} />
          <ReviewItem label="Fee" value={formatAmount(transfer.fee_amount ?? 0, transfer.fee_currency || transfer.source_currency)} />
          <ReviewItem label="Created" value={formatDateTime(transfer.created_at)} />
        </div>

        {transfer.status === "approval_required" ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Admin approval is required before this payment can be submitted to Nium.
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
        Submit to Nium
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
  sourceAccount,
  balance,
  sourceAmount,
  targetAmount,
  form,
}: {
  provider: ProviderSummary | null;
  beneficiary: Beneficiary | null;
  sourceAccount: BankAccount | null;
  balance?: Balance;
  sourceAmount: number;
  targetAmount: number;
  form: TransferForm;
}) => (
  <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
    <CardHeader>
      <CardTitle className="text-lg text-[#0f2442] dark:text-white">Payment summary</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 text-sm">
      <SummaryLine label="Infrastructure" value={provider?.name ?? PRIMARY_PROVIDER_NAME} />
      <SummaryLine label="Payee" value={beneficiary?.full_name ?? "Not selected"} />
      <SummaryLine label="Funding" value={sourceAccount ? sourceAccountLabel(sourceAccount) : "Nium wallet balance"} />
      <SummaryLine label="Available" value={balance ? formatAmount(balance.available_balance, balance.currency) : "No synced balance"} />
      <SummaryLine label="Send" value={sourceAmount > 0 ? formatAmount(sourceAmount, form.sourceCurrency) : "-"} />
      <SummaryLine label="Receive" value={targetAmount > 0 ? formatAmount(targetAmount, form.targetCurrency) : "-"} />
      <SummaryLine label="Fee" value={formatAmount(form.feeAmount || 0, form.feeCurrency)} />
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
            <p className="truncate font-medium text-[#0f2442] dark:text-white">{provider?.name || PRIMARY_PROVIDER_NAME}</p>
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
            Receives {formatAmount(transfer.target_amount, transfer.target_currency)}
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

const AmountField = ({
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
        value={value}
        inputMode="decimal"
        onChange={(event) => onAmountChange(event.target.value)}
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

const ToggleLine = ({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d7d7d2] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#10141b]">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-4 w-4 rounded border-[#aab6c9] text-[#16a34a]"
    />
    <span>
      <span className="block font-semibold text-[#0f2442] dark:text-white">{label}</span>
      <span className="mt-1 block text-xs text-[#62708a] dark:text-gray-400">{description}</span>
    </span>
  </label>
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
    provider?.name,
    beneficiary.email,
    beneficiary.country_code,
    beneficiary.account_number ? maskAccount(beneficiary.account_number) : null,
    beneficiary.iban ? maskAccount(beneficiary.iban) : null,
  ]
    .filter(Boolean)
    .join(" · ");

const sourceAccountLabel = (account: BankAccount) =>
  `${account.account_name || account.bank_name || "Bank account"} · ${account.currency} · ${maskAccount(
    account.account_number || account.iban || account.external_account_id,
  )}`;

const maskAccount = (value?: string | number | null) => {
  const text = String(value ?? "");
  if (!text) return "-";
  if (text.length <= 4) return text;
  return `${"*".repeat(Math.min(6, text.length - 4))}${text.slice(-4)}`;
};

export default AccountTransfers;
