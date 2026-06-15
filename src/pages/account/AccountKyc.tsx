import { useCallback, useEffect, useMemo, useRef, useState, type HTMLInputTypeAttribute } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Circle, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  completeIdentityVerificationSession,
  getKycProfile,
  startIdentityVerificationSession,
  submitKycProfile,
  uploadKycDocument,
  uploadIdentityVerificationFile,
  type IdentityCaptureType,
  type IdentityVerificationArtifact,
  type IdentityVerificationSession,
  type IdentityVerificationSubject,
  type KycDocumentPayload,
  type KycDocumentSubjectType,
  type KycProfile,
  type KycSubmissionPayload,
} from "@/services/kycService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApplicantType = "individual" | "business";
type IdentityDocumentType = "national_id" | "passport" | "driver_license" | "identity_document";

type ProfileForm = {
  legalName: string;
  dateOfBirth: string;
  nationality: string;
  residence: string;
  occupation: string;
  sourceOfFunds: string;
  expectedMonthlyVolume: string;
  countryCode: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  idDocumentType: IdentityDocumentType;
  idDocumentNumber: string;
  idIssuedAt: string;
  idExpiresAt: string;
  idFrontUrl: string;
  idBackUrl: string;
  proofOfAddressUrl: string;
  selfieLivenessUrl: string;
  livenessSessionId: string;
};

type BusinessForm = {
  businessName: string;
  businessRegistration: string;
  taxId: string;
  businessActivityType: string;
  exportingRegions: string;
  tradeType: string;
  mainProduct: string;
  industry: string;
  businessActivity: string;
  website: string;
  sourceOfFunds: string;
  expectedMonthlyVolume: string;
  registrationDocumentUrl: string;
  certificateOfIncorporationUrl: string;
  businessAddressProofUrl: string;
  accountOpeningFormUrl: string;
  ownershipStructureUrl: string;
  tradeAttachmentUrl: string;
  agentName: string;
  agentAddress: string;
  agentIdentityUrl: string;
  historicalTradeMaterialsUrl: string;
  historicalTradeComment: string;
};

type PersonForm = {
  legalName: string;
  dateOfBirth: string;
  nationality: string;
  residence: string;
  ownershipPercentage: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  idDocumentType: IdentityDocumentType;
  idDocumentNumber: string;
  idIssuedAt: string;
  idExpiresAt: string;
  idFrontUrl: string;
  idBackUrl: string;
  proofOfAddressUrl: string;
  selfieLivenessUrl: string;
  livenessSessionId: string;
};

type DocumentFieldKey =
  | "idDocumentType"
  | "idDocumentNumber"
  | "idIssuedAt"
  | "idExpiresAt"
  | "idFrontUrl"
  | "idBackUrl"
  | "proofOfAddressUrl";

type CaptureSessionMap = Partial<Record<IdentityVerificationSubject, IdentityVerificationSession>>;
type CaptureArtifactMap = Record<string, IdentityVerificationArtifact>;
type UploadedDocumentMap = Record<string, KycDocumentPayload>;

type KycDraft = {
  version: number;
  step: number;
  applicantType: ApplicantType;
  profileForm: ProfileForm;
  businessForm: BusinessForm;
  representativeForm: PersonForm;
  beneficialOwnerForm: PersonForm;
  captureSessions: CaptureSessionMap;
  captureArtifacts: CaptureArtifactMap;
  uploadedDocuments: UploadedDocumentMap;
  verificationConsent: boolean;
  savedAt: string;
};

const stepLabels = ["Profile type", "Applicant details", "Address & risk", "Documents", "Face check", "Submit"];
const kycDraftVersion = 1;
const kycDraftKey = (userId: string | number) => `origin-wallet-kyc-draft:${userId}`;
const lockedKycStatuses = new Set(["approved", "verified", "submitted", "under_review"]);
const todayInputValue = new Date().toISOString().slice(0, 10);
const tomorrowInputValue = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const countryOptions = [
  { label: "Vietnam (VN)", value: "VN" },
  { label: "Hong Kong (HK)", value: "HK" },
  { label: "Singapore (SG)", value: "SG" },
  { label: "China (CN)", value: "CN" },
  { label: "United States (US)", value: "US" },
  { label: "United Kingdom (GB)", value: "GB" },
  { label: "Australia (AU)", value: "AU" },
  { label: "Canada (CA)", value: "CA" },
  { label: "Japan (JP)", value: "JP" },
  { label: "South Korea (KR)", value: "KR" },
  { label: "Thailand (TH)", value: "TH" },
  { label: "Malaysia (MY)", value: "MY" },
  { label: "Indonesia (ID)", value: "ID" },
  { label: "Philippines (PH)", value: "PH" },
  { label: "India (IN)", value: "IN" },
  { label: "United Arab Emirates (AE)", value: "AE" },
  { label: "Germany (DE)", value: "DE" },
  { label: "France (FR)", value: "FR" },
  { label: "Netherlands (NL)", value: "NL" },
];

const occupationOptions = [
  { label: "Business owner", value: "business_owner" },
  { label: "Director / Executive", value: "director_executive" },
  { label: "Employee", value: "employee" },
  { label: "Freelancer / Consultant", value: "freelancer_consultant" },
  { label: "Investor", value: "investor" },
  { label: "Student", value: "student" },
  { label: "Retired", value: "retired" },
  { label: "Other", value: "other" },
];

const sourceOfFundsOptions = [
  { label: "Salary", value: "salary" },
  { label: "Business income", value: "business_income" },
  { label: "Export / import revenue", value: "trade_revenue" },
  { label: "Investment income", value: "investment_income" },
  { label: "Savings", value: "savings" },
  { label: "Loan / financing", value: "loan_financing" },
  { label: "Other", value: "other" },
];

const monthlyVolumeOptions = [
  { label: "Under 10,000 USD", value: "under_10000_usd" },
  { label: "10,000 - 50,000 USD", value: "10000_50000_usd" },
  { label: "50,000 - 100,000 USD", value: "50000_100000_usd" },
  { label: "100,000 - 500,000 USD", value: "100000_500000_usd" },
  { label: "500,000 - 1,000,000 USD", value: "500000_1000000_usd" },
  { label: "Over 1,000,000 USD", value: "over_1000000_usd" },
];

const industryOptions = [
  { label: "Wholesale / Distribution", value: "wholesale_distribution" },
  { label: "Manufacturing", value: "manufacturing" },
  { label: "E-commerce", value: "ecommerce" },
  { label: "Logistics", value: "logistics" },
  { label: "Technology", value: "technology" },
  { label: "Professional services", value: "professional_services" },
  { label: "Import / Export", value: "import_export" },
  { label: "Other", value: "other" },
];

const businessActivityOptions = [
  { label: "Foreign trade export business", value: "foreign_trade_export" },
  { label: "Foreign trade import business", value: "foreign_trade_import" },
  { label: "Import and export business", value: "foreign_trade_import_export" },
];

const tradeTypeOptions = [
  { label: "Goods Trade", value: "goods_trade" },
  { label: "Service Trade", value: "service_trade" },
  { label: "Goods Trade + Service Trade", value: "goods_service_trade" },
];

const mainProductOptions = [
  "Electrical Products and Accessories",
  "Electronic Components, Modules, and Accessories",
  "Beauty, Cosmetics, and Personal Care",
  "Kitchen and Bathroom Products",
  "Lighting and Illumination Devices",
  "Daily Necessities, Gardening Tools",
  "Automobiles",
  "Automotive Parts, Motorcycles and Their Parts",
  "Clothing, Bags, Handbags, Shoes, Textiles, Leather Products, and Accessories",
  "Toys, Hobby Items",
  "Forest Products",
  "Energy",
  "Fine Art, Antiques, Precious Metals, Jewelry, Jade, Gemstones",
  "Logistics, transportation agent",
  "Consulting, Planning, Investment, and Other Services",
  "Tea",
  "Wine, fresh seafood",
  "Ship export",
  "Ship material supply",
  "Others",
].map((value) => ({ label: value, value }));

const defaultProfileForm = (name = ""): ProfileForm => ({
  legalName: name,
  dateOfBirth: "",
  nationality: "",
  residence: "",
  occupation: "",
  sourceOfFunds: "",
  expectedMonthlyVolume: "",
  countryCode: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  idDocumentType: "national_id",
  idDocumentNumber: "",
  idIssuedAt: "",
  idExpiresAt: "",
  idFrontUrl: "",
  idBackUrl: "",
  proofOfAddressUrl: "",
  selfieLivenessUrl: "",
  livenessSessionId: "",
});

const defaultBusinessForm = (): BusinessForm => ({
  businessName: "",
  businessRegistration: "",
  taxId: "",
  businessActivityType: "foreign_trade_export",
  exportingRegions: "",
  tradeType: "goods_trade",
  mainProduct: "Electrical Products and Accessories",
  industry: "",
  businessActivity: "",
  website: "",
  sourceOfFunds: "",
  expectedMonthlyVolume: "",
  registrationDocumentUrl: "",
  certificateOfIncorporationUrl: "",
  businessAddressProofUrl: "",
  accountOpeningFormUrl: "",
  ownershipStructureUrl: "",
  tradeAttachmentUrl: "",
  agentName: "",
  agentAddress: "",
  agentIdentityUrl: "",
  historicalTradeMaterialsUrl: "",
  historicalTradeComment: "",
});

