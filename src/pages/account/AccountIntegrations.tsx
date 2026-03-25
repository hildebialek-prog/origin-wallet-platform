import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCcw,
  SendHorizonal,
} from "lucide-react";
import { Link } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
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

const getProviderSummary = (item: ProviderIntegrationItem, isProfileComplete: boolean) => {
  if (!isProfileComplete) {
    return "Complete your profile first before requesting or connecting this provider.";
  }

  if (item.provider_account) {
    return `Provider account status: ${item.provider_account.status}.`;
  }

  if (item.request_pending) {
    return "Your connection request is pending review.";
  }

  if (item.can_connect && item.integration_link?.link_url) {
    return "Your profile is eligible to connect this provider now.";
  }

  if (item.can_request_connect) {
    return "A manual provider enablement request can be submitted from this screen.";
  }

  return "Provider connection is not available yet for this account.";
};

const getProviderBadge = (item: ProviderIntegrationItem) => {
  if (item.provider_account) {
    return {
      label: item.provider_account.status,
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    };
  }

  if (item.request_pending) {
    return {
      label: "Request pending",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    };
  }

  if (item.can_connect && item.integration_link?.link_url) {
    return {
      label: "Available now",
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

const AccountIntegrations = () => {
  const { user, token, logout } = useAuth();
  const queryClient = useQueryClient();
  const [requestProvider, setRequestProvider] = useState<ProviderIntegrationItem | null>(null);
  const [requestNote, setRequestNote] = useState("Please enable this provider for my account.");

  const profile = user?.profile as Record<string, unknown> | null | undefined;
  const requiredProfileFields = [
    { label: "Full name", value: user?.name },
    { label: "Email", value: user?.email },
    { label: "Phone", value: user?.phone },
    { label: "Profile type", value: profile?.user_type },
    { label: "Country", value: user?.country ?? profile?.country_code },
  ];
  const missingFields = requiredProfileFields
    .filter(({ value }) => !String(value ?? "").trim())
    .map(({ label }) => label);
  const hasRequiredProfileFields = missingFields.length === 0;

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
    onSuccess: (payload) => {
      toast({
        title: "Request submitted",
        description: payload?.message || "Provider connection request submitted successfully.",
      });
      setRequestProvider(null);
      setRequestNote("Please enable this provider for my account.");
      void queryClient.invalidateQueries({ queryKey: ["provider-integrations", user?.id, token] });
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : "Unable to submit request.";
      if (message.includes("401") || message.includes("403")) {
        await logout();
      }
      toast({
        variant: "destructive",
        title: "Request failed",
        description: message,
      });
    },
  });

  const providerItems = integrationsQuery.data ?? [];
  const blockedByProfile = useMemo(() => {
    const message = integrationsQuery.error instanceof Error ? integrationsQuery.error.message : "";
    return message.toLowerCase().includes("profile");
  }, [integrationsQuery.error]);
  const isProfileComplete = hasRequiredProfileFields && !blockedByProfile;

  const openConnectLink = (item: ProviderIntegrationItem) => {
    if (!isProfileComplete) {
      toast({
        variant: "destructive",
        title: "Profile incomplete",
        description: `Please complete your profile before connecting a provider. Missing: ${missingFields.join(", ")}.`,
      });
      return;
    }

    const url = item.integration_link?.link_url;
    if (!url) {
      toast({
        variant: "destructive",
        title: "Connect link unavailable",
        description: "This provider is marked as connectable but no link URL was returned.",
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-[#f8f8f6] px-7 py-10 dark:bg-[#161a20]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-[3.2rem] font-bold tracking-[-0.04em] text-[#111111] dark:text-white">Integrations</h1>
            <p className="max-w-3xl text-[1.05rem] text-[#6c6c68] dark:text-gray-400">
              Connect available providers, review connection status, and request enablement when a provider still needs manual activation for your account.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void integrationsQuery.refetch()}
            disabled={integrationsQuery.isFetching}
            className="h-11 rounded-full border-[#d7d7d2] bg-white px-6 text-[1rem] font-semibold text-[#232323] hover:bg-[#f5f5f2] dark:border-white/10 dark:bg-[#1b2027] dark:text-white dark:hover:bg-white/10"
          >
            {integrationsQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Refresh providers
          </Button>
        </div>

        {!isProfileComplete && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Complete your profile before requesting or connecting a provider.</p>
                <p className="text-sm">
                  Missing information: {missingFields.join(", ") || "profile completion is still pending on the backend"}. {" "}
                  <Link to="/account/settings/profile" className="font-semibold underline underline-offset-4">
                    Update profile
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {isProfileComplete && integrationsQuery.error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-900">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load integrations</p>
                <p className="text-sm">
                  {integrationsQuery.error instanceof Error ? integrationsQuery.error.message : "Something went wrong while loading provider accounts."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {providerItems.map((item) => {
            const badge = getProviderBadge(item);
            const canOpenConnect = isProfileComplete && item.can_connect && !!item.integration_link?.link_url;
            const canRequestConnect = isProfileComplete && item.can_request_connect && !item.request_pending;

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
                      </div>

                      <p className="max-w-3xl text-[1.02rem] leading-7 text-[#6f6f6b] dark:text-gray-400">{getProviderSummary(item, isProfileComplete)}</p>

                      <div className="flex flex-wrap gap-3 text-sm text-[#6f6f6b] dark:text-gray-400">
                        <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">Code: {item.provider.code}</span>
                        <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">Provider status: {item.provider.status}</span>
                        {item.integration_request?.requested_at && (
                          <span className="rounded-full bg-[#f5f5f2] px-3 py-1 dark:bg-white/5">
                            Requested: {new Date(item.integration_request.requested_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-3 sm:min-w-[220px]">
                    {canOpenConnect && (
                      <Button
                        className="h-11 rounded-full bg-[#4f46e5] px-7 text-[1rem] font-semibold text-white hover:bg-[#4338ca] dark:shadow-[0_12px_24px_rgba(79,70,229,0.22)]"
                        onClick={() => openConnectLink(item)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {item.integration_link?.link_label || "Connect provider"}
                      </Button>
                    )}

                    {!canOpenConnect && item.can_request_connect && !item.request_pending && (
                      <Button
                        variant="outline"
                        disabled={!canRequestConnect}
                        className="h-11 rounded-full border-[#4f46e5] px-7 text-[1rem] font-semibold text-[#4f46e5] hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#8b83ff] dark:text-[#b6b1ff] dark:hover:bg-[#4f46e5]/10"
                        onClick={() => {
                          if (!canRequestConnect) {
                            return;
                          }
                          setRequestProvider(item);
                          setRequestNote("Please enable this provider for my account.");
                        }}
                      >
                        <SendHorizonal className="mr-2 h-4 w-4" />
                        Request connect
                      </Button>
                    )}

                    {!isProfileComplete && item.can_request_connect && !item.request_pending && (
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

                    {!canOpenConnect && !item.can_request_connect && !item.request_pending && item.provider_account && (
                      <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#15803d] dark:bg-green-500/10 dark:text-green-400">
                        <BadgeCheck className="h-4 w-4" />
                        Linked: {item.provider_account.status}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {integrationsQuery.isLoading && (
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
                No active providers were returned for this account yet.
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
