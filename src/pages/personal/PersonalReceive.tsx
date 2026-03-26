import { PersonalFeaturePage, personalFeatures } from "@/pages/personal/personal-content";

const PersonalReceive = () => {
  const feature = personalFeatures.find((item) => item.id === "receive");

  if (!feature) {
    return null;
  }

  return <PersonalFeaturePage feature={feature} />;
};

export default PersonalReceive;
