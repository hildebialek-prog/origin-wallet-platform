import { PersonalFeaturePage, personalFeatures } from "@/pages/personal/personal-content";

const PersonalSend = () => {
  const feature = personalFeatures.find((item) => item.id === "send");

  if (!feature) {
    return null;
  }

  return <PersonalFeaturePage feature={feature} />;
};

export default PersonalSend;
