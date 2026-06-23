import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, Home, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { countryOptions } from "@/lib/money";
import { getProviderDisplayName, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";
import { getProviderReference, requestProviderConnect } from "@/services/providerAccountService";

const countryCurrencyMap: Record<string, string> = {
  AU: "AUD",
  CA: "CAD",
  CN: "CNY",
  DE: "EUR",
  FR: "EUR",
  GB: "GBP",
  HK: "HKD",
  ID: "IDR",
  IE: "EUR",
  JP: "JPY",
  KR: "KRW",
  MY: "MYR",
  PH: "PHP",
  SG: "SGD",
  TH: "THB",
  US: "USD",
  VN: "VND",
};

const multiCurrencyVirtualAccountCurrencies = [
  "AED",
  "AUD",
  "CAD",
  "CHF",
  "CNH",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "ILS",
  "JPY",
  "MXN",
  "NOK",
  "NZD",
  "PLN",
  "RON",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "USD",
  "ZAR",
];

type VirtualAccountCountryOption = {
  code: string;
  name: string;
  defaultCurrency: string;
  currencies: string[];
  isMultiCurrency?: boolean;
};

const virtualAccountCountryOptions: VirtualAccountCountryOption[] = [
  ...countryOptions.map((country) => {
    const defaultCurrency = countryCurrencyMap[country.code] ?? "USD";

    return {
      ...country,
      defaultCurrency,
      currencies: [defaultCurrency],
      isMultiCurrency: false,
    };
  }),
  {
    code: "IE",
    name: "Ireland",
    defaultCurrency: "EUR",
    currencies: ["EUR"],
    isMultiCurrency: false,
  },
].map((country) =>
  country.code === "GB"
    ? {
        ...country,
        name: "United Kingdom (Multi-currency)",
        currencies: multiCurrencyVirtualAccountCurrencies,
        isMultiCurrency: true,
      }
    : country,
);

const AccountVirtualAccountRequest = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [providerCode, setProviderCode] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(["USD"]);
  const [alias, setAlias] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const providersQuery = useQuery({
    queryKey: ["provider-reference", token],
    enabled: !!token,
    queryFn: async () => getProviderReference({ token: token as string }),
  });

  const providers = useMemo(() => (providersQuery.data ?? []).filter((provider) => provider.status === "active"), [providersQuery.data]);
  const selectedProvider = providers.find((provider) => provider.code === providerCode);
  const selectedCountry = virtualAccountCountryOptions.find((country) => country.code === countryCode);
  const accountType = selectedCountry?.isMultiCurrency ? "Multi-currency virtual account" : "Local virtual account";
  const requestCurrencies = selectedCountry?.isMultiCurrency ? selectedCurrencies : [currency];

  const countrySelectOptions = useMemo(
    () =>
      virtualAccountCountryOptions
        .filter((country, index, list) => list.findIndex((item) => item.code === country.code) === index)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [],
  );

  useEffect(() => {
    if (!providerCode && providers.length > 0) {
      setProviderCode(providers[0].code);
    }
  }, [providerCode, providers]);

  useEffect(() => {
    if (!selectedCountry) return;

    setCurrency(selectedCountry.defaultCurrency);
    setSelectedCurrencies(
      selectedCountry.isMultiCurrency ? [selectedCountry.defaultCurrency] : [selectedCountry.defaultCurrency],
    );
  }, [countryCode, selectedCountry]);

  const toggleCurrency = (nextCurrency: string) => {
    if (!selectedCountry?.isMultiCurrency) return;

    setSelectedCurrencies((current) => {
      if (current.includes(nextCurrency)) {
        return current.length === 1 ? current : current.filter((item) => item !== nextCurrency);
      }

      return [...current, nextCurrency].sort();
    });
  };

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!providerCode || !alias.trim()) {
        throw new Error("Account setup and account alias are required.");
      }

      if (requestCurrencies.length === 0) {
        throw new Error("Select at least one currency for the virtual account.");
      }

      return requestProviderConnect({
        userId: user?.id as string,
        token: token as string,
        providerCode,
        note: [
          `Virtual account request`,
          `Account type: ${accountType}`,
          `Country: ${countryCode}${selectedCountry ? ` - ${selectedCountry.name}` : ""}`,
          `Primary currency: ${currency}`,
          `Requested currencies: ${requestCurrencies.join(", ")}`,
          `Alias: ${alias.trim()}`,
          storeLink.trim() ? `Store link: ${storeLink.trim()}` : null,
          note.trim() ? `Customer note: ${note.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    },
    onSuccess: (payload) => {
      setFormError("");
      toast({
        title: "Request submitted",
        description: payload.message || "Origin Wallet operations will review this virtual account request.",
      });
      navigate("/account/virtual-accounts?tab=pending");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to request virtual account.";
      setFormError(message);
      toast({ variant: "destructive", title: "Request failed", description: message });
    },
  });

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-[#62708a] dark:text-gray-400">
          <Home className="h-4 w-4" />
          <Link to="/account/virtual-accounts" className="hover:text-[#16a34a] dark:hover:text-white">
            Virtual accounts
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#0f2442] dark:text-white">Request</span>
        </div>

        <h1 className="mb-4 text-[2.35rem] font-bold tracking-[-0.04em] text-[#0f2442] sm:text-[3.2rem] dark:text-white">
          Request virtual account
        </h1>
        <p className="mb-10 max-w-2xl text-[1.05rem] leading-7 text-[#62708a] dark:text-gray-400">
          Submit the required receiving account setup details. Operations can complete this manually now and map it to virtual account APIs once the official integration is enabled.
        </p>

        <div className="max-w-[36rem] space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-[#0f2442] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <p className="font-semibold">Choose the receiving account type carefully</p>
                <p className="leading-6 text-[#53627a] dark:text-amber-50/80">
                  Local countries use their domestic currency automatically. United Kingdom multi-currency accounts can collect several supported currencies under one request.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d7d7d2] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#151b24]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#62708a] dark:text-gray-400">
              Infrastructure rail
            </p>
            <p className="mt-1 text-[1rem] font-semibold text-[#0f2442] dark:text-white">
              {selectedProvider ? getProviderDisplayName(selectedProvider) : PRIMARY_PROVIDER_NAME}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Country/territory</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#151b24] dark:text-white">
                  <SelectValue>
                    {selectedCountry ? `${selectedCountry.code} - ${selectedCountry.name}` : countryCode}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countrySelectOptions.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.code} - {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <div className="flex h-12 items-center rounded-xl border border-[#d7d7d2] bg-white px-4 text-[1rem] font-semibold text-[#0f2442] dark:border-white/10 dark:bg-[#151b24] dark:text-white">
                <span translate="no">{currency}</span>
              </div>
            </div>
          </div>

          {selectedCountry?.isMultiCurrency ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Currencies</Label>
                <span className="text-sm font-medium text-[#62708a] dark:text-gray-400">
                  {selectedCurrencies.length} selected
                </span>
              </div>
              <div className="rounded-2xl border border-[#d7d7d2] bg-white p-3 dark:border-white/10 dark:bg-[#151b24]">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {selectedCountry.currencies.map((item) => {
                    const selected = selectedCurrencies.includes(item);

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleCurrency(item)}
                        className={`h-9 rounded-lg border px-2 text-sm font-semibold transition ${
                          selected
                            ? "border-[#16a34a] bg-[#ecfdf3] text-[#0f5f3b] shadow-sm dark:border-[#22c55e] dark:bg-[#22c55e]/15 dark:text-[#86efac]"
                            : "border-[#d7d7d2] bg-[#fbfcfe] text-[#53627a] hover:border-[#16a34a] hover:text-[#0f2442] dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-[#22c55e] dark:hover:text-white"
                        }`}
                        translate="no"
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Account alias</Label>
            <Input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              className="h-12 rounded-xl border-[#d7d7d2] bg-white text-[1rem] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
              placeholder="Enter new account name"
            />
          </div>

          <div className="space-y-2">
            <Label>Store link</Label>
            <Input
              value={storeLink}
              onChange={(event) => setStoreLink(event.target.value)}
              className="h-12 rounded-xl border-[#d7d7d2] bg-white text-[1rem] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label>Additional note</Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="rounded-2xl border-[#d7d7d2] bg-white text-[1rem] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
            />
          </div>

          {formError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex items-center gap-4 pt-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#d7d7d2] bg-white px-5 text-[#0f2442] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#151b24] dark:text-white"
            >
              <Link to="/account/virtual-accounts">Cancel</Link>
            </Button>
            <Button
              disabled={requestMutation.isPending}
              onClick={() => requestMutation.mutate()}
              className="rounded-full bg-[#16a34a] px-7 text-[1rem] font-semibold text-white hover:bg-[#15803d]"
            >
              {requestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm and request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountVirtualAccountRequest;
