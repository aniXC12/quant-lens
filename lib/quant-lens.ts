export type PricePoint = {
  close: number;
  volume: number;
  timestamp: number;
};

export type QuoteFundamentals = {
  symbol: string;
  shortName: string;
  currency: string;
  exchange: string;
  sector: string | null;
  price: number;
  changePercent: number;
  marketCap: number | null;
  trailingPe: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
};

export type SignalSummary = {
  name: string;
  score: number;
  label: "Bullish" | "Neutral" | "Bearish";
  explanation: string;
};

export type QuantLensAnalysis = {
  symbol: string;
  companyName: string;
  currency: string;
  exchange: string;
  sector: string | null;
  price: number;
  changePercent: number;
  marketCap: number | null;
  trailingPe: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  convictionScore: number;
  recommendation: "Buy" | "Hold" | "Sell";
  sharpeEstimate: number;
  momentum: SignalSummary;
  meanReversion: SignalSummary;
  volatilityAdjusted: SignalSummary;
  risk: string;
  thesis: string;
  sparkline: number[];
  sectorContext: {
    sectorName: string;
    benchmarkSymbol: string;
    benchmarkName: string;
    momentumGap: number;
    meanReversionGap: number;
    volatilityAdjustedGap: number;
    convictionGap: number;
    explanation: string;
    summary: string;
  } | null;
  diagnostics: {
    momentumScore: number;
    meanReversionScore: number;
    volatilityAdjustedScore: number;
    realizedVolatility: number;
    priceVs20DayAverage: number;
    volumeRatio: number;
  };
};

