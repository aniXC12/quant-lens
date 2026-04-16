export type TireCompound = "soft" | "medium" | "hard";
export type WeatherCondition = "dry" | "wet";

export type PitStrategyInput = {
  currentLap: number;
  totalLaps: number;
  compound: TireCompound;
  tireAge: number;
  weather: WeatherCondition;
  gapBehindSeconds: number;
  isLeading: boolean;
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
  positionDelta: number;
  positionDeltaLabel: string;
  finishOddsLabel: string;
  bettingSignal: string;
  bettingReasoning: string;
  strategyAlertTitle: string;
  strategyAlertBody: string;
  strategyAlertLevel: "high" | "medium" | "low";
  bettingValueScore: number;
  bettingValueLabel: string;
  bettingValueReasoning: string;
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
  const gapBehindSeconds = clamp(input.gapBehindSeconds, 0, 30);
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
  const bettingView = getBettingView({
    currentLap,
    totalLaps,
    remainingLaps,
    weather: input.weather,
    tireLifeUsed,
    earliestLap,
    latestLap,
    canReachFlag,
    wearState,
  });
  const strategyAlert = getStrategyAlert({
    compound: input.compound,
    gapBehindSeconds,
    isLeading: input.isLeading,
  });

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
    const bettingValue = getBettingValue({
      confidenceScore,
      riskLabel: riskLabelFromScore(riskScore * 0.82),
      positionDelta: bettingView.positionDelta,
      strategyAlertLevel: strategyAlert.level,
    });

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
      positionDelta: bettingView.positionDelta,
      positionDeltaLabel: formatPositionDelta(bettingView.positionDelta),
      finishOddsLabel: bettingView.finishOddsLabel,
      bettingSignal: bettingView.signal,
      bettingReasoning: bettingView.reasoning,
      strategyAlertTitle: strategyAlert.title,
      strategyAlertBody: strategyAlert.body,
      strategyAlertLevel: strategyAlert.level,
      bettingValueScore: bettingValue.score,
      bettingValueLabel: bettingValue.label,
      bettingValueReasoning: bettingValue.reasoning,
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
  const riskLabel =
    earliestLap === currentLap ? "High" : riskLabelFromScore(riskScore);
  const bettingValue = getBettingValue({
    confidenceScore,
    riskLabel,
    positionDelta: bettingView.positionDelta,
    strategyAlertLevel: strategyAlert.level,
  });

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
    riskLabel,
    confidenceScore,
    tireLifeUsed,
    remainingLaps,
    positionDelta: bettingView.positionDelta,
    positionDeltaLabel: formatPositionDelta(bettingView.positionDelta),
    finishOddsLabel: bettingView.finishOddsLabel,
    bettingSignal: bettingView.signal,
    bettingReasoning: bettingView.reasoning,
    strategyAlertTitle: strategyAlert.title,
    strategyAlertBody: strategyAlert.body,
    strategyAlertLevel: strategyAlert.level,
    bettingValueScore: bettingValue.score,
    bettingValueLabel: bettingValue.label,
    bettingValueReasoning: bettingValue.reasoning,
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

function getBettingView({
  currentLap,
  totalLaps,
  remainingLaps,
  weather,
  tireLifeUsed,
  earliestLap,
  latestLap,
  canReachFlag,
  wearState,
}: {
  currentLap: number;
  totalLaps: number;
  remainingLaps: number;
  weather: WeatherCondition;
  tireLifeUsed: number;
  earliestLap: number;
  latestLap: number;
  canReachFlag: boolean;
  wearState: "stable" | "managed" | "critical";
}) {
  const raceProgress = currentLap / totalLaps;
  const tightWindow = latestLap - earliestLap <= 2;
  let positionDelta = 0;

  if (canReachFlag && tireLifeUsed < 70) {
    positionDelta = raceProgress > 0.72 ? 1 : 0;
  } else if (canReachFlag && tireLifeUsed < 88) {
    positionDelta = 0;
  } else if (wearState === "critical") {
    positionDelta = tightWindow ? -2 : -1;
  } else if (wearState === "managed") {
    positionDelta = 1;
  } else {
    positionDelta = 0;
  }

  if (weather === "wet") {
    positionDelta -= 1;
  }

  if (remainingLaps <= 8 && canReachFlag) {
    positionDelta += 1;
  }

  positionDelta = clamp(positionDelta, -3, 3);

  const finishOddsLabel =
    positionDelta >= 2
      ? "Finish odds improving"
      : positionDelta === 1
        ? "Slightly stronger finish odds"
        : positionDelta === 0
          ? "Finish odds mostly stable"
          : positionDelta === -1
            ? "Finish odds under pressure"
            : "Finish odds dropping";

  const signal =
    positionDelta > 0
      ? "Likely to gain track position"
      : positionDelta < 0
        ? "Likely to lose positions"
        : "Likely to hold station";

  const reasoning =
    positionDelta > 0
      ? `The predicted window sets up a cleaner crossover and gives this driver a realistic shot at gaining ${formatPositionDelta(positionDelta)} if rivals pit later or hit higher degradation.`
      : positionDelta < 0
        ? `The recommended stop is defensive rather than attacking, so the likely outcome is ${formatPositionDelta(positionDelta)} as pit loss or late-stint drop-off compresses race finish odds.`
        : "The model sees the strategy as neutral for betting purposes: the call should protect the current result more than it creates a major swing in finishing upside.";

  return {
    positionDelta,
    finishOddsLabel,
    signal,
    reasoning,
  };
}

function formatPositionDelta(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return `${value}`;
}

function getStrategyAlert({
  compound,
  gapBehindSeconds,
  isLeading,
}: {
  compound: TireCompound;
  gapBehindSeconds: number;
  isLeading: boolean;
}) {
  if (gapBehindSeconds <= 2) {
    return {
      title: "Undercut threat",
      body: `A car behind within ${gapBehindSeconds.toFixed(1)}s is close enough to attack an undercut if you delay the stop window.`,
      level: "high" as const,
    };
  }

  if (isLeading && compound === "hard") {
    return {
      title: "Overcut opportunity",
      body: "Leading on the harder tire opens an overcut chance if you extend while rivals switch earlier and rejoin in traffic.",
      level: "medium" as const,
    };
  }

  return {
    title: "Strategy window stable",
    body: "No immediate undercut or overcut trigger is obvious from the current gap and tire-state inputs.",
    level: "low" as const,
  };
}

function getBettingValue({
  confidenceScore,
  riskLabel,
  positionDelta,
  strategyAlertLevel,
}: {
  confidenceScore: number;
  riskLabel: string;
  positionDelta: number;
  strategyAlertLevel: "high" | "medium" | "low";
}) {
  const normalizedConfidence = confidenceScore / 100;
  const riskFactor = riskLabel === "Low" ? 1 : riskLabel === "Medium" ? 0.62 : 0.28;
  const positionFactor = clamp((positionDelta + 3) / 6, 0, 1);
  const alertFactor =
    strategyAlertLevel === "low" ? 1 : strategyAlertLevel === "medium" ? 0.72 : 0.44;
  const negativePositionPenalty = positionDelta < 0 ? Math.abs(positionDelta) * 0.9 : 0;
  const highAlertPenalty = strategyAlertLevel === "high" ? 1.1 : 0;

  const score = clamp(
    Math.round(
      1 +
        (normalizedConfidence * 4.5 +
          riskFactor * 2.4 +
          positionFactor * 2.1 +
          alertFactor * 1.2) -
        negativePositionPenalty -
        highAlertPenalty,
    ),
    1,
    10,
  );

  const label =
    score >= 8
      ? "Strong live-bet value"
      : score >= 6
        ? "Playable live-bet value"
        : score >= 4
          ? "Borderline live-bet value"
          : "Weak live-bet value";

  const reasoning =
    score >= 8
      ? "Confidence is strong, downside risk is contained, and the projected position swing supports a top-3 live bet."
      : score >= 6
        ? "The setup is reasonably attractive, but there is still enough pit-window variance that price discipline matters."
        : score >= 4
          ? "There is some upside, but the risk and position outlook are too mixed to call this a clear top-3 betting spot."
          : "The strategy picture is too unstable or defensive right now to justify a strong live top-3 bet signal.";

  return {
    score,
    label,
    reasoning,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}
