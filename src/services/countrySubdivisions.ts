export type SubdivisionOption = {
  label: string;
  value: string;
};

const subdivisionOptionsByCountry: Record<string, SubdivisionOption[]> = {
  HK: [{ label: "Central and Western", value: "HK-HCW" }],
  VN: [
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
