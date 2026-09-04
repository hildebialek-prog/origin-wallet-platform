import { describe, expect, it } from "vitest";
import { getSubdivisionOptions, stateAfterCountryChange } from "./countrySubdivisions";

describe("country subdivisions", () => {
  it("provides human-readable Vietnam provinces with submitted subdivision codes", () => {
    expect(getSubdivisionOptions("VN")).toEqual(expect.arrayContaining([
      { label: "Phu Yen", value: "VN-70" },
      { label: "Hanoi", value: "VN-HN" },
      { label: "Ho Chi Minh City", value: "VN-SG" },
    ]));
  });

  it("normalizes the selected country code", () => {
    expect(getSubdivisionOptions(" vn ")).toEqual(getSubdivisionOptions("VN"));
  });

  it("clears a state that is invalid for the newly selected country", () => {
    expect(stateAfterCountryChange("VN", "test address")).toBe("");
    expect(stateAfterCountryChange("VN", "VN-70")).toBe("VN-70");
  });

  it("supports free-text countries while clearing a previous country's state on change", () => {
    expect(getSubdivisionOptions("GB")).toEqual([]);
    expect(stateAfterCountryChange("GB", "VN-70")).toBe("");
  });
});
