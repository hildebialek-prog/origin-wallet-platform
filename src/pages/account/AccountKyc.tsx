import { useCallback, useEffect, useMemo, useRef, useState, type HTMLInputTypeAttribute } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown, Circle, Loader2, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/services/apiClient";
import {
  buildHkCorporateFullFields,
  hkAnnualTurnoverOptions,
  hkAverageTransactionValueOptions,
  hkEmployeeCountOptions,
  hkIntendedUseOptions,
  hkMonthlyTransactionOptions,
} from "@/services/hkCorporateKyc";
import {
  completeIdentityVerificationSession,
  getKycProfile,
  resubmitKycRequirement,
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
  type KycRequirement,
  type KycSubmissionPayload,
} from "@/services/kycService";
import { getSubdivisionOptions, stateAfterCountryChange } from "@/services/countrySubdivisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  formatStatusLabel,
  getSemanticStatus,
  isLockedKycStatus,
  isOpenKycRequirementStatus,
  isVerifiedKycStatus,
} from "@/lib/status";

type ApplicantType = "individual" | "business";
type IdentityDocumentType = "national_id" | "passport" | "driver_license" | "identity_document";

type BrowserFaceDetection = {
  boundingBox: DOMRectReadOnly | { height: number; width: number; x: number; y: number };
};

type BrowserFaceDetector = {
  detect: (image: CanvasImageSource) => Promise<BrowserFaceDetection[]>;
};

type BrowserFaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => BrowserFaceDetector;

declare global {
  interface Window {
    FaceDetector?: BrowserFaceDetectorConstructor;
  }
}

type LivenessStep = {
  key: string;
  label: string;
  prompt: string;
  durationMs: number;
  requirement: "center" | "first_side" | "opposite_side" | "return_center";
};

type FramePositionSignal = {
  centerX: number;
  descriptor: Uint8Array;
  quality: number;
};

type LivenessCheckResult = {
  ok: boolean;
  message: string;
};

const livenessSteps: LivenessStep[] = [
  {
    key: "center_face",
    label: "Center face",
    prompt: "Center your face inside the oval and hold still",
    durationMs: 1500,
    requirement: "center",
  },
  {
    key: "turn_left",
    label: "Turn left",
    prompt: "Turn your face left and move slightly to one side",
    durationMs: 1500,
    requirement: "first_side",
  },
  {
    key: "turn_right",
    label: "Turn right",
    prompt: "Turn your face right and move to the opposite side",
    durationMs: 1500,
    requirement: "opposite_side",
  },
  {
    key: "look_straight",
    label: "Look straight",
    prompt: "Return to center and look straight",
    durationMs: 1400,
    requirement: "return_center",
  },
];

const livenessVideoMimeTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
const livenessMovementThreshold = 0.075;
const livenessCenterTolerance = 0.06;
const livenessAppearanceChangeThreshold = 0.032;
const livenessReturnAppearanceThreshold = 0.05;
const maxLivenessVideoUploadBytes = 18 * 1024 * 1024;

const frameDescriptorDistance = (current: Uint8Array, reference: Uint8Array | null) => {
  if (!reference || current.length !== reference.length) return 0;

  let total = 0;
  for (let index = 0; index < current.length; index += 1) {
    total += Math.abs(current[index] - reference[index]);
  }

  return total / current.length / 255;
};

const normalizeEvidenceMimeType = (mimeType: string) => {
  if (mimeType.includes("webm")) return "video/webm";
  if (mimeType.includes("mp4")) return "video/mp4";
  if (mimeType.includes("quicktime") || mimeType.includes("mov")) return "video/quicktime";
  if (mimeType.includes("png")) return "image/png";
  if (mimeType.includes("webp")) return "image/webp";
  return "image/jpeg";
};

const isIdentitySessionUsable = (session?: IdentityVerificationSession) => {
  if (!session) return false;
  if (!session.expires_at) return true;

  const expiresAt = new Date(session.expires_at).getTime();
  if (Number.isNaN(expiresAt)) return true;

  return expiresAt - Date.now() > 10_000;
};

const isExpiredIdentitySessionError = (error: unknown) =>
  error instanceof ApiRequestError && /identity verification session has expired/i.test(error.message);

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
  idIssuingCountry: string;
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
  registeredDate: string;
  niumBusinessType: string;
  taxId: string;
  businessActivityType: string;
  exportingRegions: string;
  tradeType: string;
  mainProduct: string;
  industry: string;
  businessActivity: string;
  website: string;
  tradeName: string;
  sameBusinessAddress: boolean;
  businessAddressLine1: string;
  businessCity: string;
  businessState: string;
  businessPostalCode: string;
  businessCountryCode: string;
  isMultiLayeredCompany: boolean;
  bankAccountName: string;
  bankAccountNumber: string;
  bankCountry: string;
  bankName: string;
  bankCurrency: string;
  bankRoutingType: string;
  bankRoutingValue: string;
  annualTurnover: string;
  totalEmployees: string;
  intendedUses: string;
  sourceOfFunds: string;
  expectedMonthlyVolume: string;
  averageTransactionValue: string;
  monthlyTransactionCount: string;
  mainTransactionCountries: string;
  accountPurpose: string;
  registrationDocumentUrl: string;
  registrationDocumentIssuedAt: string;
  filingDocumentType: "nar1" | "nnc1";
  filingDocumentUrl: string;
  filingDocumentIssuedAt: string;
  isMostRecentFiling: boolean;
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
  role: string;
  phoneCallingCode: string;
  phoneNumber: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  idDocumentType: IdentityDocumentType;
  idDocumentNumber: string;
  idIssuingCountry: string;
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
  | "idIssuingCountry"
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
  profileForm: ProfileForm;
  businessForm: BusinessForm;
  representativeForm: PersonForm;
  beneficialOwnerForm: PersonForm;
  verificationConsent: boolean;
  savedAt: string;
};

const individualStepLabels = ["Profile type", "Applicant details", "Address & risk", "Documents", "Face check", "Submit"];
const businessStepLabels = ["Applicant details", "Business / Address information", "Documents", "Review & Submit"];
const kycDraftVersion = 2;
const kycDraftKey = (userId: string | number) => `origin-wallet-kyc-draft:${userId}`;
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

