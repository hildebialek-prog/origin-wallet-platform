import { CurrencyBadge, CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { formatAmount, toNumber } from "@/lib/money";

type SummaryBalance = { currency: string; available_balance?: string | number | null };

export function BalanceSummary({ balances }: { balances: SummaryBalance[] }) {
  const currencies = Array.from(new Set(balances.map((balance) => balance.currency)));
  const singleCurrency = currencies.length === 1 ? currencies[0] : null;

  return <div className="min-w-0 space-y-2" aria-label="Displayed balance summary">
    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
      {currencies.length > 1 ? "Balances by currency" : "Total balance"}
    </p>
    <div className="text-3xl font-semibold tracking-tight text-[#0f2442] dark:text-white">
      {singleCurrency ? <CurrencyDisplay currency={singleCurrency} size="regular">
        {formatAmount(balances.reduce((sum, balance) => sum + toNumber(balance.available_balance), 0), singleCurrency)}
      </CurrencyDisplay> : balances.length ? `${currencies.length} currencies` : "No synced balance yet"}
    </div>
    {currencies.length > 1 ? <>
      <div className="flex flex-wrap gap-3 py-1">{currencies.map((currency) => <CurrencyBadge key={currency} currency={currency} size="compact" />)}</div>
      <p className="text-sm text-slate-600 dark:text-slate-300">Shown in original currencies. No conversion applied.</p>
    </> : <p className="text-sm text-slate-600 dark:text-slate-300">
      {balances.length ? `Available across ${balances.length} displayed wallet balance${balances.length === 1 ? "" : "s"}` : "Sync wallet balances to display funds."}
    </p>}
  </div>;
}
