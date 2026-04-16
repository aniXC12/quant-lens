export type TireCompound = "soft" | "medium" | "hard";
export type WeatherCondition = "dry" | "wet";

export type PitStrategyInput = {
  currentLap: number;
  totalLaps: number;
  compound: TireCompound;
  tireAge: number;
  weather: WeatherCondition;
};

export type PitStrategyRecommendation = {
  windowStart: number | null;
  windowEnd: number | null;
  windowLabel: string;
  windowStartLabel: string;
  windowEndLabel: string;
  stopTypeLabel: string;
  riskLabel: string;
  confidenceScore: number;
  tireLifeUsed: number;
  remainingLaps: number;
  urgencyNote: string;
  extentNote: string;
  reasoning: string;
  keyFactors: string[];
};

const DRY_STINT_LIFE: Record<TireCompound, number> = {
  soft: 18,
  medium: 26,
  hard: 34,
};

const WET_STINT_FACTOR = 0.72;

export function getPitStopRecommendation(
  input: PitStrategyInput,
): PitStrategyRecommendation {
  const totalLaps = clamp(Math.round(input.totalLaps), 2, 90);
  const currentLap = clamp(Math.round(input.currentLap), 1, totalLaps - 1);
  const tireAge = clamp(Math.round(input.tireAge), 0, currentLap - 1);
  const remainingLaps = totalLaps - currentLap;
  const baseLife = DRY_STINT_LIFE[input.compound];
  const adjustedLife =
    input.weather === "wet" ? Math.round(baseLife * WET_STINT_FACTOR) : baseLife;
  const tireLifeUsed = Math.min(
    100,
    Math.round((tireAge / Math.max(adjustedLife, 1)) * 100),
  );
  const lapsAvailable = Math.max(adjustedLife - tireAge, 0);
  const canReachFlag = lapsAvailable >= remainingLaps;
  const riskScore =
    tireAge / adjustedLife +
    (input.weather === "wet" ? 0.18 : 0) +
    pressureByCompound(input.compound);
  const wearState = getWearState(tireAge / adjustedLife);
  const latestLap = Math.min(
    totalLaps - 1,
    currentLap + Math.max(1, adjustedLife - tireAge - safetyBuffer(input.weather)),
  );
  const earliestLap = Math.min(
    latestLap,
    currentLap + earliestOffset(wearState, input.weather),
  );

  if (canReachFlag && tireLifeUsed < 88) {
    const confidenceScore = clamp(
      Math.round(
        70 +
          Math.max(0, 18 - Math.abs(remainingLaps - lapsAvailable)) +
          (input.weather === "dry" ? 6 : 0) -
          tireLifeUsed * 0.08,
      ),
      62,
      96,
    );

    return {
      windowStart: null,
      windowEnd: null,
      windowLabel: "Stay out to the flag",
      windowStartLabel: "No stop needed",
      windowEndLabel: `Lap ${totalLaps}`,
      stopTypeLabel: "Extend stint",
      riskLabel: riskLabelFromScore(riskScore * 0.82),
      confidenceScore,
      tireLifeUsed,
      remainingLaps,
      urgencyNote: "Current degradation profile supports a no-stop finish.",
      extentNote: "Manage pace and protect the fronts through the final phase.",
      reasoning: `Your ${input.compound} tires still project enough life to cover the final ${remainingLaps} laps${input.weather === "wet" ? " despite the extra weather volatility" : ""}. Unless track position demands an aggressive undercut, the cleaner call is to stay out and finish.`,
      keyFactors: [
        `${input.compound[0].toUpperCase()}${input.compound.slice(1)} compound life is still inside a manageable wear band.`,
        `Only ${remainingLaps} laps remain, so the pit loss likely costs more than the tire drop-off.`,
        input.weather === "wet"
          ? "Wet conditions add risk, but the remaining distance is still short enough to avoid a forced stop."
          : "In dry conditions the current stint can be stretched without falling off the cliff immediately.",
      ],
    };
  }

  const confidenceScore = clamp(
    Math.round(
      68 +
        (wearState === "critical" ? 16 : wearState === "managed" ? 10 : 4) +
        Math.max(0, 10 - (latestLap - earliestLap) * 2) +
        (canReachFlag ? 2 : 8) -
        (input.weather === "wet" ? 6 : 0),
    ),
    58,
    95,
  );

  return {
    windowStart: earliestLap,
    windowEnd: latestLap,
    windowLabel:
      earliestLap === currentLap
        ? `Box this lap to lap ${latestLap}`
        : `Pit window: lap ${earliestLap} to ${latestLap}`,
    windowStartLabel: earliestLap === currentLap ? "Box now" : `Lap ${earliestLap}`,
    windowEndLabel: `Lap ${latestLap}`,
    stopTypeLabel:
      earliestLap === currentLap ? "Immediate stop" : canReachFlag ? "Flexible stop" : "Mandatory stop",
    riskLabel:
      earliestLap === currentLap ? "High" : riskLabelFromScore(riskScore),
    confidenceScore,
    tireLifeUsed,
    remainingLaps,
    urgencyNote:
      earliestLap === currentLap
        ? "Degradation is already in the attack zone."
        : "This is the first strong lap to cover the drop-off or undercut.",
    extentNote:
      latestLap - earliestLap <= 2
        ? "The useful window is tight, so delaying further raises the risk sharply."
        : "You have a short extension option, but the crossover point is close.",
    reasoning: buildReasoning({
      compound: input.compound,
      weather: input.weather,
      canReachFlag,
      remainingLaps,
      wearState,
      earliestLap,
      latestLap,
    }),
    keyFactors: [
      `${capitalize(input.compound)} tires are operating in a ${wearState} degradation phase at ${tireAge} laps old.`,
      input.weather === "wet"
        ? "Wet running compresses tire life and rewards earlier, safer crossover calls."
        : "Dry conditions allow a short extension, but the undercut window is now opening.",
      canReachFlag
        ? "You could stretch further on paper, but the pace loss likely outweighs the benefit."
        : `The remaining ${remainingLaps} laps exceed the safe life left in this stint, so a stop is required.`,
    ],
  };
}

