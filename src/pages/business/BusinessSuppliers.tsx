import { BusinessFeaturePage, businessFeatures } from "@/pages/business/business-content";

const BusinessSuppliers = () => {
  const feature = businessFeatures.find((item) => item.id === "suppliers");

  if (!feature) {
    return null;
  }

  return <BusinessFeaturePage feature={feature} />;
};

export default BusinessSuppliers;
