import { RACE_OPTIONS_2025 } from "@/lib/f1-races";

export type HistoricalDriverRace = {
  driverId: string;
  localDriverId: string | null;
  driverName: string;
  team: string;
  finishPosition: number | null;
  gridPosition: number | null;
  lapsCompleted: number | null;
  status: string;
  pitStops: number;
  firstPitLap: number | null;
  averagePitLap: number | null;
  actualPitLaps: number[];
};

export type HistoricalRaceSummary = {
  round: number;
  raceId: string;
  raceName: string;
  date: string | null;
  completed: boolean;
  winnerLaps: number | null;
  totalPitStops: number;
  avgPitStops: number;
  medianFirstPitLap: number | null;
  strategyTrend: string;
  drivers: HistoricalDriverRace[];
};

export type HistoricalSeasonData = {
  season: number;
  source: string;
  fetchedAt: string;
  races: HistoricalRaceSummary[];
};

export type HistoricalRaceProfile = {
  completed: boolean;
  raceName: string;
  winnerLaps: number | null;
  avgPitStops: number;
  medianFirstPitLap: number | null;
  strategyTrend: string;
  driverFinishPosition: number | null;
  driverPitStops: number | null;
  driverFirstPitLap: number | null;
  driverPitLaps: number[];
};

const ERGAST_TO_LOCAL_DRIVER_ID: Record<string, string> = {
  norris: "lando-norris",
  piastri: "oscar-piastri",
  leclerc: "charles-leclerc",
  hamilton: "lewis-hamilton",
  max_verstappen: "max-verstappen",
  lawson: "liam-lawson",
  russell: "george-russell",
  antonelli: "kimi-antonelli",
  alonso: "fernando-alonso",
  stroll: "lance-stroll",
  tsunoda: "yuki-tsunoda",
  hadjar: "isack-hadjar",
  bearman: "oliver-bearman",
  ocon: "esteban-ocon",
  gasly: "pierre-gasly",
  doohan: "jack-doohan",
  albon: "alex-albon",
  sainz: "carlos-sainz",
  hulkenberg: "nico-hulkenberg",
  bortoleto: "gabriel-bortoleto",
};

export function buildHistoricalRaceProfile(
  seasonData: HistoricalSeasonData | null,
  raceId: string,
  localDriverId: string,
): HistoricalRaceProfile | null {
  if (!seasonData) {
    return null;
  }

  const selectedRace = RACE_OPTIONS_2025.find((race) => race.id === raceId);

  if (!selectedRace) {
    return null;
  }

  const historicalRace = seasonData.races.find(
    (race) => race.round === selectedRace.round,
  );

  if (!historicalRace || !historicalRace.completed) {
    return null;
  }

  const driver = historicalRace.drivers.find(
    (entry) => entry.localDriverId === localDriverId,
  );

  return {
    completed: true,
    raceName: historicalRace.raceName,
    winnerLaps: historicalRace.winnerLaps,
    avgPitStops: historicalRace.avgPitStops,
    medianFirstPitLap: historicalRace.medianFirstPitLap,
    strategyTrend: historicalRace.strategyTrend,
    driverFinishPosition: driver?.finishPosition ?? null,
    driverPitStops: driver?.pitStops ?? null,
    driverFirstPitLap: driver?.firstPitLap ?? null,
    driverPitLaps: driver?.actualPitLaps ?? [],
  };
}

export function buildHistoricalRaceSummary({
  round,
  raceName,
  date,
  results,
  pitStops,
}: {
  round: number;
  raceName: string;
  date: string | null;
  results: Array<{
    driverId: string;
    driverName: string;
    team: string;
    finishPosition: number | null;
    gridPosition: number | null;
    lapsCompleted: number | null;
    status: string;
  }>;
  pitStops: Array<{
    driverId: string;
    lap: number | null;
  }>;
}): HistoricalRaceSummary {
  const race = RACE_OPTIONS_2025.find((entry) => entry.round === round);
  const groupedPitStops = new Map<string, number[]>();

  for (const stop of pitStops) {
    if (!stop.driverId || stop.lap == null) {
      continue;
    }

    const existing = groupedPitStops.get(stop.driverId) ?? [];
    existing.push(stop.lap);
    groupedPitStops.set(stop.driverId, existing);
  }

  const drivers: HistoricalDriverRace[] = results.map((result) => {
    const stops = (groupedPitStops.get(result.driverId) ?? []).sort((a, b) => a - b);

    return {
      driverId: result.driverId,
      localDriverId: ERGAST_TO_LOCAL_DRIVER_ID[result.driverId] ?? null,
      driverName: result.driverName,
      team: result.team,
      finishPosition: result.finishPosition,
      gridPosition: result.gridPosition,
      lapsCompleted: result.lapsCompleted,
      status: result.status,
      pitStops: stops.length,
      firstPitLap: stops[0] ?? null,
      averagePitLap:
        stops.length > 0
          ? Math.round(stops.reduce((sum, lap) => sum + lap, 0) / stops.length)
          : null,
      actualPitLaps: stops,
    };
  });

  const totalPitStops = drivers.reduce((sum, driver) => sum + driver.pitStops, 0);
  const avgPitStops =
    drivers.length > 0 ? Number((totalPitStops / drivers.length).toFixed(2)) : 0;
  const medianFirstPitLap = median(
    drivers.map((driver) => driver.firstPitLap).filter(isNumber),
  );
  const winnerLaps =
    drivers
      .filter((driver) => driver.finishPosition === 1)
      .map((driver) => driver.lapsCompleted)
      .find(isNumber) ?? null;

  return {
    round,
    raceId: race?.id ?? `round-${round}`,
    raceName,
    date,
    completed: true,
    winnerLaps,
    totalPitStops,
    avgPitStops,
    medianFirstPitLap,
    strategyTrend: describeStrategyTrend(avgPitStops),
    drivers,
  };
}

function describeStrategyTrend(avgPitStops: number) {
  if (avgPitStops >= 2.2) {
    return "High-degradation multi-stop race";
  }

  if (avgPitStops >= 1.3) {
    return "Two-stop leaning strategy race";
  }

  if (avgPitStops >= 0.7) {
    return "One-stop dominant strategy race";
  }

  return "Low-stop or interrupted race";
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return sorted[middle] ?? null;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
