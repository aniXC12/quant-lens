import { describe, expect, it } from "vitest";
import { buildRacePredictorLeaderboard } from "@/lib/f1-race-predictor";

describe("buildRacePredictorLeaderboard", () => {
  it("returns a ranked leaderboard for the current 2025 driver field", () => {
    const leaderboard = buildRacePredictorLeaderboard({
      raceId: "great-britain",
      currentLap: 24,
      weather: "dry",
      safetyCarLikely: false,
      historicalData: null,
    });

    expect(leaderboard).toHaveLength(21);
    expect(leaderboard[0]?.raceScore).toBeGreaterThanOrEqual(
      leaderboard[1]?.raceScore ?? 0,
    );
    expect(leaderboard[0]?.driver.seasonRank).toBeLessThanOrEqual(5);
  });

  it("reacts to a late-race safety-car scenario", () => {
    const safetyCar = buildRacePredictorLeaderboard({
      raceId: "great-britain",
      currentLap: 24,
      weather: "dry",
      safetyCarLikely: true,
      historicalData: null,
    });
    expect(
      safetyCar.some((entry) =>
        entry.strategy.strategyAlertTitle.includes("Safety car"),
      ),
    ).toBe(true);
  });
});
