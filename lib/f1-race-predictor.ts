import { DRIVER_OPTIONS, type DriverOption } from "@/lib/f1-drivers";
import {
  buildHistoricalRaceProfile,
  type HistoricalRaceProfile,
  type HistoricalSeasonData,
} from "@/lib/f1-historical";
import { getRace, type RaceOption } from "@/lib/f1-races";
import {
  getPitStopRecommendation,
  type PitStrategyInput,
  type PitStrategyRecommendation,
  type TireCompound,
  type WeatherCondition,
} from "@/lib/f1-strategy";

export type PredictorInput = {
  raceId: string;
  currentLap: number;
  weather: WeatherCondition;
  safetyCarLikely: boolean;
  historicalData: HistoricalSeasonData | null;
};

export type PredictorDriverEntry = {
  driver: DriverOption;
  strategy: PitStrategyRecommendation;
  raceScore: number;
  tireRisk: string;
  reason: string;
  historicalContext: HistoricalRaceProfile | null;
  inferredState: PitStrategyInput;
};

export function buildRacePredictorLeaderboard(
  input: PredictorInput,
): PredictorDriverEntry[] {
  const race = getRace(input.raceId);

  return DRIVER_OPTIONS.map((driver) => {
    const historicalContext = buildHistoricalRaceProfile(
      input.historicalData,
      race.id,
      driver.id,
    );
    const inferredState = inferDriverState({
      driver,
      race,
      currentLap: input.currentLap,
      weather: input.weather,
      safetyCarLikely: input.safetyCarLikely,
      historicalContext,
    });
    const strategy = getPitStopRecommendation({
      ...inferredState,
      historicalContext,
    });
    const raceScore = getRaceScore({ driver, strategy, historicalContext });

    return {
      driver,
      strategy,
      raceScore,
      tireRisk: strategy.riskLabel,
      reason: buildRankingReason({ driver, strategy, historicalContext }),
      historicalContext,
      inferredState,
    };
  }).sort((left, right) => right.raceScore - left.raceScore);
}

function inferDriverState({
  driver,
  race,
  currentLap,
  weather,
  safetyCarLikely,
  historicalContext,
}: {
  driver: DriverOption;
  race: RaceOption;
  currentLap: number;
  weather: WeatherCondition;
  safetyCarLikely: boolean;
  historicalContext: HistoricalRaceProfile | null;
}): PitStrategyInput {
  const totalLaps = race.laps;
  const normalizedLap = clamp(Math.round(currentLap), 1, totalLaps);
  const medianFirstPitLap =
    historicalContext?.medianFirstPitLap ?? Math.max(12, Math.round(totalLaps * 0.34));
  const expectedStops =
    historicalContext?.avgPitStops != null && historicalContext.avgPitStops >= 1.45
      ? 2
      : 1;
  const phaseSplit = Math.max(
    medianFirstPitLap + 6,
    Math.round((medianFirstPitLap + totalLaps) / 2),
  );
  const compound = inferCompound({
    normalizedLap,
    medianFirstPitLap,
    phaseSplit,
    expectedStops,
    driver,
  });
  const stintStartLap =
    normalizedLap <= medianFirstPitLap
      ? 1
      : expectedStops > 1 && normalizedLap > phaseSplit
        ? phaseSplit
        : medianFirstPitLap;
  const tireAge = clamp(
    normalizedLap - stintStartLap + 1 + rankBias(driver.seasonRank, -2, 3),
    1,
    50,
  );
  const gapBehindSeconds = clamp(
    0.8 +
      driver.seasonRank * 0.22 +
      (historicalContext?.driverFinishPosition != null
        ? historicalContext.driverFinishPosition * 0.05
        : 0) +
      hashDriver(driver.id) * 0.9,
    0,
    10,
  );

  return {
    currentLap: normalizedLap,
    totalLaps,
    compound,
    tireAge,
    weather,
    gapBehindSeconds: Number(gapBehindSeconds.toFixed(1)),
    isLeading: driver.seasonRank <= 2,
    safetyCarLikely,
  };
}

function inferCompound({
  normalizedLap,
  medianFirstPitLap,
  phaseSplit,
  expectedStops,
  driver,
}: {
  normalizedLap: number;
  medianFirstPitLap: number;
  phaseSplit: number;
  expectedStops: number;
  driver: DriverOption;
}): TireCompound {
  if (normalizedLap <= medianFirstPitLap) {
    return driver.seasonRank <= 6 ? "medium" : "soft";
  }

  if (expectedStops > 1 && normalizedLap > phaseSplit) {
    return driver.seasonRank <= 8 ? "soft" : "medium";
  }

  return "hard";
}

function getRaceScore({
  driver,
  strategy,
  historicalContext,
}: {
  driver: DriverOption;
  strategy: PitStrategyRecommendation;
  historicalContext: HistoricalRaceProfile | null;
}) {
  const pointsShare = driver.seasonPoints / 423;
  const confidenceShare = strategy.confidenceScore / 100;
  const bettingShare = strategy.bettingValueScore / 10;
  const positionShare = clamp((strategy.positionDelta + 3) / 6, 0, 1);
  const riskPenalty =
    strategy.riskLabel === "High" ? 0.11 : strategy.riskLabel === "Medium" ? 0.05 : 0;
  const historicalBonus =
    historicalContext?.driverFinishPosition != null
      ? clamp((12 - historicalContext.driverFinishPosition) / 12, 0, 0.22)
      : historicalContext?.avgPitStops != null
        ? clamp((2.4 - historicalContext.avgPitStops) / 10, 0, 0.08)
        : 0;

  return Math.round(
    (pointsShare * 0.42 +
      bettingShare * 0.24 +
      confidenceShare * 0.18 +
      positionShare * 0.12 +
      historicalBonus -
      riskPenalty) *
      100,
  );
}

function buildRankingReason({
  driver,
  strategy,
  historicalContext,
}: {
  driver: DriverOption;
  strategy: PitStrategyRecommendation;
  historicalContext: HistoricalRaceProfile | null;
}) {
  const historicalLine =
    historicalContext?.driverFinishPosition != null
      ? `with a past ${historicalContext.raceName} finish of P${historicalContext.driverFinishPosition}`
      : "without a circuit-specific finish boost";

  if (strategy.bettingValueScore >= 8 && strategy.riskLabel !== "High") {
    return `${driver.driver} ranks high because the pit window is clean, the tire risk is controlled, and the live bet profile stays strong ${historicalLine}.`;
  }

  if (strategy.riskLabel === "High") {
    return `${driver.driver} drops because the current tires are already in a risky zone, forcing a sharper pit call and weakening the top-3 path.`;
  }

  if (strategy.positionDelta < 0) {
    return `${driver.driver} is held back because this strategy snapshot points toward losing track position rather than building toward the podium.`;
  }

  return `${driver.driver} sits in the middle because the strategy outlook is stable, but the race score still trails the strongest podium profiles ${historicalLine}.`;
}

function rankBias(rank: number, min: number, max: number) {
  return clamp(Math.round((rank - 11) / 4), min, max);
}

function hashDriver(value: string) {
  let hash = 0;

  for (const char of value) {
    hash = (hash + char.charCodeAt(0)) % 10;
  }

  return hash / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
