import { CurrencyBadge, CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  getBeneficiary,
  getTransfer,
  getTransfers,
  submitTransfer,
  syncTransferStatus,
  type Balance,
  type Beneficiary,
  type Transfer,
  type NiumPayoutAmounts,
} from "@/services/moneyMovementService";
import {
  currencyOptions,
  formatAmount,
  formatDateTime,
  statusBadgeClassName,
  toNumber,
} from "@/lib/money";
import { isVerifiedKycStatus, normalizeStatus } from "@/lib/status";
import { SgdLocalAmountBreakdown } from "./SgdLocalAmountBreakdown";
import SgdLocalReview from "./SgdLocalReview";
import { reviewPayoutAmounts, sgdFinancialKey } from "./sgdFinancialTerms";
import PaymentRecovery from "./PaymentRecovery";
import { belongsToIdentity, canCancelPayment, canLeavePayment, claimPaymentIdentity, clearPaymentIdentity,
  isBlockedDraft, leaveBlockedDraftSession, paymentFingerprint, paymentPresentation, paymentUncertain, readPaymentIdentity, rememberPaymentTransfer,
  structuredTransfer, writePaymentIdentity, type PaymentIdentity } from "./paymentSafety";
import {
  buildTransferPayload,
  beneficiaryTransferOption,
  isNiumProvider,
  isTransferAmountInput,
  purposeOptionsForProvider,
  purposeOptionsForTransferProvider,
  recipientAmountPresentation,
  payoutFeePresentation,
  shouldFetchNiumPurposeCodes,
  transferFormFromTransfer,
  validateTransferConfiguration,
  validateTransferAmount,
} from "./transferForm";

import { isDynamicBeneficiaryCandidate, useDynamicPayment } from "./useDynamicPayment";
import { DynamicActivity, DynamicDetails, DynamicRecovery, DynamicResult, DynamicReviewStep, DynamicSummary } from "./DynamicPaymentSteps";

// Preserve existing legacy admission; every valid Nium recipient can also request a Dynamic check.
const wizardBeneficiaryOption = (beneficiary: Beneficiary, provider?: ProviderSummary) => {
  const legacy = beneficiaryTransferOption(beneficiary, provider);
  return legacy.selectable || !isDynamicBeneficiaryCandidate(beneficiary, provider) ? legacy
    : { visible: true, selectable: true, reason: "Dynamic availability and recipient currencies will be checked after selection." };
};

type WizardStep = "payee" | "details" | "review" | "result";
type PaymentFlow = "legacy" | "dynamic";

type TransferForm = ReturnType<typeof transferFormFromTransfer>;

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
const canSync = (status?: string | null) =>
  ["pending", "processing", "submitted", "sent", "provider_pending"].includes(normalizeStatus(status));

