import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Loader2, RefreshCcw, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProviderLogo } from "@/components/account/ProviderLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProviders, type ProviderSummary } from "@/services/fxOrderService";
import {
  getTransactions,
  syncProviderTransactions,
  type Transaction,
} from "@/services/moneyMovementService";
import { formatAmount, formatDateTime, statusBadgeClassName } from "@/lib/money";
import { getProviderDisplayName, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";

const directionClassName = (direction?: string | null) => {
  const normalized = String(direction ?? "").toLowerCase();
  if (normalized === "credit" || normalized === "inbound") return "text-emerald-700 dark:text-emerald-300";
  if (normalized === "debit" || normalized === "outbound") return "text-red-600 dark:text-red-300";
  return "text-[#202020] dark:text-white";
};

const transactionAmount = (transaction: Transaction) => {
  const direction = String(transaction.direction ?? "").toLowerCase();
  const sign = direction === "debit" || direction === "outbound" ? "-" : "+";
  return `${sign} ${formatAmount(transaction.amount, transaction.currency)}`;
};

const AccountTransactions = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncError, setSyncError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const transactionsQuery = useQuery({
    queryKey: ["money-transactions", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getTransactions({ userId: user?.id as string, token: token as string }),
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
  const transactions = transactionsQuery.data ?? [];

  const providerById = useMemo(() => {
    const map = new Map<number, ProviderSummary>();
    providers.forEach((provider) => map.set(provider.id, provider));
    return map;
  }, [providers]);

  const currencies = Array.from(new Set(transactions.map((transaction) => transaction.currency))).sort();
  const statuses = Array.from(new Set(transactions.map((transaction) => transaction.status))).sort();

  const filteredTransactions = transactions.filter((transaction) => {
    const provider = providerById.get(transaction.provider_id);
    const query = searchQuery.trim().toLowerCase();
    const matchesCurrency = currencyFilter === "all" || transaction.currency === currencyFilter;
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesSearch =
      !query ||
      [
        transaction.external_transaction_id,
        transaction.description,
        transaction.reference_text,
        transaction.transaction_type,
        transaction.direction,
        transaction.wallet_context?.virtual_account_reference,
        transaction.wallet_context?.provider_payment_id,
        getProviderDisplayName(provider),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

    return matchesCurrency && matchesStatus && matchesSearch;
  });

  const syncMutation = useMutation({
    mutationFn: async (providerCode: string) =>
      syncProviderTransactions({ userId: user?.id as string, token: token as string, providerCode }),
    onSuccess: async () => {
      setSyncError("");
      await queryClient.invalidateQueries({ queryKey: ["money-transactions", user?.id] });
    },
    onError: (error) => {
      setSyncError(error instanceof Error ? error.message : "Unable to sync transactions.");
    },
  });

  const syncableProviders = providers.filter((provider) => provider.supports_data_sync);

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[2.35rem] font-bold tracking-[-0.04em] text-[#0f2442] sm:text-[3.2rem] dark:text-white">
              Transactions
            </h1>
            <p className="mt-2 max-w-3xl text-[1.05rem] leading-7 text-[#62708a] dark:text-gray-400">
              Review synced wallet activity, transfer postings, fees, and settlement references.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {syncableProviders.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate(provider.code)}
                className="h-11 rounded-full border-[#d7d7d2] bg-white px-5 font-semibold text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
              >
                {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Sync {getProviderDisplayName(provider)}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-11 rounded-full border-[#d7d7d2] bg-white px-5 font-semibold text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        {syncError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {syncError}
          </div>
        ) : null}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="h-11 w-full rounded-xl border-[#d7d7d2] bg-white px-4 text-[1rem] sm:w-[160px] dark:border-white/15 dark:bg-[#151b24] dark:text-white">
              <SelectValue>
                {currencyFilter === "all" ? "All currencies" : <span translate="no">{currencyFilter}</span>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All currencies</SelectItem>
              {currencies.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  <span translate="no">{currency}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full rounded-xl border-[#d7d7d2] bg-white px-4 text-[1rem] sm:w-[180px] dark:border-white/15 dark:bg-[#151b24] dark:text-white">
              <SelectValue>
                {statusFilter === "all" ? "All statuses" : statusFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full flex-1 lg:min-w-[22rem]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a879c] dark:text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 rounded-full border-[#d7d7d2] bg-white pl-11 text-[1rem] dark:border-white/10 dark:bg-[#151b24] dark:text-white dark:placeholder:text-gray-500"
              placeholder="Search transaction ID, reference, or wallet status"
            />
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[160px_1fr_1fr_130px_130px_44px] border-b border-[#d7d7d2] px-5 py-4 text-sm font-semibold text-[#0f2442] dark:border-white/10 dark:text-gray-200">
                <div>Date</div>
                <div>Description</div>
                <div>Infrastructure</div>
                <div>Status</div>
                <div className="text-right">Amount</div>
                <div />
              </div>
              <CardContent className="p-0">
                {filteredTransactions.map((transaction) => {
                  const provider = providerById.get(transaction.provider_id);

                  return (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-[160px_1fr_1fr_130px_130px_44px] items-center border-b border-[#e8edf5] px-5 py-5 text-sm last:border-b-0 dark:border-white/5"
                    >
                      <div className="text-[#53627a] dark:text-gray-300">{formatDateTime(transaction.booked_at || transaction.created_at)}</div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#0f2442] dark:text-white">
                          {transaction.description || transaction.transaction_type}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#62708a] dark:text-gray-400">
                          {transaction.external_transaction_id || transaction.reference_text || `Transaction #${transaction.id}`}
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
                          {provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME}
                        </span>
                      </div>
                      <div>
                        <Badge className={statusBadgeClassName(transaction.status)}>{transaction.status}</Badge>
                      </div>
                      <div className={`text-right font-semibold ${directionClassName(transaction.direction)}`}>
                        {transactionAmount(transaction)}
                        {transaction.wallet_context?.virtual_account_reference ||
                        transaction.wallet_context?.provider_payment_id ? (
                          <p className="mt-1 text-xs font-normal text-[#62708a] dark:text-gray-400">
                            VA • {transaction.wallet_context.virtual_account_reference ||
                              transaction.wallet_context.provider_payment_id}
                          </p>
                        ) : transaction.wallet_context ? (
                          <p className="mt-1 text-xs font-normal text-[#62708a] dark:text-gray-400">
                            {transaction.currency} Wallet
                          </p>
                        ) : null}
                        {transaction.fee_amount ? (
                          <p className="mt-1 text-xs font-normal text-[#62708a] dark:text-gray-400">
                            Fee {formatAmount(transaction.fee_amount, transaction.currency)}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label={`View transaction ${transaction.external_transaction_id || transaction.id}`}
                        onClick={() => setSelectedTransaction(transaction)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#62708a] hover:bg-[#f3fdf9] dark:text-gray-400 dark:hover:bg-white/10"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <div className="px-5 py-14 text-center">
                    <p className="text-[1.05rem] font-medium text-[#0f2442] dark:text-white">
                      {transactionsQuery.isLoading ? "Loading transactions..." : "No transaction data available"}
                    </p>
                    <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
                      Sync wallet data or submit a transfer to populate wallet activity.
                    </p>
                    <Button asChild className="mt-5 rounded-full bg-[#16a34a] px-5 font-semibold text-white hover:bg-[#15803d]">
                      <Link to="/account/transfers">Move funds</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </div>
          </div>
        </Card>

        {selectedTransaction ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label="Transaction details"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) {
                setSelectedTransaction(null);
              }
            }}
          >
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#151b24] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f2442] dark:text-white">
                    Transaction details
                  </h2>
                  <p className="mt-1 text-sm text-[#62708a] dark:text-gray-400">
                    {selectedTransaction.external_transaction_id ||
                      selectedTransaction.reference_text ||
                      `Transaction #${selectedTransaction.id}`}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setSelectedTransaction(null)}
                >
                  Close
                </Button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <TransactionDetail
                  label="Transaction ID"
                  value={selectedTransaction.external_transaction_id || `#${selectedTransaction.id}`}
                />
                <TransactionDetail label="Type" value={selectedTransaction.transaction_type || "-"} />
                <TransactionDetail label="Direction" value={selectedTransaction.direction || "-"} />
                <TransactionDetail label="Status" value={selectedTransaction.status || "-"} />
                <TransactionDetail label="Amount" value={transactionAmount(selectedTransaction)} />
                <TransactionDetail
                  label="Fee"
                  value={formatAmount(selectedTransaction.fee_amount || 0, selectedTransaction.currency)}
                />
                <TransactionDetail
                  label="Reference"
                  value={selectedTransaction.reference_text || "-"}
                />
                <TransactionDetail
                  label="Booked"
                  value={formatDateTime(selectedTransaction.booked_at || selectedTransaction.created_at)}
                />
              </div>

              <div className="mt-7 rounded-2xl border border-[#d7d7d2] p-5 dark:border-white/10">
                <h3 className="font-semibold text-[#0f2442] dark:text-white">
                  Virtual account
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <TransactionDetail
                    label="VA number"
                    value={
                      selectedTransaction.wallet_context?.virtual_account_reference ||
                      selectedTransaction.wallet_context?.provider_payment_id ||
                      "-"
                    }
                  />
                  <TransactionDetail
                    label="Currency"
                    value={
                      selectedTransaction.wallet_context?.virtual_account_currency ||
                      selectedTransaction.currency
                    }
                  />
                  <TransactionDetail
                    label="Account type"
                    value={selectedTransaction.wallet_context?.account_type || "-"}
                  />
                  <TransactionDetail
                    label="Category"
                    value={selectedTransaction.wallet_context?.account_category || "-"}
                  />
                  <TransactionDetail
                    label="VA status"
                    value={selectedTransaction.wallet_context?.virtual_account_status || "-"}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#d7d7d2] p-5 dark:border-white/10">
                <h3 className="font-semibold text-[#0f2442] dark:text-white">
                  Wallet balance after transaction
                </h3>

                {selectedTransaction.wallet_context?.balance_after_transaction ? (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <TransactionDetail
                        label="Available"
                        value={formatAmount(
                          selectedTransaction.wallet_context.balance_after_transaction.available_balance,
                          selectedTransaction.wallet_context.balance_after_transaction.currency
                        )}
                      />
                      <TransactionDetail
                        label="Reserved"
                        value={formatAmount(
                          selectedTransaction.wallet_context.balance_after_transaction.reserved_balance,
                          selectedTransaction.wallet_context.balance_after_transaction.currency
                        )}
                      />
                      <TransactionDetail
                        label="Ledger"
                        value={formatAmount(
                          selectedTransaction.wallet_context.balance_after_transaction.ledger_balance,
                          selectedTransaction.wallet_context.balance_after_transaction.currency
                        )}
                      />
                    </div>

                    <p className="mt-3 text-xs text-[#7a879c] dark:text-gray-500">
                      Balance recorded immediately after this transaction event.
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-[#62708a] dark:text-gray-400">
                    Historical balance is unavailable for this transaction.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex items-center justify-center gap-5 text-[#bdbdb6] dark:text-gray-500">
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white dark:hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[1rem] font-medium text-[#535353] dark:text-gray-300">1</span>
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white dark:hover:bg-white/10">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const TransactionDetail = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-[#f8f8f6] px-4 py-3 dark:bg-white/5">
    <p className="text-xs font-medium uppercase tracking-wide text-[#7a879c] dark:text-gray-500">
      {label}
    </p>
    <p className="mt-1 break-words font-medium text-[#0f2442] dark:text-white">
      {value || "-"}
    </p>
  </div>
);

export default AccountTransactions;
