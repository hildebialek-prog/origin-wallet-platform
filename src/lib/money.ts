export const currencyOptions = [
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "CHF",
  "HKD",
  "JPY",
  "KRW",
  "NZD",
  "SGD",
  "THB",
  "VND",
];

export const countryOptions = [
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "CN", name: "China" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "HK", name: "Hong Kong" },
  { code: "ID", name: "Indonesia" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "MY", name: "Malaysia" },
  { code: "PH", name: "Philippines" },
  { code: "SG", name: "Singapore" },
  { code: "TH", name: "Thailand" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
];

export const purposeOptions = [
  { code: "business_payment", label: "Business payment" },
  { code: "supplier_payment", label: "Supplier payment" },
  { code: "salary", label: "Salary" },
  { code: "family_support", label: "Family support" },
  { code: "education", label: "Education" },
  { code: "travel", label: "Travel" },
  { code: "investment", label: "Investment" },
  { code: "other", label: "Other" },
];

export const toNumber = (value?: string | number | null) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const formatNumber = (value?: string | number | null, maximumFractionDigits = 8) => {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits }).format(numeric)
    : String(value);
};

export const formatAmount = (value?: string | number | null, currency?: string | null) => {
  const formatted = formatNumber(value);
  return formatted === "-" ? "-" : `${currency || ""} ${formatted}`.trim();
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
};

export const statusBadgeClassName = (status?: string | null) => {
  const normalized = String(status ?? "").toLowerCase();

  if (["active", "approved", "completed", "confirmed", "success", "succeeded", "processed"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (["pending", "processing", "submitted", "approval_required", "draft"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }

  if (["failed", "rejected", "cancelled", "canceled", "returned", "expired"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300";
};
