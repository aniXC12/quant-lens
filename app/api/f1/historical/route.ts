import { NextResponse } from "next/server";
import { RACE_OPTIONS_2025 } from "@/lib/f1-races";
import {
  buildHistoricalRaceSummary,
  type HistoricalRaceSummary,
  type HistoricalSeasonData,
} from "@/lib/f1-historical";

const PRIMARY_API_BASE = "http://ergast.com/api/f1";
const FALLBACK_API_BASE = "https://api.jolpi.ca/ergast/f1";

export const revalidate = 86_400;

type ErgastResponse = {
  MRData?: {
    RaceTable?: {
      Races?: ErgastRace[];
    };
  };
};

type ErgastRace = {
  raceName?: string;
  date?: string;
  Results?: ErgastResult[];
  PitStops?: ErgastPitStop[];
};

type ErgastResult = {
  position?: string;
  grid?: string;
  laps?: string;
  status?: string;
  Driver?: {
    driverId?: string;
    givenName?: string;
    familyName?: string;
  };
  Constructor?: {
    name?: string;
  };
};

type ErgastPitStop = {
  driverId?: string;
  lap?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const season = Number(url.searchParams.get("season") ?? "2025");

  try {
    const races = await Promise.all(
      RACE_OPTIONS_2025.map(async (race) => {
        const resultsResponse = await fetchErgastJson(
          `${season}/${race.round}/results.json?limit=100`,
        );
        const raceData = resultsResponse?.MRData?.RaceTable?.Races?.[0];

        if (!raceData || !Array.isArray(raceData.Results) || raceData.Results.length === 0) {
          return null;
        }

        const pitStopsResponse = await fetchErgastJson(
          `${season}/${race.round}/pitstops.json?limit=2000`,
        );
        const pitRaceData = pitStopsResponse?.MRData?.RaceTable?.Races?.[0];
        const pitStops = Array.isArray(pitRaceData?.PitStops)
          ? pitRaceData.PitStops
          : [];

        return buildHistoricalRaceSummary({
          round: race.round,
          raceName: raceData.raceName ?? race.grandPrix,
          date: raceData.date ?? null,
          results: raceData.Results.map((result) => ({
            driverId: String(result.Driver?.driverId ?? ""),
            driverName: `${result.Driver?.givenName ?? ""} ${result.Driver?.familyName ?? ""}`.trim(),
            team: String(result.Constructor?.name ?? ""),
            finishPosition: parseNumber(result.position),
            gridPosition: parseNumber(result.grid),
            lapsCompleted: parseNumber(result.laps),
            status: String(result.status ?? ""),
          })),
          pitStops: pitStops.map((stop) => ({
            driverId: String(stop.driverId ?? ""),
            lap: parseNumber(stop.lap),
          })),
        });
      }),
    );

    const payload: HistoricalSeasonData = {
      season,
      source: "Ergast-compatible API",
      fetchedAt: new Date().toISOString(),
      races: races.filter(isHistoricalRaceSummary),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to fetch historical F1 race data",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function fetchErgastJson(path: string) {
  const endpoints = [PRIMARY_API_BASE, FALLBACK_API_BASE];
  let lastError: Error | null = null;

  for (const baseUrl of endpoints) {
    try {
      const response = await fetch(`${baseUrl}/${path}`, {
        next: { revalidate },
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      return (await response.json()) as ErgastResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown fetch error");
    }
  }

  throw lastError ?? new Error("Failed to fetch Ergast-compatible API");
}

function isHistoricalRaceSummary(
  race: HistoricalRaceSummary | null,
): race is HistoricalRaceSummary {
  return race !== null;
}

function parseNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}
