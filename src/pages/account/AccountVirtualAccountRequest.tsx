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
import { getProviderDisplayName, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";
import {
  getProviderReference,
  requestVirtualAccount,
  type VirtualAccountCategory,
  type VirtualAccountType,
} from "@/services/providerAccountService";

const virtualAccountCurrencies = [
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

const AccountVirtualAccountRequest = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [providerCode, setProviderCode] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [accountCategory, setAccountCategory] = useState<VirtualAccountCategory>("SELF_FUNDING_ACCOUNT");
  const [accountType, setAccountType] = useState<VirtualAccountType>("LOCAL");
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

  useEffect(() => {
    if (!providerCode && providers.length > 0) {
      setProviderCode(providers[0].code);
    }
  }, [providerCode, providers]);

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!providerCode || !alias.trim()) {
        throw new Error("Account setup and account alias are required.");
      }

      return requestVirtualAccount({
        userId: user?.id as string,
        token: token as string,
        providerCode,
        currency,
        accountCategory,
        accountType,
      });
    },
    onSuccess: (payload) => {
      setFormError("");
      toast({
        title: "Request submitted",
        description: payload.message || "Your virtual account was assigned successfully.",
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
                  Currency, account category, and account type determine how the receiving account can be funded and used.
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

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#151b24] dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {virtualAccountCurrencies.map((item) => (
                  <SelectItem key={item} value={item} translate="no">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Account category</Label>
              <Select
                value={accountCategory}
                onValueChange={(value) => setAccountCategory(value as VirtualAccountCategory)}
              >
                <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#151b24] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELF_FUNDING_ACCOUNT">Self-funding account</SelectItem>
                  <SelectItem value="COLLECTION_ACCOUNT">Collection account</SelectItem>
                  <SelectItem value="SELF_FUNDING_AND_COLLECTION_ACCOUNT">
                    Self-funding and collection
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account type</Label>
              <Select value={accountType} onValueChange={(value) => setAccountType(value as VirtualAccountType)}>
                <SelectTrigger className="h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#151b24] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCAL">Local</SelectItem>
                  <SelectItem value="WIRES">Wires</SelectItem>
                  <SelectItem value="LOCAL_AND_WIRES">Local and wires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
