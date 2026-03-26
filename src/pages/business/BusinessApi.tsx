import { BusinessFeaturePage, businessFeatures } from "@/pages/business/business-content";

const BusinessApi = () => {
  const feature = businessFeatures.find((item) => item.id === "api");

  if (!feature) {
    return null;
  }

  return <BusinessFeaturePage feature={feature} />;
};

export default BusinessApi;
