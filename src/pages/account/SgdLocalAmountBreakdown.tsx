import { useEffect, useState } from "react";
import type { NiumPayoutAmounts } from "@/services/moneyMovementService";
import { formatAmount } from "@/lib/money";

const decimal = (value: unknown) => {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d+(?:\.\d+)?$/.test(String(value))) return null;
  const [whole, fraction = ""] = String(value).split(".");
  const integer = whole.replace(/^0+(?=\d)/, "");
  const tail = fraction.replace(/0+$/, "");
  return `${integer}${tail ? `.${tail}` : ""}`;
};

export const SgdLocalAmountBreakdown = ({ sourceAmount, amounts }: {
  sourceAmount: string | number;
  amounts?: NiumPayoutAmounts | null;
}) => {
  const [now, setNow] = useState(Date.now);
  const verified = amounts?.source_currency === "USD" && amounts.destination_currency === "SGD" &&
    decimal(amounts.source_amount) !== null && decimal(amounts.source_amount) === decimal(sourceAmount) ? amounts : null;
  const amount = (value: unknown, currency: string, unavailable: string) =>
    decimal(value) !== null ? formatAmount(String(value), currency) : unavailable;
  const expiresAt = verified?.fx_lock_expires_at ? Date.parse(verified.fx_lock_expires_at) : NaN;
  const lockActive = Number.isFinite(expiresAt) && expiresAt > Math.max(now, Date.now());
  useEffect(() => {
    if (!lockActive) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(Math.max(1, expiresAt - Date.now()), 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [expiresAt, lockActive, now]);
  const normalizedRate = lockActive ? decimal(verified?.fx_rate) : null;
  const rate = normalizedRate !== null && normalizedRate !== "0" ? String(verified?.fx_rate) : null;
  const actual = verified?.actual_debit;
  const reconciled = actual?.currency === "USD" &&
    ["principal_reconciled", "unexpected_charges_reconciled"].includes(actual.state);
  const rows = [
    ["USD source amount", formatAmount(sourceAmount, "USD")],
    ["USD total wallet debit", amount(verified?.total_wallet_debit, "USD", "Unavailable — fees not confirmed")],
    ["FX rate", rate !== null && rate !== "0" ? `${rate} SGD per USD` : "Unavailable pending provider confirmation"],
    ["FX lock expiry", lockActive ? new Date(expiresAt).toISOString() : Number.isFinite(expiresAt) ? "Expired — a new FX lock and review are required" : "Unavailable — no confirmed FX lock"],
    ["SGD conversion amount", amount(lockActive ? verified?.conversion_amount : null, "SGD", "SGD amount unavailable — FX confirmation pending")],
    ...(verified?.estimated_conversion_amount !== undefined ? [["Estimated SGD amount", lockActive && decimal(verified.estimated_conversion_amount) !== null
      ? `SGD ${decimal(verified.estimated_conversion_amount)} (estimate)` : "Unavailable — a current FX lock is required"]] : []),
    ["NIUM transfer fee", verified?.transfer_fee && /^[A-Z]{3}$/.test(verified.transfer_fee.currency)
      ? amount(verified.transfer_fee.amount, verified.transfer_fee.currency, "Unavailable — provider confirmation pending")
      : "Unavailable — provider confirmation pending"],
    ["Expected beneficiary credit (SGD)", amount(verified?.beneficiary_credit, "SGD", "Unavailable — final credit not confirmed")],
    ...(actual ? [
      ["Observed USD wallet debit", reconciled ? amount(actual.observed_total_debit, "USD", "Awaiting financial evidence") : "Awaiting financial evidence"],
      ...(actual.observed_charge_debit !== undefined ? [["Observed additional NIUM charges",
        reconciled ? amount(actual.observed_charge_debit, "USD", "Awaiting financial evidence") : "Awaiting financial evidence"]] : []),
    ] : []),
  ];

  return <div className="space-y-3 text-sm">
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => <div key={label}>
        <dt className="text-xs text-[#62708a] dark:text-gray-400">{label}</dt>
        <dd className="mt-1 font-medium text-[#0f2442] dark:text-white">{value}</dd>
      </div>)}
    </dl>
    <p className="text-xs text-[#62708a] dark:text-gray-400">Conversion proceeds do not confirm final beneficiary credit. Fees may affect wallet debit and the amount received.</p>
    {verified?.estimated_conversion_amount ? <p className="text-xs text-[#62708a] dark:text-gray-400">The estimate uses NIUM's locked rate. NIUM performs the conversion; payout rounding and final credit remain subject to confirmation.</p> : null}
    {actual ? <p className="text-xs text-[#62708a] dark:text-gray-400">{reconciled
      ? "The observed debit comes from NIUM wallet activity. Additional charges may appear later."
      : "Wallet debit reconciliation is pending. Unresolved reservations remain held for review."}</p> : null}
    {actual?.pilot_charge_ceiling_breached ? <p role="alert">Observed charges exceed the verified test reserve ceiling. Financial review is required.</p> : null}
    {actual?.pilot_charge_exposure === "uncapped" ? <p role="alert">This one-time test has no verified ceiling for additional NIUM charges. Observed charges may increase as further debit evidence arrives.</p> : null}
  </div>;
};
