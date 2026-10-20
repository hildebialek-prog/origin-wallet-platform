import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, Home, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/contexts/AuthContext";
import { getProviderDisplayName, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";
import {
  VirtualAccountOperationTracker,
  type VirtualAccountRequestSnapshot,
} from "@/lib/virtualAccountOperation";
import {
  getProviderIntegrations,
  getProviderReference,
  requestVirtualAccount,
  type VirtualAccountCategory,
  type VirtualAccountType,
} from "@/services/providerAccountService";

const virtualAccountCurrencies = [
  "AED",
  "AUD",
  "CAD",
  "CHF",
  "CNH",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "ILS",
  "JPY",
  "MXN",
  "NOK",
  "NZD",
  "PLN",
  "RON",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "USD",
  "ZAR",
];

const AccountVirtualAccountRequest = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const operationTracker = useMemo(
    () =>
      new VirtualAccountOperationTracker(
        undefined,
        typeof window !== "undefined" ? window.sessionStorage : undefined,
        `origin-wallet:virtual-account-operation:${user?.id ?? "anonymous"}`,
    ),
    [user?.id],
  );
  const restoredOperation = useMemo(() => operationTracker.current(), [operationTracker]);
  const [providerCode, setProviderCode] = useState(restoredOperation?.request.providerCode ?? "");
  const [currency, setCurrency] = useState(restoredOperation?.request.currency ?? "USD");
  const [accountCategory, setAccountCategory] = useState<VirtualAccountCategory>(
    (restoredOperation?.request.accountCategory as VirtualAccountCategory | undefined) ?? "SELF_FUNDING_ACCOUNT",
  );
  const [accountType, setAccountType] = useState<VirtualAccountType>(
    (restoredOperation?.request.accountType as VirtualAccountType | undefined) ?? "LOCAL",
  );
  const [alias, setAlias] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [pendingOperation, setPendingOperation] = useState(restoredOperation);
  const [hasLegacyOperation, setHasLegacyOperation] = useState(operationTracker.hasUnrestorableOperation());

  useEffect(() => {
    const restored = operationTracker.current();
    setPendingOperation(restored);
    setHasLegacyOperation(operationTracker.hasUnrestorableOperation());

    if (restored) {
      setProviderCode(restored.request.providerCode);
      setCurrency(restored.request.currency);
      setAccountCategory(restored.request.accountCategory as VirtualAccountCategory);
      setAccountType(restored.request.accountType as VirtualAccountType);
    }
  }, [operationTracker]);

  const providersQuery = useQuery({
    queryKey: ["provider-reference", token],
    enabled: !!token,
    queryFn: async () => getProviderReference({ token: token as string }),
    retry: false,
  });
  const integrationsQuery = useQuery({
    queryKey: ["provider-integrations", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getProviderIntegrations({ userId: user?.id as string, token: token as string }),
    retry: false,
  });

  const providers = useMemo(() => (providersQuery.data ?? []).filter((provider) => provider.status === "active"), [providersQuery.data]);
  const selectedProvider = providers.find((provider) => provider.code.toLowerCase() === providerCode.toLowerCase());
  const selectedIntegration = (integrationsQuery.data ?? []).find(
    (integration) => integration.provider.code.toLowerCase() === providerCode.toLowerCase(),
  );
  const eligibilityLoading = providersQuery.isLoading || integrationsQuery.isLoading;
  const eligibilityUnavailable = providersQuery.isError || integrationsQuery.isError || !selectedProvider || !selectedIntegration;
  const canRequestVirtualAccount = !eligibilityLoading
    && !eligibilityUnavailable
    && selectedIntegration.can_request_virtual_account === true;
  const eligibilityMessage = eligibilityLoading
    ? "Checking virtual account eligibility..."
    : canRequestVirtualAccount
      ? "Account ready for virtual account requests."
      : selectedIntegration?.virtual_account_eligibility_reason === "kyb_approval_pending"
        ? "KYB approval pending. Virtual account requests will be available after approval."
        : "Account setup or verification incomplete. Virtual account requests are unavailable for now.";
  const requestSnapshot: VirtualAccountRequestSnapshot = {
    providerCode,
    currency,
    accountCategory,
    accountType,
  };
  const hasChangedPendingRequest = pendingOperation !== null && !operationTracker.matches(requestSnapshot);

  useEffect(() => {
    if (!providerCode && providers.length > 0) {
      setProviderCode(providers[0].code);
    }
  }, [providerCode, providers]);

  const requestMutation = useMutation({
    mutationFn: async (requestedSnapshot: VirtualAccountRequestSnapshot) => {
      if (!requestedSnapshot.providerCode) {
        throw new Error("Account setup is required.");
      }

      const requestedIntegration = (integrationsQuery.data ?? []).find(
        (integration) => integration.provider.code.toLowerCase() === requestedSnapshot.providerCode.toLowerCase(),
      );
      if (!requestedIntegration?.can_request_virtual_account) {
        throw new Error("This provider account is not eligible for virtual account requests yet.");
      }

      const operation = operationTracker.getOrCreate(requestedSnapshot);
      setPendingOperation(operation);
      setHasLegacyOperation(false);

      return requestVirtualAccount({
        userId: user?.id as string,
        token: token as string,
        providerCode: operation.request.providerCode,
        currency: operation.request.currency,
        accountCategory: operation.request.accountCategory as VirtualAccountCategory,
        accountType: operation.request.accountType as VirtualAccountType,
        operationId: operation.operationId,
      });
    },
    retry: false,
    onSuccess: (payload) => {
      operationTracker.reset();
      setPendingOperation(null);
      setHasLegacyOperation(false);
      setFormError("");
      toast({
        title: "Request submitted",
        description: payload.message || "Your virtual account was assigned successfully.",
      });
      navigate("/account/virtual-accounts?tab=pending");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to request virtual account.";
      setFormError(message);
      toast({ variant: "destructive", title: "Request failed", description: message });
    },
  });

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-[#62708a] dark:text-gray-400">
          <Home className="h-4 w-4" />
          <Link to="/account/virtual-accounts" className="hover:text-[#16a34a] dark:hover:text-white">
            Virtual accounts
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#0f2442] dark:text-white">Request</span>
        </div>

        <h1 className="mb-4 text-[2.35rem] font-bold tracking-[-0.04em] text-[#0f2442] sm:text-[3.2rem] dark:text-white">
          Request virtual account
        </h1>
        <p className="mb-10 max-w-2xl text-[1.05rem] leading-7 text-[#62708a] dark:text-gray-400">
          Choose the receiving account details for your provider-approved account. Each confirmed request may create a new
          virtual account, including another account in the same currency.
        </p>

        <div className="max-w-[36rem] space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-[#0f2442] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <p className="font-semibold">Choose the receiving account type carefully</p>
                <p className="leading-6 text-[#53627a] dark:text-amber-50/80">
                  Currency, account category, and account type determine how the receiving account can be funded and used.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d7d7d2] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#151b24]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#62708a] dark:text-gray-400">
              Infrastructure rail
            </p>
            <p className="mt-1 text-[1rem] font-semibold text-[#0f2442] dark:text-white">
              {selectedProvider ? getProviderDisplayName(selectedProvider) : PRIMARY_PROVIDER_NAME}
            </p>
            <p
              className={`mt-2 text-sm leading-6 ${
                canRequestVirtualAccount
                  ? "text-[#15803d] dark:text-emerald-300"
                  : "text-[#62708a] dark:text-gray-400"
              }`}
            >
              {eligibilityMessage}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#151b24] dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {virtualAccountCurrencies.map((item) => (
                  <SelectItem key={item} value={item} translate="no">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Account category</Label>
              <Select
                value={accountCategory}
                onValueChange={(value) => setAccountCategory(value as VirtualAccountCategory)}
              >
                <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#151b24] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELF_FUNDING_ACCOUNT">Self-funding account</SelectItem>
                  <SelectItem value="COLLECTION_ACCOUNT">Collection account</SelectItem>
                  <SelectItem value="SELF_FUNDING_AND_COLLECTION_ACCOUNT">
                    Self-funding and collection
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account type</Label>
              <Select value={accountType} onValueChange={(value) => setAccountType(value as VirtualAccountType)}>
                <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#151b24] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCAL">Local</SelectItem>
                  <SelectItem value="WIRES">Wires</SelectItem>
                  <SelectItem value="LOCAL_AND_WIRES">Local and wires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Account alias (local reference only)</Label>
            <Input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              className="h-12 rounded-xl border-[#d7d7d2] bg-white text-[1rem] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
              placeholder="Enter new account name"
            />
          </div>

          <div className="space-y-2">
            <Label>Store link (local reference only)</Label>
            <Input
              value={storeLink}
              onChange={(event) => setStoreLink(event.target.value)}
              className="h-12 rounded-xl border-[#d7d7d2] bg-white text-[1rem] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label>Additional note (local reference only)</Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="rounded-2xl border-[#d7d7d2] bg-white text-[1rem] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
            />
            <p className="text-sm leading-6 text-[#62708a] dark:text-gray-400">
              Account alias, store link, and note are not currently sent to or persisted by the virtual account API.
            </p>
          </div>

          {formError ? (
            <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <p>{formError}</p>
              <p className="font-normal leading-6">
                The original request remains saved for a safe retry. Starting a separate request may create another real
                virtual account, including another USD virtual account.
              </p>
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => {
                  operationTracker.reset();
                  setPendingOperation(null);
                  setHasLegacyOperation(false);
                  setFormError("");
                }}
              >
                Start a separate VA request
              </button>
            </div>
          ) : null}

          {hasLegacyOperation ? (
            <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-[#0f2442] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="font-semibold">A previous unresolved request needs your decision</p>
              <p className="leading-6 text-[#53627a] dark:text-amber-50/80">
                Its original account parameters were not saved by the earlier page version, so it cannot be retried safely.
                Starting a separate request may create another real virtual account, including another USD virtual account.
              </p>
              <button
                type="button"
                className="font-semibold underline underline-offset-4"
                disabled={requestMutation.isPending}
                onClick={() => {
                  operationTracker.reset();
                  setHasLegacyOperation(false);
                  setFormError("");
                }}
              >
                Start a separate VA request
              </button>
            </div>
          ) : null}

          {hasChangedPendingRequest && pendingOperation ? (
            <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-[#0f2442] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="font-semibold">These details differ from your unresolved request</p>
              <p className="leading-6 text-[#53627a] dark:text-amber-50/80">
                Resume the original {pendingOperation.request.currency} request with its saved operation ID, or deliberately
                start a separate request. A separate request may create another real virtual account, including another USD
                virtual account.
              </p>
              <div className="flex flex-wrap gap-4 font-semibold">
                <button
                  type="button"
                  className="underline underline-offset-4"
                  disabled={requestMutation.isPending || !canRequestVirtualAccount}
                  onClick={() => {
                    const original = pendingOperation.request;
                    setProviderCode(original.providerCode);
                    setCurrency(original.currency);
                    setAccountCategory(original.accountCategory as VirtualAccountCategory);
                    setAccountType(original.accountType as VirtualAccountType);
                    setFormError("");
                    requestMutation.mutate(original);
                  }}
                >
                  Resume original request
                </button>
                <button
                  type="button"
                  className="underline underline-offset-4"
                  disabled={requestMutation.isPending}
                  onClick={() => {
                    operationTracker.reset();
                    setPendingOperation(null);
                    setHasLegacyOperation(false);
                    setFormError("");
                  }}
                >
                  Start a separate VA request
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-4 pt-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#d7d7d2] bg-white px-5 text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
            >
              <Link to="/account/virtual-accounts">Cancel</Link>
            </Button>
            <Button
              disabled={
                requestMutation.isPending
                || hasChangedPendingRequest
                || hasLegacyOperation
                || !canRequestVirtualAccount
              }
              onClick={() => requestMutation.mutate(requestSnapshot)}
              className="rounded-full bg-[#16a34a] px-7 text-[1rem] font-semibold text-white hover:bg-[#15803d]"
            >
              {requestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm and request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountVirtualAccountRequest;
