import { describe, expect, it } from "vitest";
import {
  buildHistoricalRaceProfile,
  buildHistoricalRaceSummary,
  type HistoricalSeasonData,
} from "@/lib/f1-historical";

describe("buildHistoricalRaceSummary", () => {
  it("aggregates real race result and pit stop style data", () => {
    const summary = buildHistoricalRaceSummary({
      round: 12,
      raceName: "British Grand Prix",
      date: "2025-07-06",
      results: [
        {
          driverId: "hamilton",
          driverName: "Lewis Hamilton",
          team: "Ferrari",
          finishPosition: 1,
          gridPosition: 2,
          lapsCompleted: 52,
          status: "Finished",
        },
        {
          driverId: "max_verstappen",
          driverName: "Max Verstappen",
          team: "Red Bull Racing",
          finishPosition: 2,
          gridPosition: 1,
          lapsCompleted: 52,
          status: "Finished",
        },
      ],
      pitStops: [
        { driverId: "hamilton", lap: 18 },
        { driverId: "hamilton", lap: 36 },
        { driverId: "max_verstappen", lap: 21 },
      ],
    });

    expect(summary.raceId).toBe("great-britain");
    expect(summary.avgPitStops).toBe(1.5);
    expect(summary.medianFirstPitLap).toBe(20);
    expect(summary.strategyTrend).toContain("Two-stop");
  });
});

describe("buildHistoricalRaceProfile", () => {
  it("finds a driver-specific profile for a completed race", () => {
    const seasonData: HistoricalSeasonData = {
      season: 2025,
      source: "test",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      races: [
        {
          round: 12,
          raceId: "great-britain",
          raceName: "British Grand Prix",
          date: "2025-07-06",
          completed: true,
          winnerLaps: 52,
          totalPitStops: 3,
          avgPitStops: 1.5,
          medianFirstPitLap: 20,
          strategyTrend: "Two-stop leaning strategy race",
          drivers: [
            {
              driverId: "hamilton",
              localDriverId: "lewis-hamilton",
              driverName: "Lewis Hamilton",
              team: "Ferrari",
              finishPosition: 1,
              gridPosition: 2,
              lapsCompleted: 52,
              status: "Finished",
              pitStops: 2,
              firstPitLap: 18,
              averagePitLap: 27,
              actualPitLaps: [18, 36],
            },
          ],
        },
      ],
    };

    const profile = buildHistoricalRaceProfile(
      seasonData,
      "great-britain",
      "lewis-hamilton",
    );

    expect(profile?.completed).toBe(true);
    expect(profile?.driverFinishPosition).toBe(1);
    expect(profile?.medianFirstPitLap).toBe(20);
  });
});