const phoneCountryOptions = [
  { label: "Vietnam (+84)", value: "+84" },
  { label: "Hong Kong (+852)", value: "+852" },
  { label: "Singapore (+65)", value: "+65" },
  { label: "China (+86)", value: "+86" },
  { label: "United States / Canada (+1)", value: "+1" },
  { label: "United Kingdom (+44)", value: "+44" },
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

const niumBusinessTypeOptions = [
  { label: "Private company", value: "PRIVATE_COMPANY" },
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
  idIssuingCountry: "",
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
  registeredDate: "",
  niumBusinessType: "PRIVATE_COMPANY",
  taxId: "",
  businessActivityType: "foreign_trade_export",
  exportingRegions: "",
  tradeType: "goods_trade",
  mainProduct: "Electrical Products and Accessories",
  industry: "",
  businessActivity: "",
  website: "",
  tradeName: "",
  sameBusinessAddress: true,
  businessAddressLine1: "",
  businessCity: "",
  businessState: "",
  businessPostalCode: "",
  businessCountryCode: "HK",
  isMultiLayeredCompany: false,
  bankAccountName: "",
  bankAccountNumber: "",
  bankCountry: "HK",
  bankName: "",
  bankCurrency: "HKD",
  bankRoutingType: "SWIFT",
  bankRoutingValue: "",
  annualTurnover: "",
  totalEmployees: "",
  intendedUses: "",
  sourceOfFunds: "",
  expectedMonthlyVolume: "",
  averageTransactionValue: "",
  monthlyTransactionCount: "",
  mainTransactionCountries: "",
  accountPurpose: "",
  registrationDocumentUrl: "",
  registrationDocumentIssuedAt: "",
  filingDocumentType: "nar1",
  filingDocumentUrl: "",
  filingDocumentIssuedAt: "",
  isMostRecentFiling: true,
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
  role: "director",
  phoneCallingCode: "+84",
  phoneNumber: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "",
  idDocumentType: "national_id",
  idDocumentNumber: "",
  idIssuingCountry: "",
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

const normalizeNiumBusinessType = (value?: string | null) =>
  value?.trim().toUpperCase() === "PRIVATE_COMPANY" ? "PRIVATE_COMPANY" : "";

const normalizeProfileDraftForm = (form?: Partial<ProfileForm>, fallbackName = ""): ProfileForm => {
  const next = { ...defaultProfileForm(fallbackName), ...(form ?? {}) };

  return {
    ...next,
    countryCode: normalizeCountryCode(next.countryCode),
    dateOfBirth: toDateInputValue(next.dateOfBirth),
    expectedMonthlyVolume: optionValue(monthlyVolumeOptions, next.expectedMonthlyVolume),
    idExpiresAt: toDateInputValue(next.idExpiresAt),
    idIssuingCountry: normalizeCountryCode(next.idIssuingCountry),
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
    mainTransactionCountries: selectedValues(next.mainTransactionCountries).filter(isCountryCode).join(","),
    industry: optionValue(industryOptions, next.industry),
    mainProduct: optionValue(mainProductOptions, next.mainProduct) || "Electrical Products and Accessories",
    niumBusinessType: normalizeNiumBusinessType(next.niumBusinessType) || "PRIVATE_COMPANY",
    registeredDate: toDateInputValue(next.registeredDate),
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
    idIssuingCountry: normalizeCountryCode(next.idIssuingCountry),
    idIssuedAt: toDateInputValue(next.idIssuedAt),
    nationality: normalizeCountryCode(next.nationality),
    residence: normalizeCountryCode(next.residence),
  };
};

const statusTone = (status?: string | null) => {
  switch (getSemanticStatus(status)) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "danger":
      return "border-red-200 bg-red-50 text-red-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const metadataString = (metadata: Record<string, unknown> | null | undefined, key: string) => {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
};

const isDocumentRequirement = (requirement: KycRequirement) =>
  requirement.requirement_type === "document" ||
  requirement.subject_type === "document" ||
  requirement.category.includes("document");

const requirementDocumentType = (requirement: KycRequirement) => {
  const explicitType = metadataString(requirement.metadata, "document_type");
  if (explicitType) return explicitType;

  return requirement.key
    .replace(/^document_\d+_?/, "")
    .replace(/^related_person_document_\d+_?/, "")
    .replace(/[^a-zA-Z0-9_:-]/g, "")
    || "document";
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
const isRecentDocumentDate = (value?: string | null) => {
  const normalized = normalizeDateValue(value);
  if (!normalized) return false;
  const issuedAt = new Date(`${normalized}T00:00:00Z`).getTime();
  const oneYearAgo = new Date();
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
  return issuedAt <= Date.now() && issuedAt >= oneYearAgo.getTime();
};

const selectedValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

const e164Phone = (callingCode: string, phoneNumber: string) => {
  const code = callingCode.replace(/\D/g, "");
  const localNumber = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
  return code && localNumber ? `+${code}${localNumber}` : "";
};

const splitE164Phone = (value?: string | null) => {
  const normalized = String(value ?? "").replace(/[^\d+]/g, "");
  const option = [...phoneCountryOptions]
    .sort((left, right) => right.value.length - left.value.length)
    .find((candidate) => normalized.startsWith(candidate.value));

  return {
    phoneCallingCode: option?.value ?? "+84",
    phoneNumber: option ? normalized.slice(option.value.length) : normalized.replace(/^\+/, ""),
  };
};

const withoutProfileUploads = (form: ProfileForm): ProfileForm => ({
  ...form,
  idFrontUrl: "",
  idBackUrl: "",
  proofOfAddressUrl: "",
  selfieLivenessUrl: "",
  livenessSessionId: "",
});

const withoutPersonUploads = (form: PersonForm): PersonForm => ({
  ...form,
  idFrontUrl: "",
  idBackUrl: "",
  proofOfAddressUrl: "",
  selfieLivenessUrl: "",
  livenessSessionId: "",
});

const withoutBusinessUploads = (form: BusinessForm): BusinessForm => ({
  ...form,
  registrationDocumentUrl: "",
  certificateOfIncorporationUrl: "",
  businessAddressProofUrl: "",
  accountOpeningFormUrl: "",
  ownershipStructureUrl: "",
  tradeAttachmentUrl: "",
  agentIdentityUrl: "",
  historicalTradeMaterialsUrl: "",
});

const AccountKyc = () => {
  const { user, token, refreshSession } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [applicantType, setApplicantType] = useState<ApplicantType>("business");
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
  const [requirementFiles, setRequirementFiles] = useState<Record<number, File | null>>({});
  const [requirementNotes, setRequirementNotes] = useState<Record<number, string>>({});
  const [resubmittingRequirementId, setResubmittingRequirementId] = useState<number | null>(null);
  const [editingRequestedInfo, setEditingRequestedInfo] = useState(false);
  const draftHydratedRef = useRef(false);
  const draftStorageKey = useMemo(() => (user?.id ? kycDraftKey(user.id) : ""), [user?.id]);
  const stepLabels = applicantType === "business" ? businessStepLabels : individualStepLabels;

  const kycQuery = useQuery({
    queryKey: ["kyc-profile", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getKycProfile({ userId: user?.id as string, token: token as string }),
  });

  const profile = kycQuery.data?.kyc_profile ?? null;

  const applyDraft = useCallback((draft: KycDraft) => {
    setStep(Number.isFinite(draft.step) ? Math.min(Math.max(draft.step, 1), 4) : 1);
    setApplicantType("business");
    setProfileForm(normalizeProfileDraftForm(draft.profileForm, user?.name ?? ""));
    setBusinessForm(normalizeBusinessDraftForm(draft.businessForm));
    setRepresentativeForm(normalizePersonDraftForm(draft.representativeForm));
    setBeneficialOwnerForm(normalizePersonDraftForm(draft.beneficialOwnerForm));
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
    const niumFields = asMetadataRecord(metadata.nium_v5_fields);
    const niumAddresses = asMetadataRecord(niumFields.addresses);
    const businessAddress = asMetadataRecord(niumAddresses.businessAddress);
    const bankAccountDetails = asMetadataRecord(niumFields.bankAccountDetails);
    const routingCode = Array.isArray(bankAccountDetails.routingCodes)
      ? asMetadataRecord(bankAccountDetails.routingCodes[0])
      : {};
    const expectedAccountUsage = asMetadataRecord(niumFields.expectedAccountUsage);
    const sizeOfBusiness = asMetadataRecord(niumFields.sizeOfBusiness);
    const representativePositions = Array.isArray(representative?.metadata?.positions)
      ? representative.metadata.positions.filter((position): position is string => typeof position === "string")
      : [];
    const hydratedDocuments: UploadedDocumentMap = {};
    const representativePhone = splitE164Phone(stringifyMetadata(representative?.metadata?.phone));
    const beneficialOwnerPhone = splitE164Phone(stringifyMetadata(beneficialOwner?.metadata?.phone));

    if (nextProfile.applicant_type === "business") {
      profileDocs.forEach((document) => {
        hydratedDocuments[captureKey("business", document.type)] = document;
      });
    } else {
      hydratePersonDocumentMap(hydratedDocuments, "applicant", profileDocs);
    }

    hydratePersonDocumentMap(hydratedDocuments, "authorized_representative", representative?.documents ?? []);
    hydratePersonDocumentMap(hydratedDocuments, "beneficial_owner", beneficialOwner?.documents ?? []);

    setApplicantType("business");
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
      registeredDate: toDateInputValue(stringifyMetadata(metadata.registered_date)),
      niumBusinessType: normalizeNiumBusinessType(stringifyMetadata(metadata.nium_business_type)) || "PRIVATE_COMPANY",
      taxId: nextProfile.tax_id ?? "",
      businessActivityType: optionValue(businessActivityOptions, stringifyMetadata(metadata.business_activity_type)) || "foreign_trade_export",
      exportingRegions: stringifyMetadata(metadata.exporting_regions),
      tradeType: optionValue(tradeTypeOptions, stringifyMetadata(metadata.trade_type)) || "goods_trade",
      mainProduct: optionValue(mainProductOptions, stringifyMetadata(metadata.main_product)) || "Electrical Products and Accessories",
      industry: optionValue(industryOptions, stringifyMetadata(metadata.business_industry)),
      businessActivity: stringifyMetadata(metadata.business_activity),
      website: stringifyMetadata(metadata.business_website),
      tradeName: stringifyMetadata(niumFields.tradeName) || nextProfile.business_name || "",
      sameBusinessAddress: niumAddresses.isBusinessAddressSameAsRegisteredAddress !== false,
      businessAddressLine1: stringifyMetadata(businessAddress.address_line1),
      businessCity: stringifyMetadata(businessAddress.city),
      businessState: stringifyMetadata(businessAddress.state),
      businessPostalCode: stringifyMetadata(businessAddress.postal_code),
      businessCountryCode: normalizeCountryCode(stringifyMetadata(businessAddress.country_code)) || "HK",
      isMultiLayeredCompany: niumFields.isMultiLayeredCompany === true,
      bankAccountName: stringifyMetadata(bankAccountDetails.accountName),
      bankAccountNumber: stringifyMetadata(bankAccountDetails.accountNumber),
      bankCountry: normalizeCountryCode(stringifyMetadata(bankAccountDetails.bankCountry)) || "HK",
      bankName: stringifyMetadata(bankAccountDetails.bankName),
      bankCurrency: stringifyMetadata(bankAccountDetails.currency) || "HKD",
      bankRoutingType: stringifyMetadata(routingCode.type) || "SWIFT",
      bankRoutingValue: stringifyMetadata(routingCode.value),
      annualTurnover: stringifyMetadata(sizeOfBusiness.annualTurnover),
      totalEmployees: stringifyMetadata(sizeOfBusiness.totalEmployees),
      intendedUses: Array.isArray(expectedAccountUsage.intendedUses) ? expectedAccountUsage.intendedUses.filter((value): value is string => typeof value === "string").join(",") : "",
      sourceOfFunds: optionValue(sourceOfFundsOptions, stringifyMetadata(metadata.source_of_funds)),
      expectedMonthlyVolume: optionValue(monthlyVolumeOptions, stringifyMetadata(metadata.expected_monthly_volume)),
      averageTransactionValue: stringifyMetadata(metadata.average_transaction_value),
      monthlyTransactionCount: stringifyMetadata(metadata.monthly_transaction_count),
      mainTransactionCountries: Array.isArray(metadata.main_transaction_countries)
        ? metadata.main_transaction_countries.map(String).join(",")
        : stringifyMetadata(metadata.main_transaction_countries),
      accountPurpose: stringifyMetadata(metadata.account_purpose),
      registrationDocumentUrl: findDocumentUrl(profileDocs, ["business_registration", "certificate_of_incorporation"]),
      registrationDocumentIssuedAt: toDateInputValue(profileDocs.find((document) => ["business_registration", "certificate_of_incorporation"].includes(document.type))?.issued_at),
      filingDocumentType: profileDocs.some((document) => document.type.toLowerCase() === "nnc1") ? "nnc1" : "nar1",
      filingDocumentUrl: findDocumentUrl(profileDocs, ["nar1", "nnc1"]),
      filingDocumentIssuedAt: toDateInputValue(profileDocs.find((document) => ["nar1", "nnc1"].includes(document.type.toLowerCase()))?.issued_at),
      isMostRecentFiling: profileDocs.some((document) => ["nar1", "nnc1"].includes(document.type.toLowerCase()) && document.metadata?.is_most_recent_filing === true),
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
      role: representativePositions[0] || stringifyMetadata(representative?.metadata?.role) || "director",
      ...representativePhone,
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
      role: stringifyMetadata(beneficialOwner?.metadata?.role) || "beneficial_owner",
      ...beneficialOwnerPhone,
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

    if (isLockedKycStatus(profile?.status ?? user?.kycStatus) && !editingRequestedInfo) {
      localStorage.removeItem(draftStorageKey);
      return;
    }

    const draft: KycDraft = {
      version: kycDraftVersion,
      step,
      profileForm: withoutProfileUploads(profileForm),
      businessForm: withoutBusinessUploads(businessForm),
      representativeForm: withoutPersonUploads(representativeForm),
      beneficialOwnerForm: withoutPersonUploads(beneficialOwnerForm),
      verificationConsent,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [
    beneficialOwnerForm,
    businessForm,
    draftReady,
    draftStorageKey,
    editingRequestedInfo,
    kycQuery.isLoading,
    profile?.status,
    profileForm,
    representativeForm,
    step,
    user?.kycStatus,
    verificationConsent,
  ]);

  const openRequirements = useMemo(
    () => profile?.requirements?.filter((requirement) => isOpenKycRequirementStatus(requirement.status)) ?? [],
    [profile?.requirements],
  );
  const profileStatus = profile?.status ?? null;

  useEffect(() => {
    if (!profileStatus || profileStatus !== "needs_more_info" || openRequirements.length === 0) {
      setEditingRequestedInfo(false);
    }
  }, [openRequirements.length, profile?.id, profileStatus]);

  const updateProfile = (field: keyof ProfileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const updateCompanyLegalName = (value: string) => {
    setProfileForm((current) => ({ ...current, legalName: value }));
    setBusinessForm((current) => current.businessName.trim()
      ? current
      : { ...current, businessName: value });
  };

  const updateBusiness = (field: keyof BusinessForm, value: string | boolean) => {
    setBusinessForm((current) => ({ ...current, [field]: value }));
  };

  const updateRepresentative = (field: keyof PersonForm, value: string) => {
    setRepresentativeForm((current) => ({ ...current, [field]: value }));
  };

  const updateBeneficialOwner = (field: keyof PersonForm, value: string) => {
    setBeneficialOwnerForm((current) => ({ ...current, [field]: value }));
  };

  const getVerificationSession = async (subjectType: IdentityVerificationSubject, forceNew = false) => {
    const existingSession = captureSessions[subjectType];
    if (!forceNew && isIdentitySessionUsable(existingSession)) return existingSession;

    if (existingSession && !isIdentitySessionUsable(existingSession)) {
      setCaptureSessions((current) => {
        const next = { ...current };
        delete next[subjectType];
        return next;
      });
    }

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
    metadata?: Record<string, unknown>,
    fallbackFile?: File,
  ) => {
    if (!user?.id || !token) {
      setFormError("Please sign in before uploading verification evidence.");
      return;
    }

    const uploadKey = `${subjectType}:${captureType}`;
    setUploadingCapture(uploadKey);
    setFormError("");

    try {
      let session = await getVerificationSession(subjectType);

      const uploadEvidence = (
        sessionToUse: IdentityVerificationSession,
        evidenceFile: File,
        evidenceMetadata?: Record<string, unknown>,
      ) =>
        uploadIdentityVerificationFile({
          captureType,
          file: evidenceFile,
          metadata: evidenceMetadata,
          sessionId: sessionToUse.id,
          token,
          userId: user.id,
        });

      const uploadWithFallback = async (sessionToUse: IdentityVerificationSession) => {
        try {
          return {
            completedMetadata: metadata,
            response: await uploadEvidence(sessionToUse, file, metadata),
          };
        } catch (error) {
          if (isExpiredIdentitySessionError(error)) {
            throw error;
          }

          const canRetryWithStill = captureType === "selfie_liveness" && fallbackFile && file.type.startsWith("video/");

          if (!canRetryWithStill) {
            throw error;
          }

          const fallbackMetadata = {
            ...metadata,
            evidence_type: "guided_liveness_image_fallback",
            fallback_reason: "video_upload_failed",
            original_evidence_mime_type: file.type,
            original_evidence_size: file.size,
            video_evidence_recorded: true,
          };

          return {
            completedMetadata: fallbackMetadata,
            response: await uploadEvidence(sessionToUse, fallbackFile, fallbackMetadata),
          };
        }
      };

      let uploadResult: Awaited<ReturnType<typeof uploadWithFallback>>;

      try {
        uploadResult = await uploadWithFallback(session);
      } catch (error) {
        if (!isExpiredIdentitySessionError(error)) {
          throw error;
        }

        setCaptureSessions((current) => {
          const next = { ...current };
          delete next[subjectType];
          return next;
        });
        session = await getVerificationSession(subjectType, true);
        uploadResult = await uploadWithFallback(session);
      }

      const { completedMetadata, response } = uploadResult;

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
              liveness_method: completedMetadata?.evidence_type ?? "guided_liveness_capture",
              liveness_steps: completedMetadata?.challenge_steps ?? null,
            },
            liveness_score: Number(completedMetadata?.liveness_score ?? 90),
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
      ? normalizeCountryCode(form.idIssuingCountry) || normalizeCountryCode(form.nationality) || normalizeCountryCode(form.residence) || normalizeCountryCode(form.countryCode)
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
    issuedAt?: string | null,
  ) => {
    void uploadKycDocumentFile({
      file,
      issuingCountryCode: normalizeCountryCode(profileForm.countryCode) || null,
      metadata: {
        subject: "business",
        ...metadata,
      },
      issuedAt,
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
  const validIdentityDocuments = (form: Pick<PersonForm, DocumentFieldKey>, corporate = false) => {
    const identityFiles = corporate && form.idDocumentType === "passport"
      ? requiredFilled([form.idFrontUrl])
      : requiredFilled([form.idFrontUrl, form.idBackUrl]);

    if (!corporate) {
      return requiredFilled([form.idDocumentNumber, form.proofOfAddressUrl]) && identityFiles &&
        isDateValue(form.idExpiresAt);
    }

    return requiredFilled([form.idDocumentNumber]) && identityFiles &&
      (form.idDocumentType !== "passport" || (
        isCountryCode(form.idIssuingCountry) &&
        isDateValue(form.idIssuedAt) &&
        isDateValue(form.idExpiresAt)
      ));
  };

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
          businessForm.registeredDate,
          businessForm.taxId,
          businessForm.businessActivity,
          businessForm.tradeName,
          businessForm.website,
          representativeForm.role,
          beneficialOwnerForm.ownershipPercentage,
        ]) &&
        requiredSelects([
          businessForm.businessActivityType,
          businessForm.niumBusinessType,
          businessForm.tradeType,
          businessForm.mainProduct,
          businessForm.industry,
          businessForm.sourceOfFunds,
        ]) &&
        selectedValues(businessForm.exportingRegions).every(isCountryCode) &&
        selectedValues(businessForm.exportingRegions).length > 0 &&
        validPersonDetails(representativeForm) &&
        representativeForm.role.trim() !== "" &&
        requiredFilled([e164Phone(representativeForm.phoneCallingCode, representativeForm.phoneNumber)]) &&
        validPersonDetails(beneficialOwnerForm)
      );
    }

    if (step === 2) {
      const accountAddress = validAddress(profileForm);
      if (applicantType === "individual") return accountAddress;

      return (
        accountAddress &&
        (businessForm.sameBusinessAddress || (
          isCountryCode(businessForm.businessCountryCode) &&
          requiredFilled([
            businessForm.businessAddressLine1,
            businessForm.businessCity,
            businessForm.businessPostalCode,
          ])
        )) &&
        validAddress(representativeForm) &&
        validAddress(beneficialOwnerForm) &&
        requiredFilled([
          businessForm.expectedMonthlyVolume,
          businessForm.averageTransactionValue,
          businessForm.monthlyTransactionCount,
          businessForm.accountPurpose,
          businessForm.annualTurnover,
          businessForm.totalEmployees,
        ]) &&
        selectedValues(businessForm.mainTransactionCountries).every(isCountryCode) &&
        selectedValues(businessForm.mainTransactionCountries).length > 0 &&
        selectedValues(businessForm.intendedUses).length > 0
      );
    }

    if (step === 3) {
      if (applicantType === "individual") {
        return validIdentityDocuments(profileForm);
      }

      return (
        requiredFilled([
          businessForm.registrationDocumentUrl,
          businessForm.registrationDocumentIssuedAt,
          businessForm.filingDocumentUrl,
          businessForm.filingDocumentIssuedAt,
          businessForm.businessAddressProofUrl,
        ]) &&
        validIdentityDocuments(representativeForm, true) &&
        validIdentityDocuments(beneficialOwnerForm, true) &&
        isRecentDocumentDate(businessForm.registrationDocumentIssuedAt) &&
        businessForm.isMostRecentFiling &&
        (!businessForm.isMultiLayeredCompany || businessForm.ownershipStructureUrl.trim() !== "")
      );
    }

    if (step === 4) {
      if (applicantType === "business") return verificationConsent;
      return requiredFilled([profileForm.selfieLivenessUrl]) && verificationConsent;
    }

    return true;
  };

  const firstCurrentStepError = (): { field: string; message: string } => {
    if (applicantType === "business" && step === 2) {
      const checks: Array<[boolean, string, string]> = [
        [businessForm.expectedMonthlyVolume.trim() !== "", "expected-monthly-volume", "Select the expected monthly transaction volume."],
        [businessForm.averageTransactionValue.trim() !== "", "average-transaction-value", "Select the average transaction value."],
        [businessForm.monthlyTransactionCount.trim() !== "", "monthly-transaction-count", "Select the monthly transaction count."],
        [selectedValues(businessForm.mainTransactionCountries).length > 0, "main-transaction-countries", "Select at least one main transaction country."],
        [businessForm.annualTurnover.trim() !== "", "annual-turnover", "Select the annual turnover band."],
        [businessForm.totalEmployees.trim() !== "", "total-employees", "Select the employee count band."],
        [selectedValues(businessForm.intendedUses).length > 0, "intended-uses", "Select at least one intended account use."],
        [businessForm.sameBusinessAddress || businessForm.businessAddressLine1.trim() !== "", "business-address-line1", "Enter the business address line 1."],
        [businessForm.sameBusinessAddress || businessForm.businessCity.trim() !== "", "business-city", "Enter the business city."],
        [businessForm.sameBusinessAddress || businessForm.businessPostalCode.trim() !== "", "business-postal-code", "Enter the business postal code."],
      ];
      const failed = checks.find(([valid]) => !valid);
      if (failed) return { field: failed[1], message: failed[2] };
    }

    if (applicantType === "business" && step === 3) {
      const checks: Array<[boolean, string, string]> = [
        [businessForm.registrationDocumentUrl.trim() !== "", "business-registration-document", "Upload the business registration document."],
        [isRecentDocumentDate(businessForm.registrationDocumentIssuedAt), "business-registration-issued-at", "Enter a valid recent business registration issue date."],
        [businessForm.filingDocumentUrl.trim() !== "", "filing-document", "Upload the latest NAR1 or NNC1 filing."],
        [isDateValue(businessForm.filingDocumentIssuedAt), "filing-issued-at", "Enter a valid filing issue date."],
        [businessForm.isMostRecentFiling, "most-recent-filing", "Confirm that this is the most recent company filing."],
        [!businessForm.isMultiLayeredCompany || businessForm.ownershipStructureUrl.trim() !== "", "ownership-structure", "Upload corporate structure evidence for a multilayered company."],
      ];
      const failed = checks.find(([valid]) => !valid);
      if (failed) return { field: failed[1], message: failed[2] };
    }

    return { field: `kyc-step-${step}`, message: "Complete the first missing or invalid field in this step." };
  };

  const showFirstCurrentStepError = () => {
    const error = firstCurrentStepError();
    setFormError(error.message);
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-kyc-field="${error.field}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    });
  };

  const nextStep = () => {
    if (!validateCurrentStep()) {
      showFirstCurrentStepError();
      return;
    }

    setFormError("");
    setStep((currentStep) => Math.min(currentStep + 1, 4));
  };

  const previousStep = () => {
    setFormError("");
    setStep((currentStep) => Math.max(currentStep - 1, 1));
  };

  const buildCurrentKycPayload = (): KycSubmissionPayload => {
    const consentAt = new Date().toISOString();
    const documents =
      applicantType === "business"
        ? buildBusinessDocuments(businessForm, profileForm.countryCode, documentEvidence("business"))
        : buildPersonDocuments(profileForm, "applicant", documentEvidence("applicant"), false);
    const ownership = Number(beneficialOwnerForm.ownershipPercentage);

    if (applicantType === "business") {
      assertFilingDocumentEvidence(documents, businessForm.filingDocumentType);
    }

    return {
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
                metadata: {
                  role: representativeForm.role.trim(),
                  positions: [representativeForm.role.trim().toLowerCase().replace(/[ -]+/g, "_")],
                  phone: e164Phone(representativeForm.phoneCallingCode, representativeForm.phoneNumber),
                },
                documents: buildPersonDocuments(
                  representativeForm,
                  "authorized_representative",
                  documentEvidence("authorized_representative"),
                  true,
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
                  true,
                ),
              },
            ]
          : [],
      metadata: {
        source: "origin_wallet_platform",
        verification_consent: verificationConsent,
        verification_consent_at: consentAt,
        nium_region: applicantType === "business" ? "HK" : undefined,
        nium_kyc_type: applicantType === "business" ? "full" : undefined,
        source_of_funds:
          applicantType === "business" ? businessForm.sourceOfFunds.trim() : profileForm.sourceOfFunds.trim(),
        ...(applicantType === "individual"
          ? { expected_monthly_volume: profileForm.expectedMonthlyVolume.trim() }
          : {}),
        occupation: applicantType === "individual" ? profileForm.occupation.trim() : null,
        registered_date: applicantType === "business" ? normalizeDateValue(businessForm.registeredDate) : null,
        nium_business_type: applicantType === "business" ? businessForm.niumBusinessType.trim() : null,
        business_activity: applicantType === "business" ? businessForm.businessActivity.trim() : null,
        business_website: applicantType === "business" ? businessForm.website.trim() || null : null,
        business_activity_type: applicantType === "business" ? businessForm.businessActivityType.trim() : null,
        trade_type: applicantType === "business" ? businessForm.tradeType.trim() : null,
        main_product: applicantType === "business" ? businessForm.mainProduct.trim() : null,
        business_industry: applicantType === "business" ? businessForm.industry : null,
        expected_monthly_volume: applicantType === "business" ? businessForm.expectedMonthlyVolume : profileForm.expectedMonthlyVolume,
        average_transaction_value: applicantType === "business" ? businessForm.averageTransactionValue : null,
        monthly_transaction_count: applicantType === "business" ? businessForm.monthlyTransactionCount : null,
        main_transaction_countries: applicantType === "business" ? selectedValues(businessForm.mainTransactionCountries) : null,
        nium_v5_fields:
          applicantType === "business"
            ? buildHkCorporateFullFields({
                tradeName: businessForm.tradeName,
                sameBusinessAddress: businessForm.sameBusinessAddress,
                businessAddress: {
                  addressLine1: businessForm.businessAddressLine1,
                  city: businessForm.businessCity,
                  state: businessForm.businessState,
                  postalCode: businessForm.businessPostalCode,
                  countryCode: businessForm.businessCountryCode,
                },
                consentAt,
                isMultiLayeredCompany: businessForm.isMultiLayeredCompany,
                bank: {
                  accountName: businessForm.bankAccountName,
                  accountNumber: businessForm.bankAccountNumber,
                  bankCountry: businessForm.bankCountry,
                  bankName: businessForm.bankName,
                  currency: businessForm.bankCurrency,
                  routingType: businessForm.bankRoutingType,
                  routingValue: businessForm.bankRoutingValue,
                },
                deviceDescriptor: navigator.platform || "Origin Wallet web",
                industry: businessForm.industry,
                operatingCountries: selectedValues(businessForm.exportingRegions),
                monthlyVolume: businessForm.expectedMonthlyVolume,
                averageTransactionValue: businessForm.averageTransactionValue,
                monthlyTransactions: businessForm.monthlyTransactionCount,
                transactionCountries: selectedValues(businessForm.mainTransactionCountries),
                annualTurnover: businessForm.annualTurnover,
                totalEmployees: businessForm.totalEmployees,
                intendedUses: selectedValues(businessForm.intendedUses),
              })
            : null,
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
  };

  const buildProfileResubmissionPayload = () => {
    const { documents: _documents, related_persons: _relatedPersons, ...profilePayload } = buildCurrentKycPayload();

    return profilePayload;
  };

  const buildRelatedPersonResubmissionPayload = (requirement: KycRequirement) => {
    if (requirement.subject_type !== "related_person") return undefined;

    const relationshipType = metadataString(requirement.metadata, "relationship_type");
    const isBeneficialOwner = relationshipType.includes("beneficial") || relationshipType.includes("ubo");
    const form = isBeneficialOwner ? beneficialOwnerForm : representativeForm;
    const ownership = Number(beneficialOwnerForm.ownershipPercentage);

    return {
      relationship_type: relationshipType || (isBeneficialOwner ? "beneficial_owner" : "authorized_representative"),
      legal_name: form.legalName.trim(),
      date_of_birth: normalizeDateValue(form.dateOfBirth),
      nationality_country_code: normalizeCountryCode(form.nationality),
      residence_country_code: normalizeCountryCode(form.residence),
      ownership_percentage: isBeneficialOwner && Number.isFinite(ownership) ? ownership : null,
      address_line1: form.addressLine1.trim(),
      city: form.city.trim(),
      state: form.state.trim() || null,
      postal_code: form.postalCode.trim() || null,
      country_code: normalizeCountryCode(form.countryCode),
      metadata: {
        role: isBeneficialOwner
          ? relationshipType || "beneficial_owner"
          : form.role.trim() || relationshipType || "authorized_representative",
        ...(!isBeneficialOwner
          ? { phone: e164Phone(form.phoneCallingCode, form.phoneNumber) }
          : {}),
      },
    };
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

  const requirementResubmitMutation = useMutation({
    mutationFn: async ({
      requirement,
      file,
      note,
    }: {
      requirement: KycRequirement;
      file?: File | null;
      note?: string;
    }) => {
      if (!user?.id || !token) {
        throw new Error("Please sign in before resubmitting KYC/KYB information.");
      }

      let document: KycDocumentPayload | undefined;

      if (isDocumentRequirement(requirement)) {
        if (!file) {
          throw new Error("Choose a replacement document before submitting this requirement.");
        }

        const uploadResponse = await uploadKycDocument({
          file,
          metadata: {
            resubmission_requirement_id: requirement.id,
            resubmission_requirement_key: requirement.key,
            document_type: requirementDocumentType(requirement),
          },
          subjectType: "applicant",
          token,
          type: requirementDocumentType(requirement),
          userId: user.id,
        });

        document = uploadResponse.document;
      }

      return resubmitKycRequirement({
        requirementId: requirement.id,
        token,
        userId: user.id,
        payload: {
          document,
          metadata: {
            source: "origin_wallet_platform",
            requirement_key: requirement.key,
          },
          note: note?.trim() || null,
          profile: isDocumentRequirement(requirement) ? undefined : buildProfileResubmissionPayload(),
          related_person: buildRelatedPersonResubmissionPayload(requirement),
        },
      });
    },
    onSuccess: async (response, variables) => {
      setMessage(response.message || "KYC/KYB requirement resubmitted.");
      setFormError("");
      setRequirementFiles((current) => ({ ...current, [variables.requirement.id]: null }));
      setRequirementNotes((current) => ({ ...current, [variables.requirement.id]: "" }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["kyc-profile", user?.id, token] }),
        refreshSession(),
      ]);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Unable to resubmit this KYC/KYB requirement.");
    },
    onSettled: () => {
      setResubmittingRequirementId(null);
    },
  });

  const handleRequirementResubmit = (requirement: KycRequirement) => {
    setFormError("");
    setResubmittingRequirementId(requirement.id);
    requirementResubmitMutation.mutate({
      file: requirementFiles[requirement.id] ?? null,
      note: requirementNotes[requirement.id] ?? "",
      requirement,
    });
  };

  const handleSubmit = () => {
    if (!validateCurrentStep()) {
      showFirstCurrentStepError();
      return;
    }

    try {
      submitMutation.mutate(buildCurrentKycPayload());
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to build the KYC/KYB submission.");
    }
  };

  const isKycReadOnly = isLockedKycStatus(profile?.status ?? user?.kycStatus) && !editingRequestedInfo;
  const lockedProfile = profile && isKycReadOnly ? profile : null;
  const lockedStatusOnly = isKycReadOnly && !lockedProfile;

  const startRequestedInfoEdit = () => {
    setEditingRequestedInfo(true);
    setStep(1);
    setFormError("");
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
              Complete the required identity, document, and business ownership checks before account approval.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isKycReadOnly ? <StepIndicator currentStep={Math.max(step - 1, 0)} labels={stepLabels} /> : null}

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

            {lockedProfile ? (
              <LockedKycSummary
                canSubmitInfoUpdate={false}
                isPending={requirementResubmitMutation.isPending}
                onEditRequestedInfo={startRequestedInfoEdit}
                onFileChange={(requirement, file) =>
                  setRequirementFiles((current) => ({ ...current, [requirement.id]: file }))
                }
                onNoteChange={(requirement, note) =>
                  setRequirementNotes((current) => ({ ...current, [requirement.id]: note }))
                }
                onResubmit={handleRequirementResubmit}
                profile={lockedProfile}
                requirementFiles={requirementFiles}
                requirementNotes={requirementNotes}
                resubmittingRequirementId={resubmittingRequirementId}
              />
            ) : null}

            {lockedStatusOnly ? <LockedKycStatusOnlySummary status={profile?.status ?? user?.kycStatus} /> : null}

            {!isKycReadOnly && step === 1 ? (
              <section className="space-y-5">
                <SectionTitle title={applicantType === "business" ? "Business and people details" : "Personal details"} />
                <Field label={applicantType === "business" ? "Company legal name" : "Legal name"} value={profileForm.legalName} onChange={applicantType === "business" ? updateCompanyLegalName : (value) => updateProfile("legalName", value)} />
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
                      <Field label="Trade name" value={businessForm.tradeName} onChange={(value) => updateBusiness("tradeName", value)} />
                      <Field label="Registration number" value={businessForm.businessRegistration} onChange={(value) => updateBusiness("businessRegistration", value)} />
                      <Field label="Tax ID" value={businessForm.taxId} onChange={(value) => updateBusiness("taxId", value)} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Registered date"
                        value={businessForm.registeredDate}
                        onChange={(value) => updateBusiness("registeredDate", value)}
                        placeholder="YYYY-MM-DD"
                      />
                      <SelectField
                        label="Nium business type"
                        value={businessForm.niumBusinessType}
                        onChange={(value) => updateBusiness("niumBusinessType", value)}
                        options={niumBusinessTypeOptions}
                        placeholder="Select business type"
                      />
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
                      <SearchableMultiSelectField
                        label="Operating countries"
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
                    <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm">
                      <Checkbox checked={businessForm.isMultiLayeredCompany} onCheckedChange={(checked) => updateBusiness("isMultiLayeredCompany", checked === true)} />
                      The company has multiple ownership layers
                    </label>
                    <div className="grid gap-4">
                      <SelectField label="Business source of funds" value={businessForm.sourceOfFunds} onChange={(value) => updateBusiness("sourceOfFunds", value)} options={sourceOfFundsOptions} placeholder="Select source" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Agent name (optional)" value={businessForm.agentName} onChange={(value) => updateBusiness("agentName", value)} />
                      <Field label="Agent address (optional)" value={businessForm.agentAddress} onChange={(value) => updateBusiness("agentAddress", value)} />
                    </div>
                    <PersonDetails title="Authorized representative" form={representativeForm} onChange={updateRepresentative} includeOwnership={false} includePhone />
                    <PersonDetails title="Beneficial owner / UBO" form={beneficialOwnerForm} onChange={updateBeneficialOwner} includeOwnership includePhone={false} />
                  </>
                )}
                <WizardActions onBack={previousStep} onNext={nextStep} />
              </section>
            ) : null}

            {!isKycReadOnly && step === 2 ? (
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
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] md:p-6">
                      <div className="border-b border-gray-100 pb-4 dark:border-white/10">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Expected account usage</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Help us understand the company&apos;s expected payment activity.</p>
                      </div>
                      <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2">
                        <SelectField fieldId="expected-monthly-volume" label="Expected monthly transaction volume (USD)" value={businessForm.expectedMonthlyVolume} onChange={(value) => updateBusiness("expectedMonthlyVolume", value)} options={monthlyVolumeOptions} placeholder="Select volume" />
                        <SelectField fieldId="average-transaction-value" label="Average transaction value (USD)" value={businessForm.averageTransactionValue} onChange={(value) => updateBusiness("averageTransactionValue", value)} options={hkAverageTransactionValueOptions} placeholder="Select average value" />
                        <SelectField fieldId="monthly-transaction-count" label="Monthly transaction count" value={businessForm.monthlyTransactionCount} onChange={(value) => updateBusiness("monthlyTransactionCount", value)} options={hkMonthlyTransactionOptions} placeholder="Select count" />
                        <SearchableMultiSelectField fieldId="main-transaction-countries" label="Main transaction countries" value={businessForm.mainTransactionCountries} onChange={(value) => updateBusiness("mainTransactionCountries", value)} options={countryOptions} />
                        <SelectField fieldId="annual-turnover" label="Annual turnover band" value={businessForm.annualTurnover} onChange={(value) => updateBusiness("annualTurnover", value)} options={[...hkAnnualTurnoverOptions]} />
                        <SelectField fieldId="total-employees" label="Employee count band" value={businessForm.totalEmployees} onChange={(value) => updateBusiness("totalEmployees", value)} options={[...hkEmployeeCountOptions]} />
                        <MultiSelectField fieldId="intended-uses" label="Intended account uses" value={businessForm.intendedUses} onChange={(value) => updateBusiness("intendedUses", value)} options={[...hkIntendedUseOptions]} />
                      </div>
                      <div className="mt-6">
                        <TextareaField label="Account purpose" value={businessForm.accountPurpose} onChange={(value) => updateBusiness("accountPurpose", value)} placeholder="For example, collecting customer payments and paying overseas suppliers" helperText="Describe how the company will use the Origin Wallet account" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] md:p-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Business address relationship</h3>
                      <label className="mt-4 flex items-center gap-3 text-sm">
                        <Checkbox checked={businessForm.sameBusinessAddress} onCheckedChange={(checked) => updateBusiness("sameBusinessAddress", checked === true)} />
                        Business address is the same as the registered address
                      </label>
                      {!businessForm.sameBusinessAddress ? <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <SelectField label="Business country" value={businessForm.businessCountryCode} onChange={(value) => updateBusiness("businessCountryCode", value)} options={countryOptions} />
                        <Field label="Business postal code" value={businessForm.businessPostalCode} onChange={(value) => updateBusiness("businessPostalCode", value)} />
                        <Field label="Business address line 1" value={businessForm.businessAddressLine1} onChange={(value) => updateBusiness("businessAddressLine1", value)} />
                        <Field label="Business city" value={businessForm.businessCity} onChange={(value) => updateBusiness("businessCity", value)} />
                        <Field label="Business state/province" value={businessForm.businessState} onChange={(value) => updateBusiness("businessState", value)} />
                      </div> : null}
                    </div>
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

            {!isKycReadOnly && step === 3 ? (
              <section className="space-y-5">
                <SectionTitle title="Documents" />
                {applicantType === "individual" ? (
                  <PersonDocumentFields
                    title="Applicant identity documents"
                    form={profileForm}
                    onChange={updateProfile}
                    uploadSubject="applicant"
                    uploadingCapture={uploadingDocument}
                    corporate={false}
                    onUploadCapture={(captureType, field, file) =>
                      uploadPersonDocument("applicant", profileForm, updateProfile, captureType, field, file)
                    }
                  />
                ) : (
                  <>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] md:p-6">
                      <div className="border-b border-gray-100 pb-4 dark:border-white/10">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">Business documents</h3>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">2 required</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload clear, complete corporate documents for the Nium KYB review.</p>
                      </div>
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <FieldWithUpload
                          label="Certificate of Incorporation / Business Registration"
                          value={businessForm.registrationDocumentUrl}
                          onChange={(value) => updateBusiness("registrationDocumentUrl", value)}
                          uploadLabel="Upload incorporation or registration document"
                          uploading={uploadingDocument === captureKey("business", "business_registration")}
                          onFile={(file) => uploadBusinessDocument("business_registration", "registrationDocumentUrl", file, undefined, businessForm.registrationDocumentIssuedAt)}
                          required
                        />
                        <Field label="Business registration issue date" value={businessForm.registrationDocumentIssuedAt} onChange={(value) => updateBusiness("registrationDocumentIssuedAt", value)} type="date" max={todayInputValue} />
                        <SelectField label="Latest company filing type" value={businessForm.filingDocumentType} onChange={(value) => updateBusiness("filingDocumentType", value)} options={[{ label: "Annual return (NAR1)", value: "nar1" }, { label: "Incorporation form (NNC1)", value: "nnc1" }]} />
                        <FieldWithUpload
                          label="Latest NAR1 or NNC1 filing"
                          value={businessForm.filingDocumentUrl}
                          onChange={(value) => updateBusiness("filingDocumentUrl", value)}
                          uploadLabel="Upload latest filing"
                          uploading={uploadingDocument === captureKey("business", businessForm.filingDocumentType)}
                          onFile={(file) => uploadBusinessDocument(businessForm.filingDocumentType, "filingDocumentUrl", file, { is_most_recent_filing: true }, businessForm.filingDocumentIssuedAt)}
                          required
                        />
                        <Field label="Filing issue date" value={businessForm.filingDocumentIssuedAt} onChange={(value) => updateBusiness("filingDocumentIssuedAt", value)} type="date" max={todayInputValue} />
                        <FieldWithUpload
                          label="Business address proof"
                          value={businessForm.businessAddressProofUrl}
                          onChange={(value) => updateBusiness("businessAddressProofUrl", value)}
                          uploadLabel="Upload business address proof"
                          uploading={uploadingDocument === captureKey("business", "proof_of_business_address")}
                          onFile={(file) => uploadBusinessDocument("proof_of_business_address", "businessAddressProofUrl", file)}
                          required
                          helperText="For example, a recent utility bill, bank statement, or government-issued address record."
                        />
                        {businessForm.isMultiLayeredCompany ? <FieldWithUpload
                          label="Corporate ownership structure"
                          value={businessForm.ownershipStructureUrl}
                          onChange={(value) => updateBusiness("ownershipStructureUrl", value)}
                          uploadLabel="Upload ownership chart"
                          uploading={uploadingDocument === captureKey("business", "ownership_chart")}
                          onFile={(file) => uploadBusinessDocument("ownership_chart", "ownershipStructureUrl", file)}
                          required
                        /> : null}
                      </div>
                    </div>
                    <PersonDocumentFields
                      title="Authorized representative documents"
                      form={representativeForm}
                      onChange={updateRepresentative}
                      uploadSubject="authorized_representative"
                      uploadingCapture={uploadingDocument}
                      corporate
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
                      corporate
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
                <WizardActions onBack={previousStep} onNext={nextStep} nextLabel={applicantType === "business" ? "Review & submit" : "Continue to face check"} />
              </section>
            ) : null}

            {!isKycReadOnly && applicantType === "individual" && step === 4 ? (
              <section className="space-y-5">
                <SectionTitle title="Face check and consent" />
                <FaceCheckFields
                    title="Applicant face check"
                    selfieLivenessUrl={profileForm.selfieLivenessUrl}
                    livenessSessionId={profileForm.livenessSessionId}
                    uploading={uploadingCapture === "applicant:selfie_liveness"}
                    onFile={(file, metadata, fallbackFile) =>
                      uploadCapture("applicant", "selfie_liveness", file, (artifact, session) => {
                        updateProfile("selfieLivenessUrl", artifact.file_url);
                        updateProfile("livenessSessionId", session.external_session_id);
                      }, metadata, fallbackFile)
                    }
                  />
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                  <Checkbox checked={verificationConsent} onCheckedChange={(checked) => setVerificationConsent(checked === true)} />
                  <span>
                    I confirm the information is accurate and consent to identity, document, face, AML, and Origin Wallet
                    onboarding checks.
                  </span>
                </label>
                <WizardActions onBack={previousStep} onNext={nextStep} nextLabel="Review" />
              </section>
            ) : null}

            {!isKycReadOnly && ((applicantType === "business" && step === 4) || (applicantType === "individual" && step === 5)) ? (
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
                      <SummaryRow label="Expected monthly volume" value={businessForm.expectedMonthlyVolume || "-"} />
                      <SummaryRow label="Average transaction value" value={businessForm.averageTransactionValue || "-"} />
                      <SummaryRow label="Monthly transaction count" value={businessForm.monthlyTransactionCount || "-"} />
                      <SummaryRow label="Main transaction countries" value={businessForm.mainTransactionCountries || "-"} />
                      <SummaryRow label="Account purpose" value={businessForm.accountPurpose || "-"} />
                      <SummaryRow
                        label="Company materials"
                        value={[
                          businessForm.registrationDocumentUrl && "BR",
                          businessForm.businessAddressProofUrl && "Address proof",
                        ].filter(Boolean).join(", ") || "-"}
                      />
                    </>
                  ) : null}
                  <SummaryRow label="Address" value={[profileForm.addressLine1, profileForm.city, profileForm.state, profileForm.postalCode, profileForm.countryCode].filter(Boolean).join(", ") || "-"} />
                  <SummaryRow label="Documents" value={applicantType === "business" ? "Company + representative + UBO" : "Identity + address"} />
                  {applicantType === "individual" ? <SummaryRow label="Face check" value="Submitted" /> : null}
                </div>
                {applicantType === "business" ? (
                  <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                    <Checkbox checked={verificationConsent} onCheckedChange={(checked) => setVerificationConsent(checked === true)} />
                    <span>I confirm the company information is accurate and consent to document, AML, and Origin Wallet onboarding checks.</span>
                  </label>
                ) : null}
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
                <RequirementActionList
                  canSubmitInfoUpdate={!isKycReadOnly}
                  isPending={requirementResubmitMutation.isPending}
                  onEditRequestedInfo={startRequestedInfoEdit}
                  onFileChange={(requirement, file) =>
                    setRequirementFiles((current) => ({ ...current, [requirement.id]: file }))
                  }
                  onNoteChange={(requirement, note) =>
                    setRequirementNotes((current) => ({ ...current, [requirement.id]: note }))
                  }
                  onResubmit={handleRequirementResubmit}
                  requirements={openRequirements}
                  requirementFiles={requirementFiles}
                  requirementNotes={requirementNotes}
                  resubmittingRequirementId={resubmittingRequirementId}
                />
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

const LockedKycStatusOnlySummary = ({ status }: { status?: string | null }) => (
  <section className="space-y-5">
    <div className={`rounded-2xl border p-5 ${statusTone(status)}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em]">Review status</div>
          <h3 className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
            KYC/KYB profile submitted
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            Your profile is waiting for operations review. The submitted information is locked unless a reviewer asks
            for an update.
          </p>
        </div>
        <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold capitalize shadow-sm dark:bg-white/10">
          {formatStatusLabel(status, "submitted")}
        </div>
      </div>
    </div>
  </section>
);

type RequirementActionListProps = {
  canSubmitInfoUpdate: boolean;
  isPending: boolean;
  onEditRequestedInfo?: () => void;
  onFileChange: (requirement: KycRequirement, file: File | null) => void;
  onNoteChange: (requirement: KycRequirement, note: string) => void;
  onResubmit: (requirement: KycRequirement) => void;
  requirements: KycRequirement[];
  requirementFiles: Record<number, File | null>;
  requirementNotes: Record<number, string>;
  resubmittingRequirementId: number | null;
};

const RequirementActionList = ({
  canSubmitInfoUpdate,
  isPending,
  onEditRequestedInfo,
  onFileChange,
  onNoteChange,
  onResubmit,
  requirements,
  requirementFiles,
  requirementNotes,
  resubmittingRequirementId,
}: RequirementActionListProps) => (
  <ul className="space-y-3 text-sm">
    {requirements.map((requirement) => {
      const documentRequired = isDocumentRequirement(requirement);
      const reason =
        requirement.rejection_reason ||
        requirement.review_note ||
        metadataString(requirement.metadata, "reason") ||
        metadataString(requirement.metadata, "review_note");
      const submittingThisRequirement = isPending && resubmittingRequirementId === requirement.id;

      return (
        <li key={`${requirement.id}-${requirement.key}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{requirement.label}</div>
              <div className="text-xs capitalize">{String(requirement.status).replace(/_/g, " ")}</div>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold capitalize text-amber-800">
              {documentRequired ? "Document" : "Information"}
            </span>
          </div>
          {reason ? <div className="mt-2 text-xs leading-5">{reason}</div> : null}

          <div className="mt-3 space-y-2">
            {documentRequired ? (
              <>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4,.mov,.webm,image/*,application/pdf,video/*"
                  className="border-amber-200 bg-white text-slate-950 file:mr-3 file:rounded-full file:border-0 file:bg-amber-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-900"
                  onChange={(event) => onFileChange(requirement, event.target.files?.[0] ?? null)}
                />
                <textarea
                  value={requirementNotes[requirement.id] ?? ""}
                  onChange={(event) => onNoteChange(requirement, event.target.value)}
                  placeholder="Optional note for the reviewer"
                  className="min-h-20 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-green-600"
                />
                <Button
                  type="button"
                  className="w-full rounded-full bg-green-600 text-white hover:bg-green-700"
                  disabled={isPending || !requirementFiles[requirement.id]}
                  onClick={() => onResubmit(requirement)}
                >
                  {submittingThisRequirement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit replacement document
                </Button>
              </>
            ) : canSubmitInfoUpdate ? (
              <>
                <div className="rounded-lg bg-white/70 p-2 text-xs leading-5">
                  Update the requested fields in the form, then submit this item for review.
                </div>
                <textarea
                  value={requirementNotes[requirement.id] ?? ""}
                  onChange={(event) => onNoteChange(requirement, event.target.value)}
                  placeholder="Optional note for the reviewer"
                  className="min-h-20 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-green-600"
                />
                <Button
                  type="button"
                  className="w-full rounded-full bg-green-600 text-white hover:bg-green-700"
                  disabled={isPending}
                  onClick={() => onResubmit(requirement)}
                >
                  {submittingThisRequirement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit this update
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-white/70 p-2 text-xs leading-5">
                  Open the requested information form, correct the data, then submit this item.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={onEditRequestedInfo}
                >
                  Edit requested information
                </Button>
              </>
            )}
          </div>
        </li>
      );
    })}
  </ul>
);

type LockedKycSummaryProps = Omit<RequirementActionListProps, "requirements"> & { profile: KycProfile };

const LockedKycSummary = ({
  canSubmitInfoUpdate,
  isPending,
  onEditRequestedInfo,
  onFileChange,
  onNoteChange,
  onResubmit,
  profile,
  requirementFiles,
  requirementNotes,
  resubmittingRequirementId,
}: LockedKycSummaryProps) => {
  const profileName =
    profile.applicant_type === "business"
      ? profile.business_name || profile.legal_name || "Business profile"
      : profile.legal_name || "Individual profile";
  const countryCode =
    profile.applicant_type === "business"
      ? profile.registered_country_code || profile.country_code
      : profile.residence_country_code || profile.nationality_country_code || profile.country_code;
  const openRequirements =
    profile.requirements?.filter((requirement) => isOpenKycRequirementStatus(requirement.status)) ?? [];
  const isApproved = isVerifiedKycStatus(profile.status);
  const hasOpenRequirements = openRequirements.length > 0;
  const title = hasOpenRequirements
    ? "More information requested"
    : isApproved
      ? "KYC/KYB profile approved"
      : "KYC/KYB profile submitted";
  const description = hasOpenRequirements
    ? "Operations needs a few updates before the review can continue. Only the requested items below need to be corrected or resubmitted."
    : isApproved
      ? "This profile has been reviewed and approved. No further customer action is required."
      : "Your profile is waiting for operations review. The submitted information is locked unless a reviewer asks for an update.";

  return (
    <section className="space-y-5">
      <div className={`rounded-2xl border p-5 ${statusTone(profile.status)}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em]">Review status</div>
            <h3 className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              {description}
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold capitalize shadow-sm dark:bg-white/10">
            {formatStatusLabel(profile.status)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm dark:border-white/10 dark:bg-white/5">
        <SummaryRow label="Profile type" value={profile.applicant_type === "business" ? "Business KYB" : "Individual KYC"} />
        <SummaryRow label="Profile name" value={profileName} />
        <SummaryRow label="Country" value={countryCode || "-"} />
        <SummaryRow label="Submitted" value={formatDate(profile.submitted_at)} />
        <SummaryRow label="Reviewed" value={formatDate(profile.reviewed_at)} />
      </div>

      {hasOpenRequirements ? (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div>
            <div className="font-semibold">Open requirements</div>
            <p className="mt-1 text-xs leading-5">
              Submit only the item requested by the reviewer. Submitted replacements will return to review status.
            </p>
          </div>
          <RequirementActionList
            canSubmitInfoUpdate={canSubmitInfoUpdate}
            isPending={isPending}
            onEditRequestedInfo={onEditRequestedInfo}
            onFileChange={onFileChange}
            onNoteChange={onNoteChange}
            onResubmit={onResubmit}
            requirements={openRequirements}
            requirementFiles={requirementFiles}
            requirementNotes={requirementNotes}
            resubmittingRequirementId={resubmittingRequirementId}
          />
        </div>
      ) : null}
    </section>
  );
};

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
    metadata: artifact.metadata,
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
    metadata: document.metadata,
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
  const filingEvidence = evidence(form.filingDocumentType);

  if (import.meta.env.DEV) {
    console.debug("HK KYB filing evidence", {
      type: form.filingDocumentType,
      evidence: filingEvidence,
    });
  }

  return [
    {
      type: "business_registration",
      file_url: form.registrationDocumentUrl.trim(),
      issuing_country_code: issuingCountryCode,
      issued_at: normalizeDateValue(form.registrationDocumentIssuedAt),
      ...evidence("business_registration"),
    },
    buildFilingDocumentPayload(form, issuingCountryCode, filingEvidence),
    {
      type: "proof_of_business_address",
      file_url: form.businessAddressProofUrl.trim(),
      issuing_country_code: issuingCountryCode,
      ...evidence("proof_of_business_address"),
    },
    ...(form.isMultiLayeredCompany
      ? [{
          type: "ownership_chart",
          file_url: form.ownershipStructureUrl.trim(),
          issuing_country_code: issuingCountryCode,
          ...evidence("ownership_chart"),
        }]
      : []),
  ];
};

export const buildFilingDocumentPayload = (
  form: Pick<BusinessForm, "filingDocumentType" | "filingDocumentUrl" | "filingDocumentIssuedAt" | "isMostRecentFiling">,
  issuingCountryCode: string | null,
  filingEvidence: Partial<KycDocumentPayload>,
): KycDocumentPayload => ({
  type: form.filingDocumentType,
  file_url: form.filingDocumentUrl.trim(),
  issuing_country_code: issuingCountryCode,
  issued_at: normalizeDateValue(form.filingDocumentIssuedAt),
  ...filingEvidence,
  metadata: {
    ...(filingEvidence.metadata ?? {}),
    is_most_recent_filing: form.isMostRecentFiling,
  },
});

export const assertFilingDocumentEvidence = (
  documents: KycDocumentPayload[],
  filingDocumentType: "nar1" | "nnc1",
) => {
  const filingDocument = documents.find((document) => document.type === filingDocumentType);
  const requiredEvidence = [
    filingDocument?.file_url,
    filingDocument?.file_hash,
    filingDocument?.file_path,
    filingDocument?.storage_disk,
  ];

  if (!filingDocument || requiredEvidence.some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error("Uploaded filing document metadata is missing. Please re-upload the NAR1/NNC1 document.");
  }
};

const buildPersonDocuments = (
  form: ProfileForm | PersonForm,
  subject: IdentityVerificationSubject,
  evidence: (captureType: string) => Partial<KycDocumentPayload>,
  corporate = false,
): KycDocumentPayload[] => {
  const issuingCountry = normalizeCountryCode(form.idIssuingCountry) || normalizeCountryCode("nationality" in form ? form.nationality : "");
  const documentType = form.idDocumentType || "identity_document";
  const baseMetadata = {
    subject,
    document_type: documentType,
  };

  const documents: KycDocumentPayload[] = [{
      type: `${documentType}_front`,
      file_url: form.idFrontUrl.trim(),
      side: "front",
      document_number: form.idDocumentNumber.trim(),
      issuing_country_code: issuingCountry || null,
      issued_at: normalizeDateValue(form.idIssuedAt) || null,
      expires_at: normalizeDateValue(form.idExpiresAt) || null,
      metadata: baseMetadata,
      ...evidence("identity_front"),
    }];

  if (!corporate) {
    documents.push({
      type: "proof_of_address",
      file_url: form.proofOfAddressUrl.trim(),
      issuing_country_code: "countryCode" in form ? normalizeCountryCode(form.countryCode) || null : null,
      metadata: { subject },
      ...evidence("proof_of_address"),
    });
  }

  if (!corporate || documentType !== "passport") {
    documents.splice(1, 0, {
      type: `${documentType}_back`,
      file_url: form.idBackUrl.trim(),
      side: "back",
      document_number: form.idDocumentNumber.trim(),
      issuing_country_code: issuingCountry || null,
      issued_at: normalizeDateValue(form.idIssuedAt) || null,
      expires_at: normalizeDateValue(form.idExpiresAt) || null,
      metadata: baseMetadata,
      ...evidence("identity_back"),
    });
  }

  if (form.selfieLivenessUrl.trim()) {
    documents.push({
      type: "selfie_liveness",
      file_url: form.selfieLivenessUrl.trim(),
      metadata: {
        subject,
        liveness_session_id: form.livenessSessionId.trim() || null,
        captured_at: new Date().toISOString(),
      },
      ...evidence("selfie_liveness"),
    });
  }

  return documents;
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
    idIssuingCountry: normalizeCountryCode(front?.issuing_country_code ?? back?.issuing_country_code),
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

const SectionTitle = ({ title }: { title: string }) => (
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
);

const Field = ({
  helperText,
  label,
  max,
  min,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  helperText?: string;
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
    {helperText ? <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{helperText}</p> : null}
  </div>
);

const TextareaField = ({
  helperText,
  label,
  onChange,
  placeholder,
  value,
}: {
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-28 resize-y rounded-xl border-gray-200"
    />
    {helperText ? <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{helperText}</p> : null}
  </div>
);

const FieldWithUpload = ({
  acceptedTypes = "JPG, PNG or PDF",
  helperText,
  label,
  onFile,
  uploadLabel,
  uploading,
  value,
  required = false,
}: {
  acceptedTypes?: string;
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  onFile: (file: File) => void;
  uploadLabel: string;
  uploading: boolean;
  value: string;
  required?: boolean;
}) => (
  <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {required ? <span className="text-xs font-semibold text-red-600">Required</span> : null}
      </div>
      {helperText ? <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{helperText}</p> : null}
      <div className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${value ? "border-emerald-200 bg-emerald-50/70" : "border-gray-200 bg-white"}`}>
        <span className={value ? "font-medium text-emerald-700" : "text-gray-500"}>
          {value ? "Upload complete" : "Waiting for document"}
        </span>
        {value ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
      </div>
    </div>
    <EvidenceUpload
      accept="image/*,.pdf"
      capture="environment"
      label={uploadLabel}
      onFile={onFile}
      uploading={uploading}
    />
    <p className="text-xs text-gray-500 dark:text-gray-400">Accepted: {acceptedTypes}</p>
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
  fieldId,
  label,
  onChange,
  options,
  placeholder = "Select an option",
  value,
}: {
  fieldId?: string;
  label: string;
  onChange: (value: TValue) => void;
  options: { label: string; value: TValue }[];
  placeholder?: string;
  value: TValue;
}) => (
  <div className="space-y-2" data-kyc-field={fieldId}>
    <Label>{label}</Label>
    <select
      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
      value={value}
      translate="no"
      onChange={(event) => onChange(event.target.value as TValue)}
    >
      <option value="" disabled translate="no">
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} translate="no">
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const MultiSelectField = ({
  fieldId,
  label,
  onChange,
  options,
  value,
}: {
  fieldId?: string;
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) => {
  const selected = selectedValues(value);

  return (
    <div className="space-y-2" data-kyc-field={fieldId}>
      <Label>{label}</Label>
      <select
        multiple
        className="min-h-[116px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
        value={selected}
        translate="no"
        onChange={(event) => {
          const values = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
          onChange(values.join(","));
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} translate="no">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const SearchableMultiSelectField = ({
  fieldId,
  label,
  onChange,
  options,
  value,
}: {
  fieldId?: string;
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) => {
  const [open, setOpen] = useState(false);
  const selected = selectedValues(value);
  const selectedOptions = selected
    .map((selectedValue) => options.find((option) => option.value === selectedValue))
    .filter((option): option is { label: string; value: string } => Boolean(option));

  const toggleOption = (optionValue: string) => {
    const next = selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue];
    onChange(next.join(","));
  };

  return (
    <div className="space-y-2" data-kyc-field={fieldId}>
      <Label>{label}</Label>
      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-white/10 dark:bg-white/5">
          {selectedOptions.map((option) => (
            <span key={option.value} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
              {option.label}
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                className="rounded-full p-0.5 hover:bg-emerald-100"
                onClick={() => toggleOption(option.value)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-12 w-full justify-between rounded-xl border-gray-200 bg-white px-3 font-normal text-gray-600">
            {selected.length ? "Add or remove countries" : "Search and select countries"}
            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <CommandItem key={option.value} value={`${option.label} ${option.value}`} onSelect={() => toggleOption(option.value)}>
                      <span className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${isSelected ? "border-green-600 bg-green-600 text-white" : "border-gray-300"}`}>
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const PersonDetails = ({
  form,
  includePhone,
  includeOwnership,
  onChange,
  title,
}: {
  form: PersonForm;
  includePhone: boolean;
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
      ) : (
        <SelectField label="Role" value={form.role} onChange={(value) => onChange("role", value)} options={[{ label: "Director", value: "director" }]} />
      )}
    </div>
    {includePhone ? (
      <div className="mt-4 space-y-2">
        <Label>Registration phone</Label>
        <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
          <select
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
            value={form.phoneCallingCode}
            onChange={(event) => onChange("phoneCallingCode", event.target.value)}
          >
            {phoneCountryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <Input
            className="h-12 rounded-xl border-gray-200"
            inputMode="tel"
            value={form.phoneNumber}
            placeholder="901234567"
            onChange={(event) => onChange("phoneNumber", event.target.value)}
          />
        </div>
        <p className="text-xs text-gray-500">Submitted as {e164Phone(form.phoneCallingCode, form.phoneNumber) || "an E.164 phone number"}.</p>
      </div>
    ) : null}
  </div>
);

export const AddressFields = ({
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
}) => {
  const subdivisionOptions = getSubdivisionOptions(countryCode);
  const hasValidSubdivision = subdivisionOptions.some((option) => option.value === state);

  useEffect(() => {
    if (subdivisionOptions.length > 0 && state && !hasValidSubdivision) {
      onChange("state", "");
    }
  }, [hasValidSubdivision, onChange, state, subdivisionOptions.length]);

  const handleCountryChange = (value: string) => {
    const nextState = stateAfterCountryChange(value, state);

    onChange("countryCode", value);
    if (nextState !== state) {
      onChange("state", nextState);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SelectField fieldId="address-country" label="Country" value={countryCode} onChange={handleCountryChange} options={countryOptions} placeholder="Select country" />
        <Field label="Postal code" value={postalCode} onChange={(value) => onChange("postalCode", value)} />
      </div>
      <div className="mt-4">
        <Field label="Address line 1" value={addressLine1} onChange={(value) => onChange("addressLine1", value)} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="City" value={city} onChange={(value) => onChange("city", value)} />
        {subdivisionOptions.length > 0 ? (
          <SelectField fieldId="address-state" label="State/province" value={state} onChange={(value) => onChange("state", value)} options={subdivisionOptions} placeholder="Select state/province" />
        ) : (
          <Field label="State/province" value={state} onChange={(value) => onChange("state", value)} />
        )}
      </div>
    </div>
  );
};

const PersonDocumentFields = ({
  corporate,
  form,
  onChange,
  onUploadCapture,
  title,
  uploadSubject,
  uploadingCapture,
}: {
  corporate: boolean;
  form: Pick<PersonForm, DocumentFieldKey>;
  onChange: (field: DocumentFieldKey, value: string) => void;
  onUploadCapture: (captureType: IdentityCaptureType, field: DocumentFieldKey, file: File) => void;
  title: string;
  uploadSubject: IdentityVerificationSubject;
  uploadingCapture: string;
}) => {
  const isPassport = corporate && form.idDocumentType === "passport";
  const documentOptions = corporate
    ? [
        { label: "National ID", value: "national_id" as IdentityDocumentType },
        { label: "Passport", value: "passport" as IdentityDocumentType },
      ]
    : [
        { label: "National ID", value: "national_id" as IdentityDocumentType },
        { label: "Passport", value: "passport" as IdentityDocumentType },
        { label: "Driver license", value: "driver_license" as IdentityDocumentType },
        { label: "Other identity document", value: "identity_document" as IdentityDocumentType },
      ];

  const changeDocumentType = (value: IdentityDocumentType) => {
    onChange("idDocumentType", value);
    if (!corporate) return;

    onChange("idDocumentNumber", "");
    onChange("idIssuingCountry", "");
    onChange("idIssuedAt", "");
    onChange("idExpiresAt", "");
    onChange("idFrontUrl", "");
    onChange("idBackUrl", "");
  };

  return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] md:p-6">
    <div className="border-b border-gray-100 pb-4 dark:border-white/10">
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      {corporate ? <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose one identity document. All displayed fields and uploads are required.</p> : null}
    </div>
    <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2">
      <SelectField
        label="Document type"
        value={form.idDocumentType}
        onChange={changeDocumentType}
        options={documentOptions}
      />
      <Field label={isPassport ? "Passport number" : "ID number"} value={form.idDocumentNumber} onChange={(value) => onChange("idDocumentNumber", value)} />
      {isPassport ? <SelectField label="Issuing country" value={form.idIssuingCountry} onChange={(value) => onChange("idIssuingCountry", value)} options={countryOptions} placeholder="Select issuing country" /> : null}
      {!corporate || isPassport ? <Field label={corporate ? "Issue date" : "Issued date"} value={form.idIssuedAt} onChange={(value) => onChange("idIssuedAt", value)} type="date" max={todayInputValue} /> : null}
      {!corporate || isPassport ? <Field label="Expiry date" value={form.idExpiresAt} onChange={(value) => onChange("idExpiresAt", value)} type="date" min={tomorrowInputValue} /> : null}
      <FieldWithUpload
        label={isPassport ? "Passport document" : "ID front image"}
        value={form.idFrontUrl}
        onChange={(value) => onChange("idFrontUrl", value)}
        uploadLabel={isPassport ? "Upload passport document" : "Capture or upload ID front"}
        uploading={uploadingCapture === `${uploadSubject}:identity_front`}
        onFile={(file) => onUploadCapture("identity_front", "idFrontUrl", file)}
        required={corporate}
      />
      {!isPassport ? (
        <FieldWithUpload
          label="ID back image"
          value={form.idBackUrl}
          onChange={(value) => onChange("idBackUrl", value)}
          uploadLabel="Capture or upload ID back"
          uploading={uploadingCapture === `${uploadSubject}:identity_back`}
          onFile={(file) => onUploadCapture("identity_back", "idBackUrl", file)}
          required={corporate}
        />
      ) : null}
    </div>
    {!corporate ? <div className="mt-4">
      <FieldWithUpload
        label="Proof of address"
        value={form.proofOfAddressUrl}
        onChange={(value) => onChange("proofOfAddressUrl", value)}
        uploadLabel="Upload proof of address"
        uploading={uploadingCapture === `${uploadSubject}:proof_of_address`}
        onFile={(file) => onUploadCapture("proof_of_address", "proofOfAddressUrl", file)}
      />
    </div> : null}
  </div>;
};

const FaceCheckFields = ({
  livenessSessionId,
  onFile,
  selfieLivenessUrl,
  title,
  uploading,
}: {
  livenessSessionId: string;
  onFile: (file: File, metadata?: Record<string, unknown>, fallbackFile?: File) => void;
  selfieLivenessUrl: string;
  title: string;
  uploading: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const previewUrlRef = useRef("");
  const scanStartedAtRef = useRef(0);
  const stepStartedAtRef = useRef(0);
  const neutralCenterXRef = useRef<number | null>(null);
  const neutralFrameRef = useRef<Uint8Array | null>(null);
  const firstSideDirectionRef = useRef<-1 | 1 | null>(null);
  const firstSideFrameRef = useRef<Uint8Array | null>(null);
  const verifiedStepKeysRef = useRef<Set<string>>(new Set());
  const faceDetectorRef = useRef<BrowserFaceDetector | null>(null);
  const faceDetectionAvailableRef = useRef<boolean | null>(null);
  const finishInProgressRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "requesting" | "scanning" | "processing" | "captured">(
    selfieLivenessUrl ? "captured" : "idle",
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [faceStatus, setFaceStatus] = useState("Waiting for camera");
  const [usingFaceDetector, setUsingFaceDetector] = useState(false);
  const [verifiedStepKeys, setVerifiedStepKeys] = useState<string[]>([]);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }, []);

  const markStepVerified = useCallback((stepKey: string) => {
    if (verifiedStepKeysRef.current.has(stepKey)) return;

    const next = new Set(verifiedStepKeysRef.current);
    next.add(stepKey);
    verifiedStepKeysRef.current = next;
    setVerifiedStepKeys(Array.from(next));
  }, []);

  const resetLivenessChecks = useCallback(() => {
    neutralCenterXRef.current = null;
    neutralFrameRef.current = null;
    firstSideDirectionRef.current = null;
    firstSideFrameRef.current = null;
    verifiedStepKeysRef.current = new Set();
    setVerifiedStepKeys([]);
  }, []);

  const selectedVideoMimeType = useMemo(() => {
    if (typeof MediaRecorder === "undefined") return "";
    return livenessVideoMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
  }, []);

  const stopRecorder = useCallback(async () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return null;
    }

    if (recorder.state === "inactive") {
      const mimeType = recorder.mimeType || selectedVideoMimeType || "video/webm";
      mediaRecorderRef.current = null;
      return recordedChunksRef.current.length > 0 ? new Blob(recordedChunksRef.current, { type: mimeType }) : null;
    }

    return new Promise<Blob | null>((resolve) => {
      const mimeType = recorder.mimeType || selectedVideoMimeType || "video/webm";
      recorder.onstop = () => {
        mediaRecorderRef.current = null;
        resolve(recordedChunksRef.current.length > 0 ? new Blob(recordedChunksRef.current, { type: mimeType }) : null);
      };
      recorder.stop();
    });
  }, [selectedVideoMimeType]);

  const startRecorder = useCallback(
    (stream: MediaStream) => {
      recordedChunksRef.current = [];

      if (typeof MediaRecorder === "undefined") {
        return;
      }

      try {
        const recorder = new MediaRecorder(stream, {
          ...(selectedVideoMimeType ? { mimeType: selectedVideoMimeType } : {}),
          videoBitsPerSecond: 800_000,
        });
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.start(500);
        mediaRecorderRef.current = recorder;
      } catch {
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];
      }
    },
    [selectedVideoMimeType],
  );

  const attachStreamToVideo = useCallback(async () => {
    const stream = streamRef.current;
    const video = videoRef.current;

    if (!stream || !video) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    try {
      await video.play();
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true);
        setCameraError("");
        setFaceStatus("Position your face in the oval");
      }
    } catch {
      setCameraError("Camera is waiting for browser permission. Allow camera access and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setCameraActive(false);
  }, []);

  const cancelFaceScan = useCallback(() => {
    void stopRecorder().finally(() => {
      recordedChunksRef.current = [];
    });
    stopCamera();
    finishInProgressRef.current = false;
    resetLivenessChecks();
    setCameraError("");
    setCurrentStep(0);
    setStepProgress(0);
    setFaceStatus("Scan cancelled");
    setScanStatus(previewUrlRef.current || selfieLivenessUrl ? "captured" : "idle");
  }, [resetLivenessChecks, selfieLivenessUrl, stopCamera, stopRecorder]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopCamera();
      revokePreview();
    };
  }, [revokePreview, stopCamera]);

  useEffect(() => {
    if (cameraActive) {
      void attachStreamToVideo();
    }
  }, [attachStreamToVideo, cameraActive]);

  useEffect(() => {
    setScanStatus((current) => (current === "idle" && selfieLivenessUrl ? "captured" : current));
  }, [selfieLivenessUrl]);

  const captureStillBlob = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const context = canvas.getContext("2d");
    if (!context) return null;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const sourceX = (video.videoWidth - size) / 2;
    const sourceY = (video.videoHeight - size) / 2;
    canvas.width = 720;
    canvas.height = 720;
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, sourceX, sourceY, size, size, 0, 0, canvas.width, canvas.height);
    context.restore();

    return new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92));
  }, []);

  const measureFramePosition = useCallback((): FramePositionSignal | null => {
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;

    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const width = 96;
    const height = 72;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(video, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    let luminanceTotal = 0;
    let sampleCount = 0;

    for (let y = 6; y < height - 4; y += 1) {
      for (let x = 3; x < width - 3; x += 1) {
        const offset = (y * width + x) * 4;
        luminanceTotal += 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
        sampleCount += 1;
      }
    }

    if (sampleCount === 0) return null;

    const averageLuminance = luminanceTotal / sampleCount;
    const descriptor = new Uint8Array(sampleCount);
    let weightedX = 0;
    let weightTotal = 0;
    let descriptorIndex = 0;

    for (let y = 6; y < height - 4; y += 1) {
      for (let x = 3; x < width - 3; x += 1) {
        const offset = (y * width + x) * 4;
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
        const contrast = Math.abs(luminance - averageLuminance);
        const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
        const weight = Math.max(0, contrast - 6) + saturation * 0.25;
        descriptor[descriptorIndex] = Math.max(0, Math.min(255, Math.round(luminance)));
        descriptorIndex += 1;

        if (weight <= 0) continue;

        weightedX += x * weight;
        weightTotal += weight;
      }
    }

    const quality = weightTotal / (sampleCount * 255);
    if (quality < 0.018) return null;

    return {
      centerX: weightedX / weightTotal / (width - 1),
      descriptor,
      quality,
    };
  }, []);

  const evaluateLivenessPosition = useCallback(
    (signal: FramePositionSignal): LivenessCheckResult => {
      const step = livenessSteps[currentStep];
      const baseline = neutralCenterXRef.current;
      const centerX = signal.centerX;
      const neutralDistance = frameDescriptorDistance(signal.descriptor, neutralFrameRef.current);
      const firstSideDistance = frameDescriptorDistance(signal.descriptor, firstSideFrameRef.current);

      if (step.requirement === "center") {
        if (Math.abs(centerX - 0.5) > 0.24) {
          return { ok: false, message: "Keep your face centered in the oval" };
        }

        neutralCenterXRef.current = baseline === null ? centerX : baseline * 0.75 + centerX * 0.25;
        neutralFrameRef.current = new Uint8Array(signal.descriptor);
        markStepVerified(step.key);
        return { ok: true, message: "Center position verified" };
      }

      if (baseline === null || !neutralFrameRef.current) {
        return { ok: false, message: "Center your face first" };
      }

      const delta = centerX - baseline;

      if (step.requirement === "first_side") {
        if (Math.abs(delta) < livenessMovementThreshold && neutralDistance < livenessAppearanceChangeThreshold) {
          return { ok: false, message: "Turn your face farther to one side" };
        }

        firstSideDirectionRef.current = delta === 0 ? 1 : delta < 0 ? -1 : 1;
        firstSideFrameRef.current = new Uint8Array(signal.descriptor);
        markStepVerified(step.key);
        return { ok: true, message: "First side gesture verified" };
      }

      if (step.requirement === "opposite_side") {
        const firstDirection = firstSideDirectionRef.current;

        if (!firstDirection || !firstSideFrameRef.current) {
          return { ok: false, message: "Complete the first side movement first" };
        }

        if (delta * firstDirection > -livenessMovementThreshold && firstSideDistance < livenessAppearanceChangeThreshold) {
          return { ok: false, message: "Turn your face to the opposite side" };
        }

        markStepVerified(step.key);
        return { ok: true, message: "Opposite side gesture verified" };
      }

      if (Math.abs(delta) > livenessCenterTolerance && neutralDistance > livenessReturnAppearanceThreshold) {
        return { ok: false, message: "Return to center and look straight" };
      }

      markStepVerified(step.key);
      return { ok: true, message: "Straight look verified" };
    },
    [currentStep, markStepVerified],
  );

  const inspectMotionFallback = useCallback((): LivenessCheckResult => {
    const signal = measureFramePosition();

    if (!signal) {
      setFaceStatus("Camera image is unclear");
      return { ok: false, message: "Improve lighting and keep your face in frame" };
    }

    const result = evaluateLivenessPosition(signal);
    setFaceStatus(result.message);
    return result;
  }, [evaluateLivenessPosition, measureFramePosition]);

  const inspectFace = useCallback(async () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return { ok: false, message: "Camera is starting" };
    }

    if (faceDetectionAvailableRef.current === null) {
      faceDetectionAvailableRef.current = typeof window.FaceDetector !== "undefined";
      setUsingFaceDetector(faceDetectionAvailableRef.current);
    }

    if (!faceDetectionAvailableRef.current || !window.FaceDetector) {
      setUsingFaceDetector(false);
      return inspectMotionFallback();
    }

    try {
      if (!faceDetectorRef.current) {
        faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
      }

      const faces = await faceDetectorRef.current.detect(video);

      if (faces.length === 0) {
        setFaceStatus("No face detected");
        return { ok: false, message: "Move your face into the oval" };
      }

      if (faces.length > 1) {
        setFaceStatus("Multiple faces detected");
        return { ok: false, message: "Only one face can be in frame" };
      }

      const face = faces[0].boundingBox;
      const centerX = (face.x + face.width / 2) / video.videoWidth;
      const centerY = (face.y + face.height / 2) / video.videoHeight;
      const faceAreaRatio = (face.width * face.height) / (video.videoWidth * video.videoHeight);
      const faceCentered = centerX > 0.28 && centerX < 0.72 && centerY > 0.22 && centerY < 0.78;

      if (faceAreaRatio < 0.055) {
        setFaceStatus("Face too far");
        return { ok: false, message: "Move closer to the camera" };
      }

      if (faceAreaRatio > 0.55) {
        setFaceStatus("Face too close");
        return { ok: false, message: "Move back slightly" };
      }

      if (!faceCentered) {
        setFaceStatus("Face outside frame");
        return { ok: false, message: "Keep your face inside the oval" };
      }

      const frameSignal = measureFramePosition();
      const result = evaluateLivenessPosition(frameSignal ? { ...frameSignal, centerX } : { centerX, descriptor: new Uint8Array(0), quality: 1 });
      setFaceStatus(result.message);
      return result;
    } catch {
      faceDetectionAvailableRef.current = false;
      setUsingFaceDetector(false);
      return inspectMotionFallback();
    }
  }, [evaluateLivenessPosition, inspectMotionFallback, measureFramePosition]);

  const finishLivenessScan = useCallback(async () => {
    if (finishInProgressRef.current) return;
    finishInProgressRef.current = true;
    setScanStatus("processing");
    setCameraError("");
    setStepProgress(100);
    setFaceStatus("Processing liveness evidence");

    const stillBlob = await captureStillBlob();
    const videoBlob = await stopRecorder();
    stopCamera();

    if (stillBlob) {
      revokePreview();
      const nextPreviewUrl = URL.createObjectURL(stillBlob);
      previewUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
    }

    const shouldUseVideo = Boolean(videoBlob && videoBlob.size > 2048 && videoBlob.size <= maxLivenessVideoUploadBytes);
    const evidenceBlob = shouldUseVideo ? videoBlob : stillBlob;

    if (!evidenceBlob) {
      finishInProgressRef.current = false;
      setScanStatus("idle");
      setCameraError("Cannot save liveness evidence. Try again.");
      return;
    }

    const mimeType = normalizeEvidenceMimeType(evidenceBlob.type || (shouldUseVideo ? "video/webm" : "image/jpeg"));
    const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("webm") ? "webm" : "jpg";
    const uploadBlob = evidenceBlob.type === mimeType ? evidenceBlob : new Blob([evidenceBlob], { type: mimeType });
    const fallbackFile = stillBlob
      ? new File([stillBlob], `liveness-still-${Date.now()}.jpg`, { type: "image/jpeg" })
      : undefined;
    const durationMs = Math.max(0, Date.now() - scanStartedAtRef.current);
    const metadata = {
      evidence_type: mimeType.startsWith("video/") ? "guided_liveness_video" : "guided_liveness_image_fallback",
      evidence_mime_type: mimeType,
      evidence_size: uploadBlob.size,
      video_evidence_recorded: Boolean(videoBlob && videoBlob.size > 2048),
      video_evidence_size: videoBlob?.size ?? null,
      video_upload_skipped_reason: videoBlob && videoBlob.size > maxLivenessVideoUploadBytes ? "video_too_large" : null,
      challenge_steps: livenessSteps.map((step) => step.key),
      challenge_step_count: livenessSteps.length,
      verified_challenge_steps: Array.from(verifiedStepKeysRef.current),
      verified_challenge_step_count: verifiedStepKeysRef.current.size,
      duration_ms: durationMs,
      face_detection: usingFaceDetector ? "browser_face_detector" : "motion_position_fallback",
      liveness_score: usingFaceDetector ? 88 : 78,
      captured_at: new Date().toISOString(),
    };
    const file = new File([uploadBlob], `liveness-session-${Date.now()}.${extension}`, { type: mimeType });

    setScanStatus("captured");
    setFaceStatus("Liveness evidence captured");
    onFile(file, metadata, fallbackFile);
    finishInProgressRef.current = false;
  }, [captureStillBlob, onFile, revokePreview, stopCamera, stopRecorder, usingFaceDetector]);

  useEffect(() => {
    if (scanStatus !== "scanning" || !cameraReady) return undefined;

    stepStartedAtRef.current = performance.now();
    setStepProgress(0);

    let cancelled = false;
    const timer = window.setInterval(() => {
      void (async () => {
        if (cancelled) return;

        const faceCheck = await inspectFace();
        if (cancelled) return;

        const elapsed = performance.now() - stepStartedAtRef.current;
        setStepProgress(Math.min(100, Math.round((elapsed / livenessSteps[currentStep].durationMs) * 100)));

        if (!faceCheck.ok) {
          setCameraError(faceCheck.message);
          stepStartedAtRef.current = performance.now();
          return;
        }

        setCameraError("");

        if (elapsed < livenessSteps[currentStep].durationMs) return;

        if (currentStep >= livenessSteps.length - 1) {
          await finishLivenessScan();
          return;
        }

        setCurrentStep((step) => Math.min(step + 1, livenessSteps.length - 1));
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [cameraReady, currentStep, finishLivenessScan, inspectFace, scanStatus]);

  const startFaceScan = async () => {
    setCameraError("");
    setCameraReady(false);
    setCurrentStep(0);
    setStepProgress(0);
    setFaceStatus("Requesting camera access");
    setScanStatus("requesting");
    finishInProgressRef.current = false;
    resetLivenessChecks();
    revokePreview();
    setPreviewUrl("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available in this browser.");
      setScanStatus("idle");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          height: { ideal: 720 },
          width: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      scanStartedAtRef.current = Date.now();
      startRecorder(stream);
      setCameraActive(true);
      setScanStatus("scanning");
    } catch {
      setCameraError("Cannot access camera. Allow camera permission and try again.");
      setScanStatus("idle");
      resetLivenessChecks();
      stopCamera();
    }
  };

  const activeStep = livenessSteps[currentStep];
  const canStart = !uploading && scanStatus !== "requesting" && scanStatus !== "scanning" && scanStatus !== "processing";

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">
        Complete the guided liveness challenge with the front camera. A short evidence video is saved with the KYC review.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-slate-950">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  onCanPlay={() => {
                    setCameraReady(true);
                    setCameraError("");
                  }}
                  onLoadedMetadata={() => {
                    void attachStreamToVideo();
                  }}
                  className="h-full w-full scale-x-[-1] object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-[72%] w-[58%] rounded-[48%] border-2 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.28)]" />
                </div>
                <div className="absolute inset-x-4 top-4 rounded-2xl bg-slate-950/70 px-4 py-3 text-center text-white backdrop-blur">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">{activeStep.label}</div>
                  <div className="mt-1 text-lg font-semibold">{activeStep.prompt}</div>
                </div>
              </>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Captured face scan" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-300">
                Start guided scan to open the front camera.
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={analysisCanvasRef} className="hidden" />
          </div>
          {scanStatus === "scanning" || scanStatus === "processing" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{faceStatus}</span>
                <span className="text-gray-500">
                  {currentStep + 1}/{livenessSteps.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${stepProgress}%` }} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {livenessSteps.map((step, index) => (
                  <div
                    key={step.key}
                    className={`h-1.5 rounded-full ${
                      verifiedStepKeys.includes(step.key) ? "bg-green-600" : index === currentStep ? "bg-amber-400" : "bg-gray-200"
                    }`}
                    title={step.label}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {cameraError ? <p className="text-sm text-red-600">{cameraError}</p> : null}
          {cameraActive && !cameraReady && !cameraError ? <p className="text-sm text-gray-500">Starting camera...</p> : null}
          <div className="flex flex-wrap gap-3">
            {scanStatus === "scanning" || scanStatus === "requesting" || scanStatus === "processing" ? (
              <>
                <Button className="rounded-full bg-green-600 px-5 text-white hover:bg-green-700" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {scanStatus === "processing" ? "Processing evidence" : "Scanning"}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={cancelFaceScan} disabled={uploading || scanStatus === "processing"}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button className="rounded-full bg-green-600 px-5 text-white hover:bg-green-700" disabled={!canStart} onClick={startFaceScan}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selfieLivenessUrl || previewUrl ? "Retake guided scan" : "Start guided scan"}
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
          <div>
            <div className="text-gray-500">Face scan status</div>
            <div className={selfieLivenessUrl ? "font-semibold text-emerald-700" : "font-semibold text-gray-700"}>
              {uploading
                ? "Uploading evidence..."
                : scanStatus === "processing"
                  ? "Processing evidence"
                  : selfieLivenessUrl
                    ? "Captured and stored"
                    : scanStatus === "scanning"
                      ? "Scanning"
                      : "Not captured"}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Challenge</div>
            <div className="font-semibold text-gray-700">{verifiedStepKeys.length}/{livenessSteps.length} verified</div>
          </div>
          <div>
            <div className="text-gray-500">Face detection</div>
            <div className="font-semibold text-gray-700">{usingFaceDetector ? "FaceDetector" : "Motion check"}</div>
          </div>
          <div>
            <div className="text-gray-500">Liveness session</div>
            <div className="break-all font-mono text-xs text-gray-700">{livenessSessionId || "Pending capture"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
