export type SubdivisionOption = {
  label: string;
  value: string;
};

const subdivisionOptionsByCountry: Record<string, SubdivisionOption[]> = {
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
