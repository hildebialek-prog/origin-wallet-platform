import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { VirtualAccountLifecycleStatus } from "@/components/account/VirtualAccountLifecycleStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useVirtualAccountOperation } from "@/hooks/useVirtualAccountOperation";
import { blocksAssignment } from "@/lib/virtualAccountOperation";
import { getProviderDisplayName, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";
import { getProviderIntegrations, getProviderReference, virtualAccountAllocationMessage, type VirtualAccountCategory, type VirtualAccountType } from "@/services/providerAccountService";

const AccountVirtualAccountRequest = () => {
  const { user, token } = useAuth();
  const lifecycle = useVirtualAccountOperation();
  const [currency, setCurrency] = useState("USD");
  const [accountCategory, setAccountCategory] = useState<VirtualAccountCategory>("SELF_FUNDING_ACCOUNT");
  const [accountType, setAccountType] = useState<VirtualAccountType>("WIRES");
  const [alias, setAlias] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [reviewAnotherRequest, setReviewAnotherRequest] = useState(false);
  const submissionStarted = useRef(false);
  const retainedRequest = lifecycle.state?.scope?.operations.find(blocksAssignment)?.request;
  const retainedCurrency = retainedRequest?.currency;
  const retainedCategory = retainedRequest?.accountCategory;
  const retainedType = retainedRequest?.accountType;
  // Status refreshes may recreate the request object; restore only when its parameters change.
  useEffect(() => {
    if (retainedCurrency && retainedCategory && retainedType) {
      setCurrency(retainedCurrency);
      setAccountCategory(retainedCategory as VirtualAccountCategory);
      setAccountType(retainedType as VirtualAccountType);
    }
  }, [retainedCurrency, retainedCategory, retainedType]);

  const providers = useQuery({ queryKey: ["provider-reference", token], enabled: !!token,
    queryFn: () => getProviderReference({ token }), retry: false });
  const integrations = useQuery({ queryKey: ["provider-integrations", user?.id, token], enabled: !!user?.id && !!token,
    queryFn: () => getProviderIntegrations({ userId: user.id, token }), retry: false });
  const provider = providers.data?.find((item) => item.code.toLowerCase() === "nium" && item.status === "active");
  const integration = integrations.data?.find((item) => item.provider.code.toLowerCase() === "nium");
  const loading = providers.isLoading || integrations.isLoading;
  const accountEligible = !loading && !providers.isError && !integrations.isError && !!provider
    && integration?.can_request_virtual_account === true && !!integration.provider_account?.id;
  const eligible = accountEligible && integration?.virtual_account_allocation_reason === null;
  const eligibilityMessages: Record<string, string> = {
    account_missing: "Provider account setup is incomplete. Virtual account requests are unavailable for now.",
    kyb_approval_pending: "KYB approval pending. Virtual account requests will be available after approval.",
    account_restricted: "The provider account is restricted. Virtual account requests are unavailable.",
    account_security_review: "The provider account requires a security review. Virtual account requests are unavailable.",
    account_verification_incomplete: "Customer or wallet verification is incomplete. Virtual account requests are unavailable for now.",
    unsupported_provider: "Virtual account requests are unavailable for this provider.",
  };
  const eligibilityMessage = loading ? "Checking virtual account eligibility..."
    : providers.isError || integrations.isError ? "Account setup or verification incomplete. Eligibility could not be checked."
    : !provider ? "The provider is currently unavailable. Saved requests can still be checked."
    : !accountEligible ? eligibilityMessages[integration?.virtual_account_eligibility_reason ?? ""]
      ?? "Account setup or verification incomplete. Virtual account requests are unavailable for now."
    : !eligible ? virtualAccountAllocationMessage(integration?.virtual_account_allocation_reason)
    : "Account ready for virtual account requests.";
  const supportedIntent = currency === "USD" && accountCategory === "SELF_FUNDING_ACCOUNT" && accountType === "WIRES";

  const mutation = useMutation({
    mutationFn: () => lifecycle.submit({ providerCode: "nium", currency, accountCategory, accountType }, integration?.provider_account?.id),
    retry: false,
    onSuccess: (operation) => {
      setFormError("");
      if (operation.server?.status === "assigned") setReviewAnotherRequest(true);
      toast({ title: operation.server?.status === "assigned" ? "Virtual account assigned" : "Request saved",
        description: operation.server?.status === "assigned" ? "Banking details may still be updating." : "Check the saved request status here. Assignment is not yet confirmed." });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "The saved request needs status verification.");
    },
    onSettled: () => { submissionStarted.current = false; },
  });
  const disabled = mutation.isPending || lifecycle.state?.submitting || lifecycle.blocked || reviewAnotherRequest;
  const fieldClass = "h-12 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#151b24] dark:text-white";

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
      <div className="mx-auto max-w-4xl">
        <Link to="/account/virtual-accounts" className="text-sm text-[#62708a] underline">Virtual accounts</Link>
        <h1 className="mb-4 mt-6 text-4xl font-bold tracking-tight text-[#0f2442] dark:text-white">Request virtual account</h1>
        <p className="mb-8 max-w-2xl text-[#62708a] dark:text-gray-400">USD self-funding requests use JPM_SG with Wires intent. Each new confirmed request may create another virtual account. Availability depends on account approval and allocation readiness.</p>
        <div className="max-w-[36rem] space-y-6">
          <div className="rounded-2xl border border-[#d7d7d2] bg-white p-4 dark:border-white/10 dark:bg-[#151b24]">
            <p className="text-xs font-semibold uppercase text-[#62708a]">Infrastructure rail</p>
            <p className="mt-1 font-semibold dark:text-white">{provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME}</p>
            <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">{eligibilityMessage}</p>
          </div>
          <VirtualAccountLifecycleStatus lifecycle={lifecycle} />
          <div className="space-y-2">
            <Label htmlFor="va-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={disabled || !eligible}>
              <SelectTrigger id="va-currency" className={fieldClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD" translate="no">USD</SelectItem>
                {currency !== "USD" && <SelectItem value={currency} disabled>{currency} (saved request)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="va-category">Account category</Label>
              <Select value={accountCategory} disabled={disabled || !eligible} onValueChange={(value) => setAccountCategory(value as VirtualAccountCategory)}>
                <SelectTrigger id="va-category" className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELF_FUNDING_ACCOUNT">Self-funding account</SelectItem>
                  {accountCategory !== "SELF_FUNDING_ACCOUNT" && <SelectItem value={accountCategory} disabled>
                    {accountCategory === "COLLECTION_ACCOUNT" ? "Collection account" : "Self-funding and collection"} (saved request)
                  </SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="va-type">Account type</Label>
              <Select value={accountType} disabled={disabled || !eligible} onValueChange={(value) => setAccountType(value as VirtualAccountType)}>
                <SelectTrigger id="va-type" className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIRES">Wires</SelectItem>
                  {accountType !== "WIRES" && <SelectItem value={accountType} disabled>
                    {accountType === "LOCAL" ? "Local" : "Local and wires"} (saved request)
                  </SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!supportedIntent && <p role="status" className="text-sm text-[#62708a]">Saved request parameters are retained. New requests require USD, self-funding and Wires.</p>}
          <div className="space-y-2"><Label htmlFor="va-alias">Account alias (local reference only)</Label><Input id="va-alias" value={alias} onChange={(event) => setAlias(event.target.value)} className={fieldClass} /></div>
          <div className="space-y-2"><Label htmlFor="va-store">Store link (local reference only)</Label><Input id="va-store" value={storeLink} onChange={(event) => setStoreLink(event.target.value)} className={fieldClass} /></div>
          <div className="space-y-2">
            <Label htmlFor="va-note">Additional note (local reference only)</Label><Textarea id="va-note" value={note} onChange={(event) => setNote(event.target.value)} />
            <p className="text-sm text-[#62708a]">Account alias, store link, and note are not sent to or persisted by the virtual account API.</p>
          </div>
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          {reviewAnotherRequest && <Button variant="outline" disabled={lifecycle.blocked} onClick={() => setReviewAnotherRequest(false)}>Prepare another VA request</Button>}
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" className="rounded-full"><Link to="/account/virtual-accounts">View accounts</Link></Button>
            <Button disabled={disabled || !eligible || !supportedIntent || lifecycle.state?.checking} onClick={(event) => {
              if (event.detail > 1 || submissionStarted.current) return;
              submissionStarted.current = true;
              mutation.mutate();
            }} className="rounded-full bg-[#16a34a] text-white hover:bg-[#15803d]">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm and request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountVirtualAccountRequest;
