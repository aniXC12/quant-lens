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
      gapBehindSeconds: 4.2,
      isLeading: true,
      safetyCarLikely: false,
    });

    expect(result.windowStart).toBeNull();
    expect(result.windowLabel).toContain("Stay out");
    expect(result.stopTypeLabel).toBe("Extend stint");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(62);
    expect(result.strategyAlertTitle).toContain("Overcut");
  });

  it("calls for an immediate stop when the tire is beyond the critical range", () => {
    const result = getPitStopRecommendation({
      currentLap: 29,
      totalLaps: 57,
      compound: "soft",
      tireAge: 16,
      weather: "dry",
      gapBehindSeconds: 1.4,
      isLeading: false,
      safetyCarLikely: false,
    });

    expect(result.windowStart).toBe(29);
    expect(result.stopTypeLabel).toBe("Immediate stop");
    expect(result.riskLabel).toBe("High");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(result.strategyAlertTitle).toContain("Undercut");
  });

  it("tightens the window in wet conditions", () => {
    const result = getPitStopRecommendation({
      currentLap: 18,
      totalLaps: 52,
      compound: "medium",
      tireAge: 10,
      weather: "wet",
      gapBehindSeconds: 3.5,
      isLeading: false,
      safetyCarLikely: false,
    });

    expect(result.windowStart).toBeGreaterThanOrEqual(18);
    expect(result.windowEnd).toBeLessThan(31);
    expect(result.reasoning).toContain("wet");
    expect(result.confidenceScore).toBeLessThanOrEqual(89);
  });

  it("shows a positive betting implication for a manageable late no-stop run", () => {
    const result = getPitStopRecommendation({
      currentLap: 46,
      totalLaps: 53,
      compound: "hard",
      tireAge: 19,
      weather: "dry",
      gapBehindSeconds: 5,
      isLeading: true,
      safetyCarLikely: false,
    });

    expect(result.positionDelta).toBeGreaterThanOrEqual(1);
    expect(result.finishOddsLabel).toContain("improving");
    expect(result.bettingValueScore).toBeGreaterThanOrEqual(6);
  });

  it("shows a negative betting implication for a forced defensive stop", () => {
    const result = getPitStopRecommendation({
      currentLap: 31,
      totalLaps: 57,
      compound: "soft",
      tireAge: 17,
      weather: "wet",
      gapBehindSeconds: 1.7,
      isLeading: false,
      safetyCarLikely: false,
    });

    expect(result.positionDelta).toBeLessThan(0);
    expect(result.bettingSignal).toContain("lose");
    expect(result.bettingValueScore).toBeLessThanOrEqual(5);
  });

  it("recalculates strategy when a safety car is likely soon", () => {
    const normal = getPitStopRecommendation({
      currentLap: 24,
      totalLaps: 57,
      compound: "hard",
      tireAge: 15,
      weather: "dry",
      gapBehindSeconds: 3.8,
      isLeading: false,
      safetyCarLikely: false,
    });

    const safetyCar = getPitStopRecommendation({
      currentLap: 24,
      totalLaps: 57,
      compound: "hard",
      tireAge: 15,
      weather: "dry",
      gapBehindSeconds: 3.8,
      isLeading: false,
      safetyCarLikely: true,
    });

    expect(safetyCar.windowLabel).not.toBe(normal.windowLabel);
    expect(safetyCar.strategyAlertTitle).toContain("Safety car");
    expect(safetyCar.bettingValueScore).toBeGreaterThanOrEqual(normal.bettingValueScore);
  });
});
