import { PersonalFeaturePage, personalFeatures } from "@/pages/personal/personal-content";

const PersonalWallet = () => {
  const feature = personalFeatures.find((item) => item.id === "wallet");

  if (!feature) {
    return null;
  }

  return <PersonalFeaturePage feature={feature} />;
};

export default PersonalWallet;
