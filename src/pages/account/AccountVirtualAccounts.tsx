import { Info, MoreHorizontal, RefreshCcw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ProviderLogo } from "@/components/account/ProviderLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getProviders, type ProviderSummary } from "@/services/fxOrderService";
import { getBankAccounts } from "@/services/moneyMovementService";
import { statusBadgeClassName } from "@/lib/money";
import { normalizeStatus } from "@/lib/status";
import { PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";

const AccountVirtualAccounts = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const activeTab = new URLSearchParams(location.search).get("tab") || "approved";

  const accountsQuery = useQuery({
    queryKey: ["money-bank-accounts", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBankAccounts({ userId: user?.id as string, token: token as string }),
  });

  const providersQuery = useQuery({
    queryKey: ["money-providers"],
    enabled: !!token,
    queryFn: async () => {
      const payload = await getProviders();
      return payload.data.filter((provider) => provider.status === "active");
    },
  });

  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const accounts = accountsQuery.data ?? [];
  const providerById = useMemo(() => {
    const map = new Map<number, ProviderSummary>();
    providers.forEach((provider) => map.set(provider.id, provider));
    return map;
  }, [providers]);

  const visibleAccounts = accounts.filter((account) => {
    const normalized = normalizeStatus(account.status);
    if (activeTab === "pending") {
      return !["active", "approved"].includes(normalized);
    }

    return ["active", "approved"].includes(normalized);
  });

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[2.35rem] font-bold tracking-[-0.04em] text-[#0f2442] sm:text-[3.2rem] dark:text-white">
              Virtual accounts
            </h1>
            <p className="mt-2 max-w-3xl text-[1.05rem] leading-7 text-[#62708a] dark:text-gray-400">
              View Nium receiving account details and wallet account references.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 text-[1rem] font-semibold text-[#53627a] dark:text-gray-300">
              <Info className="h-4 w-4" />
              Capabilities
            </button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#d7d7d2] bg-white px-6 text-[1rem] font-semibold text-[#16a34a] hover:bg-[#ecfdf3] dark:border-white/15 dark:bg-[#151b24] dark:text-white dark:hover:bg-white/10"
            >
              <Link to="/account/virtual-accounts/request">Request</Link>
            </Button>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8 text-[1.05rem] font-semibold">
            <Link
              to="/account/virtual-accounts?tab=approved"
              className={
                activeTab === "approved"
                  ? "border-b-2 border-[#16a34a] pb-3 text-[#0f2442] dark:text-white"
                  : "pb-3 text-[#62708a] dark:text-gray-400"
              }
            >
              Approved
            </Link>
            <Link
              to="/account/virtual-accounts?tab=pending"
              className={
                activeTab === "pending"
                  ? "border-b-2 border-[#16a34a] pb-3 text-[#0f2442] dark:text-white"
                  : "pb-3 text-[#62708a] dark:text-gray-400"
              }
            >
              Pending
            </Link>
          </div>
          <Button
            variant="outline"
            onClick={() => accountsQuery.refetch()}
            disabled={accountsQuery.isFetching}
            className="h-10 rounded-full border-[#d7d7d2] bg-white px-4 text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${accountsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[1.25fr_1fr_0.7fr_1.2fr_0.7fr_52px] border-b border-[#d7d7d2] px-5 py-4 text-sm font-semibold text-[#0f2442] dark:border-white/10 dark:text-gray-200">
                <div>Alias</div>
                <div>Infrastructure</div>
                <div>Currency</div>
                <div>Account details</div>
                <div>Status</div>
                <div />
              </div>
              <CardContent className="p-0">
                {visibleAccounts.map((account) => {
                  const provider = providerById.get(account.provider_id);

                  return (
                    <div
                      key={account.id}
                      className="grid grid-cols-[1.25fr_1fr_0.7fr_1.2fr_0.7fr_52px] items-center border-b border-[#e8edf5] px-5 py-4 last:border-b-0 dark:border-white/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[1.05rem] font-semibold text-[#0f2442] dark:text-white">
                          {account.account_name || account.external_account_id || "Nium account"}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#62708a] dark:text-gray-400">
                          {account.account_type || "wallet"}
                        </p>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <ProviderLogo
                          provider={provider}
                          className="h-8 w-8 rounded-lg"
                          imageClassName="p-0.5"
                          fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
                        />
                        <span className="truncate font-medium text-[#0f2442] dark:text-white">
                          {provider?.name || PRIMARY_PROVIDER_NAME}
                        </span>
                      </div>
                      <div>
                        <span className="rounded-md border border-[#d7d7d2] bg-[#f3fdf9] px-3 py-1 text-sm font-medium text-[#0f2442] dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                          {account.currency}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0f2442] dark:text-white">
                          {account.iban || account.account_number || account.external_account_id || "-"}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#62708a] dark:text-gray-400">
                          {account.bank_name || account.swift_bic || account.routing_number || account.country_code || "Nium account details"}
                        </p>
                      </div>
                      <div>
                        <Badge className={statusBadgeClassName(account.status)}>{account.status}</Badge>
                      </div>
                      <button className="flex h-9 w-9 items-center justify-center rounded-full text-[#62708a] transition hover:bg-[#f3fdf9] dark:text-gray-400 dark:hover:bg-white/10">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })}
                {visibleAccounts.length === 0 && (
                  <div className="px-5 py-14 text-center">
                    <p className="text-[1.05rem] font-medium text-[#0f2442] dark:text-white">
                      {accountsQuery.isLoading ? "Loading virtual accounts..." : "No virtual account data available"}
                    </p>
                    <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
                      Nium account details will appear here after onboarding or data sync is completed.
                    </p>
                    <Button asChild className="mt-5 rounded-full bg-[#16a34a] px-5 font-semibold text-white hover:bg-[#15803d]">
                      <Link to="/account/integrations">Manage integrations</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AccountVirtualAccounts;
