import { describe, expect, it } from "vitest";
import { RACE_OPTIONS_2025 } from "@/lib/f1-races";

describe("RACE_OPTIONS_2025", () => {
  it("contains the full 2025 official race calendar", () => {
    expect(RACE_OPTIONS_2025).toHaveLength(24);
    expect(RACE_OPTIONS_2025[0]?.grandPrix).toBe("Australian Grand Prix");
    expect(RACE_OPTIONS_2025[23]?.grandPrix).toBe("Abu Dhabi Grand Prix");
  });

  it("stores a lap count for every race", () => {
    for (const race of RACE_OPTIONS_2025) {
      expect(race.laps).toBeGreaterThan(40);
    }
  });
});
