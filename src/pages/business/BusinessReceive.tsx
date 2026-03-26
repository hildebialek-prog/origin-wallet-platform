import { BusinessFeaturePage, businessFeatures } from "@/pages/business/business-content";

const BusinessReceive = () => {
  const feature = businessFeatures.find((item) => item.id === "receive");

  if (!feature) {
    return null;
  }

  return <BusinessFeaturePage feature={feature} />;
};

export default BusinessReceive;