function buildReasoning({
  compound,
  weather,
  canReachFlag,
  remainingLaps,
  wearState,
  earliestLap,
  latestLap,
}: {
  compound: TireCompound;
  weather: WeatherCondition;
  canReachFlag: boolean;
  remainingLaps: number;
  wearState: "stable" | "managed" | "critical";
  earliestLap: number;
  latestLap: number;
}) {
  const compoundLabel = capitalize(compound);
  const weatherText =
    weather === "wet"
      ? "the circuit is wet, so degradation and crossover risk rise quickly"
      : "the track is dry, so you can lean on predictable degradation for a short extension";
  const finishText = canReachFlag
    ? "You can theoretically reach the end, but the tire delta is likely to erode lap time before then."
    : `You do not have enough projected tire life to cover the final ${remainingLaps} laps without a stop.`;

  return `${compoundLabel} is in a ${wearState} wear phase and ${weatherText}. ${finishText} The best trade-off is to target laps ${earliestLap} to ${latestLap}, balancing pit-loss timing against the risk of the stint dropping off abruptly.`;
}

function pressureByCompound(compound: TireCompound) {
  if (compound === "soft") {
    return 0.14;
  }

  if (compound === "medium") {
    return 0.08;
  }

  return 0.03;
}

function safetyBuffer(weather: WeatherCondition) {
  return weather === "wet" ? 4 : 2;
}

function earliestOffset(
  wearState: "stable" | "managed" | "critical",
  weather: WeatherCondition,
) {
  if (wearState === "critical") {
    return 0;
  }

  if (wearState === "managed") {
    return weather === "wet" ? 1 : 2;
  }

  return weather === "wet" ? 3 : 5;
}

function getWearState(wearRatio: number) {
  if (wearRatio >= 0.78) {
    return "critical";
  }

  if (wearRatio >= 0.56) {
    return "managed";
  }

  return "stable";
}

function riskLabelFromScore(score: number) {
  if (score >= 1.05) {
    return "High";
  }

  if (score >= 0.78) {
    return "Medium";
  }

  return "Low";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}
