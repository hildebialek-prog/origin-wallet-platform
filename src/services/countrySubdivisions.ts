export type SubdivisionOption = {
  label: string;
  value: string;
};

const subdivisionOptionsByCountry: Record<string, SubdivisionOption[]> = {
  HK: [
    { label: "Central and Western", value: "HK-HCW" },
    { label: "Eastern", value: "HK-HEA" },
    { label: "Southern", value: "HK-HSO" },
    { label: "Wan Chai", value: "HK-HWC" },
    { label: "Kowloon City", value: "HK-KKC" },
    { label: "Kwun Tong", value: "HK-KKT" },
    { label: "Sham Shui Po", value: "HK-KSS" },
    { label: "Wong Tai Sin", value: "HK-KWT" },
    { label: "Yau Tsim Mong", value: "HK-KYT" },
    { label: "Islands", value: "HK-NIS" },
    { label: "Kwai Tsing", value: "HK-NKT" },
    { label: "North", value: "HK-NNO" },
    { label: "Sai Kung", value: "HK-NSK" },
    { label: "Sha Tin", value: "HK-NST" },
    { label: "Tuen Mun", value: "HK-NTM" },
    { label: "Tai Po", value: "HK-NTP" },
    { label: "Tsuen Wan", value: "HK-NTW" },
    { label: "Yuen Long", value: "HK-NYL" },
  ],
  SG: [
    { label: "Central Singapore", value: "SG-01" },
    { label: "North East", value: "SG-02" },
    { label: "North West", value: "SG-03" },
    { label: "South East", value: "SG-04" },
    { label: "South West", value: "SG-05" },
  ],
  VN: [
    { label: "Hanoi", value: "VN-HN" },
    { label: "Ho Chi Minh City", value: "VN-SG" },
    { label: "Phu Yen", value: "VN-70" },
  ],
};

export const getSubdivisionOptions = (countryCode: string): SubdivisionOption[] =>
  subdivisionOptionsByCountry[countryCode.trim().toUpperCase()] ?? [];

export const stateAfterCountryChange = (countryCode: string, currentState: string): string => {
  const options = getSubdivisionOptions(countryCode);

  if (options.length === 0) {
    return "";
  }

  return options.some((option) => option.value === currentState) ? currentState : "";
};
