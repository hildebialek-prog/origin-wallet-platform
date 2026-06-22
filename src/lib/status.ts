const successStatuses = new Set(["active", "approved", "confirmed", "verified"]);
const warningStatuses = new Set(["pending", "submitted", "under_review", "needs_more_info"]);
const dangerStatuses = new Set(["failed", "rejected", "suspended"]);

const verifiedKycStatuses = new Set(["approved", "verified"]);
const lockedKycStatuses = new Set(["approved", "verified", "submitted", "under_review", "needs_more_info"]);
const openKycRequirementStatuses = new Set(["required", "open", "pending", "needs_more_info", "requested", "rejected"]);

export type SemanticStatus = "success" | "warning" | "danger" | "neutral";

export const normalizeStatus = (status?: string | null) => String(status ?? "").trim().toLowerCase();

export const formatStatusLabel = (status?: string | null, fallback = "not started") => {
  const normalized = normalizeStatus(status);
  return normalized ? normalized.replace(/_/g, " ") : fallback;
};

export const isVerifiedKycStatus = (status?: string | null) => verifiedKycStatuses.has(normalizeStatus(status));

export const isLockedKycStatus = (status?: string | null) => lockedKycStatuses.has(normalizeStatus(status));

export const isOpenKycRequirementStatus = (status?: string | null) =>
  openKycRequirementStatuses.has(normalizeStatus(status));

export const getSemanticStatus = (status?: string | null): SemanticStatus => {
  const normalized = normalizeStatus(status);

  if (successStatuses.has(normalized)) {
    return "success";
  }

  if (warningStatuses.has(normalized)) {
    return "warning";
  }

  if (dangerStatuses.has(normalized)) {
    return "danger";
  }

  return "neutral";
};