const defaultPersonForm = (): PersonForm => ({
  legalName: "",
  dateOfBirth: "",
  nationality: "",
  residence: "",
  ownershipPercentage: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "",
  idDocumentType: "national_id",
  idDocumentNumber: "",
  idIssuedAt: "",
  idExpiresAt: "",
  idFrontUrl: "",
  idBackUrl: "",
  proofOfAddressUrl: "",
  selfieLivenessUrl: "",
  livenessSessionId: "",
});

const optionValue = <TValue extends string>(options: { value: TValue }[], value?: string | null) =>
  options.some((option) => option.value === value) ? (value as TValue) : "";

const normalizeProfileDraftForm = (form?: Partial<ProfileForm>, fallbackName = ""): ProfileForm => {
  const next = { ...defaultProfileForm(fallbackName), ...(form ?? {}) };

  return {
    ...next,
    countryCode: normalizeCountryCode(next.countryCode),
    dateOfBirth: toDateInputValue(next.dateOfBirth),
    expectedMonthlyVolume: optionValue(monthlyVolumeOptions, next.expectedMonthlyVolume),
    idExpiresAt: toDateInputValue(next.idExpiresAt),
    idIssuedAt: toDateInputValue(next.idIssuedAt),
    nationality: normalizeCountryCode(next.nationality),
    occupation: optionValue(occupationOptions, next.occupation),
    residence: normalizeCountryCode(next.residence),
    sourceOfFunds: optionValue(sourceOfFundsOptions, next.sourceOfFunds),
  };
};

const normalizeBusinessDraftForm = (form?: Partial<BusinessForm>): BusinessForm => {
  const next = { ...defaultBusinessForm(), ...(form ?? {}) };

  return {
    ...next,
    businessActivityType: optionValue(businessActivityOptions, next.businessActivityType) || "foreign_trade_export",
    expectedMonthlyVolume: optionValue(monthlyVolumeOptions, next.expectedMonthlyVolume),
    exportingRegions: selectedValues(next.exportingRegions).filter(isCountryCode).join(","),
    industry: optionValue(industryOptions, next.industry),
    mainProduct: optionValue(mainProductOptions, next.mainProduct) || "Electrical Products and Accessories",
    sourceOfFunds: optionValue(sourceOfFundsOptions, next.sourceOfFunds),
    tradeType: optionValue(tradeTypeOptions, next.tradeType) || "goods_trade",
  };
};

const normalizePersonDraftForm = (form?: Partial<PersonForm>): PersonForm => {
  const next = { ...defaultPersonForm(), ...(form ?? {}) };

  return {
    ...next,
    countryCode: normalizeCountryCode(next.countryCode),
    dateOfBirth: toDateInputValue(next.dateOfBirth),
    idExpiresAt: toDateInputValue(next.idExpiresAt),
    idIssuedAt: toDateInputValue(next.idIssuedAt),
    nationality: normalizeCountryCode(next.nationality),
    residence: normalizeCountryCode(next.residence),
  };
};

