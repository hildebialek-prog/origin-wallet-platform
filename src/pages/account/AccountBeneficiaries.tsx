/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProviderLogo } from "@/components/account/ProviderLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProviders, type ProviderSummary } from "@/services/fxOrderService";
import {
  createBeneficiary,
  deleteBeneficiary,
  getBeneficiaries,
  getBeneficiaryRequirements,
  type NiumBeneficiaryRequirements,
  updateBeneficiary,
  type Beneficiary,
  type BeneficiaryPayload,
} from "@/services/moneyMovementService";
import { ApiRequestError } from "@/services/apiClient";
import { applyNiumRequirements, extraSchemaFields, fieldLabel, routingEntries, schemaErrors, schemaFormFields } from "./beneficiaryRequirements";
import { countryOptions, currencyOptions, formatDateTime, statusBadgeClassName } from "@/lib/money";
import { getProviderDisplayName, PRIMARY_PROVIDER_NAME } from "@/lib/primaryProvider";

type BeneficiaryStep = "basic" | "accountType" | "bank" | "review";

export type BeneficiaryForm = {
  providerId: string;
  beneficiaryType: string;
  fullName: string;
  companyName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  countryCode: string;
  currency: string;
  bankName: string;
  bankCode: string;
  routingType: string;
  routingValue: string;
  secondaryRoutingType: string;
  secondaryRoutingValue: string;
  schemaValues: Record<string, string>;
  branchCode: string;
  accountNumber: string;
  confirmAccountNumber: string;
  iban: string;
  swiftBic: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  payoutMethod: string;
  bankAccountType: string;
  verifyBeforeCreate: string;
  vendorType: string;
  transactionDocumentName: string;
  accountRoute: "bank" | "provider";
};

export const emptyForm: BeneficiaryForm = {
  providerId: "",
  beneficiaryType: "business",
  fullName: "",
  companyName: "",
  email: "",
  phoneCountryCode: "+852",
  phone: "",
  countryCode: "HK",
  currency: "USD",
  bankName: "",
  bankCode: "",
  routingType: "",
  routingValue: "",
  secondaryRoutingType: "",
  secondaryRoutingValue: "",
  schemaValues: {},
  branchCode: "",
  accountNumber: "",
  confirmAccountNumber: "",
  iban: "",
  swiftBic: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  payoutMethod: "SWIFT",
  bankAccountType: "CURRENT",
  verifyBeforeCreate: "false",
  vendorType: "supplier",
  transactionDocumentName: "",
  accountRoute: "bank",
};

const beneficiarySteps: { key: BeneficiaryStep; label: string }[] = [
  { key: "basic", label: "Basic info" },
  { key: "accountType", label: "Account type" },
  { key: "bank", label: "Bank details" },
  { key: "review", label: "Review" },
];

const toRawData = (beneficiary?: Beneficiary | null) => (beneficiary?.raw_data ?? {}) as Record<string, unknown>;

export const toForm = (beneficiary?: Beneficiary | null): BeneficiaryForm => {
  if (!beneficiary) return emptyForm;

  const rawData = toRawData(beneficiary);
  const nium = (rawData.nium ?? {}) as Record<string, unknown>;
  const origin = (rawData.origin ?? {}) as Record<string, unknown>;

  const routing = (nium.routingInfo as { type: string; value: string }[] | undefined) ?? [
    ...(beneficiary.swift_bic ? [{ type: "SWIFT", value: beneficiary.swift_bic }] : []),
    ...(beneficiary.bank_code ? [{ type: String(nium.bankCodeType ?? ""), value: beneficiary.bank_code }] : []),
    ...(beneficiary.branch_code ? [{ type: String(nium.branchCodeType ?? ""), value: beneficiary.branch_code }] : []),
  ];

  return {
    routingType: routing[0]?.type ?? "", routingValue: routing[0]?.value ?? "",
    secondaryRoutingType: routing[1]?.type ?? "", secondaryRoutingValue: routing[1]?.value ?? "",
    schemaValues: (nium.additionalFields as Record<string, string>) ?? {},
    providerId: String(beneficiary.provider_id),
    beneficiaryType: beneficiary.beneficiary_type || "business",
    fullName: beneficiary.full_name || "",
    companyName: beneficiary.company_name || "",
    email: beneficiary.email || "",
    phoneCountryCode: String(nium.beneficiaryContactCountryCode ?? origin.phone_country_code ?? "+852"),
    phone: beneficiary.phone || "",
    countryCode: beneficiary.country_code || "HK",
    currency: beneficiary.currency || "USD",
    bankName: beneficiary.bank_name || "",
    bankCode: beneficiary.bank_code || "",
    branchCode: beneficiary.branch_code || "",
    accountNumber: beneficiary.account_number || "",
    confirmAccountNumber: beneficiary.account_number || "",
    iban: beneficiary.iban || "",
    swiftBic: beneficiary.swift_bic || "",
    addressLine1: beneficiary.address_line1 || "",
    addressLine2: beneficiary.address_line2 || "",
    city: beneficiary.city || "",
    state: beneficiary.state || "",
    postalCode: beneficiary.postal_code || "",
    payoutMethod: String(beneficiary.payout_method ?? nium.payoutMethod ?? "SWIFT"),
    bankAccountType: String(nium.beneficiaryBankAccountType ?? nium.bankAccountType ?? "CURRENT"),
    verifyBeforeCreate: String(Boolean(nium.verify_before_create ?? false)),
    vendorType: String(origin.vendor_type ?? nium.remitterBeneficiaryRelationship ?? "supplier"),
    transactionDocumentName: String(origin.transaction_document_name ?? ""),
    accountRoute: String(origin.account_route ?? "bank") === "provider" ? "provider" : "bank",
  };
};

