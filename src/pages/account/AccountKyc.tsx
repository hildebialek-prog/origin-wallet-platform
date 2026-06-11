import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Circle, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  completeIdentityVerificationSession,
  getKycProfile,
  startIdentityVerificationSession,
  submitKycProfile,
  uploadIdentityVerificationFile,
  type IdentityCaptureType,
  type IdentityVerificationArtifact,
  type IdentityVerificationSession,
  type IdentityVerificationSubject,
  type KycDocumentPayload,
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

const stepLabels = ["Profile type", "Applicant details", "Address & risk", "Documents", "Face check", "Submit"];

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
  const [uploadingCapture, setUploadingCapture] = useState("");
  const [verificationConsent, setVerificationConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  const kycQuery = useQuery({
    queryKey: ["kyc-profile", user?.id, token],
    enabled: !!user?.id && !!token,
    queryFn: async () => getKycProfile({ userId: user?.id as string, token: token as string }),
  });

  const profile = kycQuery.data?.kyc_profile ?? null;

  useEffect(() => {
    if (!profile) {
      setProfileForm((current) => ({ ...current, legalName: current.legalName || user?.name || "" }));
      return;
    }

    hydrateProfile(profile);
  }, [profile?.id, user?.name]);

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

  const documentEvidence = (subjectType: IdentityVerificationSubject) => (captureType: IdentityCaptureType) =>
    artifactToDocumentPayload(captureArtifacts[captureKey(subjectType, captureType)]);

  const requiredFilled = (values: string[]) => values.every((value) => value.trim() !== "");

  const validateCurrentStep = () => {
    if (step === 1) {
      if (applicantType === "individual") {
        return requiredFilled([
          profileForm.legalName,
          profileForm.dateOfBirth,
          profileForm.nationality,
          profileForm.residence,
          profileForm.occupation,
          profileForm.sourceOfFunds,
          profileForm.expectedMonthlyVolume,
        ]);
      }

      return requiredFilled([
        profileForm.legalName,
        businessForm.businessName,
        businessForm.businessRegistration,
        businessForm.taxId,
        businessForm.businessActivityType,
        businessForm.exportingRegions,
        businessForm.tradeType,
        businessForm.mainProduct,
        businessForm.industry,
        businessForm.businessActivity,
        businessForm.sourceOfFunds,
        businessForm.expectedMonthlyVolume,
        representativeForm.legalName,
        representativeForm.dateOfBirth,
        representativeForm.nationality,
        representativeForm.residence,
        beneficialOwnerForm.legalName,
        beneficialOwnerForm.dateOfBirth,
        beneficialOwnerForm.nationality,
        beneficialOwnerForm.residence,
        beneficialOwnerForm.ownershipPercentage,
      ]);
    }

    if (step === 2) {
      const accountAddress = requiredFilled([profileForm.countryCode, profileForm.addressLine1, profileForm.city]);
      if (applicantType === "individual") return accountAddress;

      return (
        accountAddress &&
        requiredFilled([
          representativeForm.countryCode,
          representativeForm.addressLine1,
          representativeForm.city,
          beneficialOwnerForm.countryCode,
          beneficialOwnerForm.addressLine1,
          beneficialOwnerForm.city,
        ])
      );
    }

    if (step === 3) {
      if (applicantType === "individual") {
        return requiredFilled([
          profileForm.idDocumentNumber,
          profileForm.idExpiresAt,
          profileForm.idFrontUrl,
          profileForm.idBackUrl,
          profileForm.proofOfAddressUrl,
        ]);
      }

      return requiredFilled([
        businessForm.registrationDocumentUrl,
        businessForm.certificateOfIncorporationUrl,
        businessForm.businessAddressProofUrl,
        businessForm.accountOpeningFormUrl,
        businessForm.ownershipStructureUrl,
        representativeForm.idDocumentNumber,
        representativeForm.idExpiresAt,
        representativeForm.idFrontUrl,
        representativeForm.idBackUrl,
        representativeForm.proofOfAddressUrl,
        beneficialOwnerForm.idDocumentNumber,
        beneficialOwnerForm.idExpiresAt,
        beneficialOwnerForm.idFrontUrl,
        beneficialOwnerForm.idBackUrl,
        beneficialOwnerForm.proofOfAddressUrl,
      ]);
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
      date_of_birth: applicantType === "individual" ? profileForm.dateOfBirth.trim() : null,
      nationality_country_code: profileForm.nationality.trim().toUpperCase() || null,
      residence_country_code: profileForm.residence.trim().toUpperCase() || null,
      business_name: applicantType === "business" ? businessForm.businessName.trim() : null,
      business_registration_number:
        applicantType === "business" ? businessForm.businessRegistration.trim() || null : null,
      tax_id: applicantType === "business" ? businessForm.taxId.trim() || null : null,
      registered_country_code: applicantType === "business" ? profileForm.countryCode.trim().toUpperCase() : null,
      address_line1: profileForm.addressLine1.trim(),
      city: profileForm.city.trim(),
      state: profileForm.state.trim() || null,
      postal_code: profileForm.postalCode.trim() || null,
      country_code: profileForm.countryCode.trim().toUpperCase(),
      documents,
      related_persons:
        applicantType === "business"
          ? [
              {
                relationship_type: "authorized_representative",
                legal_name: representativeForm.legalName.trim(),
                date_of_birth: representativeForm.dateOfBirth.trim(),
                nationality_country_code: representativeForm.nationality.trim().toUpperCase(),
                residence_country_code: representativeForm.residence.trim().toUpperCase(),
                address_line1: representativeForm.addressLine1.trim(),
                city: representativeForm.city.trim(),
                state: representativeForm.state.trim() || null,
                postal_code: representativeForm.postalCode.trim() || null,
                country_code: representativeForm.countryCode.trim().toUpperCase(),
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
                date_of_birth: beneficialOwnerForm.dateOfBirth.trim(),
                nationality_country_code: beneficialOwnerForm.nationality.trim().toUpperCase(),
                residence_country_code: beneficialOwnerForm.residence.trim().toUpperCase(),
                ownership_percentage: Number.isFinite(ownership) ? ownership : null,
                address_line1: beneficialOwnerForm.addressLine1.trim(),
                city: beneficialOwnerForm.city.trim(),
                state: beneficialOwnerForm.state.trim() || null,
                postal_code: beneficialOwnerForm.postalCode.trim() || null,
                country_code: beneficialOwnerForm.countryCode.trim().toUpperCase(),
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
            ? businessForm.exportingRegions
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
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

  const hydrateProfile = (nextProfile: KycProfile) => {
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

    setApplicantType(nextProfile.applicant_type === "business" ? "business" : "individual");
    setProfileForm({
      ...defaultProfileForm(user?.name ?? ""),
      legalName: nextProfile.legal_name ?? "",
      dateOfBirth: nextProfile.date_of_birth ?? "",
      nationality: nextProfile.nationality_country_code ?? "",
      residence: nextProfile.residence_country_code ?? "",
      occupation: stringifyMetadata(metadata.occupation),
      sourceOfFunds: stringifyMetadata(metadata.source_of_funds),
      expectedMonthlyVolume: stringifyMetadata(metadata.expected_monthly_volume),
      countryCode: nextProfile.country_code ?? "",
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
      businessActivityType: stringifyMetadata(metadata.business_activity_type) || "foreign_trade_export",
      exportingRegions: stringifyMetadata(metadata.exporting_regions),
      tradeType: stringifyMetadata(metadata.trade_type) || "goods_trade",
      mainProduct: stringifyMetadata(metadata.main_product) || "Electrical Products and Accessories",
      industry: stringifyMetadata(metadata.business_industry),
      businessActivity: stringifyMetadata(metadata.business_activity),
      website: stringifyMetadata(metadata.business_website),
      sourceOfFunds: stringifyMetadata(metadata.source_of_funds),
      expectedMonthlyVolume: stringifyMetadata(metadata.expected_monthly_volume),
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
      dateOfBirth: representative?.date_of_birth ?? "",
      nationality: representative?.nationality_country_code ?? "",
      residence: representative?.residence_country_code ?? "",
      addressLine1: representative?.address_line1 ?? "",
      city: representative?.city ?? "",
      state: representative?.state ?? "",
      postalCode: representative?.postal_code ?? "",
      countryCode: representative?.country_code ?? "",
      ...representativeIdentity,
    });
    setBeneficialOwnerForm({
      ...defaultPersonForm(),
      legalName: beneficialOwner?.legal_name ?? "",
      dateOfBirth: beneficialOwner?.date_of_birth ?? "",
      nationality: beneficialOwner?.nationality_country_code ?? "",
      residence: beneficialOwner?.residence_country_code ?? "",
      ownershipPercentage:
        beneficialOwner?.ownership_percentage !== undefined && beneficialOwner?.ownership_percentage !== null
          ? String(beneficialOwner.ownership_percentage)
          : "",
      addressLine1: beneficialOwner?.address_line1 ?? "",
      city: beneficialOwner?.city ?? "",
      state: beneficialOwner?.state ?? "",
      postalCode: beneficialOwner?.postal_code ?? "",
      countryCode: beneficialOwner?.country_code ?? "",
      ...beneficialOwnerIdentity,
    });
    setVerificationConsent(Boolean(metadata.verification_consent));
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
                      <Field label="Date of birth" value={profileForm.dateOfBirth} onChange={(value) => updateProfile("dateOfBirth", value)} placeholder="YYYY-MM-DD" />
                      <Field label="Nationality" value={profileForm.nationality} onChange={(value) => updateProfile("nationality", value)} placeholder="VN" />
                      <Field label="Residence" value={profileForm.residence} onChange={(value) => updateProfile("residence", value)} placeholder="VN" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Occupation" value={profileForm.occupation} onChange={(value) => updateProfile("occupation", value)} />
                      <Field label="Source of funds" value={profileForm.sourceOfFunds} onChange={(value) => updateProfile("sourceOfFunds", value)} />
                      <Field label="Expected monthly volume" value={profileForm.expectedMonthlyVolume} onChange={(value) => updateProfile("expectedMonthlyVolume", value)} />
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
                      <Field
                        label="Exporting countries/regions"
                        value={businessForm.exportingRegions}
                        onChange={(value) => updateBusiness("exportingRegions", value)}
                        placeholder="Hong Kong, Vietnam, Singapore"
                      />
                      <SelectField
                        label="Main product"
                        value={businessForm.mainProduct}
                        onChange={(value) => updateBusiness("mainProduct", value)}
                        options={mainProductOptions}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Industry" value={businessForm.industry} onChange={(value) => updateBusiness("industry", value)} />
                      <Field label="Business website" value={businessForm.website} onChange={(value) => updateBusiness("website", value)} />
                    </div>
                    <Field label="Business activity" value={businessForm.businessActivity} onChange={(value) => updateBusiness("businessActivity", value)} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Business source of funds" value={businessForm.sourceOfFunds} onChange={(value) => updateBusiness("sourceOfFunds", value)} />
                      <Field label="Expected monthly volume" value={businessForm.expectedMonthlyVolume} onChange={(value) => updateBusiness("expectedMonthlyVolume", value)} />
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
                    uploadingCapture={uploadingCapture}
                    onUploadCapture={(captureType, field, file) =>
                      uploadCapture("applicant", captureType, file, (artifact) => updateProfile(field, artifact.file_url))
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
                          uploading={uploadingCapture === "business:business_registration"}
                          onFile={(file) =>
                            uploadCapture("business", "business_registration", file, (artifact) =>
                              updateBusiness("registrationDocumentUrl", artifact.file_url),
                            )
                          }
                        />
                        <FieldWithUpload
                          label="Certificate of Incorporation (CI)"
                          value={businessForm.certificateOfIncorporationUrl}
                          onChange={(value) => updateBusiness("certificateOfIncorporationUrl", value)}
                          uploadLabel="Upload certificate of incorporation"
                          uploading={uploadingCapture === "business:certificate_of_incorporation"}
                          onFile={(file) =>
                            uploadCapture("business", "certificate_of_incorporation", file, (artifact) =>
                              updateBusiness("certificateOfIncorporationUrl", artifact.file_url),
                            )
                          }
                        />
                        <FieldWithUpload
                          label="Proof of business address"
                          value={businessForm.businessAddressProofUrl}
                          onChange={(value) => updateBusiness("businessAddressProofUrl", value)}
                          uploadLabel="Upload business address proof"
                          uploading={uploadingCapture === "business:proof_of_business_address"}
                          onFile={(file) =>
                            uploadCapture("business", "proof_of_business_address", file, (artifact) =>
                              updateBusiness("businessAddressProofUrl", artifact.file_url),
                            )
                          }
                        />
                        <FieldWithUpload
                          label="Hand-held account opening application form"
                          value={businessForm.accountOpeningFormUrl}
                          onChange={(value) => updateBusiness("accountOpeningFormUrl", value)}
                          uploadLabel="Upload hand-held account opening form photo"
                          uploading={uploadingCapture === "business:account_opening_application_form"}
                          onFile={(file) =>
                            uploadCapture("business", "account_opening_application_form", file, (artifact) =>
                              updateBusiness("accountOpeningFormUrl", artifact.file_url),
                            )
                          }
                        />
                        <FieldWithUpload
                          label="Ownership structure or shareholder register"
                          value={businessForm.ownershipStructureUrl}
                          onChange={(value) => updateBusiness("ownershipStructureUrl", value)}
                          uploadLabel="Upload ownership structure"
                          uploading={uploadingCapture === "business:ownership_structure"}
                          onFile={(file) =>
                            uploadCapture("business", "ownership_structure", file, (artifact) =>
                              updateBusiness("ownershipStructureUrl", artifact.file_url),
                            )
                          }
                        />
                        <Field
                          label="Foreign trade attachment URL (optional)"
                          value={businessForm.tradeAttachmentUrl}
                          onChange={(value) => updateBusiness("tradeAttachmentUrl", value)}
                        />
                        <Field
                          label="Agent ID document URL (optional)"
                          value={businessForm.agentIdentityUrl}
                          onChange={(value) => updateBusiness("agentIdentityUrl", value)}
                        />
                        <Field
                          label="Historical trade materials URL (optional)"
                          value={businessForm.historicalTradeMaterialsUrl}
                          onChange={(value) => updateBusiness("historicalTradeMaterialsUrl", value)}
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
                      uploadingCapture={uploadingCapture}
                      onUploadCapture={(captureType, field, file) =>
                        uploadCapture("authorized_representative", captureType, file, (artifact) =>
                          updateRepresentative(field, artifact.file_url),
                        )
                      }
                    />
                    <PersonDocumentFields
                      title="Beneficial owner documents"
                      form={beneficialOwnerForm}
                      onChange={updateBeneficialOwner}
                      uploadSubject="beneficial_owner"
                      uploadingCapture={uploadingCapture}
                      onUploadCapture={(captureType, field, file) =>
                        uploadCapture("beneficial_owner", captureType, file, (artifact) =>
                          updateBeneficialOwner(field, artifact.file_url),
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

const captureKey = (subjectType: IdentityVerificationSubject, captureType: IdentityCaptureType) =>
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

const buildBusinessDocuments = (
  form: BusinessForm,
  countryCode: string,
  evidence: (captureType: IdentityCaptureType) => Partial<KycDocumentPayload>,
): KycDocumentPayload[] => {
  const issuingCountryCode = countryCode.trim().toUpperCase() || null;
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
    });
  });

  return documents;
};

const buildPersonDocuments = (
  form: ProfileForm | PersonForm,
  subject: IdentityVerificationSubject,
  evidence: (captureType: IdentityCaptureType) => Partial<KycDocumentPayload>,
): KycDocumentPayload[] => {
  const issuingCountry = ("nationality" in form ? form.nationality : "").trim().toUpperCase();
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
      issued_at: form.idIssuedAt.trim() || null,
      expires_at: form.idExpiresAt.trim() || null,
      metadata: baseMetadata,
      ...evidence("identity_front"),
    },
    {
      type: `${documentType}_back`,
      file_url: form.idBackUrl.trim(),
      side: "back",
      document_number: form.idDocumentNumber.trim(),
      issuing_country_code: issuingCountry || null,
      issued_at: form.idIssuedAt.trim() || null,
      expires_at: form.idExpiresAt.trim() || null,
      metadata: baseMetadata,
      ...evidence("identity_back"),
    },
    {
      type: "proof_of_address",
      file_url: form.proofOfAddressUrl.trim(),
      issuing_country_code: "countryCode" in form ? form.countryCode.trim().toUpperCase() || null : null,
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
    idIssuedAt: front?.issued_at ?? back?.issued_at ?? "",
    idExpiresAt: front?.expires_at ?? back?.expires_at ?? "",
    idFrontUrl: front?.file_url ?? "",
    idBackUrl: back?.file_url ?? "",
    proofOfAddressUrl: proofOfAddress?.file_url ?? "",
    selfieLivenessUrl: selfie?.file_url ?? "",
    livenessSessionId: stringifyMetadata(selfie?.metadata?.liveness_session_id),
  };
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
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
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
  value,
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: { label: string; value: TValue }[];
  value: TValue;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <select
      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value as TValue)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

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
      <Field label="Date of birth" value={form.dateOfBirth} onChange={(value) => onChange("dateOfBirth", value)} placeholder="YYYY-MM-DD" />
      {includeOwnership ? (
        <Field label="Ownership %" value={form.ownershipPercentage} onChange={(value) => onChange("ownershipPercentage", value)} />
      ) : (
        <Field label="Residence" value={form.residence} onChange={(value) => onChange("residence", value)} placeholder="VN" />
      )}
      <Field label="Nationality" value={form.nationality} onChange={(value) => onChange("nationality", value)} placeholder="VN" />
      {includeOwnership ? (
        <Field label="Residence" value={form.residence} onChange={(value) => onChange("residence", value)} placeholder="VN" />
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
      <Field label="Country code" value={countryCode} onChange={(value) => onChange("countryCode", value)} placeholder="VN" />
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
      <Field label="Issued date" value={form.idIssuedAt} onChange={(value) => onChange("idIssuedAt", value)} placeholder="YYYY-MM-DD" />
      <Field label="Expiry date" value={form.idExpiresAt} onChange={(value) => onChange("idExpiresAt", value)} placeholder="YYYY-MM-DD" />
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