const statusTone = (status?: string | null) => {
  const normalized = String(status ?? "").toLowerCase();

  if (["verified", "approved", "active"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["rejected", "failed"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (["pending", "submitted", "under_review", "needs_more_info"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const normalizeCountryCode = (value?: string | null) => {
  const normalized = String(value ?? "").trim().toUpperCase();

  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
};

const isCountryCode = (value?: string | null) => normalizeCountryCode(value) !== "";

const normalizeDateValue = (value?: string | null) => {
  const normalized = String(value ?? "").trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
};

const toDateInputValue = (value?: string | null) => {
  const normalized = String(value ?? "").trim();
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);

  return match?.[1] ?? "";
};

const isDateValue = (value?: string | null) => normalizeDateValue(value) !== "";

const selectedValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

const AccountKyc = () => {
  const { user, token, refreshSession } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [applicantType, setApplicantType] = useState<ApplicantType>("individual");
  const [profileForm, setProfileForm] = useState<ProfileForm>(() => defaultProfileForm(user?.name ?? ""));
  const [businessForm, setBusinessForm] = useState<BusinessForm>(() => defaultBusinessForm());
  const [representativeForm, setRepresentativeForm] = useState<PersonForm>(() => defaultPersonForm());
  const [beneficialOwnerForm, setBeneficialOwnerForm] = useState<PersonForm>(() => defaultPersonForm());
  const [captureSessions, setCaptureSessions] = useState<CaptureSessionMap>({});
  const [captureArtifacts, setCaptureArtifacts] = useState<CaptureArtifactMap>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocumentMap>({});
  const [uploadingCapture, setUploadingCapture] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState("");
  const [verificationConsent, setVerificationConsent] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const draftHydratedRef = useRef(false);
  const draftStorageKey = useMemo(() => (user?.id ? kycDraftKey(user.id) : ""), [user?.id]);

  const kycQuery = useQuery({
    queryKey: ["kyc-profile", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getKycProfile({ userId: user?.id as string, token: token as string }),
  });

  const profile = kycQuery.data?.kyc_profile ?? null;

  const applyDraft = useCallback((draft: KycDraft) => {
    setStep(Number.isFinite(draft.step) ? Math.min(Math.max(draft.step, 0), stepLabels.length - 1) : 0);
    setApplicantType(draft.applicantType === "business" ? "business" : "individual");
    setProfileForm(normalizeProfileDraftForm(draft.profileForm, user?.name ?? ""));
    setBusinessForm(normalizeBusinessDraftForm(draft.businessForm));
    setRepresentativeForm(normalizePersonDraftForm(draft.representativeForm));
    setBeneficialOwnerForm(normalizePersonDraftForm(draft.beneficialOwnerForm));
    setCaptureSessions(draft.captureSessions ?? {});
    setCaptureArtifacts(draft.captureArtifacts ?? {});
    setUploadedDocuments(draft.uploadedDocuments ?? {});
    setVerificationConsent(Boolean(draft.verificationConsent));
  }, [user?.name]);

  const hydrateProfile = useCallback((nextProfile: KycProfile) => {
    const profileDocs = nextProfile.documents ?? [];
    const representative = nextProfile.related_persons?.find((person) =>
      ["authorized_representative", "director"].includes(person.relationship_type.toLowerCase()),
    );
    const beneficialOwner = nextProfile.related_persons?.find((person) =>
      ["beneficial_owner", "ubo"].includes(person.relationship_type.toLowerCase()),
    );
    const profileIdentity = readPersonDocuments(profileDocs);
    const representativeIdentity = readPersonDocuments(representative?.documents ?? []);
    const beneficialOwnerIdentity = readPersonDocuments(beneficialOwner?.documents ?? []);
    const metadata = nextProfile.metadata ?? {};
    const hydratedDocuments: UploadedDocumentMap = {};

    if (nextProfile.applicant_type === "business") {
      profileDocs.forEach((document) => {
        hydratedDocuments[captureKey("business", document.type)] = document;
      });
    } else {
      hydratePersonDocumentMap(hydratedDocuments, "applicant", profileDocs);
    }

    hydratePersonDocumentMap(hydratedDocuments, "authorized_representative", representative?.documents ?? []);
    hydratePersonDocumentMap(hydratedDocuments, "beneficial_owner", beneficialOwner?.documents ?? []);

    setApplicantType(nextProfile.applicant_type === "business" ? "business" : "individual");
    setProfileForm({
      ...defaultProfileForm(user?.name ?? ""),
      legalName: nextProfile.legal_name ?? "",
      dateOfBirth: toDateInputValue(nextProfile.date_of_birth),
      nationality: normalizeCountryCode(nextProfile.nationality_country_code),
      residence: normalizeCountryCode(nextProfile.residence_country_code),
      occupation: optionValue(occupationOptions, stringifyMetadata(metadata.occupation)),
      sourceOfFunds: optionValue(sourceOfFundsOptions, stringifyMetadata(metadata.source_of_funds)),
      expectedMonthlyVolume: optionValue(monthlyVolumeOptions, stringifyMetadata(metadata.expected_monthly_volume)),
      countryCode: normalizeCountryCode(nextProfile.country_code),
      addressLine1: nextProfile.address_line1 ?? "",
      city: nextProfile.city ?? "",
      state: nextProfile.state ?? "",
      postalCode: nextProfile.postal_code ?? "",
      ...profileIdentity,
    });
    setBusinessForm({
      ...defaultBusinessForm(),
      businessName: nextProfile.business_name ?? "",
      businessRegistration: nextProfile.business_registration_number ?? "",
      taxId: nextProfile.tax_id ?? "",
      businessActivityType: optionValue(businessActivityOptions, stringifyMetadata(metadata.business_activity_type)) || "foreign_trade_export",
      exportingRegions: stringifyMetadata(metadata.exporting_regions),
      tradeType: optionValue(tradeTypeOptions, stringifyMetadata(metadata.trade_type)) || "goods_trade",
      mainProduct: optionValue(mainProductOptions, stringifyMetadata(metadata.main_product)) || "Electrical Products and Accessories",
      industry: optionValue(industryOptions, stringifyMetadata(metadata.business_industry)),
      businessActivity: stringifyMetadata(metadata.business_activity),
      website: stringifyMetadata(metadata.business_website),
      sourceOfFunds: optionValue(sourceOfFundsOptions, stringifyMetadata(metadata.source_of_funds)),
      expectedMonthlyVolume: optionValue(monthlyVolumeOptions, stringifyMetadata(metadata.expected_monthly_volume)),
      registrationDocumentUrl: findDocumentUrl(profileDocs, ["business_registration"]),
      certificateOfIncorporationUrl: findDocumentUrl(profileDocs, ["certificate_of_incorporation"]),
      businessAddressProofUrl: findDocumentUrl(profileDocs, ["proof_of_business_address"]),
      accountOpeningFormUrl: findDocumentUrl(profileDocs, ["account_opening_application_form"]),
      ownershipStructureUrl: findDocumentUrl(profileDocs, ["ownership_structure"]),
      tradeAttachmentUrl: findDocumentUrl(profileDocs, ["foreign_trade_attachment"]),
      agentName: stringifyMetadata(asMetadataRecord(metadata.agent).name),
      agentAddress: stringifyMetadata(asMetadataRecord(metadata.agent).address),
      agentIdentityUrl: findDocumentUrl(profileDocs, ["agent_identity_document"]),
      historicalTradeMaterialsUrl: findDocumentUrl(profileDocs, ["historical_trade_materials"]),
      historicalTradeComment: stringifyMetadata(metadata.historical_trade_comment),
    });
    setRepresentativeForm({
      ...defaultPersonForm(),
      legalName: representative?.legal_name ?? "",
      dateOfBirth: toDateInputValue(representative?.date_of_birth),
      nationality: normalizeCountryCode(representative?.nationality_country_code),
      residence: normalizeCountryCode(representative?.residence_country_code),
      addressLine1: representative?.address_line1 ?? "",
      city: representative?.city ?? "",
      state: representative?.state ?? "",
      postalCode: representative?.postal_code ?? "",
      countryCode: normalizeCountryCode(representative?.country_code),
      ...representativeIdentity,
    });
    setBeneficialOwnerForm({
      ...defaultPersonForm(),
      legalName: beneficialOwner?.legal_name ?? "",
      dateOfBirth: toDateInputValue(beneficialOwner?.date_of_birth),
      nationality: normalizeCountryCode(beneficialOwner?.nationality_country_code),
      residence: normalizeCountryCode(beneficialOwner?.residence_country_code),
      ownershipPercentage:
        beneficialOwner?.ownership_percentage !== undefined && beneficialOwner?.ownership_percentage !== null
          ? String(beneficialOwner.ownership_percentage)
          : "",
      addressLine1: beneficialOwner?.address_line1 ?? "",
      city: beneficialOwner?.city ?? "",
      state: beneficialOwner?.state ?? "",
      postalCode: beneficialOwner?.postal_code ?? "",
      countryCode: normalizeCountryCode(beneficialOwner?.country_code),
      ...beneficialOwnerIdentity,
    });
    setUploadedDocuments(hydratedDocuments);
    setVerificationConsent(Boolean(metadata.verification_consent));
  }, [user?.name]);

  useEffect(() => {
    draftHydratedRef.current = false;
    setDraftReady(false);

    if (!draftStorageKey) {
      setDraftReady(true);
      return;
    }

    try {
      const rawDraft = localStorage.getItem(draftStorageKey);
      if (!rawDraft) {
        setDraftReady(true);
        return;
      }

      const draft = JSON.parse(rawDraft) as Partial<KycDraft>;
      if (draft.version !== kycDraftVersion) {
        localStorage.removeItem(draftStorageKey);
        setDraftReady(true);
        return;
      }

      applyDraft(draft as KycDraft);
      draftHydratedRef.current = true;
    } catch {
      localStorage.removeItem(draftStorageKey);
    } finally {
      setDraftReady(true);
    }
  }, [applyDraft, draftStorageKey]);

  useEffect(() => {
    if (!draftReady) return;

    if (!profile) {
      if (!draftHydratedRef.current) {
        setProfileForm((current) => ({ ...current, legalName: current.legalName || user?.name || "" }));
      }
      return;
    }

    if (isLockedKycStatus(profile.status)) {
      if (draftStorageKey) localStorage.removeItem(draftStorageKey);
      draftHydratedRef.current = false;
      hydrateProfile(profile);
      return;
    }

    if (draftHydratedRef.current) return;

    hydrateProfile(profile);
  }, [draftReady, draftStorageKey, hydrateProfile, profile, user?.name]);

  useEffect(() => {
    if (!draftReady || !draftStorageKey || kycQuery.isLoading) return;

    if (isLockedKycStatus(profile?.status ?? user?.kycStatus)) {
      localStorage.removeItem(draftStorageKey);
      return;
    }

    const draft: KycDraft = {
      version: kycDraftVersion,
      step,
      applicantType,
      profileForm,
      businessForm,
      representativeForm,
      beneficialOwnerForm,
      captureSessions,
      captureArtifacts,
      uploadedDocuments,
      verificationConsent,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [
    applicantType,
    beneficialOwnerForm,
    businessForm,
    captureArtifacts,
    captureSessions,
    draftReady,
    draftStorageKey,
    kycQuery.isLoading,
    profile?.status,
    profileForm,
    representativeForm,
    step,
    uploadedDocuments,
    user?.kycStatus,
    verificationConsent,
  ]);

  const openRequirements = useMemo(
    () =>
      profile?.requirements?.filter((requirement) =>
        ["required", "needs_more_info", "rejected"].includes(requirement.status),
      ) ?? [],
    [profile?.requirements],
  );

  const updateProfile = (field: keyof ProfileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const updateBusiness = (field: keyof BusinessForm, value: string) => {
    setBusinessForm((current) => ({ ...current, [field]: value }));
  };

  const updateRepresentative = (field: keyof PersonForm, value: string) => {
    setRepresentativeForm((current) => ({ ...current, [field]: value }));
  };

  const updateBeneficialOwner = (field: keyof PersonForm, value: string) => {
    setBeneficialOwnerForm((current) => ({ ...current, [field]: value }));
  };

  const getVerificationSession = async (subjectType: IdentityVerificationSubject) => {
    const existingSession = captureSessions[subjectType];
    if (existingSession) return existingSession;

    const response = await startIdentityVerificationSession({
      subjectType,
      token: token as string,
      userId: user?.id as string,
    });

    setCaptureSessions((current) => ({ ...current, [subjectType]: response.session }));

    return response.session;
  };

  const uploadCapture = async (
    subjectType: IdentityVerificationSubject,
    captureType: IdentityCaptureType,
    file: File,
    onUploaded: (artifact: IdentityVerificationArtifact, session: IdentityVerificationSession) => void,
  ) => {
    if (!user?.id || !token) {
      setFormError("Please sign in before uploading verification evidence.");
      return;
    }

    const uploadKey = `${subjectType}:${captureType}`;
    setUploadingCapture(uploadKey);
    setFormError("");

    try {
      const session = await getVerificationSession(subjectType);
      const response = await uploadIdentityVerificationFile({
        captureType,
        file,
        sessionId: session.id,
        token,
        userId: user.id,
      });

      setCaptureSessions((current) => ({ ...current, [subjectType]: response.session }));
      setCaptureArtifacts((current) => ({
        ...current,
        [captureKey(subjectType, captureType)]: response.artifact,
      }));
      onUploaded(response.artifact, response.session);

      if (captureType === "selfie_liveness") {
        const completed = await completeIdentityVerificationSession({
          token,
          userId: user.id,
          sessionId: response.session.id,
          payload: {
            checks: {
              liveness: "captured",
              face_match: "pending_manual_or_provider_review",
            },
            liveness_score: 90,
            face_match_score: 90,
          },
        });

        setCaptureSessions((current) => ({ ...current, [subjectType]: completed.session }));
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to upload verification evidence.");
    } finally {
      setUploadingCapture("");
    }
  };

  const uploadKycDocumentFile = async (params: {
    subjectType: KycDocumentSubjectType;
    uploadKey: string;
    type: string;
    file: File;
    onUploaded: (document: KycDocumentPayload) => void;
    side?: string | null;
    issuingCountryCode?: string | null;
    documentNumber?: string | null;
    issuedAt?: string | null;
    expiresAt?: string | null;
    metadata?: Record<string, unknown>;
  }) => {
    if (!user?.id || !token) {
      setFormError("Please sign in before uploading KYC/KYB documents.");
      return;
    }

    setUploadingDocument(params.uploadKey);
    setFormError("");

    try {
      const response = await uploadKycDocument({
        documentNumber: params.documentNumber?.trim() || null,
        expiresAt: normalizeDateValue(params.expiresAt) || null,
        file: params.file,
        issuedAt: normalizeDateValue(params.issuedAt) || null,
        issuingCountryCode: normalizeCountryCode(params.issuingCountryCode) || null,
        metadata: params.metadata,
        side: params.side,
        subjectType: params.subjectType,
        token,
        type: params.type,
        userId: user.id,
      });

      setUploadedDocuments((current) => ({
        ...current,
        [params.uploadKey]: response.document,
      }));
      params.onUploaded(response.document);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to upload KYC/KYB document.");
    } finally {
      setUploadingDocument("");
    }
  };

  const uploadPersonDocument = (
    subjectType: IdentityVerificationSubject,
    form: ProfileForm | PersonForm,
    update: (field: DocumentFieldKey, value: string) => void,
    captureType: IdentityCaptureType,
    field: DocumentFieldKey,
    file: File,
  ) => {
    const isFront = captureType === "identity_front";
    const isBack = captureType === "identity_back";
    const documentType = isFront
      ? `${form.idDocumentType}_front`
      : isBack
        ? `${form.idDocumentType}_back`
        : "proof_of_address";
    const issuingCountryCode = isFront || isBack
      ? normalizeCountryCode(form.nationality) || normalizeCountryCode(form.residence) || normalizeCountryCode(form.countryCode)
      : normalizeCountryCode(form.countryCode) || normalizeCountryCode(form.residence) || normalizeCountryCode(form.nationality);

    if (!issuingCountryCode) {
      setFormError(
        isFront || isBack
          ? "Select a valid nationality or residence country before uploading the identity document."
          : "Select a valid address country before uploading proof of address.",
      );
      return;
    }

    void uploadKycDocumentFile({
      documentNumber: isFront || isBack ? form.idDocumentNumber : null,
      expiresAt: isFront || isBack ? form.idExpiresAt : null,
      file,
      issuedAt: isFront || isBack ? form.idIssuedAt : null,
      issuingCountryCode,
      metadata: {
        capture_type: captureType,
        document_type: form.idDocumentType,
        subject: subjectType,
      },
      onUploaded: (document) => update(field, document.file_url),
      side: isFront ? "front" : isBack ? "back" : null,
      subjectType,
      type: documentType,
      uploadKey: captureKey(subjectType, captureType),
    });
  };

  const uploadBusinessDocument = (
    type: string,
    field: keyof BusinessForm,
    file: File,
    metadata?: Record<string, unknown>,
  ) => {
    void uploadKycDocumentFile({
      file,
      issuingCountryCode: normalizeCountryCode(profileForm.countryCode) || null,
      metadata: {
        subject: "business",
        ...metadata,
      },
      onUploaded: (document) => updateBusiness(field, document.file_url),
      subjectType: "business",
      type,
      uploadKey: captureKey("business", type),
    });
  };

  const documentEvidence = (subjectType: IdentityVerificationSubject) => (captureType: string) =>
    documentEvidencePayload(
      captureArtifacts[captureKey(subjectType, captureType)],
      uploadedDocuments[captureKey(subjectType, captureType)],
    );

  const requiredFilled = (values: string[]) => values.every((value) => value.trim() !== "");
  const requiredSelects = (values: string[]) => values.every((value) => value.trim() !== "");
  const validPersonDetails = (form: Pick<PersonForm, "legalName" | "dateOfBirth" | "nationality" | "residence">) =>
    requiredFilled([form.legalName]) && isDateValue(form.dateOfBirth) && isCountryCode(form.nationality) && isCountryCode(form.residence);
  const validAddress = (form: Pick<PersonForm, "countryCode" | "addressLine1" | "city">) =>
    isCountryCode(form.countryCode) && requiredFilled([form.addressLine1, form.city]);
  const validIdentityDocuments = (form: Pick<PersonForm, DocumentFieldKey>) =>
    requiredFilled([form.idDocumentNumber, form.idFrontUrl, form.idBackUrl, form.proofOfAddressUrl]) &&
    isDateValue(form.idExpiresAt);

  const validateCurrentStep = () => {
    if (step === 1) {
      if (applicantType === "individual") {
        return (
          validPersonDetails(profileForm) &&
          requiredSelects([profileForm.occupation, profileForm.sourceOfFunds, profileForm.expectedMonthlyVolume])
        );
      }

      return (
        requiredFilled([
          profileForm.legalName,
          businessForm.businessName,
          businessForm.businessRegistration,
          businessForm.taxId,
          businessForm.businessActivity,
          beneficialOwnerForm.ownershipPercentage,
        ]) &&
        requiredSelects([
          businessForm.businessActivityType,
          businessForm.tradeType,
          businessForm.mainProduct,
          businessForm.industry,
          businessForm.sourceOfFunds,
          businessForm.expectedMonthlyVolume,
        ]) &&
        selectedValues(businessForm.exportingRegions).every(isCountryCode) &&
        selectedValues(businessForm.exportingRegions).length > 0 &&
        validPersonDetails(representativeForm) &&
        validPersonDetails(beneficialOwnerForm)
      );
    }

    if (step === 2) {
      const accountAddress = validAddress(profileForm);
      if (applicantType === "individual") return accountAddress;

      return (
        accountAddress &&
        validAddress(representativeForm) &&
        validAddress(beneficialOwnerForm)
      );
    }

    if (step === 3) {
      if (applicantType === "individual") {
        return validIdentityDocuments(profileForm);
      }

      return (
        requiredFilled([
          businessForm.registrationDocumentUrl,
          businessForm.certificateOfIncorporationUrl,
          businessForm.businessAddressProofUrl,
          businessForm.accountOpeningFormUrl,
          businessForm.ownershipStructureUrl,
        ]) &&
        validIdentityDocuments(representativeForm) &&
        validIdentityDocuments(beneficialOwnerForm)
      );
    }

    if (step === 4) {
      const livenessReady =
        applicantType === "business"
          ? requiredFilled([representativeForm.selfieLivenessUrl, beneficialOwnerForm.selfieLivenessUrl])
          : requiredFilled([profileForm.selfieLivenessUrl]);

      return livenessReady && verificationConsent;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) {
      setFormError("Complete all required fields in this step before continuing.");
      return;
    }

    setFormError("");
    setStep((currentStep) => Math.min(currentStep + 1, stepLabels.length - 1));
  };

  const previousStep = () => {
    setFormError("");
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  };

  const submitMutation = useMutation({
    mutationFn: async (payload: KycSubmissionPayload) =>
      submitKycProfile({
        userId: user?.id as string,
        token: token as string,
        payload,
      }),
    onSuccess: async (response) => {
      if (draftStorageKey) localStorage.removeItem(draftStorageKey);
      draftHydratedRef.current = false;
      setMessage(response.message || "KYC/KYB profile submitted and is pending review.");
      setFormError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["kyc-profile", user?.id, token] }),
        refreshSession(),
      ]);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Unable to submit KYC/KYB profile.");
    },
  });

  const handleSubmit = () => {
    if (!validateCurrentStep()) {
      setFormError("Complete the face check and consent before submitting.");
      return;
    }

    const documents =
      applicantType === "business"
        ? buildBusinessDocuments(businessForm, profileForm.countryCode, documentEvidence("business"))
        : buildPersonDocuments(profileForm, "applicant", documentEvidence("applicant"));
    const ownership = Number(beneficialOwnerForm.ownershipPercentage);
    const payload: KycSubmissionPayload = {
      applicant_type: applicantType,
      legal_name: profileForm.legalName.trim(),
      date_of_birth: applicantType === "individual" ? normalizeDateValue(profileForm.dateOfBirth) : null,
      nationality_country_code: normalizeCountryCode(profileForm.nationality) || null,
      residence_country_code: normalizeCountryCode(profileForm.residence) || null,
      business_name: applicantType === "business" ? businessForm.businessName.trim() : null,
      business_registration_number:
        applicantType === "business" ? businessForm.businessRegistration.trim() || null : null,
      tax_id: applicantType === "business" ? businessForm.taxId.trim() || null : null,
      registered_country_code: applicantType === "business" ? normalizeCountryCode(profileForm.countryCode) || null : null,
      address_line1: profileForm.addressLine1.trim(),
      city: profileForm.city.trim(),
      state: profileForm.state.trim() || null,
      postal_code: profileForm.postalCode.trim() || null,
      country_code: normalizeCountryCode(profileForm.countryCode),
      documents,
      related_persons:
        applicantType === "business"
          ? [
              {
                relationship_type: "authorized_representative",
                legal_name: representativeForm.legalName.trim(),
                date_of_birth: normalizeDateValue(representativeForm.dateOfBirth),
                nationality_country_code: normalizeCountryCode(representativeForm.nationality),
                residence_country_code: normalizeCountryCode(representativeForm.residence),
                address_line1: representativeForm.addressLine1.trim(),
                city: representativeForm.city.trim(),
                state: representativeForm.state.trim() || null,
                postal_code: representativeForm.postalCode.trim() || null,
                country_code: normalizeCountryCode(representativeForm.countryCode),
                metadata: { role: "authorized_representative" },
                documents: buildPersonDocuments(
                  representativeForm,
                  "authorized_representative",
                  documentEvidence("authorized_representative"),
                ),
              },
              {
                relationship_type: "beneficial_owner",
                legal_name: beneficialOwnerForm.legalName.trim(),
                date_of_birth: normalizeDateValue(beneficialOwnerForm.dateOfBirth),
                nationality_country_code: normalizeCountryCode(beneficialOwnerForm.nationality),
                residence_country_code: normalizeCountryCode(beneficialOwnerForm.residence),
                ownership_percentage: Number.isFinite(ownership) ? ownership : null,
                address_line1: beneficialOwnerForm.addressLine1.trim(),
                city: beneficialOwnerForm.city.trim(),
                state: beneficialOwnerForm.state.trim() || null,
                postal_code: beneficialOwnerForm.postalCode.trim() || null,
                country_code: normalizeCountryCode(beneficialOwnerForm.countryCode),
                metadata: { role: "beneficial_owner" },
                documents: buildPersonDocuments(
                  beneficialOwnerForm,
                  "beneficial_owner",
                  documentEvidence("beneficial_owner"),
                ),
              },
            ]
          : [],
      metadata: {
        source: "origin_wallet_platform",
        verification_consent: verificationConsent,
        verification_consent_at: new Date().toISOString(),
        source_of_funds:
          applicantType === "business" ? businessForm.sourceOfFunds.trim() : profileForm.sourceOfFunds.trim(),
        expected_monthly_volume:
          applicantType === "business"
            ? businessForm.expectedMonthlyVolume.trim()
            : profileForm.expectedMonthlyVolume.trim(),
        occupation: applicantType === "individual" ? profileForm.occupation.trim() : null,
        business_industry: applicantType === "business" ? businessForm.industry.trim() : null,
        business_activity: applicantType === "business" ? businessForm.businessActivity.trim() : null,
        business_website: applicantType === "business" ? businessForm.website.trim() || null : null,
        business_activity_type: applicantType === "business" ? businessForm.businessActivityType.trim() : null,
        exporting_regions:
          applicantType === "business"
            ? selectedValues(businessForm.exportingRegions)
            : [],
        trade_type: applicantType === "business" ? businessForm.tradeType.trim() : null,
        main_product: applicantType === "business" ? businessForm.mainProduct.trim() : null,
        historical_trade_comment:
          applicantType === "business" ? businessForm.historicalTradeComment.trim() || null : null,
        agent:
          applicantType === "business" && (businessForm.agentName.trim() || businessForm.agentAddress.trim())
            ? {
                name: businessForm.agentName.trim() || null,
                address: businessForm.agentAddress.trim() || null,
              }
            : null,
        identity_verification_sessions: Object.fromEntries(
          Object.entries(captureSessions).map(([subject, session]) => [subject, session?.external_session_id]),
        ),
      },
    };

    submitMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6 dark:bg-[#161a20]">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl dark:text-white">
              <ShieldCheck className="h-6 w-6 text-green-600" />
              KYC/KYB verification
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Complete identity, document, business ownership, and face verification before account approval.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <StepIndicator currentStep={step} labels={stepLabels} />

            {kycQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading KYC/KYB profile...
              </div>
            ) : null}

            {formError ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{formError}</span>
              </div>
            ) : null}

            {message ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            {step === 0 ? (
              <section className="space-y-4">
                <SectionTitle title="Choose profile type" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TypeButton
                    active={applicantType === "individual"}
                    label="Individual KYC"
                    description="Personal account verification with ID, address, and face check."
                    onClick={() => setApplicantType("individual")}
                  />
                  <TypeButton
                    active={applicantType === "business"}
                    label="Business KYB"
                    description="Company verification with representative and UBO checks."
                    onClick={() => setApplicantType("business")}
                  />
                </div>
                <Button className="rounded-full bg-green-600 px-6 text-white hover:bg-green-700" onClick={nextStep}>
                  Continue
                </Button>
              </section>
            ) : null}

            {step === 1 ? (
              <section className="space-y-5">
                <SectionTitle title={applicantType === "business" ? "Business and people details" : "Personal details"} />
                <Field label="Legal name" value={profileForm.legalName} onChange={(value) => updateProfile("legalName", value)} />
                {applicantType === "individual" ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Date of birth" value={profileForm.dateOfBirth} onChange={(value) => updateProfile("dateOfBirth", value)} type="date" max={todayInputValue} />
                      <SelectField label="Nationality" value={profileForm.nationality} onChange={(value) => updateProfile("nationality", value)} options={countryOptions} placeholder="Select nationality" />
                      <SelectField label="Residence" value={profileForm.residence} onChange={(value) => updateProfile("residence", value)} options={countryOptions} placeholder="Select residence" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <SelectField label="Occupation" value={profileForm.occupation} onChange={(value) => updateProfile("occupation", value)} options={occupationOptions} placeholder="Select occupation" />
                      <SelectField label="Source of funds" value={profileForm.sourceOfFunds} onChange={(value) => updateProfile("sourceOfFunds", value)} options={sourceOfFundsOptions} placeholder="Select source" />
                      <SelectField label="Expected monthly volume" value={profileForm.expectedMonthlyVolume} onChange={(value) => updateProfile("expectedMonthlyVolume", value)} options={monthlyVolumeOptions} placeholder="Select volume" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Business name" value={businessForm.businessName} onChange={(value) => updateBusiness("businessName", value)} />
                      <Field label="Registration number" value={businessForm.businessRegistration} onChange={(value) => updateBusiness("businessRegistration", value)} />
                      <Field label="Tax ID" value={businessForm.taxId} onChange={(value) => updateBusiness("taxId", value)} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="Foreign trade business type"
                        value={businessForm.businessActivityType}
                        onChange={(value) => updateBusiness("businessActivityType", value)}
                        options={businessActivityOptions}
                      />
                      <SelectField
                        label="Trade type"
                        value={businessForm.tradeType}
                        onChange={(value) => updateBusiness("tradeType", value)}
                        options={tradeTypeOptions}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <MultiSelectField
                        label="Exporting countries/regions"
                        value={businessForm.exportingRegions}
                        onChange={(value) => updateBusiness("exportingRegions", value)}
                        options={countryOptions}
                      />
                      <SelectField
                        label="Main product"
                        value={businessForm.mainProduct}
                        onChange={(value) => updateBusiness("mainProduct", value)}
                        options={mainProductOptions}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Industry" value={businessForm.industry} onChange={(value) => updateBusiness("industry", value)} options={industryOptions} placeholder="Select industry" />
                      <Field label="Business website" value={businessForm.website} onChange={(value) => updateBusiness("website", value)} />
                    </div>
                    <Field label="Business activity" value={businessForm.businessActivity} onChange={(value) => updateBusiness("businessActivity", value)} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Business source of funds" value={businessForm.sourceOfFunds} onChange={(value) => updateBusiness("sourceOfFunds", value)} options={sourceOfFundsOptions} placeholder="Select source" />
                      <SelectField label="Expected monthly volume" value={businessForm.expectedMonthlyVolume} onChange={(value) => updateBusiness("expectedMonthlyVolume", value)} options={monthlyVolumeOptions} placeholder="Select volume" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Agent name (optional)" value={businessForm.agentName} onChange={(value) => updateBusiness("agentName", value)} />
                      <Field label="Agent address (optional)" value={businessForm.agentAddress} onChange={(value) => updateBusiness("agentAddress", value)} />
                    </div>
                    <PersonDetails title="Authorized representative" form={representativeForm} onChange={updateRepresentative} includeOwnership={false} />
                    <PersonDetails title="Beneficial owner / UBO" form={beneficialOwnerForm} onChange={updateBeneficialOwner} includeOwnership />
                  </>
                )}
                <WizardActions onBack={previousStep} onNext={nextStep} />
              </section>
            ) : null}

            {step === 2 ? (
              <section className="space-y-5">
                <SectionTitle title="Address and risk data" />
                <AddressFields
                  title={applicantType === "business" ? "Registered business address" : "Residential address"}
                  countryCode={profileForm.countryCode}
                  addressLine1={profileForm.addressLine1}
                  city={profileForm.city}
                  state={profileForm.state}
                  postalCode={profileForm.postalCode}
                  onChange={(field, value) => updateProfile(field, value)}
                />
                {applicantType === "business" ? (
                  <>
                    <AddressFields
                      title="Authorized representative address"
                      countryCode={representativeForm.countryCode}
                      addressLine1={representativeForm.addressLine1}
                      city={representativeForm.city}
                      state={representativeForm.state}
                      postalCode={representativeForm.postalCode}
                      onChange={(field, value) => updateRepresentative(field, value)}
                    />
                    <AddressFields
                      title="Beneficial owner address"
                      countryCode={beneficialOwnerForm.countryCode}
                      addressLine1={beneficialOwnerForm.addressLine1}
                      city={beneficialOwnerForm.city}
                      state={beneficialOwnerForm.state}
                      postalCode={beneficialOwnerForm.postalCode}
                      onChange={(field, value) => updateBeneficialOwner(field, value)}
                    />
                  </>
                ) : null}
                <WizardActions onBack={previousStep} onNext={nextStep} />
              </section>
            ) : null}

            {step === 3 ? (
              <section className="space-y-5">
                <SectionTitle title="Documents" />
                {applicantType === "individual" ? (
                  <PersonDocumentFields
                    title="Applicant identity documents"
                    form={profileForm}
                    onChange={updateProfile}
                    uploadSubject="applicant"
                    uploadingCapture={uploadingDocument}
                    onUploadCapture={(captureType, field, file) =>
                      uploadPersonDocument("applicant", profileForm, updateProfile, captureType, field, file)
                    }
                  />
                ) : (
                  <>
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <h3 className="font-semibold text-gray-900">Business documents</h3>
                      <div className="mt-4 grid gap-4">
                        <FieldWithUpload
                          label="Business registration certificate"
                          value={businessForm.registrationDocumentUrl}
                          onChange={(value) => updateBusiness("registrationDocumentUrl", value)}
                          uploadLabel="Upload business certificate"
                          uploading={uploadingDocument === captureKey("business", "business_registration")}
                          onFile={(file) => uploadBusinessDocument("business_registration", "registrationDocumentUrl", file)}
                        />
                        <FieldWithUpload
                          label="Certificate of Incorporation (CI)"
                          value={businessForm.certificateOfIncorporationUrl}
                          onChange={(value) => updateBusiness("certificateOfIncorporationUrl", value)}
                          uploadLabel="Upload certificate of incorporation"
                          uploading={uploadingDocument === captureKey("business", "certificate_of_incorporation")}
                          onFile={(file) =>
                            uploadBusinessDocument("certificate_of_incorporation", "certificateOfIncorporationUrl", file)
                          }
                        />
                        <FieldWithUpload
                          label="Proof of business address"
                          value={businessForm.businessAddressProofUrl}
                          onChange={(value) => updateBusiness("businessAddressProofUrl", value)}
                          uploadLabel="Upload business address proof"
                          uploading={uploadingDocument === captureKey("business", "proof_of_business_address")}
                          onFile={(file) => uploadBusinessDocument("proof_of_business_address", "businessAddressProofUrl", file)}
                        />
                        <FieldWithUpload
                          label="Hand-held account opening application form"
                          value={businessForm.accountOpeningFormUrl}
                          onChange={(value) => updateBusiness("accountOpeningFormUrl", value)}
                          uploadLabel="Upload hand-held account opening form photo"
                          uploading={uploadingDocument === captureKey("business", "account_opening_application_form")}
                          onFile={(file) =>
                            uploadBusinessDocument("account_opening_application_form", "accountOpeningFormUrl", file, {
                              requirement: "handheld_form_photo",
                            })
                          }
                        />
                        <FieldWithUpload
                          label="Ownership structure or shareholder register"
                          value={businessForm.ownershipStructureUrl}
                          onChange={(value) => updateBusiness("ownershipStructureUrl", value)}
                          uploadLabel="Upload ownership structure"
                          uploading={uploadingDocument === captureKey("business", "ownership_structure")}
                          onFile={(file) => uploadBusinessDocument("ownership_structure", "ownershipStructureUrl", file)}
                        />
                        <FieldWithUpload
                          label="Foreign trade attachment (optional)"
                          value={businessForm.tradeAttachmentUrl}
                          onChange={(value) => updateBusiness("tradeAttachmentUrl", value)}
                          uploadLabel="Upload foreign trade attachment"
                          uploading={uploadingDocument === captureKey("business", "foreign_trade_attachment")}
                          onFile={(file) => uploadBusinessDocument("foreign_trade_attachment", "tradeAttachmentUrl", file)}
                        />
                        <FieldWithUpload
                          label="Agent ID document (optional)"
                          value={businessForm.agentIdentityUrl}
                          onChange={(value) => updateBusiness("agentIdentityUrl", value)}
                          uploadLabel="Upload agent ID document"
                          uploading={uploadingDocument === captureKey("business", "agent_identity_document")}
                          onFile={(file) =>
                            uploadBusinessDocument("agent_identity_document", "agentIdentityUrl", file, {
                              subject: "agent",
                            })
                          }
                        />
                        <FieldWithUpload
                          label="Historical trade materials (optional)"
                          value={businessForm.historicalTradeMaterialsUrl}
                          onChange={(value) => updateBusiness("historicalTradeMaterialsUrl", value)}
                          uploadLabel="Upload historical trade materials"
                          uploading={uploadingDocument === captureKey("business", "historical_trade_materials")}
                          onFile={(file) => uploadBusinessDocument("historical_trade_materials", "historicalTradeMaterialsUrl", file)}
                        />
                        <Field
                          label="Historical trade material comment (optional)"
                          value={businessForm.historicalTradeComment}
                          onChange={(value) => updateBusiness("historicalTradeComment", value)}
                        />
                      </div>
                    </div>
                    <PersonDocumentFields
                      title="Authorized representative documents"
                      form={representativeForm}
                      onChange={updateRepresentative}
                      uploadSubject="authorized_representative"
                      uploadingCapture={uploadingDocument}
                      onUploadCapture={(captureType, field, file) =>
                        uploadPersonDocument(
                          "authorized_representative",
                          representativeForm,
                          updateRepresentative,
                          captureType,
                          field,
                          file,
                        )
                      }
                    />
                    <PersonDocumentFields
                      title="Beneficial owner documents"
                      form={beneficialOwnerForm}
                      onChange={updateBeneficialOwner}
                      uploadSubject="beneficial_owner"
                      uploadingCapture={uploadingDocument}
                      onUploadCapture={(captureType, field, file) =>
                        uploadPersonDocument(
                          "beneficial_owner",
                          beneficialOwnerForm,
                          updateBeneficialOwner,
                          captureType,
                          field,
                          file,
                        )
                      }
                    />
                  </>
                )}
                <WizardActions onBack={previousStep} onNext={nextStep} nextLabel="Continue to face check" />
              </section>
            ) : null}

            {step === 4 ? (
              <section className="space-y-5">
                <SectionTitle title="Face check and consent" />
                {applicantType === "individual" ? (
                  <FaceCheckFields
                    title="Applicant face check"
                    selfieLivenessUrl={profileForm.selfieLivenessUrl}
                    livenessSessionId={profileForm.livenessSessionId}
                    onChange={(field, value) => updateProfile(field, value)}
                    uploading={uploadingCapture === "applicant:selfie_liveness"}
                    onFile={(file) =>
                      uploadCapture("applicant", "selfie_liveness", file, (artifact, session) => {
                        updateProfile("selfieLivenessUrl", artifact.file_url);
                        updateProfile("livenessSessionId", session.external_session_id);
                      })
                    }
                  />
                ) : (
                  <>
                    <FaceCheckFields
                      title="Authorized representative face check"
                      selfieLivenessUrl={representativeForm.selfieLivenessUrl}
                      livenessSessionId={representativeForm.livenessSessionId}
                      onChange={(field, value) => updateRepresentative(field, value)}
                      uploading={uploadingCapture === "authorized_representative:selfie_liveness"}
                      onFile={(file) =>
                        uploadCapture("authorized_representative", "selfie_liveness", file, (artifact, session) => {
                          updateRepresentative("selfieLivenessUrl", artifact.file_url);
                          updateRepresentative("livenessSessionId", session.external_session_id);
                        })
                      }
                    />
                    <FaceCheckFields
                      title="Beneficial owner face check"
                      selfieLivenessUrl={beneficialOwnerForm.selfieLivenessUrl}
                      livenessSessionId={beneficialOwnerForm.livenessSessionId}
                      onChange={(field, value) => updateBeneficialOwner(field, value)}
                      uploading={uploadingCapture === "beneficial_owner:selfie_liveness"}
                      onFile={(file) =>
                        uploadCapture("beneficial_owner", "selfie_liveness", file, (artifact, session) => {
                          updateBeneficialOwner("selfieLivenessUrl", artifact.file_url);
                          updateBeneficialOwner("livenessSessionId", session.external_session_id);
                        })
                      }
                    />
                  </>
                )}
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                  <Checkbox checked={verificationConsent} onCheckedChange={(checked) => setVerificationConsent(checked === true)} />
                  <span>
                    I confirm the information is accurate and consent to identity, document, face, AML, and provider
                    onboarding checks.
                  </span>
                </label>
                <WizardActions onBack={previousStep} onNext={nextStep} nextLabel="Review" />
              </section>
            ) : null}

            {step === 5 ? (
              <section className="space-y-4">
                <SectionTitle title="Review and submit" />
                <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                  <SummaryRow label="Type" value={applicantType === "business" ? "Business KYB" : "Individual KYC"} />
                  <SummaryRow label="Legal name" value={profileForm.legalName || "-"} />
                  {applicantType === "business" ? (
                    <>
                      <SummaryRow label="Business name" value={businessForm.businessName || "-"} />
                      <SummaryRow label="Trade type" value={businessForm.tradeType || "-"} />
                      <SummaryRow label="Main product" value={businessForm.mainProduct || "-"} />
                      <SummaryRow label="Exporting regions" value={businessForm.exportingRegions || "-"} />
                      <SummaryRow label="Representative" value={representativeForm.legalName || "-"} />
                      <SummaryRow label="Beneficial owner" value={beneficialOwnerForm.legalName || "-"} />
                      <SummaryRow
                        label="Company materials"
                        value={[
                          businessForm.registrationDocumentUrl && "BR",
                          businessForm.certificateOfIncorporationUrl && "CI",
                          businessForm.businessAddressProofUrl && "Address proof",
                          businessForm.ownershipStructureUrl && "Ownership",
                          businessForm.accountOpeningFormUrl && "Opening form",
                        ].filter(Boolean).join(", ") || "-"}
                      />
                    </>
                  ) : null}
                  <SummaryRow label="Address" value={[profileForm.addressLine1, profileForm.city, profileForm.state, profileForm.postalCode, profileForm.countryCode].filter(Boolean).join(", ") || "-"} />
                  <SummaryRow label="Documents" value={applicantType === "business" ? "Company + representative + UBO" : "Identity + address"} />
                  <SummaryRow label="Face check" value="Submitted" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="rounded-full" onClick={previousStep}>
                    Back
                  </Button>
                  <Button
                    className="rounded-full bg-green-600 px-6 text-white hover:bg-green-700"
                    disabled={submitMutation.isPending}
                    onClick={handleSubmit}
                  >
                    {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for review
                  </Button>
                </div>
              </section>
            ) : null}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className={`border shadow-sm ${statusTone(profile?.status ?? user?.kycStatus)}`}>
            <CardHeader>
              <CardTitle className="text-base">Current status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SummaryRow label="Account" value={user?.status || "pending"} />
              <SummaryRow label="KYC/KYB" value={profile?.status || user?.kycStatus || "pending"} />
              <SummaryRow label="Submitted" value={formatDate(profile?.submitted_at)} />
              <SummaryRow label="Reviewed" value={formatDate(profile?.reviewed_at)} />
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b2027]">
            <CardHeader>
              <CardTitle className="text-base dark:text-white">Open requirements</CardTitle>
            </CardHeader>
            <CardContent>
              {openRequirements.length ? (
                <ul className="space-y-3 text-sm">
                  {openRequirements.map((requirement) => (
                    <li key={requirement.key} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                      <div className="font-medium">{requirement.label}</div>
                      <div className="text-xs">{requirement.status.replace(/_/g, " ")}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No open requirements yet. Submit your profile to start review.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};

const isLockedKycStatus = (status?: string | null) => lockedKycStatuses.has(String(status ?? "").toLowerCase());

const captureKey = (subjectType: string, captureType: string) =>
  `${subjectType}:${captureType}`;

const artifactToDocumentPayload = (artifact?: IdentityVerificationArtifact): Partial<KycDocumentPayload> => {
  if (!artifact) return {};

  return {
    file_hash: artifact.file_hash ?? null,
    file_path: artifact.file_path,
    file_size: artifact.size ?? null,
    mime_type: artifact.mime_type ?? null,
    original_name: artifact.original_name ?? null,
    storage_disk: artifact.storage_disk ?? null,
  };
};

const uploadedDocumentToPayload = (document?: KycDocumentPayload): Partial<KycDocumentPayload> => {
  if (!document) return {};

  return {
    file_hash: document.file_hash ?? null,
    file_path: document.file_path ?? null,
    file_size: document.file_size ?? null,
    mime_type: document.mime_type ?? null,
    original_name: document.original_name ?? null,
    storage_disk: document.storage_disk ?? null,
  };
};

const documentEvidencePayload = (
  artifact?: IdentityVerificationArtifact,
  document?: KycDocumentPayload,
): Partial<KycDocumentPayload> => ({
  ...artifactToDocumentPayload(artifact),
  ...uploadedDocumentToPayload(document),
});

const buildBusinessDocuments = (
  form: BusinessForm,
  countryCode: string,
  evidence: (captureType: string) => Partial<KycDocumentPayload>,
): KycDocumentPayload[] => {
  const issuingCountryCode = normalizeCountryCode(countryCode) || null;
  const documents: KycDocumentPayload[] = [
    {
      type: "business_registration",
      file_url: form.registrationDocumentUrl.trim(),
      issuing_country_code: issuingCountryCode,
      ...evidence("business_registration"),
    },
    {
      type: "certificate_of_incorporation",
      file_url: form.certificateOfIncorporationUrl.trim(),
      issuing_country_code: issuingCountryCode,
      ...evidence("certificate_of_incorporation"),
    },
    {
      type: "proof_of_business_address",
      file_url: form.businessAddressProofUrl.trim(),
      issuing_country_code: issuingCountryCode,
      ...evidence("proof_of_business_address"),
    },
    {
      type: "account_opening_application_form",
      file_url: form.accountOpeningFormUrl.trim(),
      issuing_country_code: issuingCountryCode,
      metadata: { requirement: "handheld_form_photo" },
      ...evidence("account_opening_application_form"),
    },
    {
      type: "ownership_structure",
      file_url: form.ownershipStructureUrl.trim(),
      issuing_country_code: issuingCountryCode,
      ...evidence("ownership_structure"),
    },
  ];

  [
    { type: "foreign_trade_attachment", fileUrl: form.tradeAttachmentUrl.trim() },
    { type: "agent_identity_document", fileUrl: form.agentIdentityUrl.trim() },
    { type: "historical_trade_materials", fileUrl: form.historicalTradeMaterialsUrl.trim() },
  ].forEach((document) => {
    if (!document.fileUrl) return;

    documents.push({
      type: document.type,
      file_url: document.fileUrl,
      issuing_country_code: issuingCountryCode,
      ...evidence(document.type),
    });
  });

  return documents;
};

const buildPersonDocuments = (
  form: ProfileForm | PersonForm,
  subject: IdentityVerificationSubject,
  evidence: (captureType: string) => Partial<KycDocumentPayload>,
): KycDocumentPayload[] => {
  const issuingCountry = normalizeCountryCode("nationality" in form ? form.nationality : "");
  const documentType = form.idDocumentType || "identity_document";
  const baseMetadata = {
    subject,
    document_type: documentType,
  };

  return [
    {
      type: `${documentType}_front`,
      file_url: form.idFrontUrl.trim(),
      side: "front",
      document_number: form.idDocumentNumber.trim(),
      issuing_country_code: issuingCountry || null,
      issued_at: normalizeDateValue(form.idIssuedAt) || null,
      expires_at: normalizeDateValue(form.idExpiresAt) || null,
      metadata: baseMetadata,
      ...evidence("identity_front"),
    },
    {
      type: `${documentType}_back`,
      file_url: form.idBackUrl.trim(),
      side: "back",
      document_number: form.idDocumentNumber.trim(),
      issuing_country_code: issuingCountry || null,
      issued_at: normalizeDateValue(form.idIssuedAt) || null,
      expires_at: normalizeDateValue(form.idExpiresAt) || null,
      metadata: baseMetadata,
      ...evidence("identity_back"),
    },
    {
      type: "proof_of_address",
      file_url: form.proofOfAddressUrl.trim(),
      issuing_country_code: "countryCode" in form ? normalizeCountryCode(form.countryCode) || null : null,
      metadata: { subject },
      ...evidence("proof_of_address"),
    },
    {
      type: "selfie_liveness",
      file_url: form.selfieLivenessUrl.trim(),
      metadata: {
        subject,
        liveness_session_id: form.livenessSessionId.trim() || null,
        captured_at: new Date().toISOString(),
      },
      ...evidence("selfie_liveness"),
    },
  ];
};

const readPersonDocuments = (documents: KycDocumentPayload[]) => {
  const front = documents.find((document) => document.type.toLowerCase().endsWith("_front"));
  const back = documents.find((document) => document.type.toLowerCase().endsWith("_back"));
  const proofOfAddress = documents.find((document) => document.type.toLowerCase() === "proof_of_address");
  const selfie = documents.find((document) => document.type.toLowerCase() === "selfie_liveness");
  const documentType = normalizeDocumentType(front?.type?.replace(/_front$/i, ""));

  return {
    idDocumentType: documentType,
    idDocumentNumber: front?.document_number ?? back?.document_number ?? "",
    idIssuedAt: toDateInputValue(front?.issued_at ?? back?.issued_at),
    idExpiresAt: toDateInputValue(front?.expires_at ?? back?.expires_at),
    idFrontUrl: front?.file_url ?? "",
    idBackUrl: back?.file_url ?? "",
    proofOfAddressUrl: proofOfAddress?.file_url ?? "",
    selfieLivenessUrl: selfie?.file_url ?? "",
    livenessSessionId: stringifyMetadata(selfie?.metadata?.liveness_session_id),
  };
};

const hydratePersonDocumentMap = (
  target: UploadedDocumentMap,
  subjectType: IdentityVerificationSubject,
  documents: KycDocumentPayload[],
) => {
  documents.forEach((document) => {
    const captureType = personDocumentCaptureType(document);
    if (!captureType) return;

    target[captureKey(subjectType, captureType)] = document;
  });
};

const personDocumentCaptureType = (document: KycDocumentPayload) => {
  const type = document.type.toLowerCase();

  if (type.endsWith("_front")) return "identity_front";
  if (type.endsWith("_back")) return "identity_back";
  if (type === "proof_of_address") return "proof_of_address";
  if (type === "selfie_liveness") return "selfie_liveness";

  return null;
};

const normalizeDocumentType = (type?: string): IdentityDocumentType => {
  if (type === "passport" || type === "driver_license" || type === "identity_document") return type;
  return "national_id";
};

const findDocumentUrl = (documents: KycDocumentPayload[], types: string[]) =>
  documents.find((document) => types.includes(document.type.toLowerCase()))?.file_url ?? "";

const stringifyMetadata = (value: unknown) => (value === undefined || value === null ? "" : String(value));

const asMetadataRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const StepIndicator = ({ currentStep, labels }: { currentStep: number; labels: string[] }) => (
  <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
    {labels.map((label, index) => {
      const complete = index < currentStep;
      const active = index === currentStep;

      return (
        <div
          key={label}
          className={`flex min-h-[52px] items-center gap-2 rounded-xl border p-3 text-sm ${
            active
              ? "border-green-200 bg-green-50 text-green-700"
              : complete
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-white text-gray-500"
          }`}
        >
          {complete ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
          <span className="font-medium">{label}</span>
        </div>
      );
    })}
  </div>
);

const TypeButton = ({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl border p-5 text-left transition-colors ${
      active
        ? "border-green-500 bg-green-50 text-green-800"
        : "border-gray-200 bg-white text-gray-700 hover:border-green-200"
    }`}
  >
    <div className="font-semibold">{label}</div>
    <div className="mt-1 text-sm opacity-80">{description}</div>
  </button>
);

const SectionTitle = ({ title }: { title: string }) => (
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
);

const Field = ({
  label,
  max,
  min,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  value: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input
      value={value}
      max={max}
      min={min}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      className="h-12 rounded-xl border-gray-200"
    />
  </div>
);

const FieldWithUpload = ({
  label,
  onFile,
  uploadLabel,
  uploading,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  onFile: (file: File) => void;
  uploadLabel: string;
  uploading: boolean;
  value: string;
}) => (
  <div className="space-y-3">
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
        <span className={value ? "font-medium text-emerald-700" : "text-gray-500"}>
          {value ? "Uploaded and stored" : "No file uploaded yet"}
        </span>
        {value ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">stored</span> : null}
      </div>
    </div>
    <EvidenceUpload
      accept="image/*,.pdf"
      capture="environment"
      label={uploadLabel}
      onFile={onFile}
      uploading={uploading}
    />
  </div>
);

const EvidenceUpload = ({
  accept,
  capture,
  label,
  onFile,
  uploading,
}: {
  accept: string;
  capture?: "user" | "environment";
  label: string;
  onFile: (file: File) => void;
  uploading: boolean;
}) => (
  <label className="block rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="font-medium text-gray-800">{uploading ? "Uploading..." : label}</span>
      {uploading ? <Loader2 className="h-4 w-4 animate-spin text-green-600" /> : null}
    </div>
    <input
      type="file"
      accept={accept}
      capture={capture}
      disabled={uploading}
      className="mt-2 block w-full text-sm"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onFile(file);
        event.currentTarget.value = "";
      }}
    />
  </label>
);

const SelectField = <TValue extends string>({
  label,
  onChange,
  options,
  placeholder = "Select an option",
  value,
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: { label: string; value: TValue }[];
  placeholder?: string;
  value: TValue;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <select
      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value as TValue)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const MultiSelectField = ({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) => {
  const selected = selectedValues(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        multiple
        className="min-h-[116px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
        value={selected}
        onChange={(event) => {
          const values = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
          onChange(values.join(","));
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const PersonDetails = ({
  form,
  includeOwnership,
  onChange,
  title,
}: {
  form: PersonForm;
  includeOwnership: boolean;
  onChange: (field: keyof PersonForm, value: string) => void;
  title: string;
}) => (
  <div className="rounded-2xl border border-gray-200 p-4">
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <Field label="Legal name" value={form.legalName} onChange={(value) => onChange("legalName", value)} />
      <Field label="Date of birth" value={form.dateOfBirth} onChange={(value) => onChange("dateOfBirth", value)} type="date" max={todayInputValue} />
      {includeOwnership ? (
        <Field label="Ownership %" value={form.ownershipPercentage} onChange={(value) => onChange("ownershipPercentage", value)} type="number" min="0" max="100" />
      ) : (
        <SelectField label="Residence" value={form.residence} onChange={(value) => onChange("residence", value)} options={countryOptions} placeholder="Select residence" />
      )}
      <SelectField label="Nationality" value={form.nationality} onChange={(value) => onChange("nationality", value)} options={countryOptions} placeholder="Select nationality" />
      {includeOwnership ? (
        <SelectField label="Residence" value={form.residence} onChange={(value) => onChange("residence", value)} options={countryOptions} placeholder="Select residence" />
      ) : null}
    </div>
  </div>
);

const AddressFields = ({
  addressLine1,
  city,
  countryCode,
  onChange,
  postalCode,
  state,
  title,
}: {
  addressLine1: string;
  city: string;
  countryCode: string;
  onChange: (field: "countryCode" | "addressLine1" | "city" | "state" | "postalCode", value: string) => void;
  postalCode: string;
  state: string;
  title: string;
}) => (
  <div className="rounded-2xl border border-gray-200 p-4">
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <SelectField label="Country" value={countryCode} onChange={(value) => onChange("countryCode", value)} options={countryOptions} placeholder="Select country" />
      <Field label="Postal code" value={postalCode} onChange={(value) => onChange("postalCode", value)} />
    </div>
    <div className="mt-4">
      <Field label="Address line 1" value={addressLine1} onChange={(value) => onChange("addressLine1", value)} />
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Field label="City" value={city} onChange={(value) => onChange("city", value)} />
      <Field label="State/province" value={state} onChange={(value) => onChange("state", value)} />
    </div>
  </div>
);

const PersonDocumentFields = ({
  form,
  onChange,
  onUploadCapture,
  title,
  uploadSubject,
  uploadingCapture,
}: {
  form: Pick<PersonForm, DocumentFieldKey>;
  onChange: (field: DocumentFieldKey, value: string) => void;
  onUploadCapture: (captureType: IdentityCaptureType, field: DocumentFieldKey, file: File) => void;
  title: string;
  uploadSubject: IdentityVerificationSubject;
  uploadingCapture: string;
}) => (
  <div className="rounded-2xl border border-gray-200 p-4">
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <SelectField
        label="Document type"
        value={form.idDocumentType}
        onChange={(value) => onChange("idDocumentType", value)}
        options={[
          { label: "National ID", value: "national_id" },
          { label: "Passport", value: "passport" },
          { label: "Driver license", value: "driver_license" },
          { label: "Other identity document", value: "identity_document" },
        ]}
      />
      <Field label="Document number" value={form.idDocumentNumber} onChange={(value) => onChange("idDocumentNumber", value)} />
      <Field label="Issued date" value={form.idIssuedAt} onChange={(value) => onChange("idIssuedAt", value)} type="date" max={todayInputValue} />
      <Field label="Expiry date" value={form.idExpiresAt} onChange={(value) => onChange("idExpiresAt", value)} type="date" min={tomorrowInputValue} />
      <FieldWithUpload
        label="ID front image"
        value={form.idFrontUrl}
        onChange={(value) => onChange("idFrontUrl", value)}
        uploadLabel="Capture or upload ID front"
        uploading={uploadingCapture === `${uploadSubject}:identity_front`}
        onFile={(file) => onUploadCapture("identity_front", "idFrontUrl", file)}
      />
      <FieldWithUpload
        label="ID back image"
        value={form.idBackUrl}
        onChange={(value) => onChange("idBackUrl", value)}
        uploadLabel="Capture or upload ID back"
        uploading={uploadingCapture === `${uploadSubject}:identity_back`}
        onFile={(file) => onUploadCapture("identity_back", "idBackUrl", file)}
      />
    </div>
    <div className="mt-4">
      <FieldWithUpload
        label="Proof of address"
        value={form.proofOfAddressUrl}
        onChange={(value) => onChange("proofOfAddressUrl", value)}
        uploadLabel="Upload proof of address"
        uploading={uploadingCapture === `${uploadSubject}:proof_of_address`}
        onFile={(file) => onUploadCapture("proof_of_address", "proofOfAddressUrl", file)}
      />
    </div>
  </div>
);

const FaceCheckFields = ({
  livenessSessionId,
  onChange,
  onFile,
  selfieLivenessUrl,
  title,
  uploading,
}: {
  livenessSessionId: string;
  onChange: (field: "selfieLivenessUrl" | "livenessSessionId", value: string) => void;
  onFile: (file: File) => void;
  selfieLivenessUrl: string;
  title: string;
  uploading: boolean;
}) => (
  <div className="rounded-2xl border border-gray-200 p-4">
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">
      Capture a live selfie or short video from the front camera. The session ID is saved with the KYC evidence.
    </p>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Selfie/liveness evidence</Label>
          <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
            <span className={selfieLivenessUrl ? "font-medium text-emerald-700" : "text-gray-500"}>
              {selfieLivenessUrl ? "Uploaded and stored" : "No selfie/liveness evidence uploaded yet"}
            </span>
            {selfieLivenessUrl ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                stored
              </span>
            ) : null}
          </div>
        </div>
        <EvidenceUpload
          accept="image/*,video/*"
          capture="user"
          label="Open camera or upload selfie/liveness evidence"
          onFile={onFile}
          uploading={uploading}
        />
      </div>
      <Field label="Liveness session ID" value={livenessSessionId} onChange={(value) => onChange("livenessSessionId", value)} />
    </div>
  </div>
);

const WizardActions = ({
  nextLabel = "Continue",
  onBack,
  onNext,
}: {
  nextLabel?: string;
  onBack: () => void;
  onNext: () => void;
}) => (
  <div className="flex flex-wrap gap-3">
    <Button variant="outline" className="rounded-full" onClick={onBack}>
      Back
    </Button>
    <Button className="rounded-full bg-green-600 px-6 text-white hover:bg-green-700" onClick={onNext}>
      {nextLabel}
    </Button>
  </div>
);

const SummaryRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-right font-semibold capitalize text-gray-900 dark:text-white">{String(value).replace(/_/g, " ")}</span>
  </div>
);

export default AccountKyc;
