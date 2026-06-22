import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCcw,
  SendHorizonal,
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
import { ProviderLogo } from "@/components/account/ProviderLogo";
import { formatStatusLabel, isVerifiedKycStatus, normalizeStatus } from "@/lib/status";
import {
  completeProviderAccount,
  getProviderIntegrations,
  getProviderReference,
  linkProviderAccount,
  requestProviderConnect,
  type LinkResponse,
  type ProviderIntegrationItem,
} from "@/services/providerAccountService";
import { PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";

const openExternalUrl = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const getCapability = (
  item: ProviderIntegrationItem,
  providerCapabilities: Map<string, ProviderCapability>,
) => providerCapabilities.get(item.provider.code);

const getStatusTone = (status?: string | null) => {
  const normalizedStatus = normalizeStatus(status);

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
      label: formatStatusLabel(normalizedStatus),
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

  if (normalizeStatus(item.integration_request?.status) === "pending" || item.request_pending) {
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
    return "Complete your profile first before starting Nium onboarding.";
  }

  const status = normalizeStatus(item.provider_account?.status);
  if (status && ["pending", "submitted", "under_review"].includes(status)) {
    return "Your Nium onboarding is in review. We will unlock live wallet actions after the account is approved.";
  }

  if (status === "active") {
    return "Nium is connected and ready for the wallet features available on your account.";
  }

  if (status && ["rejected", "failed"].includes(status)) {
    return "Nium onboarding needs attention. Contact support or retry when a fresh onboarding link becomes available.";
  }

  if (normalizeStatus(item.integration_request?.status) === "pending" || item.request_pending) {
    return "Your request has been sent. You can come back here to check when a connect link becomes available.";
  }

  if (item.can_connect && item.link_available) {
    return "Nium onboarding is available now. Continue to Nium to complete the connection flow.";
  }

  if (item.can_request_connect) {
    return "A manual Nium enablement request can be sent from this screen.";
  }

  return "Nium is not available for your account yet.";
};

const getLinkTarget = (
  onboarding: OnboardingState | null | undefined,
  item: ProviderIntegrationItem,
) => onboarding?.redirect_url || item.integration_link?.link_url || null;

const isIncompleteProfileMessage = (message?: string | null) =>
  String(message ?? "").toLowerCase().includes("must complete profile");

const AccountIntegrations = () => {
  const { user, token, logout, onboarding, refreshSession } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [requestProvider, setRequestProvider] = useState<ProviderIntegrationItem | null>(null);
  const [requestNote, setRequestNote] = useState("Please enable Nium for my account.");
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [handledCompletionKey, setHandledCompletionKey] = useState<string | null>(null);

  const providersQuery = useQuery({
    queryKey: ["providers-reference"],
    enabled: !!token,
    queryFn: async () => getProviderReference({ token: token as string }),
  });

  const integrationsQuery = useQuery({
    queryKey: ["provider-integrations", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getProviderIntegrations({ userId: user?.id as string, token: token as string }),
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
      return linkProviderAccount({
        userId: user?.id as string,
        token: token as string,
        providerCode: item.provider.code,
        force: false,
      }) as Promise<LinkResponse>;
    },
    onSuccess: async (payload, item) => {
      const nextMessage =
        payload?.onboarding?.message || payload?.message || `${item.provider.name || PRIMARY_PROVIDER_NAME} onboarding started successfully.`;
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
      const message = error instanceof Error ? error.message : "Unable to start Nium onboarding.";
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
      return requestProviderConnect({
        userId: user?.id as string,
        token: token as string,
        providerCode,
        note,
      });
    },
    onSuccess: async (payload) => {
      toast({
        title: "Request submitted",
        description: payload?.message || "Nium connection request submitted successfully.",
      });
      setRequestProvider(null);
      setRequestNote("Please enable Nium for my account.");
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
      return completeProviderAccount({
        userId: user?.id as string,
        token: token as string,
        providerCode,
        status,
        externalCustomerId,
        externalAccountId,
        accountName,
      });
    },
    onSuccess: async (payload) => {
      toast({
        title: "Onboarding updated",
        description: payload?.message || "Nium onboarding completion was processed successfully.",
      });
      await refreshIntegrationState();
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : "Unable to complete Nium onboarding.";
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
  const integrationKycVerified = providerItems.some((item) => item.internal_kyc_verified);
  const isProfileComplete = Boolean(
    onboarding?.profile_completed ||
      onboarding?.internal_kyc_verified ||
      isVerifiedKycStatus(user?.kycStatus) ||
      integrationKycVerified,
  );
  const selectedProviderStatus =
    isProfileComplete && onboarding?.selected_provider_account_status === "not_started"
      ? "awaiting_provider_selection"
      : onboarding?.selected_provider_account_status ?? null;
  const onboardingMessage =
    isProfileComplete && isIncompleteProfileMessage(onboarding?.message)
      ? "Profile verified. Start Nium onboarding to enable account infrastructure."
      : onboarding?.message;

  return (
    <div className="bg-[#f8f8f6] px-7 py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111] dark:text-white">Integrations</h1>
            <p className="max-w-3xl text-[1.05rem] text-[#6c6c68] dark:text-gray-400">
              Review your Nium setup, start onboarding, and request access when a manual onboarding link still needs to be assigned to your account.
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
            Refresh Nium setup
          </Button>
        </div>

        {!isProfileComplete && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Complete your profile before connecting Nium.</p>
                <p className="text-sm">
                  {onboardingMessage || "Profile completion is required before Nium onboarding can continue."}{" "}
                  <Link to="/account/settings/profile" className="font-semibold underline underline-offset-4">
                    Update profile
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {(runtimeMessage || onboardingMessage) && (
          <div className="mb-6 rounded-2xl border border-[#d7d7d2] bg-white px-5 py-4 text-[#232323] dark:border-white/10 dark:bg-[#1b2027] dark:text-white">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#16a34a] dark:text-[#86efac]" />
              <div className="space-y-1">
                <p className="font-semibold">Current onboarding status</p>
                <p className="text-sm text-[#5f5f5a] dark:text-gray-400">{runtimeMessage || onboardingMessage}</p>
                {selectedProviderStatus && (
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7a7a74] dark:text-gray-500">
                    Nium status: {selectedProviderStatus}
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
                      : "Something went wrong while loading Nium setup data."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {providerItems.map((item) => {
            const capability = getCapability(item, providerCapabilities);
            const badge = getProviderBadge(item);
            const providerStatus = normalizeStatus(item.provider_account?.status);
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
                    <ProviderLogo provider={item.provider} />

                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-[1.2rem] font-semibold text-[#232323] dark:text-white">{item.provider.name}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badge.className}`}>
                          {badge.label}
                        </span>
                        {capability?.is_available_for_onboarding && (
                          <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#15803d] dark:bg-[#16a34a]/15 dark:text-[#86efac]">
                            Onboarding enabled
                          </span>
                        )}
                      </div>

                      <p className="max-w-3xl text-[1.02rem] leading-7 text-[#6f6f6b] dark:text-gray-400">
                        {getProviderSummary(item, isProfileComplete, capability)}
                      </p>

                      <div className="flex flex-wrap gap-3 text-sm text-[#6f6f6b] dark:text-gray-400">
                        <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">Code: {item.provider.code}</span>
                        <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">Nium status: {item.provider.status}</span>
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
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-3 sm:min-w-[240px]">
                    {canOpenConnect && (
                      <Button
                        className="h-11 rounded-full bg-[#16a34a] px-7 text-[1rem] font-semibold text-white hover:bg-[#15803d] dark:shadow-[0_12px_24px_rgba(79,70,229,0.22)]"
                        onClick={() => connectMutation.mutate(item)}
                        disabled={connectMutation.isPending}
                      >
                        {connectMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        {item.integration_link?.link_label || "Connect Nium"}
                      </Button>
                    )}

                    {!canOpenConnect && item.can_request_connect && !item.request_pending && (
                      <Button
                        variant="outline"
                        disabled={!canRequestConnect || requestConnectMutation.isPending}
                        className="h-11 rounded-full border-[#16a34a] px-7 text-[1rem] font-semibold text-[#16a34a] hover:bg-[#ecfdf3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#86efac] dark:text-[#86efac] dark:hover:bg-[#16a34a]/10"
                        onClick={() => {
                          if (!canRequestConnect) {
                            return;
                          }
                          setRequestProvider(item);
                          setRequestNote(item.integration_request?.note || "Please enable Nium for my account.");
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

                    {!canOpenConnect && normalizeStatus(item.provider_account?.status) === "active" && (
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
                Loading Nium integration...
              </CardContent>
            </Card>
          )}

          {!integrationsQuery.isLoading && !integrationsQuery.error && providerItems.length === 0 && (
            <Card className="rounded-2xl border border-dashed border-[#d7d7d2] bg-white shadow-none dark:border-white/10 dark:bg-[#1b2027]">
              <CardContent className="p-6 text-[#6f6f6b] dark:text-gray-400">
                Nium onboarding is not available for this account yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!requestProvider} onOpenChange={(open) => !open && !requestConnectMutation.isPending && setRequestProvider(null)}>
        <DialogContent className="rounded-3xl border-[#d7d7d2] bg-white sm:max-w-xl dark:border-white/10 dark:bg-[#1b2027]">
          <DialogHeader>
            <DialogTitle className="text-[#111111] dark:text-white">Request Nium access</DialogTitle>
            <DialogDescription>
              {requestProvider
                ? `Send a request to enable ${requestProvider.provider.name || PRIMARY_PROVIDER_NAME} for your account.`
                : "Send a request to enable Nium for your account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-[#6f6f6b] dark:text-gray-400">
              The note is optional, but it helps explain what you need from the Nium connection.
            </p>
            <Textarea
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              rows={5}
              placeholder="Please enable Nium for my account."
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
              className="rounded-full bg-[#16a34a] text-white hover:bg-[#15803d]"
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
