import { Info, MoreHorizontal, RefreshCcw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ProviderLogo } from "@/components/account/ProviderLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { VirtualAccountLifecycleStatus } from "@/components/account/VirtualAccountLifecycleStatus";
import { useVirtualAccountOperation } from "@/hooks/useVirtualAccountOperation";
import { getProviders } from "@/services/fxOrderService";
import type { VirtualAccount } from "@/services/providerAccountService";
import { statusBadgeClassName } from "@/lib/money";
import { normalizeStatus } from "@/lib/status";
import { getProviderDisplayName, isPrimaryProvider, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";

const enrichmentDescription = (account: VirtualAccount) => {
  switch (account.enrichment?.status) {
    case "pending": return "Banking details pending.";
    case "running": return "Banking details are updating.";
    case "complete": return "Banking details complete.";
    case "exhausted": return "Banking details could not be completed automatically. Contact support about these details; a new VA assignment is not needed.";
    default: return "Enrichment tracking unavailable. Existing banking details remain available.";
  }
};

const AccountVirtualAccounts = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const lifecycle = useVirtualAccountOperation();

  const { token } = useAuth();
  const location = useLocation();
  const activeTab = new URLSearchParams(location.search).get("tab") || "approved";

  const providersQuery = useQuery({
    queryKey: ["money-providers"],
    enabled: !!token,
    queryFn: async () => {
      const payload = await getProviders();
      return payload.data.filter((provider) => provider.status === "active");
    },
    retry: false,
  });

  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const primaryProvider = useMemo(
    () => providers.find((provider) => isPrimaryProvider(provider)),
    [providers],
  );
  const accounts = lifecycle.state?.accounts ?? [];
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  const visibleAccounts = accounts.filter((account) => {
    const normalized = normalizeStatus(account.status);
    if (activeTab === "pending") {
      return normalized === "pending";
    }

    return ["assigned", "active", "approved"].includes(normalized);
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
              View receiving account details and wallet account references.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-[1rem] font-semibold text-[#53627a] dark:text-gray-300">
              <Info className="h-4 w-4" />
              Capabilities
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#d7d7d2] bg-white px-6 text-[1rem] font-semibold text-[#16a34a] hover:bg-[#ecfdf3] dark:border-white/15 dark:bg-[#151b24] dark:text-white dark:hover:bg-white/10"
            >
              <Link to="/account/virtual-accounts/request">Request</Link>
            </Button>
          </div>
        </div>

        <VirtualAccountLifecycleStatus lifecycle={lifecycle} />
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8 text-[1.05rem] font-semibold">
            <Link
              to="/account/virtual-accounts?tab=approved"
              className={
                activeTab === "approved"
                  ? "border-b-2 border-[#16a34a] pb-3 text-[#0f2442] transition-colors hover:text-[#16a34a] dark:text-white dark:hover:text-[#86efac]"
                  : "pb-3 text-[#62708a] transition-colors hover:text-[#16a34a] dark:text-gray-400 dark:hover:text-[#86efac]"
              }
            >
              Approved
            </Link>
            <Link
              to="/account/virtual-accounts?tab=pending"
              className={
                activeTab === "pending"
                  ? "border-b-2 border-[#16a34a] pb-3 text-[#0f2442] transition-colors hover:text-[#16a34a] dark:text-white dark:hover:text-[#86efac]"
                  : "pb-3 text-[#62708a] transition-colors hover:text-[#16a34a] dark:text-gray-400 dark:hover:text-[#86efac]"
              }
            >
              Pending
            </Link>
          </div>
          <Button
            variant="outline"
            onClick={() => { void lifecycle.refresh(); }}
            disabled={lifecycle.state?.checking || lifecycle.state?.submitting}
            className="h-10 rounded-full border-[#d7d7d2] bg-white px-4 text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${lifecycle.state?.checking ? "animate-spin" : ""}`} />
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
                  return (
                    <div
                      key={account.id}
                      className="grid grid-cols-[1.25fr_1fr_0.7fr_1.2fr_0.7fr_52px] items-center border-b border-[#e8edf5] px-5 py-4 last:border-b-0 dark:border-white/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[1.05rem] font-semibold text-[#0f2442] dark:text-white">
                          {account.provider_payment_id || account.virtual_account_reference || "Origin Wallet account"}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#62708a] dark:text-gray-400">
                          {account.account_type || "-"}
                        </p>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <ProviderLogo
                          provider={primaryProvider}
                          className="h-8 w-8 rounded-lg"
                          imageClassName="p-0.5"
                          fallbackClassName="bg-[#ecfdf3] text-[#16a34a] dark:bg-[#16a34a]/10 dark:text-[#86efac]"
                        />
                        <span className="truncate font-medium text-[#0f2442] dark:text-white">
                          {primaryProvider ? getProviderDisplayName(primaryProvider) : PRIMARY_PROVIDER_NAME}
                        </span>
                      </div>
                      <div>
                        <span className="rounded-md border border-[#d7d7d2] bg-[#f3fdf9] px-3 py-1 text-sm font-medium text-[#0f2442] dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                          {account.currency}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0f2442] dark:text-white">
                          {account.virtual_account_reference || account.provider_payment_id || "-"}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#62708a] dark:text-gray-400">
                          {account.account_type || "Account details"}
                        </p>
                      </div>
                      <div>
                        <Badge className={statusBadgeClassName(normalizeStatus(account.status) === "assigned" ? "approved" : account.status)}>
                          {account.status}
                        </Badge>
                        <p className="mt-1 text-xs text-[#62708a] dark:text-gray-400">{enrichmentDescription(account)}</p>
                      </div>
                      <button
                        aria-label={`View banking details for ${account.currency} account ${account.id}`}
                        onClick={() => setSelectedAccountId(account.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#62708a] transition hover:bg-[#f3fdf9] dark:text-gray-400 dark:hover:bg-white/10"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })}
                {visibleAccounts.length === 0 && (
                  <div className="px-5 py-14 text-center">
                    <p className="text-[1.05rem] font-medium text-[#0f2442] dark:text-white">
                      {lifecycle.state?.error ? "Virtual accounts could not be refreshed" : !lifecycle.state?.ready ? "Loading virtual accounts..." : "No virtual accounts in this view"}
                    </p>
                    <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
                      {lifecycle.state?.error ? "Check status to try reading the existing accounts again." : "Saved requests may remain pending before a virtual account appears here."}
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

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div role="dialog" aria-modal="true" aria-label="Receiving account details" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-[#151b24]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0f2442] dark:text-white">
                Receiving account details
              </h2>

              <button
                aria-label="Close banking details"
                onClick={() => setSelectedAccountId(null)}
                className="text-[#62708a] hover:text-black dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <p role="status">{enrichmentDescription(selectedAccount)}</p>
              {selectedAccount.enrichment?.next_attempt_at && <p>Next details attempt: {new Date(selectedAccount.enrichment.next_attempt_at).toLocaleString()}</p>}
              <div>
                <p className="text-[#62708a]">Virtual Account Number</p>
                <p className="font-semibold text-[#0f2442] dark:text-white">
                  {selectedAccount.provider_payment_id || "-"}
                </p>
              </div>

              <div>
                <p className="text-[#62708a]">Currency</p>
                <p className="font-semibold text-[#0f2442] dark:text-white">
                  {selectedAccount.currency || "-"}
                </p>
              </div>

              <div>
                <p className="text-[#62708a]">Account Name</p>
                <p className="font-semibold text-[#0f2442] dark:text-white">
                  {selectedAccount.detail?.account_name || "-"}
                </p>
              </div>

              <div>
                <p className="text-[#62708a]">Bank Name</p>
                <p className="font-semibold text-[#0f2442] dark:text-white">
                  {selectedAccount.detail?.bank_name || selectedAccount.detail?.provider_bank_name || "-"}
                </p>
              </div>

              <div>
                <p className="text-[#62708a]">Bank Address</p>
                <p className="font-semibold text-[#0f2442] dark:text-white">
                  {selectedAccount.detail?.bank_address || "-"}
                </p>
              </div>

              <div>
                <p className="text-[#62708a]">Routing code 1</p>
                <p className="font-semibold text-[#0f2442] dark:text-white">
                  {selectedAccount.detail?.routing_code_type || "-"}{" "}
                  {selectedAccount.detail?.routing_code_value || ""}
                </p>
              </div>
              <div>
                <p className="text-[#62708a]">Routing code 2</p>
                <p className="font-semibold text-[#0f2442] dark:text-white">{selectedAccount.detail?.routing_code_type_2 || "-"}{" "}{selectedAccount.detail?.routing_code_value_2 || ""}</p>
              </div>
              {[
                ["Provider account ID", selectedAccount.user_provider_account_id],
                ["Virtual account ID", selectedAccount.id],
                ["Account reference", selectedAccount.virtual_account_reference],
                ["Requested account category", selectedAccount.account_category],
                ["Requested account type", selectedAccount.account_type],
                ["Provider account category", selectedAccount.detail?.provider_account_category],
                ["Provider account type", selectedAccount.detail?.provider_account_type],
              ].map(([label, value]) => <div key={label}><p className="text-[#62708a]">{label}</p><p className="font-semibold text-[#0f2442] dark:text-white">{value ?? "-"}</p></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountVirtualAccounts;