export type QuantLensComparison = {
  left: QuantLensAnalysis;
  right: QuantLensAnalysis;
  winner: QuantLensAnalysis;
  loser: QuantLensAnalysis;
  convictionGap: number;
  signalGaps: {
    momentum: number;
    meanReversion: number;
    volatilityAdjusted: number;
    sharpeEstimate: number;
  };
  explanation: string;
  summary: string;
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percentileLabel(score: number): SignalSummary["label"] {
  if (score >= 0.18) {
    return "Bullish";
  }

  if (score <= -0.18) {
    return "Bearish";
  }

  return "Neutral";
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function describeVolatility(realizedVolatility: number) {
  if (realizedVolatility >= 0.55) {
    return "high";
  }

  if (realizedVolatility >= 0.3) {
    return "elevated";
  }

  return "contained";
}

function buildMomentumExplanation({
  symbol,
  slope20,
  slope60,
  volumeRatio,
  score,
}: {
  symbol: string;
  slope20: number;
  slope60: number;
  volumeRatio: number;
  score: number;
}) {
  const direction =
    score > 0.15
      ? "buyers have had the tape under control"
      : score < -0.15
        ? "sellers have been pressing the stock"
        : "the tape is sending a mixed message";
  const trendLine = `Over the last month, ${symbol} is ${formatPercent(slope20)} versus ${formatPercent(
    slope60,
  )} over the last quarter, so ${direction}.`;
  const volumeLine =
    volumeRatio >= 1
      ? `Volume has been running about ${(volumeRatio * 100).toFixed(0)}% of its recent average, which suggests the move has real participation behind it rather than just thin trading noise.`
      : `Volume is only ${(volumeRatio * 100).toFixed(0)}% of its recent average, which matters because weak participation can make a trend look more durable than it really is.`;

  return `${trendLine} ${volumeLine}`;
}

function buildMeanReversionExplanation({
  symbol,
  deviation,
  zScore,
}: {
  symbol: string;
  deviation: number;
  zScore: number;
}) {
  const stretch =
    deviation > 0
      ? `${symbol} is trading ${formatPercent(deviation)} above its 20-day average`
      : `${symbol} is trading ${formatPercent(deviation)} below its 20-day average`;
  const read =
    Math.abs(zScore) >= 1.5
      ? "That is a meaningful stretch, and names this extended often spend time cooling off or snapping back toward trend."
      : "That is not an extreme dislocation, which means there is less pressure for the stock to mechanically mean-revert right away.";

  return `${stretch}. ${read}`;
}

function buildVolatilityAdjustedExplanation({
  momentumScore,
  meanReversionScore,
  realizedVolatility,
  combinedScore,
}: {
  momentumScore: number;
  meanReversionScore: number;
  realizedVolatility: number;
  combinedScore: number;
}) {
  const volWord = describeVolatility(realizedVolatility);
  const emphasis =
    realizedVolatility >= 0.45
      ? "In a choppier tape, we discount any single signal and focus more on what survives after adjusting for noise."
      : "Because recent volatility is fairly contained, cleaner directional signals deserve a bit more trust.";
  const conclusion =
    combinedScore > 0.12
      ? "Net-net, the risk-adjusted setup still leans constructive."
      : combinedScore < -0.12
        ? "Net-net, the risk-adjusted setup still leans defensive."
        : "Net-net, the risk-adjusted setup looks balanced rather than compelling.";

  return `Momentum is scoring ${momentumScore.toFixed(2)} and mean reversion is scoring ${meanReversionScore.toFixed(
    2,
  )}, with recent volatility running ${volWord} at ${(realizedVolatility * 100).toFixed(1)}% annualized. ${emphasis} ${conclusion}`;
}

function buildRiskNarrative({
  recommendation,
  realizedVolatility,
  priceVs20DayAverage,
  volumeRatio,
}: {
  recommendation: QuantLensAnalysis["recommendation"];
  realizedVolatility: number;
  priceVs20DayAverage: number;
  volumeRatio: number;
}) {
  if (recommendation === "Buy" && priceVs20DayAverage > 0.08) {
    return "The main threat to the long thesis is that the stock is already extended above trend, so even a healthy company-specific story can get interrupted by a sharp air pocket if momentum buyers pause.";
  }

  if (recommendation === "Sell" && priceVs20DayAverage < -0.08) {
    return "The biggest risk to the bearish view is squeeze potential: when a stock is already washed out below trend, it does not take much good news to trigger a violent rebound.";
  }

  if (realizedVolatility >= 0.5) {
    return "The biggest threat right now is regime instability. When realized volatility is this high, clean-looking signals can break quickly because macro headlines start dominating stock-specific behavior.";
  }

  if (volumeRatio < 0.85) {
    return "The main risk is false precision. The recent move has not been backed by especially strong trading volume, which raises the odds that the signal is more optical than fundamental.";
  }

  return "The biggest threat is simply signal decay: the setup is interesting, but not so mispriced that it can absorb a material earnings revision, macro shock, or sentiment reversal without the thesis needing to be refreshed.";
}

function buildInstitutionalThesis({
  companyName,
  recommendation,
  convictionScore,
  momentum,
  meanReversion,
  volatilityAdjusted,
}: {
  companyName: string;
  recommendation: QuantLensAnalysis["recommendation"];
  convictionScore: number;
  momentum: SignalSummary;
  meanReversion: SignalSummary;
  volatilityAdjusted: SignalSummary;
}) {
  return `${companyName} screens as a ${recommendation.toLowerCase()} with ${convictionScore.toFixed(
    1,
  )}/10 conviction because the directional tape, the stock's distance from trend, and the risk-adjusted composite are not fighting each other in a major way. Momentum is ${momentum.label.toLowerCase()}, mean reversion is ${meanReversion.label.toLowerCase()}, and the volatility-adjusted read is ${volatilityAdjusted.label.toLowerCase()}, which together suggest the opportunity is more about disciplined positioning than heroic forecasting. The institutional takeaway is straightforward: respect the signal, size it to the volatility, and stay humble about how quickly the setup can change if price action or participation deteriorates.`;
}

function buildSectorContextSummary({
  symbol,
  sectorName,
  convictionGap,
}: {
  symbol: string;
  sectorName: string;
  convictionGap: number;
}) {
  if (convictionGap > 0.35) {
    return `${symbol} is screening stronger than the average ${sectorName.toLowerCase()} setup right now.`;
  }

  if (convictionGap < -0.35) {
    return `${symbol} is lagging the average ${sectorName.toLowerCase()} tape right now.`;
  }

  return `${symbol} is trading roughly in line with the broader ${sectorName.toLowerCase()} complex right now.`;
}

function buildSectorContextExplanation({
  analysis,
  benchmark,
}: {
  analysis: QuantLensAnalysis;
  benchmark: QuantLensAnalysis;
}) {
  const momentumGap = analysis.momentum.score - benchmark.momentum.score;
  const volatilityAdjustedGap =
    analysis.volatilityAdjusted.score - benchmark.volatilityAdjusted.score;

  const momentumRead =
    momentumGap > 0.12
      ? `${analysis.symbol} has stronger momentum than the sector backdrop, which usually means the stock is attracting incremental capital instead of just getting dragged higher by group beta.`
      : momentumGap < -0.12
        ? `${analysis.symbol} has weaker momentum than the sector backdrop, which is a warning sign because it means money is finding better homes inside the same neighborhood.`
        : `${analysis.symbol}'s momentum is close to the sector backdrop, so the tape is behaving more like a sector passenger than a standout leader.`;

  const rotationRead =
    volatilityAdjustedGap > 0.12
      ? `Its risk-adjusted composite is also better than the sector proxy, so if this is a rotation trade, ${analysis.symbol} looks like one of the cleaner ways to express it.`
      : volatilityAdjustedGap < -0.12
        ? `Its risk-adjusted composite trails the sector proxy, which matters because in rotation markets you usually want the stock that is beating its own group, not just keeping up with it.`
        : `Its risk-adjusted composite is close to the sector proxy, so the thesis depends more on the sector continuing to work than on strong stock-specific separation.`;

  return `${momentumRead} ${rotationRead}`;
}

function describeEdge(gap: number) {
  if (gap >= 2) {
    return "clear";
  }

  if (gap >= 0.9) {
    return "moderate";
  }

  return "narrow";
}

function strongerSignalName(comparison: QuantLensComparison["signalGaps"]) {
  const entries: Array<[string, number]> = [
    ["momentum", Math.abs(comparison.momentum)],
    ["mean reversion", Math.abs(comparison.meanReversion)],
    ["volatility-adjusted composite", Math.abs(comparison.volatilityAdjusted)],
    ["Sharpe estimate", Math.abs(comparison.sharpeEstimate)],
  ];

  entries.sort((left, right) => right[1] - left[1]);
  return entries[0][0];
}

function buildComparisonExplanation(
  winner: QuantLensAnalysis,
  loser: QuantLensAnalysis,
  convictionGap: number,
  signalGaps: QuantLensComparison["signalGaps"],
) {
  const edge = describeEdge(convictionGap);
  const biggestDriver = strongerSignalName(signalGaps);
  const volatilityCall =
    winner.diagnostics.realizedVolatility < loser.diagnostics.realizedVolatility
      ? `${winner.symbol} is also trading with a cleaner volatility profile, which matters because a decent signal is worth more when it is not being drowned out by noise.`
      : `${winner.symbol} wins even without the calmer tape, which tells you the raw signal strength is doing most of the work.`;

  return `${winner.symbol} has the stronger quant case right now with a ${edge} ${convictionGap.toFixed(
    1,
  )}-point conviction edge over ${loser.symbol}. The biggest separator is ${biggestDriver}: ${winner.symbol} has a more favorable mix of momentum, stretch versus trend, and risk-adjusted follow-through, so the setup looks more investable rather than merely interesting. ${volatilityCall}`;
}

function buildComparisonSummary(
  winner: QuantLensAnalysis,
  loser: QuantLensAnalysis,
  convictionGap: number,
) {
  return `${winner.companyName} is the stronger head-to-head idea over ${loser.companyName} by ${convictionGap.toFixed(
    1,
  )} conviction points. If you only wanted one expression of this pair today, the systematic read would rather own ${winner.symbol} than ${loser.symbol}.`;
}

export function analyzeQuantLensData(
  quote: QuoteFundamentals,
  history: PricePoint[],
): QuantLensAnalysis {
  if (history.length < 90) {
    throw new Error("Not enough price history to compute signals.");
  }

  const closes = history.map((point) => point.close);
  const volumes = history.map((point) => point.volume);
  const latestClose = closes.at(-1) ?? quote.price;
  const trailing20 = closes.slice(-20);
  const trailing60 = closes.slice(-60);
  const trailing90 = closes.slice(-90);
  const trailing20Avg = average(trailing20);
  const trailingVolumeAvg = average(volumes.slice(-20));
  const volumeRatio = trailingVolumeAvg === 0 ? 1 : (volumes.at(-1) ?? trailingVolumeAvg) / trailingVolumeAvg;
  const slope20 = trailing20[0] ? latestClose / trailing20[0] - 1 : 0;
  const slope60 = trailing60[0] ? latestClose / trailing60[0] - 1 : 0;
  const deviation = trailing20Avg === 0 ? 0 : latestClose / trailing20Avg - 1;

  const returns = trailing90.slice(1).map((close, index) => close / trailing90[index] - 1);
  const returnStd = standardDeviation(returns);
  const avgReturn = average(returns);
  const realizedVolatility = returnStd * Math.sqrt(252);
  const deviationZScore =
    returnStd === 0 ? 0 : (latestClose - trailing20Avg) / (trailing20Avg * returnStd);

  const momentumRaw = slope20 * 1.1 + slope60 * 0.6 + (volumeRatio - 1) * 0.18;
  const meanReversionRaw = -(deviation * 1.4) - deviationZScore * 0.08;
  const momentumScore = clamp(momentumRaw, -1, 1);
  const meanReversionScore = clamp(meanReversionRaw, -1, 1);
  const trendWeight = clamp(1 - realizedVolatility / 0.8, 0.25, 0.75);
  const meanReversionWeight = 1 - trendWeight;
  const volatilityAdjustedScore = clamp(
    momentumScore * trendWeight + meanReversionScore * meanReversionWeight,
    -1,
    1,
  );

  const directionalAgreement =
    Math.sign(momentumScore || 0) === Math.sign(volatilityAdjustedScore || 0) ? 0.7 : 0.45;
  const convictionScore = clamp(
    Math.abs(volatilityAdjustedScore) * 6 +
      Math.abs(momentumScore) * 2 +
      Math.abs(meanReversionScore) * 1.5 +
      directionalAgreement,
    0,
    10,
  );

  const recommendation: QuantLensAnalysis["recommendation"] =
    volatilityAdjustedScore >= 0.16 && convictionScore >= 5.4
      ? "Buy"
      : volatilityAdjustedScore <= -0.16 && convictionScore >= 5.4
        ? "Sell"
        : "Hold";

  const sharpeEstimate = clamp(
    returnStd === 0 ? 0 : (avgReturn / returnStd) * Math.sqrt(252),
    -3,
    3,
  );

  const momentum: SignalSummary = {
    name: "Momentum",
    score: momentumScore,
    label: percentileLabel(momentumScore),
    explanation: buildMomentumExplanation({
      symbol: quote.symbol,
      slope20,
      slope60,
      volumeRatio,
      score: momentumScore,
    }),
  };

  const meanReversion: SignalSummary = {
    name: "Mean Reversion",
    score: meanReversionScore,
    label: percentileLabel(meanReversionScore),
    explanation: buildMeanReversionExplanation({
      symbol: quote.symbol,
      deviation,
      zScore: deviationZScore,
    }),
  };

  const volatilityAdjusted: SignalSummary = {
    name: "Volatility-Adjusted Composite",
    score: volatilityAdjustedScore,
    label: percentileLabel(volatilityAdjustedScore),
    explanation: buildVolatilityAdjustedExplanation({
      momentumScore,
      meanReversionScore,
      realizedVolatility,
      combinedScore: volatilityAdjustedScore,
    }),
  };

  return {
    symbol: quote.symbol,
    companyName: quote.shortName,
    currency: quote.currency,
    exchange: quote.exchange,
    sector: quote.sector,
    price: latestClose,
    changePercent: quote.changePercent,
    marketCap: quote.marketCap,
    trailingPe: quote.trailingPe,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
    convictionScore,
    recommendation,
    sharpeEstimate,
    momentum,
    meanReversion,
    volatilityAdjusted,
    risk: buildRiskNarrative({
      recommendation,
      realizedVolatility,
      priceVs20DayAverage: deviation,
      volumeRatio,
    }),
    thesis: buildInstitutionalThesis({
      companyName: quote.shortName,
      recommendation,
      convictionScore,
      momentum,
      meanReversion,
      volatilityAdjusted,
    }),
    sparkline: closes.slice(-30),
    sectorContext: null,
    diagnostics: {
      momentumScore,
      meanReversionScore,
      volatilityAdjustedScore,
      realizedVolatility,
      priceVs20DayAverage: deviation,
      volumeRatio,
    },
  };
}

export function attachSectorContext(
  analysis: QuantLensAnalysis,
  benchmark: QuantLensAnalysis,
  benchmarkSymbol: string,
  benchmarkName: string,
): QuantLensAnalysis {
  const sectorName = analysis.sector ?? "Sector";
  const convictionGap = analysis.convictionScore - benchmark.convictionScore;

  return {
    ...analysis,
    sectorContext: {
      sectorName,
      benchmarkSymbol,
      benchmarkName,
      momentumGap: analysis.momentum.score - benchmark.momentum.score,
      meanReversionGap: analysis.meanReversion.score - benchmark.meanReversion.score,
      volatilityAdjustedGap:
        analysis.volatilityAdjusted.score - benchmark.volatilityAdjusted.score,
      convictionGap,
      explanation: buildSectorContextExplanation({ analysis, benchmark }),
      summary: buildSectorContextSummary({
        symbol: analysis.symbol,
        sectorName,
        convictionGap,
      }),
    },
  };
}

export function compareQuantLensAnalyses(
  left: QuantLensAnalysis,
  right: QuantLensAnalysis,
): QuantLensComparison {
  const winner = left.convictionScore >= right.convictionScore ? left : right;
  const loser = winner.symbol === left.symbol ? right : left;
  const convictionGap = Math.abs(left.convictionScore - right.convictionScore);
  const signalGaps = {
    momentum: left.momentum.score - right.momentum.score,
    meanReversion: left.meanReversion.score - right.meanReversion.score,
    volatilityAdjusted: left.volatilityAdjusted.score - right.volatilityAdjusted.score,
    sharpeEstimate: left.sharpeEstimate - right.sharpeEstimate,
  };

  return {
    left,
    right,
    winner,
    loser,
    convictionGap,
    signalGaps,
    explanation: buildComparisonExplanation(winner, loser, convictionGap, signalGaps),
    summary: buildComparisonSummary(winner, loser, convictionGap),
  };
}