export const buildPayload = (form: BeneficiaryForm, supportsAccountVerification = false, requirements?: NiumBeneficiaryRequirements): BeneficiaryPayload => {
  const accountNumber = form.accountNumber.trim();
  const phone = form.phone.trim();

  const payload: BeneficiaryPayload = {
    provider_id: Number(form.providerId),
    beneficiary_type: form.beneficiaryType,
    full_name: form.fullName.trim(),
    company_name: form.beneficiaryType === "business" ? form.companyName.trim() || form.fullName.trim() : null,
    email: form.email.trim() || null,
    phone: phone || null,
    country_code: form.countryCode,
    currency: form.currency,
    bank_name: form.bankName.trim() || null,
    bank_code: form.bankCode.trim() || null,
    branch_code: form.branchCode.trim() || null,
    account_number: accountNumber || null,
    iban: form.iban.trim() || null,
    swift_bic: form.swiftBic.trim() || null,
    address_line1: form.addressLine1.trim() || null,
    address_line2: form.addressLine2.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    postal_code: form.postalCode.trim() || null,
    raw_data: {
      origin: {
        account_route: form.accountRoute,
        vendor_type: form.vendorType.trim(),
        ...(phone ? { phone_country_code: form.phoneCountryCode.trim() } : {}),
      },
      nium: {
        payoutMethod: form.payoutMethod,
        bankAccountType: form.bankAccountType,
        ...(phone ? { beneficiaryContactCountryCode: form.phoneCountryCode.trim() } : {}),
        remitterBeneficiaryRelationship: form.vendorType.trim(),
        ...(supportsAccountVerification ? { verify_before_create: form.verifyBeforeCreate === "true" } : {}),
      },
    },
  };
  return requirements ? applyNiumRequirements(payload, form, requirements) : payload;
};

const beneficiaryTypeLabels: Record<string, string> = {
  individual: "Individual",
  business: "Business",
};

const payoutMethodLabels: Record<string, string> = {
  LOCAL: "Local bank transfer",
  SWIFT: "SWIFT",
  CARD: "Card payout",
  PROXY: "Proxy / wallet",
};

const bankAccountTypeLabels: Record<string, string> = {
  SAVINGS: "Savings",
  CHECKING: "Checking",
  CURRENT: "Current",
  BUSINESS: "Business",
};

const verifyLabels: Record<string, string> = {
  false: "No",
  true: "Yes",
};

const vendorRelationshipLabels: Record<string, string> = {
  supplier: "Supplier",
  contractor: "Contractor",
  employee: "Employee",
  marketplace_seller: "Marketplace seller",
  logistics: "Logistics partner",
  service_provider: "Service provider",
  other: "Other",
};

const phoneCountryOptions = [
  { code: "+84", label: "VN +84" },
  { code: "+852", label: "HK +852" },
  { code: "+65", label: "SG +65" },
  { code: "+86", label: "CN +86" },
  { code: "+81", label: "JP +81" },
  { code: "+82", label: "KR +82" },
  { code: "+66", label: "TH +66" },
  { code: "+60", label: "MY +60" },
  { code: "+62", label: "ID +62" },
  { code: "+63", label: "PH +63" },
  { code: "+61", label: "AU +61" },
  { code: "+44", label: "GB +44" },
  { code: "+1", label: "US/CA +1" },
];

export const payoutMethodsFor = () => ["LOCAL", "SWIFT"];

export const applyCountryChange = (form: BeneficiaryForm, countryCode: string): BeneficiaryForm => ({ ...form, countryCode });

export const validateBankForm = (form: BeneficiaryForm) => {
  if (form.accountRoute !== "bank") return "Wallet account recipients will be enabled after account-recipient APIs are confirmed.";
  if (!form.currency) return "Currency is required.";
  if (!form.accountNumber.trim() && !form.iban.trim()) return "Enter either account number or IBAN before saving the beneficiary.";
  if (form.accountNumber.trim() && !form.confirmAccountNumber.trim()) return "Confirm the account number before saving the beneficiary.";
  if (form.accountNumber.trim() && form.accountNumber.trim() !== form.confirmAccountNumber.trim()) return "Account number and confirmation do not match.";
  return "";
};

