import { describe, expect, it } from "vitest";
import { getPitStopRecommendation } from "@/lib/f1-strategy";

describe("getPitStopRecommendation", () => {
  it("recommends staying out when the tire can comfortably reach the flag", () => {
    const result = getPitStopRecommendation({
      currentLap: 44,
      totalLaps: 50,
      compound: "hard",
      tireAge: 18,
      weather: "dry",
    });

    expect(result.windowStart).toBeNull();
    expect(result.windowLabel).toContain("Stay out");
    expect(result.stopTypeLabel).toBe("Extend stint");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(62);
  });

  it("calls for an immediate stop when the tire is beyond the critical range", () => {
    const result = getPitStopRecommendation({
      currentLap: 29,
      totalLaps: 57,
      compound: "soft",
      tireAge: 16,
      weather: "dry",
    });

    expect(result.windowStart).toBe(29);
    expect(result.stopTypeLabel).toBe("Immediate stop");
    expect(result.riskLabel).toBe("High");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it("tightens the window in wet conditions", () => {
    const result = getPitStopRecommendation({
      currentLap: 18,
      totalLaps: 52,
      compound: "medium",
      tireAge: 10,
      weather: "wet",
    });

    expect(result.windowStart).toBeGreaterThanOrEqual(18);
    expect(result.windowEnd).toBeLessThan(31);
    expect(result.reasoning).toContain("wet");
    expect(result.confidenceScore).toBeLessThanOrEqual(89);
  });
});
