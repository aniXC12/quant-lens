import { describe, expect, it } from "vitest";
import { DRIVER_OPTIONS } from "@/lib/f1-drivers";

describe("DRIVER_OPTIONS", () => {
  it("contains the official 2025 standings field", () => {
    expect(DRIVER_OPTIONS).toHaveLength(21);
  });

  it("maps each driver to a team accent color and season ranking", () => {
    for (const driver of DRIVER_OPTIONS) {
      expect(driver.driver.length).toBeGreaterThan(0);
      expect(driver.team.length).toBeGreaterThan(0);
      expect(driver.accent).toMatch(/^#/);
      expect(driver.seasonRank).toBeGreaterThan(0);
      expect(driver.seasonPoints).toBeGreaterThanOrEqual(0);
    }
  });
});
