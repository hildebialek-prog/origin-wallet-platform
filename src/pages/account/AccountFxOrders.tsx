import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  RefreshCcw,
  SendHorizonal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProviderLogo } from "@/components/account/ProviderLogo";
import {
  createFxOrder,
  getFxOrders,
  getProviderRates,
  getProviders,
  type FxOrder,
  type ProviderRate,
} from "@/services/fxOrderService";
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
import { getProviderDisplayName, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";
import { isVerifiedKycStatus, normalizeStatus } from "@/lib/status";

const currencyOptions = ["USD", "EUR", "GBP", "AUD", "CAD", "CHF", "JPY", "KRW", "NZD", "SGD", "THB", "VND"];

const formatNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(numeric)
    : String(value);
};

const formatAmount = (value?: string | number | null, currency?: string | null) => {
  const formatted = formatNumber(value);
  return formatted === "-" ? "-" : `${formatted} ${currency || ""}`.trim();
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const statusClassName = (status?: string | null) => {
  const normalized = normalizeStatus(status);

  if (normalized === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (normalized === "rejected") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }

  if (normalized === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300";
};

const getOrderIcon = (status: string) => {
  const normalized = normalizeStatus(status);

  if (normalized === "confirmed") return CheckCircle2;
  if (normalized === "rejected") return AlertCircle;
  return Clock3;
};

const getRateValue = (rate?: ProviderRate | null) => rate?.quote?.net_rate ?? rate?.quote?.mid_rate ?? null;

const AccountFxOrders = () => {
  const { user, token, logout } = useAuth();
  const queryClient = useQueryClient();
  const [providerId, setProviderId] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState("USD");
  const [targetCurrency, setTargetCurrency] = useState("VND");
  const [sourceAmount, setSourceAmount] = useState("1000");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const numericAmount = Number(sourceAmount);

  const providersQuery = useQuery({
    queryKey: ["fx-order-providers"],
    enabled: !!token,
    queryFn: async () => {
      const payload = await getProviders();
      return payload.data.filter((provider) => provider.status === "active");
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["fx-orders", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getFxOrders({ userId: user?.id as string, token: token as string }),
  });

  const ratesQuery = useQuery({
    queryKey: ["fx-order-rates", sourceCurrency, targetCurrency, numericAmount, token],
    enabled: !!token && Number.isFinite(numericAmount) && numericAmount > 0 && sourceCurrency !== targetCurrency,
    queryFn: async () =>
      getProviderRates({
        token: token as string,
        sourceCurrency,
        targetCurrency,
        sourceAmount: numericAmount,
      }),
  });

  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const orders = ordersQuery.data ?? [];
  const selectedProvider = providers.find((provider) => String(provider.id) === providerId) ?? null;
  const selectedRate = useMemo(
    () => ratesQuery.data?.data.find((rate) => String(rate.provider.id) === providerId) ?? null,
    [providerId, ratesQuery.data?.data],
  );
  const quote = selectedRate?.quote ?? null;
  const verifiedForOrders = isVerifiedKycStatus(user?.kycStatus);
  const canCreateOrder = Boolean(
    user?.id && token && providerId && numericAmount > 0 && sourceCurrency !== targetCurrency && verifiedForOrders,
  );

  useEffect(() => {
    if (!providers.length) return;

    if (!providerId || !providers.some((provider) => String(provider.id) === providerId)) {
      setProviderId(String(providers[0].id));
    }
  }, [providerId, providers]);

  const refreshOrders = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["fx-orders", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["fx-order-rates"] }),
    ]);
  };

  const handleAuthError = async (message: string) => {
    if (message.includes("401") || message.includes("403")) {
      await logout();
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!canCreateOrder || !selectedProvider) {
        throw new Error("FX rail, currency pair, and valid source amount are required first.");
      }

      return createFxOrder({
        token: token as string,
        userId: user?.id as string,
        providerId: Number(providerId),
        sourceCurrency,
        targetCurrency,
        sourceAmount: numericAmount,
        targetAmount: quote?.target_amount ?? null,
        fxRate: getRateValue(selectedRate),
        feeAmount: quote?.fee_amount ?? 0,
        feeCurrency: targetCurrency,
        rawData: {
          source: "origin_wallet_web",
          provider_code: selectedProvider.code,
          quote_status: selectedRate?.quote_status ?? "manual",
          customer_note: note.trim() || null,
        },
      });
    },
    onSuccess: async (payload) => {
      await refreshOrders();
      setFormError("");
      setNote("");
      toast({
        title: "FX order submitted",
        description: payload.message || `${payload.order.order_no} is pending admin confirmation.`,
      });
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : "Unable to submit FX order.";
      await handleAuthError(message);
      setFormError(message);
      toast({
        variant: "destructive",
        title: "Order failed",
        description: message,
      });
    },
  });

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const confirmedOrders = orders.filter((order) => order.status === "confirmed");
  const rejectedOrders = orders.filter((order) => order.status === "rejected");

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[2.35rem] font-bold tracking-[-0.04em] text-[#0f2442] sm:text-[3.2rem] dark:text-white">
              FX Orders
            </h1>
            <p className="mt-2 max-w-3xl text-[1.05rem] leading-7 text-[#62708a] dark:text-gray-400">
              Submit an FX instruction for operations review. Orders stay pending until Origin Wallet confirms them.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void refreshOrders()}
            disabled={ordersQuery.isFetching || ratesQuery.isFetching}
            className="h-11 rounded-full border-[#d7d7d2] bg-white px-6 text-[1rem] font-semibold text-[#0f2442] hover:border-[#16a34a] hover:bg-[#ecfdf3] dark:border-white/10 dark:bg-[#1b2027] dark:text-white dark:hover:bg-white/10"
          >
            {ordersQuery.isFetching || ratesQuery.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {!verifiedForOrders && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">KYC/KYB approval is required before submitting FX orders.</p>
                <p className="text-sm">
                  Your current account status is {user?.kycStatus || "pending"}.{" "}
                  <Link to="/account/kyc" className="font-semibold underline underline-offset-4">
                    Review KYC/KYB
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-[#0f2442] dark:text-white">
                <SendHorizonal className="h-5 w-5 text-[#16a34a]" />
                New FX order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Infrastructure rail</Label>
                <div className="flex h-12 items-center gap-2 rounded-xl border border-[#d7d7d2] bg-white px-4 dark:border-white/10 dark:bg-[#11161d]">
                  {selectedProvider ? (
                    <ProviderLogo
                      provider={selectedProvider}
                      className="h-7 w-7 rounded-lg"
                      imageClassName="p-0.5"
                      fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
                    />
                  ) : null}
                  <span className="font-semibold text-[#0f2442] dark:text-white">
                    {selectedProvider ? getProviderDisplayName(selectedProvider) : PRIMARY_PROVIDER_NAME}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Source currency</Label>
                  <Select value={sourceCurrency} onValueChange={setSourceCurrency}>
                    <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#11161d]">
                      <SelectValue>
                        <span translate="no">{sourceCurrency}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          <span translate="no">{currency}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target currency</Label>
                  <Select value={targetCurrency} onValueChange={setTargetCurrency}>
                    <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#11161d]">
                      <SelectValue>
                        <span translate="no">{targetCurrency}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          <span translate="no">{currency}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source_amount">Amount to send</Label>
                <Input
                  id="source_amount"
                  inputMode="decimal"
                  value={sourceAmount}
                  onChange={(event) => setSourceAmount(event.target.value)}
                  className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#11161d]"
                />
              </div>

              <div className="rounded-2xl border border-[#d7d7d2] bg-[#f8f8f6] p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a7a74] dark:text-gray-500">
                  Rate preview
                </div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[#62708a] dark:text-gray-400">Infrastructure</p>
                    <div className="mt-1 flex items-center gap-2">
                      {selectedProvider ? (
                        <ProviderLogo
                          provider={selectedProvider}
                          className="h-7 w-7 rounded-lg"
                          imageClassName="p-0.5"
                          fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
                        />
                      ) : null}
                      <p className="font-semibold text-[#0f2442] dark:text-white">{selectedProvider ? getProviderDisplayName(selectedProvider) : "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[#62708a] dark:text-gray-400">Quote status</p>
                    <p className="font-semibold text-[#0f2442] dark:text-white">{selectedRate?.quote_status || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[#62708a] dark:text-gray-400">Estimated receive</p>
                    <p className="font-semibold text-[#0f2442] dark:text-white">
                      {formatAmount(quote?.target_amount, targetCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#62708a] dark:text-gray-400">Rate / fee</p>
                    <p className="font-semibold text-[#0f2442] dark:text-white">
                      {formatNumber(getRateValue(selectedRate))} / {formatAmount(quote?.fee_amount ?? 0, targetCurrency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Customer note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  placeholder="Optional instruction for operations"
                  className="rounded-2xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#11161d]"
                />
              </div>

              {formError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{formError}</div>
              )}

              <Button
                className="h-12 w-full rounded-full bg-[#16a34a] text-[1rem] font-semibold text-white hover:bg-[#15803d]"
                disabled={!canCreateOrder || createOrderMutation.isPending}
                onClick={() => createOrderMutation.mutate()}
              >
                {createOrderMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="mr-2 h-4 w-4" />
                )}
                Submit pending order
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Pending", value: pendingOrders.length },
                { label: "Confirmed", value: confirmedOrders.length },
                { label: "Rejected", value: rejectedOrders.length },
              ].map((item) => (
                <Card key={item.label} className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
                  <CardContent className="p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a7a74] dark:text-gray-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-[#0f2442] dark:text-white">{item.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-[#0f2442] dark:text-white">
                  <ClipboardList className="h-5 w-5 text-[#16a34a]" />
                  My FX orders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {orders.length > 0 ? (
                  <div className="divide-y divide-[#ecece7] dark:divide-white/5">
                    {orders.map((order) => {
                      const StatusIcon = getOrderIcon(order.status);

                      return (
                        <OrderRow key={order.id} order={order} StatusIcon={StatusIcon} />
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-14 text-center">
                    <p className="text-[1.05rem] font-medium text-[#202020] dark:text-white">
                      {ordersQuery.isLoading ? "Loading FX orders..." : "No FX orders yet"}
                    </p>
                    <p className="mt-2 text-sm text-[#6b6b6b] dark:text-gray-400">
                      Submitted FX instructions will appear here while they wait for admin confirmation.
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

const OrderRow = ({
  order,
  StatusIcon,
}: {
  order: FxOrder;
  StatusIcon: typeof Clock3;
}) => (
  <div className="grid gap-4 px-5 py-5 text-sm md:grid-cols-[1.1fr_0.95fr_0.95fr_0.8fr] md:items-center">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <StatusIcon className="h-4 w-4 text-[#6b6b6b] dark:text-gray-400" />
        <p className="font-semibold text-[#202020] dark:text-white">{order.order_no}</p>
      </div>
      <p className="mt-1 text-xs text-[#6b6b6b] dark:text-gray-400">{formatDate(order.created_at)}</p>
    </div>

    <div className="flex min-w-0 items-center gap-2">
      <ProviderLogo
        provider={order.provider}
        className="h-8 w-8 rounded-lg"
        imageClassName="p-0.5"
        fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#202020] dark:text-white">
          {order.provider ? getProviderDisplayName(order.provider) : PRIMARY_PROVIDER_NAME}
        </p>
        <p className="mt-1 truncate text-xs text-[#6b6b6b] dark:text-gray-400">
          {order.provider?.code || "Origin Wallet platform"}
        </p>
      </div>
    </div>

    <div>
      <p className="font-semibold text-[#202020] dark:text-white">
        {formatAmount(order.source_amount, order.source_currency)}
      </p>
      <p className="mt-1 text-xs text-[#6b6b6b] dark:text-gray-400">
        {formatAmount(order.target_amount, order.target_currency)}
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-2 md:justify-end">
      <Badge className={statusClassName(order.status)}>{order.status}</Badge>
      <span className="text-xs text-[#6b6b6b] dark:text-gray-400">
        Rate {formatNumber(order.fx_rate)}
      </span>
    </div>
  </div>
);

export default AccountFxOrders;