const AccountTransfers = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransferForm>(defaultForm);
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow>("legacy");
  const [step, setStep] = useState<WizardStep>("payee");
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [createdTransfer, setCreatedTransfer] = useState<Transfer | null>(null);
  const [confirmedSgdTerms, setConfirmedSgdTerms] = useState<{ key: string; amounts: NiumPayoutAmounts | null } | null>(null);
  const [sgdBusy, setSgdBusy] = useState(false);
  const [identity, setIdentity] = useState<PaymentIdentity | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [previousBlockedTransfer, setPreviousBlockedTransfer] = useState<Transfer | null>(null);
  const [resettingSession, setResettingSession] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const resetting = useRef(false);
  const recoveryRunning = useRef(false);
  const preparing = useRef(false);
  const creating = useRef(false);

  const findSavedPayment = async (saved: PaymentIdentity): Promise<Transfer | null> => {
    const params = { userId: String(user!.id), token: token! };
    const candidate = saved.transferId !== undefined
      ? await getTransfer({ ...params, transferId: saved.transferId })
      : (await getTransfers(params)).find((transfer) => transfer.provider_id === saved.providerId
        && transfer.client_reference === saved.clientReference);
    if (!candidate) return null; // Retry may use the same reference; never allocate a replacement.
    if (!belongsToIdentity(candidate, saved)) throw new Error("Saved payment identity does not match. Contact support.");
    const current = saved.transferId !== undefined ? candidate : await getTransfer({ ...params, transferId: candidate.id });
    setIdentity(rememberPaymentTransfer(String(user!.id), saved, current));
    return current;
  };

  const inspectSavedPayment = async () => {
    const saved = readPaymentIdentity(String(user!.id));
    if (!saved) return;
    const current = await findSavedPayment(saved);
    if (current) { setCreatedTransfer(current); setStep("result"); }
    else setFormError("No saved transfer was found yet. Retry only the unchanged instruction with its retained identity.");
  };

  useEffect(() => {
    let active = true;
    setPaymentFlow("legacy"); setIdentityReady(false); setIdentity(null); setCreatedTransfer(null); setConfirmedSgdTerms(null); setFormError(""); setForm(defaultForm); setStep("payee"); setPreviousBlockedTransfer(null);
    if (!user?.id || !token) return;
    void (async () => {
      try {
        const saved = readPaymentIdentity(String(user.id));
        if (saved) {
          const params = { userId: String(user.id), token };
          const candidate = saved.transferId !== undefined ? await getTransfer({ ...params, transferId: saved.transferId })
            : (await getTransfers(params)).find((item) => item.provider_id === saved.providerId && item.client_reference === saved.clientReference);
          const current = candidate && (saved.transferId !== undefined ? candidate : await getTransfer({ ...params, transferId: candidate.id }));
          if (!active) return;
          setIdentity(current ? rememberPaymentTransfer(String(user.id), saved, current) : saved);
          if (current) { setCreatedTransfer(current); setStep("result"); }
          else setFormError("A previous payment attempt is saved. Enter the unchanged details to retry; its reference will be retained.");
        }
        if (active) setIdentityReady(true);
      } catch (failure) {
        if (active) setFormError(failure instanceof Error ? failure.message : "Cannot inspect the saved payment. New writes are blocked.");
      }
    })();
    return () => { active = false; };
  }, [user?.id, token]);

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
  const activityTransfers = transfers.slice(0, 5);
  if (previousBlockedTransfer && !activityTransfers.some((transfer) => transfer.id === previousBlockedTransfer.id)) {
    activityTransfers.push(transfers.find((transfer) => transfer.id === previousBlockedTransfer.id) ?? previousBlockedTransfer);
  }

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
  const legacyEligibility = selectedBeneficiary ? beneficiaryTransferOption(selectedBeneficiary, selectedProvider ?? undefined) : null;
  const providerBalances = balances.filter((balance) => String(balance.provider_id) === form.providerId);
  const balanceCurrencies = Array.from(new Set(providerBalances.map((balance) => balance.currency))).sort();
  const sourceCurrencies = isNiumProvider(selectedProvider?.code) ? ["USD"] : balanceCurrencies.length ? balanceCurrencies : currencyOptions;
  const selectedBalance = providerBalances.find((balance) => balance.currency === form.sourceCurrency);
  const effectiveSourceAmount = toNumber(form.sourceAmount);
  const niumPurposeCodesEnabled = paymentFlow === "legacy" && !!user?.id && !!token && shouldFetchNiumPurposeCodes(selectedProvider?.code);
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
  const dynamic = useDynamicPayment(paymentFlow === "dynamic" ? selectedBeneficiary : null,
    verifiedForTransfers && identityReady && !identity, balances);

  useEffect(() => {
    if (dynamic.saved) { setPaymentFlow("dynamic"); setStep("result"); }
    else if (paymentFlow === "dynamic" && step === "result") {
      if (dynamic.quote) setStep("details");
      else { setForm(defaultForm); setPaymentFlow("legacy"); setStep("payee"); }
    }
  }, [dynamic.saved, dynamic.quote, paymentFlow, step]);

  useEffect(() => {
    if (dynamic.transfer) {
      void queryClient.invalidateQueries({ queryKey: ["money-transfers", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["money-transactions", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["money-balances", user?.id] });
    }
  }, [dynamic.transfer, queryClient, user?.id]);

  useEffect(() => {
    if (paymentFlow === "dynamic") return;
    const purposeCodeIsCompatible = purposeOptions.some((purpose) => purpose.code === form.purposeCode);
    if (isNiumProvider(selectedProvider?.code)) {
      // Wait for the authoritative allowlist before clearing an unsupported purpose.
      if (purposeCodesQuery.isSuccess && form.purposeCode && !purposeCodeIsCompatible) {
        setForm((current) => ({ ...current, purposeCode: "" }));
      }
    } else if (!purposeCodeIsCompatible && (purposeOptions.length > 0 || form.purposeCode)) {
      setForm((current) => ({ ...current, purposeCode: purposeOptions[0]?.code ?? "" }));
    }
  }, [form.purposeCode, form.providerId, form.beneficiaryId, purposeOptions, selectedProvider?.code, purposeCodesQuery.isSuccess, paymentFlow]);

  const filteredBeneficiaries = beneficiaries.filter((beneficiary) => {
    const provider = providerById.get(beneficiary.provider_id);
    if (!wizardBeneficiaryOption(beneficiary, provider).visible) return false;
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

  const resetPayment = async () => {
    try {
      if (!createdTransfer || !canLeavePayment(createdTransfer)) throw new Error("Resolve the saved payment before starting another instruction.");
      // Re-check before releasing the browser identity; stale UI must not hide an unknown outcome.
      const current = await getTransfer({ userId: String(user!.id), token: token!, transferId: createdTransfer.id });
      if (!canLeavePayment(current)) { setCreatedTransfer(current); throw new Error("The saved payment requires review before starting another instruction."); }
      const saved = readPaymentIdentity(String(user!.id));
      if (saved) {
        if (!belongsToIdentity(current, saved)) throw new Error("Reopen the active saved payment before starting another instruction.");
        clearPaymentIdentity(String(user!.id), saved);
      }
    } catch (failure) { setFormError(failure instanceof Error ? failure.message : "Unable to confirm saved payment."); return; }
    setPaymentFlow("legacy");
    setForm(defaultForm);
    setSearch("");
    setFormError("");
    setCreatedTransfer(null);
    setConfirmedSgdTerms(null);
    setIdentity(null);
    setStep("payee");
  };

  const pickBeneficiary = (beneficiary: Beneficiary) => {
    if (!dynamic.ready || dynamic.saved) { setFormError("Resolve the saved Dynamic payment before starting another instruction."); return; }
    const providerId = String(beneficiary.provider_id);
    const provider = providerById.get(beneficiary.provider_id);
    if (!wizardBeneficiaryOption(beneficiary, provider).selectable) return;
    const dynamicCandidate = isDynamicBeneficiaryCandidate(beneficiary, provider);
    const nextFlow: PaymentFlow = beneficiaryTransferOption(beneficiary, provider).selectable ? "legacy" : "dynamic";
    if (dynamicCandidate && nextFlow === "dynamic" && (!identityReady || identity)) {
      setFormError("Resolve the saved payment before starting a Dynamic instruction."); return;
    }
    dynamic.invalidate();
    setPaymentFlow(nextFlow);
    const nextBalance = balances.find(
      (balance) => String(balance.provider_id) === providerId && (!isNiumProvider(provider?.code) || balance.currency === "USD"),
    );
    setForm({
      ...form,
      providerId,
      beneficiaryId: String(beneficiary.id),
      sourceCurrency: nextBalance?.currency ?? form.sourceCurrency,
      targetCurrency: beneficiary.currency,
      sourceAmount: form.sourceAmount,
      purposeCode: isNiumProvider(provider?.code) ? "" : purposeOptionsForProvider(provider?.code)[0]?.code ?? "",
    });
    setFormError("");
    setStep("details");
  };

  const updateSourceCurrency = (currency: string) => setForm({ ...form, sourceCurrency: currency });

  const validateDetails = () => {
    if (paymentFlow === "dynamic") return "Use the Dynamic quote and confirmation steps for this instruction.";
    if (!dynamic.ready || dynamic.saved) return "Resolve the saved Dynamic payment before starting another instruction.";
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
      purposeOptions,
      allowSgdPreparation: true,
    });
    if (corridorValidation) return corridorValidation;
    if (effectiveSourceAmount <= 0) return "Enter a sending amount.";
    if (isNiumProvider(selectedProvider.code) && form.targetCurrency === "SGD") {
      return form.referenceText.trim() ? "" : "Enter a payment reference.";
    }
    if (!selectedBalance) return "No synced wallet balance is available for the selected source currency.";
    if (toNumber(selectedBalance.available_balance) < effectiveSourceAmount) return "Available balance is not enough for this payment.";
    if (!form.purposeCode) return "Select a payment purpose.";
    return "";
  };

  const verifyIdentity = async () => {
    const saved = readPaymentIdentity(String(user!.id));
    if (!saved || !selectedBeneficiary || saved.clientReference !== identity?.clientReference) throw new Error("Reopen the saved payment before continuing.");
    const current = await getBeneficiary({ userId: String(user!.id), token: token!, beneficiaryId: saved.beneficiaryId });
    if (current.id !== Number(form.beneficiaryId) || current.provider_id !== Number(form.providerId)
      || current.status !== "active" || await paymentFingerprint(form, current) !== saved.fingerprint) {
      throw new Error("Payment details or receiving account changed. Cancel a safe saved draft before editing; review the beneficiary again.");
    }
    if (readPaymentIdentity(String(user!.id))?.clientReference !== saved.clientReference) throw new Error("Another payment became active. Reopen the saved payment.");
  };

  const prepareIdentity = async () => {
    if (!dynamic.ready || dynamic.saved) throw new Error("Resolve the saved Dynamic payment before starting another instruction.");
    if (!identityReady) throw new Error("Saved payment identity must be checked before continuing. Reload to retry the status check.");
    const current = await getBeneficiary({ userId: String(user!.id), token: token!, beneficiaryId: Number(form.beneficiaryId) });
    if (!selectedBeneficiary || current.id !== selectedBeneficiary.id || current.provider_id !== Number(form.providerId)
      || current.status !== "active" || await paymentFingerprint(form, current) !== await paymentFingerprint(form, selectedBeneficiary)) {
      throw new Error("The receiving account changed. Refresh beneficiaries and review the payment again.");
    }
    const saved = await claimPaymentIdentity(String(user!.id), current.provider_id, current.id, await paymentFingerprint(form, current));
    setIdentity(saved);
    const transfer = await findSavedPayment(saved);
    return { identity: saved, transfer };
  };

  const saveTransfer = (transfer: Transfer) => {
    const saved = readPaymentIdentity(String(user!.id));
    if (!saved) throw new Error("Payment identity is unavailable. Reopen the saved payment.");
    setIdentity(rememberPaymentTransfer(String(user!.id), saved, transfer));
  };
  const showSavedTransfer = (transfer: Transfer) => {
    saveTransfer(transfer); setCreatedTransfer(transfer); setStep("result"); void refreshTransfers();
  };

  const updateOpenedTransfer = (transfer: Transfer) => {
    const saved = readPaymentIdentity(String(user!.id));
    if (saved && belongsToIdentity(transfer, saved)) saveTransfer(transfer);
    setCreatedTransfer(transfer); void refreshTransfers();
  };

  const resumeSavedTransfer = async (transfer: Transfer) => {
    try {
      if (!dynamic.ready || dynamic.saved) throw new Error("Resolve the saved Dynamic payment before reopening another instruction.");
      const saved = readPaymentIdentity(String(user!.id));
      if (saved && !belongsToIdentity(transfer, saved)) throw new Error("Resolve the active saved payment before reviewing another instruction.");
      if (!transfer.client_reference || paymentUncertain(transfer)) throw new Error("This instruction needs status recovery before review.");
      const current = await getBeneficiary({ userId: String(user!.id), token: token!, beneficiaryId: transfer.beneficiary_id! });
      const restored = transferFormFromTransfer(transfer);
      const fingerprint = await paymentFingerprint(restored, current);
      if (saved && saved.fingerprint !== fingerprint) throw new Error("The saved receiving account or instruction changed. Cancel a safe draft before editing it.");
      const reopened: PaymentIdentity = saved ?? { version: 1, providerId: transfer.provider_id,
        beneficiaryId: transfer.beneficiary_id!, transferId: transfer.id, clientReference: transfer.client_reference,
        preparationId: crypto.randomUUID(), fingerprint };
      writePaymentIdentity(String(user!.id), reopened); setIdentity(reopened);
      setConfirmedSgdTerms({ key: sgdFinancialKey(restored, current), amounts: transfer.payout_amounts ?? null });
      queryClient.setQueryData<Beneficiary[]>(["money-beneficiaries", user?.id, token], (items) =>
        (items ?? []).map((item) => item.id === current.id ? current : item));
      setPaymentFlow("legacy"); setForm(restored); setFormError(""); setStep("details");
    } catch (failure) { setFormError(failure instanceof Error ? failure.message : "Unable to reopen payment."); }
  };

  const continueToReview = async () => {
    if (preparing.current) return;
    const validation = validateDetails();
    if (validation) {
      setFormError(validation);
      return;
    }

    // HK SWIFT review is read-only. Claim its durable identity immediately before Create.
    if (!(isNiumProvider(selectedProvider?.code) && form.targetCurrency === "SGD")) {
      if (!identityReady) { setFormError("Saved payment identity must be checked before continuing."); return; }
      setFormError(""); setStep("review"); return;
    }

    preparing.current = true; setSgdBusy(true);
    try {
      const { transfer } = await prepareIdentity();
      if (transfer && (paymentUncertain(transfer) || (transfer.status !== "draft" && transfer.payout_workflow?.can_refresh_review !== true))) {
        showSavedTransfer(transfer); return;
      }
      setFormError(""); setStep("review");
    } catch (failure) { setFormError(failure instanceof Error ? failure.message : "Unable to confirm payment identity."); }
    finally { preparing.current = false; setSgdBusy(false); }
  };

  const createMutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (creating.current) throw new Error("Payment acceptance is already in progress.");
      creating.current = true;
      try {
      const validation = validateDetails();
      if (validation) throw new Error(validation);

      if (isNiumProvider(selectedProvider?.code) && form.targetCurrency === "SGD") {
        throw new Error("Review the current SGD LOCAL payment terms before Submit.");
      }
      const prepared = await prepareIdentity();
      if (prepared.transfer) return prepared.transfer;
      const freshBeneficiary = await getBeneficiary({ userId: String(user!.id), token: token!, beneficiaryId: Number(form.beneficiaryId) });
      if (freshBeneficiary.status !== "active" || await paymentFingerprint(form, freshBeneficiary) !== prepared.identity.fingerprint
        || readPaymentIdentity(String(user!.id))?.clientReference !== prepared.identity.clientReference) {
        throw new Error("Payment details or receiving account changed. Reopen the saved payment.");
      }
      return await createTransfer({
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
          clientReference: prepared.identity.clientReference,
          providerCode: selectedProvider?.code ?? "",
          beneficiaryName: selectedBeneficiary?.full_name ?? "",
        }),
      });
      } finally { creating.current = false; }
    },
    onSuccess: async (transfer) => {
      saveTransfer(transfer); setCreatedTransfer(transfer);
      setFormError("");
      setStep("result");
      await refreshTransfers();
      toast({
        title: paymentPresentation(transfer).title,
        description: paymentPresentation(transfer).message,
      });
    },
    onError: (error) => {
      const saved = structuredTransfer(error);
      if (saved) {
        try { showSavedTransfer(saved); } catch (failure) { setFormError(String(failure)); }
      }
      const message = error instanceof Error ? error.message : "Unable to create transfer.";
      setFormError(message);
      toast({ variant: "destructive", title: "Payment acceptance not confirmed", description: `${message} Check the saved payment before retrying; the reference is retained.` });
    },
  });

  const submitMutation = useMutation({
    retry: false,
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
    retry: false,
    mutationFn: async (transferId: number) => {
      const params = { userId: String(user!.id), token: token!, transferId };
      const current = await getTransfer(params);
      if (current.payout_workflow && current.payout_workflow.can_reconcile_status !== true) throw new Error("Reconciliation is not currently authorized. Open the saved payment.");
      return syncTransferStatus(params);
    },
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
    retry: false,
    mutationFn: async (transferId: number) => {
      const params = { userId: String(user!.id), token: token!, transferId };
      const current = await getTransfer(params);
      if (!canCancelPayment(current)) throw new Error("Resolve the current operation before cancelling.");
      return cancelTransfer(params);
    },
    onSuccess: refreshTransfers,
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Cancel failed",
        description: error instanceof Error ? error.message : "Unable to cancel transfer.",
      });
    },
  });

  const sessionActionBusy = resettingSession || recoveryBusy || sgdBusy || createMutation.isPending
    || submitMutation.isPending || syncMutation.isPending || cancelMutation.isPending;
  const changePaymentMethod = (next: PaymentFlow) => {
    if (next === paymentFlow || !selectedBeneficiary || !identityReady || !dynamic.ready
      || identity || dynamic.saved || dynamic.busy || sessionActionBusy || preparing.current || creating.current) return;
    if (next === "legacy" && !legacyEligibility?.selectable) return;
    if (next === "dynamic" && !isDynamicBeneficiaryCandidate(selectedBeneficiary, selectedProvider ?? undefined)) return;
    dynamic.invalidate();
    setConfirmedSgdTerms(null);
    setForm((current) => ({ ...current, sourceAmount: "", purposeCode: "", referenceText: "" }));
    setFormError(""); setPaymentFlow(next); setStep("details");
  };
  const startNewTransfer = async () => {
    if (!user?.id || !identityReady || !createdTransfer || !isBlockedDraft(createdTransfer)
      || resetting.current || recoveryRunning.current || preparing.current || creating.current || sessionActionBusy) return;
    resetting.current = true; setResettingSession(true);
    try {
      await leaveBlockedDraftSession(String(user.id), createdTransfer);
      setPreviousBlockedTransfer(createdTransfer);
      setForm(defaultForm); setSearch(""); setFormError(""); setCreatedTransfer(null);
      setConfirmedSgdTerms(null); setIdentity(null); setStep("payee");
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "Unable to reset the saved wizard session.");
    } finally { resetting.current = false; setResettingSession(false); }
  };

  return (
    <div className="wallet-ui bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
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

        {previousBlockedTransfer && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Transfer {previousBlockedTransfer.transfer_no} remains pending investigation. Starting a new transfer does not cancel or retry it.{" "}
          <a href="#transfer-activity" className="font-semibold underline">View the previous transfer in Transfer activity</a>.
        </div>}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="wallet-card overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
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

                {dynamic.error && <div role="alert" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{dynamic.error}</div>}
                {dynamic.refusalCodes.length > 0 && <p className="mb-4 text-sm">Refusal codes: {dynamic.refusalCodes.join(", ")}</p>}

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

                {(step === "details" || step === "review") && selectedBeneficiary
                  && isDynamicBeneficiaryCandidate(selectedBeneficiary, selectedProvider ?? undefined)
                  && <PaymentMethodChoice value={paymentFlow} onChange={changePaymentMethod}
                    legacyLabel={legacyEligibility?.selectable || (paymentFlow === "legacy" && identity)
                      ? `Existing ${selectedBeneficiary.currency} ${selectedBeneficiary.payout_method ?? ""} payment` : null}
                    disabled={!identityReady || !dynamic.ready || !!identity || !!dynamic.saved || dynamic.busy || sessionActionBusy}
                    lockedReason={identity || dynamic.saved ? "Resolve the saved payment before changing payment methods." : undefined} />}

                {paymentFlow === "dynamic" && step !== "payee" && <>
                  {step !== "result" && <div className="mb-6"><SelectedPayee provider={selectedProvider} beneficiary={selectedBeneficiary}
                    changeDisabled={dynamic.busy || !!dynamic.saved}
                    onChangePayee={() => { dynamic.invalidate(); setForm(defaultForm); setPaymentFlow("legacy"); setStep("payee"); }} /></div>}
                  {step === "details" && <DynamicDetails payment={dynamic}
                    onBack={() => { dynamic.invalidate(); setForm(defaultForm); setPaymentFlow("legacy"); setStep("payee"); }}
                    onReview={() => { void dynamic.getReview().then((reviewed) => { if (reviewed) setStep("review"); }); }} />}
                  {step === "review" && <DynamicReviewStep payment={dynamic}
                    onBack={() => { dynamic.clearReview(); setStep("details"); }} />}
                  {step === "result" && <DynamicResult payment={dynamic} onNewPayment={() => {
                    if (dynamic.startAnother()) { setForm(defaultForm); setPaymentFlow("legacy"); setStep("payee"); }
                  }} />}
                </>}

                {paymentFlow === "legacy" && step === "details" && (
                  <DetailsStep
                    form={form}
                    selectedProvider={selectedProvider}
                    selectedBeneficiary={selectedBeneficiary}
                    selectedBalance={selectedBalance}
                    sourceCurrencies={sourceCurrencies}
                    effectiveSourceAmount={effectiveSourceAmount}
                    payoutAmounts={confirmedSgdTerms?.key === sgdFinancialKey(form, selectedBeneficiary) ? confirmedSgdTerms.amounts : null}
                    onBack={() => setStep("payee")}
                    onContinue={() => void continueToReview()}
                    onChange={setForm}
                    onSourceCurrencyChange={updateSourceCurrency}
                    purposeOptions={purposeOptions}
                    purposeCodesLoading={niumPurposeCodesEnabled && purposeCodesQuery.isLoading}
                    purposeCodesFailed={niumPurposeCodesEnabled && purposeCodesQuery.isError}
                    onPurposeChange={(purposeCode) => {
                      setForm((current) => ({ ...current, purposeCode }));
                      if (purposeOptions.some((purpose) => purpose.code === purposeCode)) setFormError("");
                    }}
                  />
                )}

                {paymentFlow === "legacy" && step === "review" && (
                  <ReviewStep
                    form={form}
                    provider={selectedProvider}
                    beneficiary={selectedBeneficiary}
                    balance={selectedBalance}
                    effectiveSourceAmount={effectiveSourceAmount}
                    purposeLabel={selectedPurpose?.label ?? form.purposeCode}
                    creating={createMutation.isPending}
                    backDisabled={sgdBusy}
                    onBack={() => setStep("details")}
                    onSubmit={() => { if (!creating.current) createMutation.mutate(); }}
                    sgdReview={identity && isNiumProvider(selectedProvider?.code) && form.targetCurrency === "SGD" ? <SgdLocalReview
                      key={`${user?.id}:${form.providerId}:${form.beneficiaryId}`}
                      userId={user?.id as string} token={token as string} providerId={Number(form.providerId)}
                      beneficiaryId={Number(form.beneficiaryId)} sourceAmount={form.sourceAmount} purposeCode={form.purposeCode}
                      preparationReference={identity.clientReference} preparationId={identity.preparationId}
                      transferId={identity.transferId} accountIdentity={identity.fingerprint} referenceText={form.referenceText}
                      verifyIdentity={verifyIdentity} onPrepared={saveTransfer}
                      onTermsConfirmed={(review) => setConfirmedSgdTerms({
                        key: sgdFinancialKey(form, selectedBeneficiary), amounts: reviewPayoutAmounts(review),
                      })}
                      onRecovery={(transfer) => { try { showSavedTransfer(transfer); } catch (failure) { setFormError(String(failure)); } }}
                      onInspect={() => { void inspectSavedPayment().catch((failure) => setFormError(String(failure))); }}
                      validationError={confirmedSgdTerms && confirmedSgdTerms.key !== sgdFinancialKey(form, selectedBeneficiary)
                        ? "Payment details or receiving account changed. Return to payment details before reviewing again."
                        : validateDetails()} onBusyChange={setSgdBusy}
                      onSubmitted={(transfer) => {
                        showSavedTransfer(transfer);
                      }} /> : undefined}
                  />
                )}

                {paymentFlow === "legacy" && step === "result" && <>
                  <ResultStep
                    transfer={createdTransfer}
                    provider={createdTransfer ? providerById.get(createdTransfer.provider_id) : selectedProvider}
                    beneficiary={
                      createdTransfer?.beneficiary ??
                      (createdTransfer ? beneficiaryById.get(Number(createdTransfer.beneficiary_id)) : selectedBeneficiary)
                    }
                    submitting={submitMutation.isPending}
                    onSubmitToProvider={() => createdTransfer && submitMutation.mutate(createdTransfer.id)}
                    onNewPayment={() => void resetPayment()}
                    onStartNewTransfer={() => void startNewTransfer()}
                    sessionActionDisabled={!identityReady || sessionActionBusy}
                  />
                  {createdTransfer && <PaymentRecovery userId={String(user?.id)} token={token!}
                    transfer={createdTransfer} onUpdated={updateOpenedTransfer}
                    disabled={resettingSession}
                    onBusyChange={(busy) => { recoveryRunning.current = busy; setRecoveryBusy(busy); }}
                    onResume={(transfer) => void resumeSavedTransfer(transfer)} />}
                </>}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <PaymentSummary
              dynamicPayment={paymentFlow === "dynamic" ? <DynamicSummary payment={dynamic} /> : undefined}
              provider={paymentFlow === "dynamic" && dynamic.saved ? providerById.get(beneficiaryById.get(dynamic.recoveryBeneficiaryId)?.provider_id) ?? null : step === "result" && createdTransfer ? providerById.get(createdTransfer.provider_id) ?? null : selectedProvider}
              beneficiary={paymentFlow === "dynamic" && dynamic.saved ? beneficiaryById.get(dynamic.recoveryBeneficiaryId) ?? null : step === "result" && createdTransfer ? createdTransfer.beneficiary ?? beneficiaryById.get(Number(createdTransfer.beneficiary_id)) ?? null : selectedBeneficiary}
              balance={selectedBalance}
              sourceAmount={step === "result" && createdTransfer ? toNumber(createdTransfer.source_amount) : effectiveSourceAmount}
              form={step === "result" && createdTransfer ? transferFormFromTransfer(createdTransfer) : form}
              payoutAmounts={step === "result" && createdTransfer ? createdTransfer.payout_amounts
                : confirmedSgdTerms?.key === sgdFinancialKey(form, selectedBeneficiary) ? confirmedSgdTerms.amounts : null}
            />

            <Card id="transfer-activity" className="wallet-card rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#0f2442] dark:text-white">
                  <Clock3 className="h-5 w-5 text-[#15803d]" />
                  Transfer activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DynamicRecovery key={String(user?.id)} payment={dynamic} disabled={!!identity || sessionActionBusy} />
                {activityTransfers.length > 0 || dynamic.activity.length > 0 ? (
                  <div className="divide-y divide-[#e8edf5] dark:divide-white/5">
                    {dynamic.activity.map((transfer) => <DynamicActivity key={transfer.id} transfer={transfer}
                      name={beneficiaryById.get(transfer.beneficiary.id)?.full_name} />)}
                    {activityTransfers.map((transfer) => (
                      <TransferRow
                        key={transfer.id}
                        transfer={transfer}
                        provider={providerById.get(transfer.provider_id)}
                        beneficiary={beneficiaryById.get(Number(transfer.beneficiary_id))}
                        submitting={submitMutation.isPending}
                        syncing={syncMutation.isPending || sgdBusy}
                        canceling={cancelMutation.isPending || sgdBusy}
                        onSubmit={() => submitMutation.mutate(transfer.id)}
                        onSync={() => syncMutation.mutate(transfer.id)}
                        onCancel={() => cancelMutation.mutate(transfer.id)}
                        onOpen={() => {
                          if (dynamic.busy || dynamic.saved) {
                            setFormError("Resolve the active Dynamic payment before opening another instruction."); return;
                          }
                          void getTransfer({ userId: String(user!.id), token: token!, transferId: transfer.id })
                            .then((current) => { dynamic.invalidate(); setPaymentFlow("legacy"); setCreatedTransfer(current); setFormError(""); setStep("result"); })
                            .catch((failure) => setFormError(String(failure)));
                        }}
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
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#62708a]" />
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search payee's name, email, currency"
        className="h-14 rounded-2xl border-[#d7d7d2] bg-white pl-12 text-base shadow-sm dark:border-white/10 dark:bg-[#10141b]"
      />
    </div>

    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#62708a]">
        <span>All recipients</span>
        <Link to="/account/beneficiaries" className="normal-case tracking-normal text-[#15803d] transition-colors hover:text-[#15803d] hover:underline">
          Manage beneficiaries
        </Link>
      </div>

      {beneficiaries.length > 0 ? (
        <div className="divide-y divide-[#e8edf5] rounded-2xl border border-[#d7d7d2] bg-white dark:divide-white/5 dark:border-white/10 dark:bg-[#10141b]">
          {beneficiaries.map((beneficiary) => {
            const provider = providerById.get(beneficiary.provider_id);
            const eligibility = wizardBeneficiaryOption(beneficiary, provider);
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
                  fallbackClassName="bg-[#ecfdf3] text-[#15803d] dark:bg-[#15803d]/10 dark:text-[#86efac]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-semibold text-[#0f2442] dark:text-white">{beneficiary.full_name}</p>
                    <Badge className={statusBadgeClassName(beneficiary.status)}>{beneficiary.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-[#62708a] dark:text-gray-400">
                    {beneficiarySubtitle(beneficiary, provider)}
                  </p>
                  {eligibility.reason ? (
                    <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">{eligibility.reason}</p>
                  ) : null}
                </div>
                <Badge className="border-[#d7d7d2] bg-[#f3fdf9] text-[#0f2442] dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <CurrencyBadge currency={beneficiary.currency} size="compact" />
                </Badge>
                <ArrowRight className="h-5 w-5 text-[#62708a]" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c9d3e2] bg-[#f9fbfe] px-6 py-12 text-center dark:border-white/10 dark:bg-white/5">
          <UserPlus className="mx-auto h-9 w-9 text-[#15803d]" />
          <p className="mt-4 font-semibold text-[#0f2442] dark:text-white">
            {loading ? "Loading beneficiaries..." : "No usable beneficiary found"}
          </p>
          <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
            Select an available recipient to check payment terms and supported currencies.
          </p>
          <Button asChild className="mt-5 h-11 rounded-full bg-[#15803d] px-6 text-white hover:bg-[#166534]">
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
  onPurposeChange,
  payoutAmounts,
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
  onPurposeChange: (purposeCode: string) => void;
  payoutAmounts?: NiumPayoutAmounts | null;
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
          {isNiumProvider(selectedProvider?.code) && form.targetCurrency === "SGD" ? (
            <SgdLocalAmountBreakdown sourceAmount={form.sourceAmount} amounts={payoutAmounts} />
          ) : <>
          Estimated recipient amount: <strong className="text-[#0f2442] dark:text-white">{recipientAmountPresentation(selectedProvider?.code, form.targetCurrency) ?? "Unavailable"}</strong>
          <p className="mt-2">Destination currency: {form.targetCurrency}</p>
          {form.sourceCurrency !== form.targetCurrency ? <p>FX rate: Unavailable pending provider confirmation</p> : null}
          </>}
          <span className="ml-2">{payoutFeePresentation(selectedBeneficiary?.payout_method)}.</span>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#10141b]">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Payment purpose"
          value={form.purposeCode}
          selectedLabel={providerPurposeOptions.find((purpose) => purpose.code === form.purposeCode)?.label ?? form.purposeCode}
          onChange={onPurposeChange}
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

      <p className="mt-4 text-xs text-[#62708a]">
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

export const ReviewStep = ({
  form,
  provider,
  beneficiary,
  balance,
  effectiveSourceAmount,
  purposeLabel,
  creating,
  onBack,
  onSubmit,
  sgdReview,
  backDisabled = false,
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
  sgdReview?: ReactNode;
  backDisabled?: boolean;
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
        <ReviewItem label="Transfer amount" value={<CurrencyDisplay currency={form.sourceCurrency}>{formatAmount(effectiveSourceAmount, form.sourceCurrency)}</CurrencyDisplay>} />
        <ReviewItem label="Destination currency" value={form.targetCurrency} />
        {isNiumProvider(provider?.code) && form.targetCurrency === "SGD" ? <div className="sm:col-span-2">{sgdReview ? null : <SgdLocalAmountBreakdown sourceAmount={form.sourceAmount} />}</div> : <>
        <ReviewItem label="Estimated recipient amount" value={recipientAmountPresentation(provider?.code, form.targetCurrency) ?? "-"} />
        {form.sourceCurrency !== form.targetCurrency ? <ReviewItem label="FX rate" value="Unavailable pending provider confirmation" /> : null}
        <ReviewItem label="Provider fee" value="Calculated during processing" />
        </>}
        <ReviewItem label="Fee handling" value={payoutFeePresentation(beneficiary?.payout_method)} />
        <ReviewItem label="Funding source" value="Nium wallet balance" />
        <ReviewItem label="Available balance" value={balance ? <CurrencyDisplay currency={balance.currency}>{formatAmount(balance.available_balance, balance.currency)}</CurrencyDisplay> : "No synced balance"} />
        <ReviewItem label="Purpose" value={purposeLabel} />
        <ReviewItem label="Reference" value={form.referenceText || "-"} />
      </div>
    </div>

    {sgdReview}
    {sgdReview ? <Button variant="outline" disabled={backDisabled} onClick={onBack}>Back</Button> : <WizardActions
      backLabel="Back"
      nextLabel="Submit"
      loading={creating}
      onBack={onBack}
      onNext={onSubmit}
    />}
  </div>
);

export const ResultStep = ({
  transfer,
  provider,
  beneficiary,
  submitting,
  onSubmitToProvider,
  onNewPayment,
  onStartNewTransfer,
  sessionActionDisabled = false,
}: {
  transfer: Transfer | null;
  provider?: ProviderSummary | null;
  beneficiary?: Beneficiary | null;
  submitting: boolean;
  onSubmitToProvider: () => void;
  onNewPayment: () => void;
  onStartNewTransfer?: () => void;
  sessionActionDisabled?: boolean;
}) => (
  <div className="mx-auto max-w-2xl space-y-6 text-center">
    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${transfer?.status === "completed"
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
      {transfer?.status === "completed" ? <CheckCircle2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
    </div>
    <div>
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] sm:text-3xl dark:text-white">
        {paymentPresentation(transfer).title}
      </h2>
      <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
        {paymentPresentation(transfer).message}
      </p>
    </div>

    {transfer ? (
      <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 text-left shadow-sm dark:border-white/10 dark:bg-[#10141b]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#62708a]">Transfer number</p>
            <p className="mt-1 font-semibold text-[#0f2442] dark:text-white">{transfer.transfer_no}</p>
          </div>
          <Badge className={statusBadgeClassName(transfer.status)}>{transfer.status}</Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ReviewItem label="Infrastructure" value={provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME} />
          <ReviewItem label="Beneficiary" value={beneficiary?.full_name ?? `Beneficiary #${transfer.beneficiary_id}`} />
          <ReviewItem label="Transfer amount" value={<CurrencyDisplay currency={transfer.source_currency}>{formatAmount(transfer.source_amount, transfer.source_currency)}</CurrencyDisplay>} />
          {isNiumProvider(provider?.code) && transfer.target_currency === "SGD" ? <div className="sm:col-span-2"><SgdLocalAmountBreakdown sourceAmount={transfer.source_amount} amounts={transfer.payout_amounts} /></div> : <>
          <ReviewItem
            label="Estimated recipient amount"
            value={recipientAmountPresentation(provider?.code, transfer.target_currency) ?? formatAmount(transfer.target_amount, transfer.target_currency)}
          />
          <ReviewItem
            label="Provider fee"
            value={isNiumProvider(provider?.code) ? "Calculated during processing" : formatAmount(transfer.fee_amount, transfer.fee_currency)}
          />
          </>}
          <ReviewItem label="Created" value={formatDateTime(transfer.created_at)} />
        </div>

        {transfer.status === "approval_required" ? (
          <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {isNiumProvider(provider?.code) && transfer.target_currency === "SGD"
              ? "Waiting for independent Admin approval. Admin Approve & submit initiates the NIUM payout. No further customer submission is needed."
              : isNiumProvider(provider?.code)
              ? "Waiting for admin approval. This payment will be submitted automatically once approved."
              : "Admin approval is required before this payment can be submitted."}
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
      {provider && !isNiumProvider(provider.code) ? (
      <Button
        className="h-12 rounded-full bg-[#15803d] px-7 text-white hover:bg-[#166534]"
        disabled={!transfer || paymentUncertain(transfer) || !canSubmitProvider(transfer.status) || submitting}
        onClick={onSubmitToProvider}
      >
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-2 h-4 w-4" />}
        Submit payment
      </Button>
      ) : null}
      {transfer && isBlockedDraft(transfer) && onStartNewTransfer ? <Button
        className="h-12 rounded-full bg-[#15803d] px-7 text-white hover:bg-[#166534]"
        onClick={onStartNewTransfer}
        disabled={sessionActionDisabled || submitting}
      >
        Start New Transfer
      </Button> : <Button
        variant="outline"
        className="h-12 rounded-full border-[#d7d7d2] bg-white px-7 text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b] dark:text-white"
        onClick={onNewPayment}
        disabled={!transfer || !canLeavePayment(transfer)}
      >
        Start a separate payment
      </Button>}
    </div>
  </div>
);

export const PaymentSummary = ({
  provider,
  beneficiary,
  balance,
  sourceAmount,
  form,
  payoutAmounts,
  dynamicPayment,
}: {
  provider: ProviderSummary | null;
  beneficiary: Beneficiary | null;
  balance?: Balance;
  sourceAmount: number;
  form: TransferForm;
  payoutAmounts?: NiumPayoutAmounts | null;
  dynamicPayment?: ReactNode;
}) => (
  <Card role="region" aria-label="Payment summary" className="wallet-card rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
    <CardHeader>
      <CardTitle className="text-lg text-[#0f2442] dark:text-white">Payment summary</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 text-sm">
      <SummaryLine label="Infrastructure" value={provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME} />
      <SummaryLine label="Payee" value={beneficiary?.full_name ?? "Not selected"} />
      <SummaryLine label="Funding" value={isNiumProvider(provider?.code) ? "Nium wallet balance" : "Provider funding account"} />
      <SummaryLine label="Available" value={balance ? <CurrencyDisplay currency={balance.currency}>{formatAmount(balance.available_balance, balance.currency)}</CurrencyDisplay> : "No synced balance"} />
      {dynamicPayment ?? <>
      <SummaryLine label="Transfer amount" value={sourceAmount > 0 ? <CurrencyDisplay currency={form.sourceCurrency}>{formatAmount(sourceAmount, form.sourceCurrency)}</CurrencyDisplay> : "-"} />
      <SummaryLine label="Destination currency" value={form.targetCurrency} />
      {isNiumProvider(provider?.code) && form.targetCurrency === "SGD" ? <SgdLocalAmountBreakdown sourceAmount={form.sourceAmount} amounts={payoutAmounts} /> : <>
      <SummaryLine label="Estimated recipient amount" value={recipientAmountPresentation(provider?.code, form.targetCurrency) ?? "-"} />
      {form.sourceCurrency !== form.targetCurrency ? <SummaryLine label="FX rate" value="Unavailable pending provider confirmation" /> : null}
      <SummaryLine label="Provider fee" value="Calculated during processing" />
      </>}
      <SummaryLine label="Fee handling" value={payoutFeePresentation(beneficiary?.payout_method)} />
      </>}
    </CardContent>
  </Card>
);

export const TransferRow = ({
  transfer,
  provider,
  beneficiary,
  submitting,
  syncing,
  canceling,
  onSubmit,
  onSync,
  onCancel,
  onOpen,
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
  onOpen?: () => void;
}) => (
  <div className="space-y-4 px-5 py-5">
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words font-semibold text-[#0f2442] dark:text-white">{transfer.transfer_no}</p>
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
            fallbackClassName="bg-[#ecfdf3] text-[#15803d] dark:bg-[#15803d]/10 dark:text-[#86efac]"
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
            <CurrencyDisplay currency={transfer.source_currency}>{formatAmount(transfer.source_amount, transfer.source_currency)}</CurrencyDisplay>
          </p>
          {isNiumProvider(provider?.code) && transfer.target_currency === "SGD" ? <SgdLocalAmountBreakdown sourceAmount={transfer.source_amount} amounts={transfer.payout_amounts} /> : <p className="text-xs text-[#62708a] dark:text-gray-400">
            {recipientAmountPresentation(provider?.code, transfer.target_currency) ?? `Receives ${formatAmount(transfer.target_amount, transfer.target_currency)}`}
          </p>}
          {transfer.status === "submission_unknown" ? <p role="status" className="mt-2 text-sm text-amber-700">Submission outcome is unknown. Do not submit again; contact support for reconciliation.</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onOpen && <Button size="sm" variant="outline" onClick={onOpen}>Open saved payment</Button>}
        {provider && !isNiumProvider(provider.code) ? <Button
          size="sm"
          disabled={paymentUncertain(transfer) || !canSubmitProvider(transfer.status) || submitting}
          onClick={onSubmit}
          className="rounded-full bg-[#15803d] px-4 text-white hover:bg-[#166534]"
        >
          {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="mr-2 h-3.5 w-3.5" />}
          Submit
        </Button> : null}
        <Button
          size="sm"
          variant="outline"
          disabled={syncing || (isNiumProvider(provider?.code) && transfer.target_currency === "SGD"
            ? transfer.payout_workflow?.can_reconcile_status !== true : !canSync(transfer.status))}
          onClick={onSync}
          className="rounded-full border-[#d7d7d2] bg-white px-4 dark:border-white/10 dark:bg-[#10141b] dark:text-white"
        >
          {syncing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="mr-2 h-3.5 w-3.5" />}
          Sync
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!canCancelPayment(transfer) || canceling}
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {wizardSteps.map((item, index) => {
          const active = index === currentIndex;
          const complete = index < currentIndex;
          return (
            <div key={item.key} aria-current={active ? "step" : undefined} data-complete={complete} className="wallet-step flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  complete
                    ? "bg-emerald-700 text-white"
                    : active
                      ? "bg-emerald-700 text-white"
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
          className="h-full rounded-full bg-[#15803d] transition-all"
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

export const PaymentMethodChoice = ({ value, legacyLabel, disabled, lockedReason, onChange }: {
  value: PaymentFlow;
  legacyLabel: string | null;
  disabled: boolean;
  lockedReason?: string;
  onChange: (method: PaymentFlow) => void;
}) => (
  <fieldset disabled={disabled} className="mb-6 space-y-3 rounded-2xl border border-[#d7d7d2] p-4 dark:border-white/10">
    <legend className="px-2 font-semibold text-[#0f2442] dark:text-white">Payment method</legend>
    {legacyLabel && <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input type="radio" name="payment-method" value="legacy" checked={value === "legacy"}
        className="accent-emerald-700" onChange={() => onChange("legacy")} />{legacyLabel}
    </label>}
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input type="radio" name="payment-method" value="dynamic" checked={value === "dynamic"}
        className="accent-emerald-700" onChange={() => onChange("dynamic")} />Dynamic Multi-Currency
    </label>
    <p className="text-sm text-[#62708a] dark:text-gray-400">
      {lockedReason ?? "Dynamic availability and recipient currencies are verified with the provider when you select Dynamic."}
    </p>
  </fieldset>
);

const SelectedPayee = ({
  provider,
  beneficiary,
  onChangePayee,
  changeDisabled = false,
}: {
  provider: ProviderSummary | null;
  beneficiary: Beneficiary | null;
  onChangePayee: () => void;
  changeDisabled?: boolean;
}) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-[#d7d7d2] bg-[#f3fdf9] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
    <div className="flex min-w-0 items-center gap-3">
      <ProviderLogo
        provider={provider ?? undefined}
        className="h-11 w-11 shrink-0 rounded-xl"
        imageClassName="p-1"
        fallbackClassName="bg-[#ecfdf3] text-[#15803d] dark:bg-[#15803d]/10 dark:text-[#86efac]"
      />
      <div className="min-w-0">
        <p className="break-words font-semibold text-[#0f2442] dark:text-white">
          To: {beneficiary?.full_name ?? "No beneficiary selected"}
        </p>
        <p className="truncate text-sm text-[#62708a] dark:text-gray-400">
          {beneficiary ? beneficiarySubtitle(beneficiary, provider ?? undefined) : "Choose a recipient to continue"}
        </p>
      </div>
    </div>
    <Button
      variant="outline"
      className="h-10 rounded-full border-[#d7d7d2] bg-white text-[#15803d] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b]"
      onClick={onChangePayee}
      disabled={changeDisabled}
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
    <div className="grid h-12 grid-cols-[minmax(0,1fr)_132px] overflow-hidden rounded-xl border border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#10141b]">
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
            <CurrencyBadge currency={currency} size="compact" />
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
      className="h-12 rounded-full bg-[#15803d] px-8 text-white hover:bg-[#166534]"
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
    <span className="text-[#15803d]">{icon}</span>
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
  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4 border-b border-[#e8edf5] pb-3 last:border-0 last:pb-0 dark:border-white/5">
    <span className="text-[#62708a] dark:text-gray-400">{label}</span>
    <span className="min-w-0 max-w-[190px] break-words text-right [overflow-wrap:anywhere] font-semibold text-[#0f2442] dark:text-white">{value}</span>
  </div>
);

const CurrencySelectItem = ({ value }: { value: string }) => (
  <SelectItem value={value}>
    <CurrencyBadge currency={value} size="compact" />
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
