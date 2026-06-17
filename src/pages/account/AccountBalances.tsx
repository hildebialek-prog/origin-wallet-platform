import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpDown,
  Download,
  Loader2,
  RefreshCcw,
  Search,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProviderLogo } from "@/components/account/ProviderLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProviders, type ProviderSummary } from "@/services/fxOrderService";
import {
  getBalances,
  syncProviderBalances,
  type Balance,
} from "@/services/moneyMovementService";
import { formatAmount, formatDateTime, statusBadgeClassName, toNumber } from "@/lib/money";

const AccountBalances = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [syncError, setSyncError] = useState("");

  const balancesQuery = useQuery({
    queryKey: ["money-balances", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBalances({ userId: user?.id as string, token: token as string }),
  });

  const providersQuery = useQuery({
    queryKey: ["money-providers"],
    enabled: !!token,
    queryFn: async () => {
      const payload = await getProviders();
      return payload.data.filter((provider) => provider.status === "active");
    },
  });

  const providers = providersQuery.data ?? [];
  const balances = balancesQuery.data ?? [];
  const totalCurrencies = new Set(balances.map((balance) => balance.currency)).size;

  const providerById = useMemo(() => {
    const map = new Map<number, ProviderSummary>();
    providers.forEach((provider) => map.set(provider.id, provider));
    return map;
  }, [providers]);

  const filteredBalances = balances.filter((balance) => {
    const provider = providerById.get(balance.provider_id);
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    return [
      balance.currency,
      balance.external_account_id,
      provider?.name,
      provider?.code,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const syncMutation = useMutation({
    mutationFn: async (providerCode: string) =>
      syncProviderBalances({ userId: user?.id as string, token: token as string, providerCode }),
    onSuccess: async () => {
      setSyncError("");
      await queryClient.invalidateQueries({ queryKey: ["money-balances", user?.id] });
    },
    onError: (error) => {
      setSyncError(error instanceof Error ? error.message : "Unable to sync balances.");
    },
  });

  const totalAvailable = balances.reduce((sum, balance) => sum + toNumber(balance.available_balance), 0);
  const syncableProviders = providers.filter((provider) => provider.supports_data_sync);

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <Card className="border border-[#d7d7d2] bg-white shadow-sm dark:border-white/10 dark:bg-[#151b24]">
            <CardContent className="p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-[#62708a] dark:text-gray-400">Total visible balance</p>
                  <p className="text-3xl font-bold text-[#0f2442] dark:text-white">
                    {balances.length ? formatAmount(totalAvailable, "mixed") : "No synced balance yet"}
                  </p>
                  <p className="mt-1 text-xs text-[#7a879c] dark:text-gray-500">
                    {balances.length
                      ? `${balances.length} balance records across ${totalCurrencies} currencies`
                      : "Sync a provider account to display wallet balances."}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ecfdf3] dark:bg-[#16a34a]/10">
                  <Wallet className="h-6 w-6 text-[#16a34a]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#d7d7d2] bg-white shadow-sm dark:border-white/10 dark:bg-[#151b24]">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-sm font-medium text-[#62708a] dark:text-gray-400">Provider sync</p>
                <p className="mt-1 text-xl font-bold text-[#0f2442] dark:text-white">Refresh live balances</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {syncableProviders.length > 0 ? (
                  syncableProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      variant="outline"
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate(provider.code)}
                      className="h-10 rounded-full border-[#d7d7d2] bg-white px-4 text-sm font-semibold text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b] dark:text-white"
                    >
                      {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                      {provider.name}
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-[#62708a] dark:text-gray-400">No provider account with balance sync is configured yet.</p>
                )}
              </div>
              {syncError ? <p className="text-sm font-medium text-red-600">{syncError}</p> : null}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search currency, account, or provider"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-full border border-[#d7d7d2] bg-white pl-10 pr-4 text-sm transition-colors focus:border-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 dark:border-white/10 dark:bg-[#151b24] dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 rounded-full border-[#d7d7d2] bg-white px-5 font-semibold text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#151b24] dark:text-white">
              <Link to="/account/transfers">
                <ArrowRight className="mr-2 h-4 w-4" />
                Move funds
              </Link>
            </Button>
            <Button variant="outline" className="h-11 rounded-full border-[#d7d7d2] bg-white px-5 font-semibold text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#151b24] dark:text-white">
              <Download className="mr-2 h-4 w-4" />
              Statement
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border border-[#d7d7d2] bg-white shadow-sm dark:border-white/10 dark:bg-[#151b24]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-[#d7d7d2] bg-[#f3fdf9] dark:border-white/10 dark:bg-white/5">
                  <th className="px-5 py-4 text-left text-sm font-semibold text-[#0f2442] dark:text-gray-200">Currency</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-[#0f2442] dark:text-gray-200">Provider</th>
                  <th className="px-5 py-4 text-right text-sm font-semibold text-[#0f2442] dark:text-gray-200">Available</th>
                  <th className="px-5 py-4 text-right text-sm font-semibold text-[#0f2442] dark:text-gray-200">Ledger</th>
                  <th className="px-5 py-4 text-right text-sm font-semibold text-[#0f2442] dark:text-gray-200">Reserved</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-[#0f2442] dark:text-gray-200">Last sync</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((balance) => {
                  const provider = providerById.get(balance.provider_id);

                  return (
                    <tr key={balance.id} className="border-b border-[#e8edf5] last:border-0 dark:border-white/5">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ecfdf3] text-xs font-bold text-[#16a34a] dark:bg-white/5 dark:text-gray-300">
                            {balance.currency}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#0f2442] dark:text-white">{balance.currency}</p>
                            <p className="text-xs text-[#62708a] dark:text-gray-400">{balance.external_account_id || "Wallet balance"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <ProviderLogo
                            provider={provider}
                            className="h-8 w-8 rounded-lg"
                            imageClassName="p-0.5"
                            fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
                          />
                          <span className="text-sm font-medium text-[#0f2442] dark:text-white">
                            {provider?.name || `Provider #${balance.provider_id}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-[#0f2442] dark:text-white">
                        {formatAmount(balance.available_balance, balance.currency)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-[#53627a] dark:text-gray-300">
                        {formatAmount(balance.ledger_balance, balance.currency)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-[#53627a] dark:text-gray-300">
                        {formatAmount(balance.reserved_balance, balance.currency)}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#62708a] dark:text-gray-400">
                        {formatDateTime(balance.as_of)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredBalances.length === 0 && (
            <div className="py-14 text-center">
              <p className="text-[1.05rem] font-medium text-[#0f2442] dark:text-white">
                {balancesQuery.isLoading ? "Loading balances..." : "No balance data available"}
              </p>
              <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
                Link a provider account and sync balances before initiating live transfers.
              </p>
              <Button asChild className="mt-5 rounded-full bg-[#16a34a] px-5 font-semibold text-white hover:bg-[#15803d]">
                <Link to="/account/integrations">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Manage integrations
                </Link>
              </Button>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between px-2 text-xs text-[#7a879c] dark:text-gray-500">
          <p>Showing {filteredBalances.length} of {balances.length} balance records</p>
          <Badge className={statusBadgeClassName(balances.length ? "active" : "pending")}>
            {balances.length ? "Synced data" : "Waiting for sync"}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default AccountBalances;