const AccountBeneficiaries = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [form, setForm] = useState<BeneficiaryForm>(emptyForm);
  const [step, setStep] = useState<BeneficiaryStep>("basic");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const beneficiariesQuery = useQuery({
    queryKey: ["money-beneficiaries", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getBeneficiaries({ userId: user?.id as string, token: token as string }),
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
  const beneficiaryProviders = providers.filter((provider) => provider.supports_beneficiaries);
  const beneficiaries = beneficiariesQuery.data ?? [];
  const selectedProvider = beneficiaryProviders.find((provider) => String(provider.id) === form.providerId);
  const selectedCountry = countryOptions.find((country) => country.code === form.countryCode);
  const isNium = selectedProvider?.code === "nium";
  const requirementsQuery = useQuery({
    queryKey: ["beneficiary-requirements", user?.id, token, form.providerId, form.beneficiaryType, form.countryCode, form.currency, form.payoutMethod],
    enabled: dialogOpen && isNium && !!token && !!user?.id,
    retry: false,
    queryFn: () => getBeneficiaryRequirements({
      userId: user!.id, token: token!, providerId: form.providerId, beneficiaryType: form.beneficiaryType,
      countryCode: form.countryCode, currency: form.currency, payoutMethod: form.payoutMethod,
    }),
  });
  const requirements = isNium && !requirementsQuery.isFetching && !requirementsQuery.isError ? requirementsQuery.data : undefined;
  const submittedPayload = buildPayload(form, selectedProvider?.supports_account_verification === true, requirements);
  const changeForm = (next: BeneficiaryForm) => {
    const changedCorridor = ["providerId", "beneficiaryType", "countryCode", "currency", "payoutMethod"].some((key) => next[key] !== form[key]);
    setForm(changedCorridor ? { ...next, routingType: "", routingValue: "", secondaryRoutingType: "", secondaryRoutingValue: "" } : next);
    setFieldErrors({});
    setFormError("");
  };

  const providerById = useMemo(() => {
    const map = new Map<number, ProviderSummary>();
    providers.forEach((provider) => map.set(provider.id, provider));
    return map;
  }, [providers]);

  const filteredBeneficiaries = beneficiaries.filter((beneficiary) => {
    const provider = providerById.get(beneficiary.provider_id);
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    return [
      beneficiary.full_name,
      beneficiary.company_name,
      beneficiary.bank_name,
      beneficiary.account_number,
      beneficiary.iban,
      beneficiary.currency,
      beneficiary.country_code,
      getProviderDisplayName(provider),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const refreshBeneficiaries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["money-beneficiaries", user?.id] });
  };

  const validateBasic = () => {
    if (!form.providerId) return "Beneficiary rail is not available yet.";
    if (!form.fullName.trim()) return "Vendor name is required.";
    if (!form.countryCode) return "Country or region is required.";
    if (!form.beneficiaryType) return "Vendor legal type is required.";
    if (!form.vendorType) return "Vendor relationship type is required.";
    return "";
  };

  const validateBank = () => {
    if (isNium && !requirements) return "Load the supported beneficiary requirements before continuing.";
    const errors = isNium && requirements ? schemaErrors(form, submittedPayload, requirements) : {};
    if (form.accountNumber.trim() && form.accountNumber.trim() !== form.confirmAccountNumber.trim()) {
      errors.confirmAccountNumber = form.confirmAccountNumber.trim() ? "Account number and confirmation do not match." : "Confirm the account number before continuing.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return "Check the highlighted fields before continuing.";
    return validateBankForm(form);
  };

  const goNext = () => {
    const validation =
      step === "basic"
        ? validateBasic()
        : step === "accountType" && form.accountRoute === "provider"
          ? "Wallet account recipients will be enabled after account-recipient APIs are confirmed."
          : step === "bank"
            ? validateBank()
            : "";
    if (validation) {
      setFormError(validation);
      return;
    }

    setFormError("");
    const index = beneficiarySteps.findIndex((item) => item.key === step);
    setStep(beneficiarySteps[Math.min(index + 1, beneficiarySteps.length - 1)].key);
  };

  const goBack = () => {
    setFormError("");
    const index = beneficiarySteps.findIndex((item) => item.key === step);
    setStep(beneficiarySteps[Math.max(index - 1, 0)].key);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const basicValidation = validateBasic();
      if (basicValidation) throw new Error(basicValidation);

      const bankValidation = validateBank();
      if (bankValidation) throw new Error(bankValidation);

      const payload = submittedPayload;

      if (editing) {
        return updateBeneficiary({
          userId: user?.id as string,
          token: token as string,
          beneficiaryId: editing.id,
          payload,
        });
      }

      return createBeneficiary({
        userId: user?.id as string,
        token: token as string,
        payload,
      });
    },
    onSuccess: async () => {
      await refreshBeneficiaries();
      closeDialog();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to save beneficiary.";
      setFormError(message);
      if (error instanceof ApiRequestError && error.errors) {
        setFieldErrors(Object.fromEntries(Object.entries(error.errors).map(([key, messages]) => [key.replace(/^raw_data\.nium\.additionalFields\./, ""), messages.join(" ")])));
        setStep("bank");
      }
      if (editing) {
        toast({ variant: "destructive", title: "Beneficiary update failed", description: message });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (beneficiaryId: number) =>
      deleteBeneficiary({ userId: user?.id as string, token: token as string, beneficiaryId }),
    onSuccess: refreshBeneficiaries,
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setStep("basic");
    setFormError("");
  };

  const openCreate = () => {
    setEditing(null);
    setFieldErrors({});
    setForm({
      ...emptyForm,
      providerId: beneficiaryProviders[0] ? String(beneficiaryProviders[0].id) : "",
    });
    setStep("basic");
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (beneficiary: Beneficiary) => {
    setEditing(beneficiary);
    setFieldErrors({});
    setForm(toForm(beneficiary));
    setStep("basic");
    setFormError("");
    setDialogOpen(true);
  };

  const handleCountryChange = (countryCode: string) => changeForm(applyCountryChange(form, countryCode));

  return (
    <div className="bg-[#f8f8f6] px-4 py-8 sm:px-7 sm:py-10 dark:bg-[#10141b]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[2.35rem] font-bold tracking-[-0.04em] text-[#0f2442] sm:text-[3.2rem] dark:text-white">
              Beneficiaries
            </h1>
            <p className="mt-2 max-w-3xl text-[1.05rem] leading-7 text-[#62708a] dark:text-gray-400">
              Add vendor identity and destination account details before creating live transfers.
            </p>
          </div>
          <Button onClick={openCreate} className="h-11 rounded-full bg-[#16a34a] px-6 text-[1rem] font-semibold text-white hover:bg-[#15803d]">
            <Plus className="mr-2 h-4 w-4" />
            Add beneficiary
          </Button>
        </div>

        {beneficiaryProviders.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Beneficiary rail is not ready yet.</p>
                <p className="mt-1 text-sm">
                  Complete account setup before adding beneficiaries.{" "}
                  <Link to="/account/integrations" className="font-semibold underline underline-offset-4">
                    Manage integrations
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative max-w-[32rem]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a879c]" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-12 rounded-full border-[#d7d7d2] bg-white pl-11 text-[1rem] dark:border-white/10 dark:bg-[#151b24] dark:text-white dark:placeholder:text-gray-500"
            placeholder="Alias, name, bank, account number, or currency"
          />
        </div>

        <Card className="overflow-hidden rounded-2xl border border-[#d7d7d2] bg-white shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#151b24]">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[1.25fr_1fr_1.1fr_0.8fr_0.8fr_120px] border-b border-[#d7d7d2] px-5 py-4 text-sm font-semibold text-[#0f2442] dark:border-white/10 dark:text-gray-200">
                <div>Beneficiary</div>
                <div>Infrastructure</div>
                <div>Bank details</div>
                <div>Country</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              <CardContent className="p-0">
                {filteredBeneficiaries.map((beneficiary) => {
                  const provider = providerById.get(beneficiary.provider_id);

                  return (
                    <div
                      key={beneficiary.id}
                      className="grid grid-cols-[1.25fr_1fr_1.1fr_0.8fr_0.8fr_120px] items-center border-b border-[#e8edf5] px-5 py-5 text-sm last:border-b-0 dark:border-white/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#0f2442] dark:text-white">{beneficiary.full_name}</p>
                        <p className="mt-1 truncate text-xs text-[#62708a] dark:text-gray-400">
                          {beneficiary.company_name || beneficiary.email || beneficiary.phone || beneficiary.beneficiary_type}
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
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#0f2442] dark:text-white">
                          {beneficiary.bank_name || beneficiary.swift_bic || "Bank account"}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#62708a] dark:text-gray-400">
                          {beneficiary.iban || beneficiary.account_number || "No account number"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-[#0f2442] dark:text-white">{beneficiary.country_code}</p>
                        <p className="mt-1 text-xs text-[#62708a] dark:text-gray-400">
                          <span translate="no">{beneficiary.currency}</span>
                        </p>
                      </div>
                      <div>
                        <Badge className={statusBadgeClassName(beneficiary.status)}>{beneficiary.status}</Badge>
                        <p className="mt-2 text-xs text-[#7a879c] dark:text-gray-500">{formatDateTime(beneficiary.updated_at)}</p>
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(beneficiary)}
                          className="h-9 w-9 rounded-full text-[#53627a] hover:bg-[#f0f4fa] dark:text-gray-300 dark:hover:bg-white/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(beneficiary.id)}
                          className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredBeneficiaries.length === 0 && (
                  <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 px-5 py-14 text-center">
                    <Landmark className="h-8 w-8 text-[#16a34a]" />
                    <div className="space-y-2">
                      <h2 className="text-[1.6rem] font-semibold text-[#0f2442] dark:text-white">
                        {beneficiariesQuery.isLoading ? "Loading beneficiaries..." : "No beneficiaries yet"}
                      </h2>
                      <p className="max-w-[36rem] text-[1rem] leading-7 text-[#62708a] dark:text-gray-400">
                        Add verified vendor and recipient bank details before submitting live payouts.
                      </p>
                    </div>
                    <Button onClick={openCreate} className="rounded-full bg-[#16a34a] px-6 font-semibold text-white hover:bg-[#15803d]">
                      <Plus className="mr-2 h-4 w-4" />
                      Add beneficiary
                    </Button>
                  </div>
                )}
              </CardContent>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto rounded-none border-0 bg-[#fbfcfe] p-0 dark:bg-[#10141b]">
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#e4e9f2] bg-white px-5 dark:border-white/10 dark:bg-[#151b24]">
            <div className="font-semibold text-[#0f2442] dark:text-white">{editing ? "Edit vendor" : "Add vendor"}</div>
            <button
              type="button"
              onClick={closeDialog}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#0f2442] transition-colors hover:bg-[#f0fdf4] hover:text-[#15803d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]/30 dark:text-white dark:hover:bg-white/10 dark:hover:text-[#86efac]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-10">
            <BeneficiaryStepper currentStep={step} />

            {formError ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                <AlertCircle className="mr-2 inline h-4 w-4" />
                {formError}
              </div>
            ) : null}

            {isNium && (step === "bank" || step === "review") && !requirements && (
              <div role="status" className="mt-6 space-y-3 rounded-xl border p-4">
                <p>{requirementsQuery.isFetching ? "Loading supported beneficiary requirements…" : "Beneficiary requirements are unavailable. Check the payment details and retry before continuing."}</p>
                <Button variant="outline" disabled={requirementsQuery.isFetching} onClick={() => requirementsQuery.refetch()}>Retry requirements</Button>
              </div>
            )}
            {Object.keys(fieldErrors).length > 0 && (
              <ul role="alert" className="mt-4 space-y-1 text-sm text-red-700">
                {Object.entries(fieldErrors).map(([key, message]) => <li key={key}>{fieldLabel(key)}: {message}</li>)}
              </ul>
            )}

            <div className="mt-8">
              {step === "basic" && (
                <BasicVendorStep
                  form={form}
                  selectedProvider={selectedProvider}
                  selectedCountry={selectedCountry}
                  onCountryChange={handleCountryChange}
                  onChange={changeForm}
                  onContinue={goNext}
                />
              )}

              {step === "accountType" && (
                <AccountTypeStep
                  accountRoute={form.accountRoute}
                  onBack={goBack}
                  onSelect={(accountRoute) => setForm({ ...form, accountRoute })}
                  onContinue={goNext}
                />
              )}

              {step === "bank" && (
                <BankAccountStep
                  form={form}
                  selectedCountry={selectedCountry}
                  onCountryChange={handleCountryChange}
                  onBack={goBack}
                  onChange={changeForm}
                  onContinue={goNext}
                  supportsAccountVerification={selectedProvider?.supports_account_verification === true}
                  isNium={isNium}
                  requirements={requirements}
                  fieldErrors={fieldErrors}
                />
              )}

              {step === "review" && (
                <ReviewBeneficiaryStep
                  provider={selectedProvider}
                  country={selectedCountry}
                  saving={saveMutation.isPending || (isNium && !requirements)}
                  payload={submittedPayload}
                  requirements={requirements}
                  editing={Boolean(editing)}
                  onBack={goBack}
                  onSave={() => saveMutation.mutate()}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const BasicVendorStep = ({
  form,
  selectedProvider,
  selectedCountry,
  onCountryChange,
  onChange,
  onContinue,
}: {
  form: BeneficiaryForm;
  selectedProvider?: ProviderSummary;
  selectedCountry?: { code: string; name: string };
  onCountryChange: (countryCode: string) => void;
  onChange: (form: BeneficiaryForm) => void;
  onContinue: () => void;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] dark:text-white">Add a new vendor</h2>
      <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
        Save the vendor identity exactly as it appears on invoices and destination bank records.
      </p>
    </div>

    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d7d7d2] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#10141b]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#62708a] dark:text-gray-400">
          Infrastructure rail
        </p>
        <p className="mt-1 text-[1rem] font-semibold text-[#0f2442] dark:text-white">
          {selectedProvider ? getProviderDisplayName(selectedProvider) : PRIMARY_PROVIDER_NAME}
        </p>
      </div>

      <FormInput
        label="Vendor's name"
        value={form.fullName}
        onChange={(value) =>
          onChange({
            ...form,
            fullName: value,
            companyName: form.beneficiaryType === "business" ? value : form.companyName,
          })
        }
      />

      <FormInput label="Email (optional)" value={form.email} type="email" onChange={(value) => onChange({ ...form, email: value })} />

      <div className="space-y-2">
        <Label>Phone (optional)</Label>
        <div className="grid grid-cols-[140px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#10141b]">
          <Select value={form.phoneCountryCode} onValueChange={(value) => onChange({ ...form, phoneCountryCode: value })}>
            <SelectTrigger className="h-11 rounded-none border-0 border-r border-[#d7d7d2] bg-[#f3fdf9] focus:ring-0 dark:border-white/10 dark:bg-white/5">
              <SelectValue>{form.phoneCountryCode}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {phoneCountryOptions.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={form.phone}
            inputMode="tel"
            placeholder="Vendor's phone"
            onChange={(event) => onChange({ ...form, phone: event.target.value })}
            className="h-11 rounded-none border-0 bg-transparent focus-visible:ring-0"
          />
        </div>
      </div>

      <FormInput
        label="Vendor's address"
        value={form.addressLine1}
        placeholder="Search or paste the registered address"
        onChange={(value) => onChange({ ...form, addressLine1: value })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput label="Street / address line 2" value={form.addressLine2} onChange={(value) => onChange({ ...form, addressLine2: value })} />
        <FormInput label="City" value={form.city} onChange={(value) => onChange({ ...form, city: value })} />
        <FormInput label="State / province" value={form.state} onChange={(value) => onChange({ ...form, state: value })} />
        <FormInput label="Postal code" value={form.postalCode} onChange={(value) => onChange({ ...form, postalCode: value })} />
      </div>

      <FormSelect
        label="Country or region"
        value={form.countryCode}
        selectedLabel={selectedCountry ? `${selectedCountry.code} - ${selectedCountry.name}` : form.countryCode}
        onChange={onCountryChange}
      >
        {countryOptions.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.code} - {country.name}
          </SelectItem>
        ))}
      </FormSelect>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Vendor legal type"
          value={form.beneficiaryType}
          selectedLabel={beneficiaryTypeLabels[form.beneficiaryType]}
          onChange={(value) => onChange({ ...form, beneficiaryType: value })}
        >
          <SelectItem value="business">Business</SelectItem>
          <SelectItem value="individual">Individual</SelectItem>
        </FormSelect>

        <FormSelect
          label="Vendor relationship type"
          value={form.vendorType}
          selectedLabel={(vendorRelationshipLabels[form.vendorType] ?? form.vendorType)}
          onChange={(value) => onChange({ ...form, vendorType: value })}
        >
          {Object.entries(vendorRelationshipLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </FormSelect>
      </div>

      <div className="border-t border-[#e4e9f2] pt-5 dark:border-white/10">
        <h3 className="font-semibold text-[#0f2442] dark:text-white">
          Transaction information <span className="font-normal text-[#62708a]">(Optional)</span>
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#62708a] dark:text-gray-400">
          Document upload is not available yet. No file or local filename will be sent with this beneficiary.
        </p>
      </div>
    </div>

    <div className="space-y-3 pt-2">
      <Button className="h-12 w-full rounded-full bg-[#16a34a] text-base font-semibold text-white hover:bg-[#15803d]" onClick={onContinue}>
        Continue to add accounts
      </Button>
      <Button
        variant="outline"
        className="h-12 w-full rounded-full border-[#d7d7d2] bg-white text-base font-semibold text-[#16a34a] hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b]"
        onClick={onContinue}
      >
        Add account details later
      </Button>
    </div>
  </div>
);

const AccountTypeStep = ({
  accountRoute,
  onBack,
  onSelect,
  onContinue,
}: {
  accountRoute: "bank" | "provider";
  onBack: () => void;
  onSelect: (value: "bank" | "provider") => void;
  onContinue: () => void;
}) => (
  <div className="space-y-8">
    <BackButton onClick={onBack} />
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] dark:text-white">Choose account type</h2>
      <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
        Bank account is the supported live payout route. Wallet account recipients can be enabled after the account-recipient endpoint is confirmed.
      </p>
    </div>
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        type="button"
        onClick={() => onSelect("provider")}
        className={`flex w-full items-center gap-5 rounded-2xl border p-6 text-left transition ${
          accountRoute === "provider"
            ? "border-[#16a34a] bg-[#f0fdf4]"
            : "border-[#d7d7d2] bg-white hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b] dark:hover:bg-white/5"
        }`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ecfdf3] text-[#16a34a]">
          <UserRound className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#0f2442] dark:text-white">Wallet account</p>
          <p className="mt-1 text-sm text-[#62708a] dark:text-gray-400">
            Transfer to an internal wallet account when this route is supported.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-[#62708a]" />
      </button>

      <button
        type="button"
        onClick={() => onSelect("bank")}
        className={`flex w-full items-center gap-5 rounded-2xl border p-6 text-left transition ${
          accountRoute === "bank"
            ? "border-[#16a34a] bg-[#f0fdf4]"
            : "border-[#d7d7d2] bg-white hover:bg-[#f3fdf9] dark:border-white/10 dark:bg-[#10141b] dark:hover:bg-white/5"
        }`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ecfdf3] text-[#16a34a]">
          <Banknote className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#0f2442] dark:text-white">Bank account</p>
          <p className="mt-1 text-sm text-[#62708a] dark:text-gray-400">
            Add bank account details manually for international and local payout transfers.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-[#62708a]" />
      </button>
    </div>
    <Button className="mx-auto flex h-12 w-full max-w-2xl rounded-full bg-[#16a34a] text-base font-semibold text-white hover:bg-[#15803d]" onClick={onContinue}>
      Continue
    </Button>
  </div>
);

const BankAccountStep = ({
  form,
  selectedCountry,
  onCountryChange,
  onBack,
  onChange,
  onContinue,
  supportsAccountVerification,
  isNium, requirements, fieldErrors,
}: {
  form: BeneficiaryForm;
  selectedCountry?: { code: string; name: string };
  onCountryChange: (countryCode: string) => void;
  onBack: () => void;
  onChange: (form: BeneficiaryForm) => void;
  onContinue: () => void;
  supportsAccountVerification: boolean;
  isNium: boolean;
  requirements?: NiumBeneficiaryRequirements;
  fieldErrors: Record<string, string>;
}) => (
  <div className="space-y-7">
    <BackButton onClick={onBack} />

    <div className="rounded-2xl bg-[#f0f3f8] p-5 dark:bg-white/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#62708a] dark:text-gray-400">Vendor's name</p>
          <p className="mt-1 font-semibold text-[#0f2442] dark:text-white">{form.fullName || "-"}</p>
        </div>
        <button className="text-sm font-semibold text-[#16a34a] transition-colors hover:text-[#15803d] hover:underline" onClick={onBack} type="button">
          Edit
        </button>
      </div>
      <div className="mt-5 space-y-2 text-sm text-[#53627a] dark:text-gray-300">
        {form.phone ? (
          <InfoLine icon={<Phone className="h-4 w-4" />} value={`${form.phoneCountryCode}${form.phone}`} />
        ) : null}
        {form.email ? <InfoLine icon={<Mail className="h-4 w-4" />} value={form.email} /> : null}
        {form.addressLine1 ? <InfoLine icon={<MapPin className="h-4 w-4" />} value={fullAddress(form)} /> : null}
      </div>
    </div>

    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#0f2442] dark:text-white">Bank account information</h2>

      <FormSelect
        label="Bank location"
        value={form.countryCode}
        selectedLabel={selectedCountry ? `${selectedCountry.code} - ${selectedCountry.name}` : form.countryCode}
        onChange={onCountryChange}
      >
        {countryOptions.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.code} - {country.name}
          </SelectItem>
        ))}
      </FormSelect>

      <FormSelect
        label="Currency"
        value={form.currency}
        selectedLabel={<span translate="no">{form.currency}</span>}
        onChange={(value) =>
          onChange({
            ...form,
            currency: value,
            payoutMethod: form.payoutMethod,
          })
        }
      >
        {currencyOptions.map((currency) => (
          <CurrencySelectItem key={currency} value={currency} />
        ))}
      </FormSelect>

      <FormInput
        label="Account holder name"
        error={fieldErrors.beneficiaryName}
        value={form.beneficiaryType === "business" ? form.companyName || form.fullName : form.fullName}
        onChange={(value) => onChange({ ...form, ...(form.beneficiaryType === "business" ? { companyName: value } : { fullName: value }) })}
      />

      {!isNium && (<div className="flex flex-wrap gap-5 text-sm text-[#0f2442] dark:text-white">
        {Object.entries(bankAccountTypeLabels).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="bankAccountType"
              checked={form.bankAccountType === value}
              onChange={() => onChange({ ...form, bankAccountType: value })}
              className="h-4 w-4 border-[#aab6c9] text-[#16a34a]"
            />
            {label} Account
          </label>
        ))}
      </div>)}
      {isNium && requirements?.fields.some((f) => f.name === "beneficiaryBankAccountType") && (
        <SchemaInput field={requirements.fields.find((f) => f.name === "beneficiaryBankAccountType")!}
          value={form.bankAccountType} error={fieldErrors.beneficiaryBankAccountType}
          onChange={(value) => onChange({ ...form, bankAccountType: value })} />
      )}
      {isNium && requirements && <NiumRoutingFields form={form} requirements={requirements} errors={fieldErrors} onChange={onChange} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {!isNium && <FormInput label="SWIFT / BIC" value={form.swiftBic} placeholder="e.g. ABCDINBBXXX" onChange={(value) => onChange({ ...form, swiftBic: value })} />}
        <FormInput label="Bank name" required={requirements?.fields.some((f) => f.name === "beneficiaryBankName" && f.required)} error={fieldErrors.beneficiaryBankName} value={form.bankName} onChange={(value) => onChange({ ...form, bankName: value })} />
        {!isNium && <FormInput label="Bank code" value={form.bankCode} onChange={(value) => onChange({ ...form, bankCode: value })} />}
        {!isNium && <FormInput label="Branch code" value={form.branchCode} onChange={(value) => onChange({ ...form, branchCode: value })} />}
        <FormInput label="Account number" required={requirements?.fields.some((f) => f.name === "beneficiaryAccountNumber" && f.required) && !form.iban.trim()} error={fieldErrors.beneficiaryAccountNumber} value={form.accountNumber} onChange={(value) => onChange({ ...form, accountNumber: value })} />
        <FormInput
          label="Confirm account number"
          error={fieldErrors.confirmAccountNumber}
          value={form.confirmAccountNumber}
          onChange={(value) => onChange({ ...form, confirmAccountNumber: value })}
        />
        <FormInput label="IBAN" value={form.iban} onChange={(value) => onChange({ ...form, iban: value })} />
      </div>

      {isNium && requirements && <div className="grid gap-4 sm:grid-cols-2">
        {requirements.fields.filter((field) => {
          const key = schemaFormFields[field.name];
          return key && !["fullName", "accountNumber", "bankName", "bankAccountType"].includes(key);
        }).map((field) => <SchemaInput key={field.name} field={field} value={String(form[schemaFormFields[field.name]])}
          error={fieldErrors[field.name]} onChange={(value) => onChange({ ...form, [schemaFormFields[field.name]]: value })} />)}
        {extraSchemaFields(requirements).map((field) => <SchemaInput key={field.name} field={field}
          value={form.schemaValues[field.name] ?? ""} error={fieldErrors[field.name]}
          onChange={(value) => onChange({ ...form, schemaValues: { ...form.schemaValues, [field.name]: value } })} />)}
      </div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Payout method"
          value={form.payoutMethod}
          selectedLabel={payoutMethodLabels[form.payoutMethod]}
          onChange={(value) => onChange({ ...form, payoutMethod: value })}
        >
          {payoutMethodsFor().map((method) => (
            <SelectItem key={method} value={method}>{payoutMethodLabels[method]}</SelectItem>
          ))}
        </FormSelect>

        {supportsAccountVerification ? (
          <FormSelect
            label="Verify before create"
            value={form.verifyBeforeCreate}
            selectedLabel={verifyLabels[form.verifyBeforeCreate]}
            onChange={(value) => onChange({ ...form, verifyBeforeCreate: value })}
          >
            <SelectItem value="false">No</SelectItem>
            <SelectItem value="true">Yes</SelectItem>
          </FormSelect>
        ) : null}
      </div>
    </div>

    <Button className="h-12 w-full rounded-full bg-[#16a34a] text-base font-semibold text-white hover:bg-[#15803d]" onClick={onContinue} disabled={isNium && !requirements}>
      Continue to review
    </Button>
  </div>
);

export const ReviewBeneficiaryStep = ({
  payload, requirements,
  provider,
  country,
  saving,
  editing,
  onBack,
  onSave,
}: {
  payload: BeneficiaryPayload;
  requirements?: NiumBeneficiaryRequirements;
  provider?: ProviderSummary;
  country?: { code: string; name: string };
  saving: boolean;
  editing: boolean;
  onBack: () => void;
  onSave: () => void;
}) => {
  const form = toForm({ ...payload, id: 0, user_id: 0, status: "pending" });
  const routing = ((payload.raw_data?.nium as { routingInfo?: { type: string; value: string }[] })?.routingInfo ?? []);
  return (
    <div className="space-y-7">
      <BackButton onClick={onBack} />
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f2442] dark:text-white">Review vendor details</h2>
        <p className="mt-2 text-sm text-[#62708a] dark:text-gray-400">
          Confirm these details before Origin Wallet sends the beneficiary request.
        </p>
      </div>

      <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 dark:border-white/10 dark:bg-[#10141b]">
        <SectionTitle icon={<Building2 className="h-5 w-5" />} title="Basic information" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReviewItem label="Infrastructure" value={provider ? getProviderDisplayName(provider) : PRIMARY_PROVIDER_NAME} />
          <ReviewItem label="Vendor name" value={form.fullName || "-"} />
          <ReviewItem label="Legal type" value={beneficiaryTypeLabels[form.beneficiaryType]} />
          <ReviewItem label="Relationship" value={(vendorRelationshipLabels[form.vendorType] ?? form.vendorType)} />
          <ReviewItem label="Email" value={form.email || "-"} />
          <ReviewItem label="Phone" value={form.phone ? `${form.phoneCountryCode}${form.phone}` : "-"} />
          <ReviewItem label="Country" value={country ? `${country.code} - ${country.name}` : form.countryCode} />
          <ReviewItem label="Address" value={fullAddress(form) || "-"} />
        </div>
      </div>

      <div className="rounded-2xl border border-[#d7d7d2] bg-white p-5 dark:border-white/10 dark:bg-[#10141b]">
        <SectionTitle icon={<Banknote className="h-5 w-5" />} title="Bank account information" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReviewItem label="Account route" value={form.accountRoute === "bank" ? "Bank account" : "Wallet account"} />
          <ReviewItem label="Currency" value={<span translate="no">{form.currency}</span>} />
          <ReviewItem label="Account holder" value={form.companyName || form.fullName || "-"} />
          {(!requirements || requirements.fields.some((f) => f.name === "beneficiaryBankAccountType")) &&
            <ReviewItem label="Account type" value={form.bankAccountType} /> }
          <ReviewItem label="Bank name" value={form.bankName || "-"} />
          {requirements ? routing.map((entry, index) => (
            <ReviewItem key={index} label={entry.type === "SWIFT" ? "SWIFT / BIC" : `${entry.type} code`} value={entry.value} />
          )) : <>
            <ReviewItem label="SWIFT / BIC" value={form.swiftBic || "-"} />
            <ReviewItem label="Bank code" value={form.bankCode || "-"} />
            <ReviewItem label="Branch code" value={form.branchCode || "-"} />
          </>}
          <ReviewItem label="Account number" value={payload.account_number || "-"} />
          <ReviewItem label="IBAN" value={payload.iban || "-"} />
          {requirements && extraSchemaFields(requirements).filter((f) => form.schemaValues[f.name]).map((field) =>
            <ReviewItem key={field.name} label={fieldLabel(field.name)} value={form.schemaValues[field.name]} />)}
          <ReviewItem label="Payout method" value={payoutMethodLabels[form.payoutMethod]} />
          {provider?.supports_account_verification ? (
            <ReviewItem label="Verify before create" value={verifyLabels[form.verifyBeforeCreate]} />
          ) : null}
        </div>
      </div>

      <Button
        className="h-12 w-full rounded-full bg-[#16a34a] text-base font-semibold text-white hover:bg-[#15803d]"
        disabled={saving}
        onClick={onSave}
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {editing ? "Save changes" : "Create beneficiary"}
      </Button>
    </div>
  );
};

const BeneficiaryStepper = ({ currentStep }: { currentStep: BeneficiaryStep }) => {
  const currentIndex = beneficiarySteps.findIndex((item) => item.key === currentStep);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold text-[#62708a]">
        <span>Step {currentIndex + 1} of {beneficiarySteps.length}</span>
        <span>{Math.round(((currentIndex + 1) / beneficiarySteps.length) * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#e4e9f2] dark:bg-white/10">
        <div
          className="h-full rounded-full bg-[#16a34a] transition-all"
          style={{ width: `${((currentIndex + 1) / beneficiarySteps.length) * 100}%` }}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {beneficiarySteps.map((item, index) => {
          const active = index === currentIndex;
          const complete = index < currentIndex;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${
                active ? "bg-[#ecfdf3] text-[#0f2442]" : "text-[#62708a] dark:text-gray-400"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  complete
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-[#16a34a] text-white"
                      : "bg-[#eef2f8] text-[#62708a] dark:bg-white/5"
                }`}
              >
                {complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              <span className="truncate font-semibold">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f2442] transition-colors hover:text-[#16a34a] dark:text-white dark:hover:text-[#86efac]">
    <ArrowLeft className="h-4 w-4" />
    Back
  </button>
);

const InfoLine = ({ icon, value }: { icon: ReactNode; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 text-[#53627a]">{icon}</span>
    <span>{value}</span>
  </div>
);

const FormInput = ({ label, value, type = "text", placeholder, onChange, error, required }: {
  label: string; value: string; type?: string; placeholder?: string; onChange: (value: string) => void; error?: string; required?: boolean;
}) => {
  const id = useId();
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}{required ? " (Required)" : required === false ? " (Optional)" : ""}</Label>
    <Input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} required={required}
      type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#10141b]" />
    {error && <p id={`${id}-error`} className="text-sm text-red-700">{error}</p>}
  </div>;
};

export const NiumRoutingFields = ({ form, requirements, errors, onChange }: {
  form: BeneficiaryForm; requirements: NiumBeneficiaryRequirements; errors: Record<string, string>; onChange: (form: BeneficiaryForm) => void;
}) => <div className="grid gap-4 sm:grid-cols-2">
  {routingEntries(form, requirements).map((entry) => <div key={entry.slot} className="space-y-3">
    {(entry.types.length > 1 || !entry.required || !entry.types.includes(entry.type)) && <SchemaInput
      field={{ name: `routingCodeType${entry.slot}`, required: entry.required, allowed_values: entry.types }}
      label={entry.slot === 1 ? "Routing type" : "Additional routing type"}
      value={entry.type} error={errors[`routingCodeType${entry.slot}`]}
      onChange={(value) => onChange({ ...form, ...(entry.slot === 1 ? { routingType: value, routingValue: "" } : { secondaryRoutingType: value, secondaryRoutingValue: "" }) })} />}
    {(entry.required || entry.type || entry.types.length === 1) && <FormInput
      label={entry.type === "SWIFT" || (entry.types.length === 1 && entry.types[0] === "SWIFT") ? "SWIFT / BIC" : `${entry.type || "Routing"} code`}
      value={entry.value} required={entry.required}
      error={errors[`routingCodeValue${entry.slot}`] || errors[`routingCodeType${entry.slot}`]}
      onChange={(value) => onChange({ ...form, ...(entry.slot === 1 ? { routingValue: value } : { secondaryRoutingValue: value }) })} />}
  </div>)}
</div>;

const SchemaInput = ({ field, label = fieldLabel(field.name), value, error, onChange }: {
  field: import("@/services/moneyMovementService").BeneficiaryRequirementField;
  label?: string; value: string; error?: string; onChange: (value: string) => void;
}) => {
  const id = useId();
  const options = field.allowed_values ?? (field.type === "boolean" ? [true, false] : undefined);
  if (!options) return <FormInput label={label} value={value} required={field.required} error={error} onChange={onChange} />;
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}{field.required ? " (Required)" : " (Optional)"}</Label>
    <select id={id} className="h-11 w-full rounded-xl border bg-background px-3" value={value} required={field.required}
      aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select {label.toLowerCase()}</option>
      {options.map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
    </select>
    {error && <p id={`${id}-error`} className="text-sm text-red-700">{error}</p>}
  </div>;
};

const FormSelect = ({
  label,
  value,
  selectedLabel,
  onChange,
  children,
}: {
  label: string;
  value: string;
  selectedLabel?: ReactNode;
  onChange: (value: string) => void;
  children: ReactNode;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 rounded-xl border-[#d7d7d2] bg-white dark:border-white/10 dark:bg-[#10141b]">
        <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
          {value ? selectedLabel : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  </div>
);

const CurrencySelectItem = ({ value }: { value: string }) => (
  <SelectItem value={value}>
    <span translate="no">{value}</span>
  </SelectItem>
);

const SectionTitle = ({ icon, title }: { icon: ReactNode; title: string }) => (
  <div className="flex items-center gap-2 font-semibold text-[#0f2442] dark:text-white">
    <span className="text-[#16a34a]">{icon}</span>
    {title}
  </div>
);

const ReviewItem = ({ label, value }: { label: string; value?: ReactNode }) => (
  <div className="rounded-xl bg-[#f3fdf9] px-4 py-3 dark:bg-white/5">
    <p className="text-xs font-medium text-[#62708a] dark:text-gray-400">{label}</p>
    <p className="mt-1 break-words font-semibold text-[#0f2442] dark:text-white">{value || "-"}</p>
  </div>
);

const fullAddress = (form: BeneficiaryForm) =>
  [form.addressLine1, form.addressLine2, form.city, form.state, form.postalCode, form.countryCode].filter(Boolean).join(", ");

export default AccountBeneficiaries;
