import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCcw,
  SendHorizonal,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, type OnboardingState, type ProviderCapability } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface IntegrationProvider {
  id: number;
  code: string;
  name: string;
  status: string;
}

interface ProviderAccount {
  id: number;
  status: string;
  external_customer_id?: string | null;
  external_account_id?: string | null;
  account_name?: string | null;
}

interface IntegrationLink {
  id: number;
  link_url: string;
  link_label?: string | null;
  is_active: boolean;
}

interface IntegrationRequest {
  id: number;
  status: string;
  note?: string | null;
  requested_at?: string | null;
}

interface ProviderIntegrationItem {
  provider: IntegrationProvider;
  provider_account: ProviderAccount | null;
  integration_link: IntegrationLink | null;
  integration_request: IntegrationRequest | null;
  link_available: boolean;
  can_connect: boolean;
  can_request_connect: boolean;
  request_pending: boolean;
}

interface LinkResponse {
  message?: string;
  provider_account?: ProviderAccount | null;
  onboarding?: OnboardingState | null;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const buildApiUrl = (path: string) => {
  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL");
  }

  return `${apiBaseUrl}${path}`;
};

const getResponseError = async (response: Response) => {
  try {
    const data = await response.json();
    const fieldErrors = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
    return data?.message || fieldErrors || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

const requestApi = async (
  path: string,
  {
    method = "GET",
    token,
    body,
  }: {
    method?: "GET" | "POST";
    token: string;
    body?: Record<string, unknown>;
  },
) => {
  const response = await fetch(buildApiUrl(path), {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const openExternalUrl = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const getCapability = (
  item: ProviderIntegrationItem,
  providerCapabilities: Map<string, ProviderCapability>,
) => providerCapabilities.get(item.provider.code);

const getStatusTone = (status?: string | null) => {
  const normalizedStatus = String(status ?? "").toLowerCase();

  if (["pending", "submitted", "under_review"].includes(normalizedStatus)) {
    return {
      label: "In review",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    };
  }

  if (normalizedStatus === "active") {
    return {
      label: "Connected",
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    };
  }

  if (["rejected", "failed"].includes(normalizedStatus)) {
    return {
      label: "Needs attention",
      className: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    };
  }

  if (normalizedStatus) {
    return {
      label: normalizedStatus.replace(/_/g, " "),
      className: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
    };
  }

  return {
    label: "Not started",
    className: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  };
};

const getProviderBadge = (item: ProviderIntegrationItem) => {
  if (item.provider_account) {
    return getStatusTone(item.provider_account.status);
  }

  if (item.integration_request?.status?.toLowerCase() === "pending" || item.request_pending) {
    return {
      label: "Request sent",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    };
  }

  if (item.can_connect && item.link_available) {
    return {
      label: "Ready to connect",
      className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
    };
  }

  if (item.can_request_connect) {
    return {
      label: "Request required",
      className: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
    };
  }

  return {
    label: "Unavailable",
    className: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400",
  };
};

const getProviderSummary = (
  item: ProviderIntegrationItem,
  isProfileComplete: boolean,
  capability?: ProviderCapability,
) => {
  if (!isProfileComplete) {
    return "Complete your profile first before starting or requesting provider onboarding.";
  }

  const status = item.provider_account?.status?.toLowerCase();
  if (status && ["pending", "submitted", "under_review"].includes(status)) {
    return "Your onboarding is in review. We will unlock live wallet actions after the provider approves the account.";
  }

  if (status === "active") {
    return capability?.is_configured === false
      ? "Connected for onboarding. Live sync, quote, transfer, and webhook features are not enabled yet for this provider."
      : "This provider is connected and ready for the wallet features supported by its capability flags.";
  }

  if (status && ["rejected", "failed"].includes(status)) {
    return "This provider onboarding needs attention. Contact support or retry when a new onboarding link becomes available.";
  }

  if (item.integration_request?.status?.toLowerCase() === "pending" || item.request_pending) {
    return "Your request has been sent. You can come back here to check when a connect link becomes available.";
  }

  if (item.can_connect && item.link_available) {
    return "This provider is available for onboarding now. Continue to the provider to complete the connection flow.";
  }

  if (item.can_request_connect) {
    return "A manual enablement request can be sent from this screen for this provider.";
  }

  return "This provider is not available for your account yet.";
};

const getLinkTarget = (
  onboarding: OnboardingState | null | undefined,
  item: ProviderIntegrationItem,
) => onboarding?.redirect_url || item.integration_link?.link_url || null;

const AccountIntegrations = () => {
  const { user, token, logout, onboarding, refreshSession } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [requestProvider, setRequestProvider] = useState<ProviderIntegrationItem | null>(null);
  const [requestNote, setRequestNote] = useState("Please enable this provider for my account.");
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [handledCompletionKey, setHandledCompletionKey] = useState<string | null>(null);

  const isProfileComplete = onboarding?.profile_completed ?? false;
  const selectedProviderStatus = onboarding?.selected_provider_account_status ?? null;

  const providersQuery = useQuery({
    queryKey: ["providers-reference"],
    enabled: !!token,
    queryFn: async () => {
      const payload = await requestApi("/providers", {
        method: "GET",
        token: token as string,
      });

      return Array.isArray(payload?.data) ? (payload.data as ProviderCapability[]) : [];
    },
  });

  const integrationsQuery = useQuery({
    queryKey: ["provider-integrations", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => {
      const payload = await requestApi(`/user/users/${user?.id}/provider-accounts`, {
        method: "GET",
        token: token as string,
      });

      return Array.isArray(payload?.data) ? (payload.data as ProviderIntegrationItem[]) : [];
    },
  });

  const providerCapabilities = useMemo(
    () => new Map((providersQuery.data ?? []).map((provider) => [provider.code, provider])),
    [providersQuery.data],
  );

  const refreshIntegrationState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["provider-integrations", user?.id, token] }),
      queryClient.invalidateQueries({ queryKey: ["providers-reference"] }),
      refreshSession(),
    ]);
  };

  const handleAuthError = async (message: string) => {
    if (message.includes("401") || message.includes("403")) {
      await logout();
    }
  };

  const connectMutation = useMutation({
    mutationFn: async (item: ProviderIntegrationItem) => {
      return requestApi(`/user/users/${user?.id}/provider-accounts/${item.provider.code}/link`, {
        method: "POST",
        token: token as string,
        body: {
          force: false,
        },
      }) as Promise<LinkResponse>;
    },
    onSuccess: async (payload, item) => {
      const nextMessage =
        payload?.onboarding?.message || payload?.message || `${item.provider.name} onboarding started successfully.`;
      setRuntimeMessage(nextMessage);
      await refreshIntegrationState();

      const targetUrl = getLinkTarget(payload?.onboarding, item);
      if (targetUrl) {
        openExternalUrl(targetUrl);
      }

      toast({
        title: item.provider.name,
        description: nextMessage,
      });
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : "Unable to start provider onboarding.";
      await handleAuthError(message);
      toast({
        variant: "destructive",
        title: "Connect failed",
        description: message,
      });
    },
  });

  const requestConnectMutation = useMutation({
    mutationFn: async ({ providerCode, note }: { providerCode: string; note: string }) => {
      return requestApi(`/user/users/${user?.id}/provider-accounts/${providerCode}/request-connect`, {
        method: "POST",
        token: token as string,
        body: {
          note,
        },
      });
    },
    onSuccess: async (payload) => {
      toast({
        title: "Request submitted",
        description: payload?.message || "Provider connection request submitted successfully.",
      });
      setRequestProvider(null);
      setRequestNote("Please enable this provider for my account.");
      await refreshIntegrationState();
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : "Unable to submit request.";
      await handleAuthError(message);
      toast({
        variant: "destructive",
        title: "Request failed",
        description: message,
      });
    },
  });

  const completionMutation = useMutation({
    mutationFn: async ({
      providerCode,
      status,
      externalCustomerId,
      externalAccountId,
      accountName,
    }: {
      providerCode: string;
      status?: string | null;
      externalCustomerId?: string | null;
      externalAccountId?: string | null;
      accountName?: string | null;
    }) => {
      return requestApi(`/user/users/${user?.id}/provider-accounts/${providerCode}/complete`, {
        method: "POST",
        token: token as string,
        body: {
          ...(status ? { status } : {}),
          ...(externalCustomerId ? { external_customer_id: externalCustomerId } : {}),
          ...(externalAccountId ? { external_account_id: externalAccountId } : {}),
          ...(accountName ? { account_name: accountName } : {}),
        },
      });
    },
    onSuccess: async (payload) => {
      toast({
        title: "Onboarding updated",
        description: payload?.message || "Provider onboarding completion was processed successfully.",
      });
      await refreshIntegrationState();
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : "Unable to complete provider onboarding.";
      await handleAuthError(message);
      toast({
        variant: "destructive",
        title: "Completion failed",
        description: message,
      });
    },
  });

  useEffect(() => {
    if (!user?.id || !token || completionMutation.isPending) {
      return;
    }

    const providerCode = searchParams.get("provider") || searchParams.get("provider_code");
    const status = searchParams.get("status");
    const externalCustomerId = searchParams.get("external_customer_id");
    const externalAccountId = searchParams.get("external_account_id");
    const accountName = searchParams.get("account_name");
    const completionKey = [
      providerCode,
      status,
      externalCustomerId,
      externalAccountId,
      accountName,
    ].join("|");

    if (!providerCode || (!status && !externalCustomerId && !externalAccountId && !accountName)) {
      return;
    }

    if (handledCompletionKey === completionKey) {
      return;
    }

    setHandledCompletionKey(completionKey);

    completionMutation.mutate({
      providerCode,
      status,
      externalCustomerId,
      externalAccountId,
      accountName,
    });
  }, [completionMutation, handledCompletionKey, searchParams, token, user?.id]);

  const providerItems = integrationsQuery.data ?? [];

  return (
    <div className="bg-[#f8f8f6] px-7 py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111] dark:text-white">Integrations</h1>
            <p className="max-w-3xl text-[1.05rem] text-[#6c6c68] dark:text-gray-400">
              Review onboarding-ready providers, start a provider connection, and request access when a manual onboarding
              link still needs to be assigned to your account.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void refreshIntegrationState()}
            disabled={integrationsQuery.isFetching || providersQuery.isFetching}
            className="h-11 rounded-full border-[#d7d7d2] bg-white px-6 text-[1rem] font-semibold text-[#232323] hover:bg-[#f5f5f2] dark:border-white/10 dark:bg-[#1b2027] dark:text-white dark:hover:bg-white/10"
          >
            {integrationsQuery.isFetching || providersQuery.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh providers
          </Button>
        </div>

        {!isProfileComplete && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Complete your profile before connecting a provider.</p>
                <p className="text-sm">
                  {onboarding?.message || "Profile completion is required before provider onboarding can continue."}{" "}
                  <Link to="/account/settings/profile" className="font-semibold underline underline-offset-4">
                    Update profile
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {(runtimeMessage || onboarding?.message) && (
          <div className="mb-6 rounded-2xl border border-[#d7d7d2] bg-white px-5 py-4 text-[#232323] dark:border-white/10 dark:bg-[#1b2027] dark:text-white">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#4f46e5] dark:text-[#8b83ff]" />
              <div className="space-y-1">
                <p className="font-semibold">Current onboarding status</p>
                <p className="text-sm text-[#5f5f5a] dark:text-gray-400">{runtimeMessage || onboarding?.message}</p>
                {selectedProviderStatus && (
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7a7a74] dark:text-gray-500">
                    Selected provider status: {selectedProviderStatus}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {(integrationsQuery.error || providersQuery.error) && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-900">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load integrations</p>
                <p className="text-sm">
                  {integrationsQuery.error instanceof Error
                    ? integrationsQuery.error.message
                    : providersQuery.error instanceof Error
                      ? providersQuery.error.message
                      : "Something went wrong while loading provider data."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {providerItems.map((item) => {
            const capability = getCapability(item, providerCapabilities);
            const badge = getProviderBadge(item);
            const providerStatus = item.provider_account?.status?.toLowerCase();
            const canOpenConnect = isProfileComplete && item.can_connect && item.link_available;
            const canRequestConnect = isProfileComplete && item.can_request_connect && !item.request_pending;
            const needsAttention = providerStatus === "rejected" || providerStatus === "failed";

            return (
              <Card
                key={item.provider.code}
                className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]"
              >
                <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4f46e5]/10 text-[#4f46e5] dark:bg-[#4f46e5]/15 dark:text-[#8b83ff]">
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-[1.2rem] font-semibold text-[#232323] dark:text-white">{item.provider.name}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badge.className}`}>
                          {badge.label}
                        </span>
                        {capability?.is_available_for_onboarding && (
                          <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4338ca] dark:bg-[#4f46e5]/15 dark:text-[#b6b1ff]">
                            Onboarding enabled
                          </span>
                        )}
                      </div>

                      <p className="max-w-3xl text-[1.02rem] leading-7 text-[#6f6f6b] dark:text-gray-400">
                        {getProviderSummary(item, isProfileComplete, capability)}
                      </p>

                      <div className="flex flex-wrap gap-3 text-sm text-[#6f6f6b] dark:text-gray-400">
                        <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">Code: {item.provider.code}</span>
                        <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">Provider status: {item.provider.status}</span>
                        <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">
                          {capability?.is_configured === false ? "Manual onboarding only" : "Live API features may be available"}
                        </span>
                        {item.integration_request?.requested_at && (
                          <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">
                            Requested: {new Date(item.integration_request.requested_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {capability?.supports_data_sync && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f2] px-3 py-1 text-xs font-medium text-[#4b4b45] dark:bg-white/5 dark:text-gray-300">
                            <Zap className="h-3.5 w-3.5" />
                            Sync enabled
                          </span>
                        )}
                        {capability?.supports_quotes && (
                          <span className="rounded-full bg-[#f5f5f2] px-3 py-1 text-xs font-medium text-[#4b4b45] dark:bg-white/5 dark:text-gray-300">
                            Quotes enabled
                          </span>
                        )}
                        {capability?.supports_transfers && (
                          <span className="rounded-full bg-[#f5f5f2] px-3 py-1 text-xs font-medium text-[#4b4b45] dark:bg-white/5 dark:text-gray-300">
                            Transfers enabled
                          </span>
                        )}
                        {capability?.is_configured === false && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-medium text-[#c2410c] dark:bg-orange-500/10 dark:text-orange-300">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Live API not configured
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-3 sm:min-w-[240px]">
                    {canOpenConnect && (
                      <Button
                        className="h-11 rounded-full bg-[#4f46e5] px-7 text-[1rem] font-semibold text-white hover:bg-[#4338ca] dark:shadow-[0_12px_24px_rgba(79,70,229,0.22)]"
                        onClick={() => connectMutation.mutate(item)}
                        disabled={connectMutation.isPending}
                      >
                        {connectMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        {item.integration_link?.link_label || "Connect provider"}
                      </Button>
                    )}

                    {!canOpenConnect && item.can_request_connect && !item.request_pending && (
                      <Button
                        variant="outline"
                        disabled={!canRequestConnect || requestConnectMutation.isPending}
                        className="h-11 rounded-full border-[#4f46e5] px-7 text-[1rem] font-semibold text-[#4f46e5] hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#8b83ff] dark:text-[#b6b1ff] dark:hover:bg-[#4f46e5]/10"
                        onClick={() => {
                          if (!canRequestConnect) {
                            return;
                          }
                          setRequestProvider(item);
                          setRequestNote(item.integration_request?.note || "Please enable this provider for my account.");
                        }}
                      >
                        <SendHorizonal className="mr-2 h-4 w-4" />
                        Request connect
                      </Button>
                    )}

                    {!isProfileComplete && (item.can_connect || item.can_request_connect) && (
                      <p className="text-center text-xs font-medium text-amber-700 dark:text-amber-400">
                        Complete profile to enable this action.
                      </p>
                    )}

                    {!canOpenConnect && item.request_pending && (
                      <Button disabled className="h-11 rounded-full bg-[#eab308] text-[1rem] font-semibold text-white hover:bg-[#eab308]">
                        <Clock3 className="mr-2 h-4 w-4" />
                        Request pending
                      </Button>
                    )}

                    {!canOpenConnect && item.provider_account?.status?.toLowerCase() === "active" && (
                      <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#15803d] dark:bg-green-500/10 dark:text-green-400">
                        <BadgeCheck className="h-4 w-4" />
                        Connected
                      </div>
                    )}

                    {needsAttention && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                        Onboarding needs attention. Contact support or retry when a fresh connect link is available.
                      </div>
                    )}

                    {!canOpenConnect && !item.request_pending && !item.provider_account && !item.can_request_connect && (
                      <div className="rounded-2xl border border-dashed border-[#d7d7d2] px-4 py-3 text-sm text-[#6f6f6b] dark:border-white/10 dark:text-gray-400">
                        <div className="inline-flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          No connect link available yet.
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(integrationsQuery.isLoading || providersQuery.isLoading) && (
            <Card className="rounded-2xl border border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
              <CardContent className="flex items-center gap-3 p-6 text-[#6f6f6b] dark:text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading provider integrations...
              </CardContent>
            </Card>
          )}

          {!integrationsQuery.isLoading && !integrationsQuery.error && providerItems.length === 0 && (
            <Card className="rounded-2xl border border-dashed border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
              <CardContent className="p-6 text-[#6f6f6b] dark:text-gray-400">
                No onboarding-capable providers were returned for this account yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!requestProvider} onOpenChange={(open) => !open && !requestConnectMutation.isPending && setRequestProvider(null)}>
        <DialogContent className="rounded-3xl border-[#d7d7d2] bg-white sm:max-w-xl dark:border-white/10 dark:bg-[#1b2027]">
          <DialogHeader>
            <DialogTitle className="text-[#111111] dark:text-white">Request provider access</DialogTitle>
            <DialogDescription>
              {requestProvider
                ? `Send a request to enable ${requestProvider.provider.name} for your account.`
                : "Send a request to enable this provider for your account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-[#6f6f6b] dark:text-gray-400">
              The note is optional, but it helps explain what you need from the provider connection.
            </p>
            <Textarea
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              rows={5}
              placeholder="Please enable this provider for my account."
              className="rounded-2xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#11161d]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={requestConnectMutation.isPending}
              onClick={() => setRequestProvider(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full bg-[#4f46e5] text-white hover:bg-[#4338ca]"
              disabled={!requestProvider || requestConnectMutation.isPending || !isProfileComplete}
              onClick={() => {
                if (!requestProvider || !isProfileComplete) {
                  return;
                }

                requestConnectMutation.mutate({
                  providerCode: requestProvider.provider.code,
                  note: requestNote.trim(),
                });
              }}
            >
              {requestConnectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountIntegrations;
