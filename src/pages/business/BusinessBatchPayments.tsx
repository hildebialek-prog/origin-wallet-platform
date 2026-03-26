import { BusinessFeaturePage, businessFeatures } from "@/pages/business/business-content";

const BusinessBatchPayments = () => {
  const feature = businessFeatures.find((item) => item.id === "batch-payments");

  if (!feature) {
    return null;
  }

  return <BusinessFeaturePage feature={feature} />;
};

export default BusinessBatchPayments;
