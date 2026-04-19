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
  shortPercentOfFloat: number | null;
  daysToCover: number | null;
  nextEarningsDate: string | null;
  daysUntilEarnings: number | null;
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
  signalHistory: {
    timestamp: number;
    momentum: number;
    meanReversion: number;
    volatilityAdjusted: number;
    recommendation: "Buy" | "Hold" | "Sell";
    price: number;
    forwardReturn10Day: number | null;
  }[];
  signalReliability: {
    buySignals: number;
    sellSignals: number;
    averageBuyReturn10Day: number | null;
    averageSellReturn10Day: number | null;
    explanation: string;
  };
  shortSqueeze: {
    probabilityScore: number;
    shortPercentOfFloat: number | null;
    daysToCover: number | null;
    sentiment: "Low" | "Moderate" | "High";
    summary: string;
    explanation: string;
  } | null;
  newsSentiment: {
    score: number;
    sentiment: "Positive" | "Neutral" | "Negative";
    alignment: "Aligned" | "Conflicting" | "Mixed";
    headlines: Array<NewsHeadline & { sentimentScore: number }>;
    summary: string;
    explanation: string;
  } | null;
  earningsCatalyst: {
    hasUpcomingEarnings: boolean;
    nextEarningsDate: string | null;
    daysUntilEarnings: number | null;
    riskLevel: "Low" | "Moderate" | "High";
    summary: string;
    explanation: string;
  } | null;
  institutionalOwnership: {
    currentPercentHeld: number | null;
    previousQuarterPercentHeld: number | null;
    twoQuartersAgoPercentHeld: number | null;
    trend: "Rising" | "Falling" | "Flat" | "Unknown";
    summary: string;
    explanation: string;
  } | null;
  insiderActivity: {
    sentiment: "Buying" | "Selling" | "Mixed" | "Quiet";
    buyCount: number;
    sellCount: number;
    netShares: number;
    netValue: number;
    latestDate: string | null;
    transactions: Array<{
      filerName: string;
      relation: string;
      transactionType: string;
      shares: number;
      value: number;
      date: string;
    }>;
    summary: string;
    explanation: string;
  } | null;
  stressTest: {
    stressed: {
      convictionScore: number;
      recommendation: "Buy" | "Hold" | "Sell";
      sharpeEstimate: number;
      momentum: SignalSummary;
      meanReversion: SignalSummary;
      volatilityAdjusted: SignalSummary;
      risk: string;
      thesis: string;
      diagnostics: {
        momentumScore: number;
        meanReversionScore: number;
        volatilityAdjustedScore: number;
        realizedVolatility: number;
        priceVs20DayAverage: number;
        volumeRatio: number;
      };
    };
    convictionDelta: number;
    holdsUp: boolean;
    explanation: string;
    thesisShift: string;
  };
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

export type InsiderTransaction = {
  filerName: string;
  relation: string;
  transactionType: string;
  shares: number;
  value: number;
  date: string;
};

export type NewsHeadline = {
  title: string;
  link: string;
  publishedAt: string | null;
};

export type InstitutionalOwnershipData = {
  currentPercentHeld: number | null;
  previousQuarterPercentHeld: number | null;
  twoQuartersAgoPercentHeld: number | null;
  trend: "Rising" | "Falling" | "Flat" | "Unknown";
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
  stressTest: {
    winnerSymbol: string;
    loserSymbol: string;
    convictionGap: number;
    explanation: string;
    summary: string;
  };
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

function averageOrNull(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return average(values);
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
  daysUntilEarnings,
}: {
  recommendation: QuantLensAnalysis["recommendation"];
  realizedVolatility: number;
  priceVs20DayAverage: number;
  volumeRatio: number;
  daysUntilEarnings: number | null;
}) {
  if (daysUntilEarnings != null && daysUntilEarnings >= 0 && daysUntilEarnings <= 7) {
    return "The biggest threat right now is earnings event risk. When a print is this close, guidance and positioning can overwhelm an otherwise clean signal in a single session, so the thesis has less durability than the chart alone suggests.";
  }

  if (daysUntilEarnings != null && daysUntilEarnings >= 0 && daysUntilEarnings <= 21) {
    return "The main risk is that the setup has to survive a nearby earnings catalyst. Even good-looking momentum can get reset quickly when the market is about to reprice the company on fresh numbers and forward guidance.";
  }

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

function buildStressExplanation({
  symbol,
  baseConviction,
  stressedConviction,
  baseRecommendation,
  stressedRecommendation,
}: {
  symbol: string;
  baseConviction: number;
  stressedConviction: number;
  baseRecommendation: QuantLensAnalysis["recommendation"];
  stressedRecommendation: QuantLensAnalysis["recommendation"];
}) {
  const delta = stressedConviction - baseConviction;
  const resilience =
    delta >= -0.75
      ? "The setup holds together reasonably well even after you shock the tape."
      : delta >= -1.75
        ? "The setup softens under stress, but it does not completely break."
        : "The setup is meaningfully less convincing once you force a risk-off regime through it.";
  const recommendationShift =
    baseRecommendation === stressedRecommendation
      ? `The headline recommendation stays ${stressedRecommendation.toLowerCase()}, which tells you the thesis survives the first round of stress testing.`
      : `The headline recommendation flips from ${baseRecommendation.toLowerCase()} to ${stressedRecommendation.toLowerCase()}, which is a sign that the thesis is more regime-dependent than it first appears.`;

  return `Under a modeled 20% market drawdown, ${symbol}'s conviction moves from ${baseConviction.toFixed(
    1,
  )} to ${stressedConviction.toFixed(1)}. ${resilience} ${recommendationShift}`;
}

function buildStressThesisShift({
  companyName,
  baseRecommendation,
  stressedRecommendation,
  stressedVolatility,
}: {
  companyName: string;
  baseRecommendation: QuantLensAnalysis["recommendation"];
  stressedRecommendation: QuantLensAnalysis["recommendation"];
  stressedVolatility: number;
}) {
  const volatilityWord = describeVolatility(stressedVolatility);

  if (baseRecommendation === stressedRecommendation) {
    return `${companyName} still points to a ${stressedRecommendation.toLowerCase()} even in a ${volatilityWord} risk-off tape, so the question becomes sizing discipline rather than whether the thesis survives at all.`;
  }

  return `${companyName} no longer looks like the same trade once volatility turns ${volatilityWord}; what looked attractive in the live tape becomes more fragile when markets de-rate and correlations jump.`;
}

function formatAverageReturn(value: number | null) {
  if (value == null) {
    return "N/A";
  }

  return formatPercent(value);
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

function formatCompactSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function buildInsiderSummary({
  symbol,
  sentiment,
}: {
  symbol: string;
  sentiment: "Buying" | "Selling" | "Mixed" | "Quiet";
}) {
  if (sentiment === "Buying") {
    return `Insiders have been net buyers in ${symbol} over the last 90 days.`;
  }

  if (sentiment === "Selling") {
    return `Insiders have been net sellers in ${symbol} over the last 90 days.`;
  }

  if (sentiment === "Mixed") {
    return `${symbol} has seen both insider buying and selling recently, so the read is mixed rather than directional.`;
  }

  return `There has not been much insider activity in ${symbol} over the last 90 days.`;
}

function buildInsiderExplanation({
  sentiment,
  netShares,
  buyCount,
  sellCount,
  momentumScore,
}: {
  sentiment: "Buying" | "Selling" | "Mixed" | "Quiet";
  netShares: number;
  buyCount: number;
  sellCount: number;
  momentumScore: number;
}) {
  if (sentiment === "Buying" && momentumScore > 0.12) {
    return `This is the cleanest alignment you can ask for: executives are buying their own stock while the tape is already acting well. When insider demand and positive momentum point the same way, the setup usually deserves more respect because both the market and management are leaning constructive at the same time.`;
  }

  if (sentiment === "Buying") {
    return `Executives have been net buyers, with roughly ${formatCompactSigned(
      netShares,
    )} shares accumulated across ${buyCount} recent filings. That does not guarantee upside, but it does tell you the people closest to the business are willing to add risk with their own capital, which makes a fragile-looking setup easier to defend.`;
  }

  if (sentiment === "Selling" && momentumScore > 0.12) {
    return `The tape still looks constructive, but insider selling is a caution flag because management is using strength to lighten up. That does not automatically kill the thesis, yet it does make a momentum signal less comforting than it would be if insiders were buying alongside it.`;
  }

  if (sentiment === "Selling") {
    return `Insiders have been net sellers, with about ${formatCompactSigned(
      netShares,
    )} shares leaving executive hands across ${sellCount} recent filings. In plain English, smart money inside the building is not sending a bullish confirmation signal, so the quant thesis has to stand on the tape alone.`;
  }

  if (sentiment === "Mixed") {
    return `Recent filings show both buying and selling, which usually means the insider read is noise rather than signal. In that case, you should let the quant setup do most of the talking instead of forcing a narrative out of mixed executive behavior.`;
  }

  return `There has not been enough recent insider activity to treat it as a real input. That keeps the thesis cleaner, but it also means you are not getting an extra confidence boost from management buying its own stock.`;
}

function buildShortSqueezeSummary({
  symbol,
  probabilityScore,
}: {
  symbol: string;
  probabilityScore: number;
}) {
  if (probabilityScore >= 70) {
    return `${symbol} has a meaningful short-squeeze setup if the tape keeps pressing higher.`;
  }

  if (probabilityScore >= 45) {
    return `${symbol} has some squeeze potential, but it is not the kind of setup you should assume will automatically go parabolic.`;
  }

  return `${symbol} does not look like a high-probability short-squeeze candidate right now.`;
}

function buildShortSqueezeExplanation({
  symbol,
  probabilityScore,
  shortPercentOfFloat,
  daysToCover,
  momentumScore,
}: {
  symbol: string;
  probabilityScore: number;
  shortPercentOfFloat: number | null;
  daysToCover: number | null;
  momentumScore: number;
}) {
  const shortFloatText =
    shortPercentOfFloat == null ? "unknown short interest" : `${(shortPercentOfFloat * 100).toFixed(1)}% of float sold short`;
  const coverText =
    daysToCover == null ? "unknown days to cover" : `${daysToCover.toFixed(1)} days to cover`;

  if (probabilityScore >= 70) {
    return `${symbol} has ${shortFloatText} and ${coverText}, while momentum is already leaning positive. In plain English, there is enough fuel in the short base that a continued rally could force bearish positioning to unwind quickly, which can turn a decent long into a much sharper move over the next month.`;
  }

  if (probabilityScore >= 45) {
    return `${symbol} has ${shortFloatText} with ${coverText}, so there is some squeeze fuel in the setup. The catch is that momentum is not yet strong enough to make that fuel dangerous on its own, so treat it as upside optionality rather than the core reason to buy the stock.`;
  }

  if (momentumScore > 0.12) {
    return `${symbol} has positive momentum, but the short base is not crowded enough to make a squeeze the main story. That means the thesis should stand on trend strength and fundamentals rather than on the hope of trapped shorts bailing you out.`;
  }

  return `${symbol} does not have the classic ingredients for a squeeze: the short base is manageable and momentum is not forcing bears into a hurry. For a retail investor, the practical takeaway is simple: do not overpay for a squeeze narrative that the data is not really supporting.`;
}

function scoreHeadline(title: string) {
  const normalized = title.toLowerCase();
  const positiveTerms = [
    "beats",
    "beat",
    "surges",
    "surge",
    "jumps",
    "jump",
    "raises",
    "raise",
    "wins",
    "win",
    "growth",
    "strong",
    "upgrades",
    "upgrade",
    "record",
    "expands",
    "bullish",
  ];
  const negativeTerms = [
    "misses",
    "miss",
    "cuts",
    "cut",
    "falls",
    "fall",
    "drops",
    "drop",
    "lawsuit",
    "probe",
    "downgrade",
    "downgrades",
    "weak",
    "warning",
    "slump",
    "decline",
    "loss",
    "risk",
    "recall",
  ];

  let score = 0;
  positiveTerms.forEach((term) => {
    if (normalized.includes(term)) {
      score += 1;
    }
  });
  negativeTerms.forEach((term) => {
    if (normalized.includes(term)) {
      score -= 1;
    }
  });

  return clamp(score, -3, 3);
}

function buildNewsSummary({
  symbol,
  alignment,
}: {
  symbol: string;
  alignment: "Aligned" | "Conflicting" | "Mixed";
}) {
  if (alignment === "Conflicting") {
    return `Recent news flow is fighting the quant signal in ${symbol}, which raises the odds of thesis friction.`;
  }

  if (alignment === "Aligned") {
    return `Recent news flow is moving in the same direction as the quant signal in ${symbol}.`;
  }

  return `Recent news flow around ${symbol} is mixed, so the tape is carrying more of the thesis than the headlines are.`;
}

function buildNewsExplanation({
  alignment,
  sentiment,
  momentumScore,
}: {
  alignment: "Aligned" | "Conflicting" | "Mixed";
  sentiment: "Positive" | "Neutral" | "Negative";
  momentumScore: number;
}) {
  if (alignment === "Conflicting" && momentumScore > 0.12) {
    return `Momentum still looks constructive, but the news tape is leaning negative. A quant desk would read that as a live risk to the thesis: the price trend is asking for follow-through while the fundamental narrative is trying to interrupt it, which is exactly how seemingly strong setups get derailed.`;
  }

  if (alignment === "Conflicting") {
    return `The headlines and the signal stack are not reinforcing each other right now. When news sentiment points one way and the model points another, the right posture is usually smaller size and more humility, because you are effectively betting that price will overpower the narrative.`;
  }

  if (alignment === "Aligned" && sentiment === "Positive") {
    return `This is the clean version of the setup: the quantitative signal and the headline tape are both leaning the same way. In plain English, the market trend is getting help from the story rather than fighting it, which makes the thesis easier to own.`;
  }

  if (alignment === "Aligned" && sentiment === "Negative") {
    return `The news flow is negative and the model agrees, which usually means the tape is correctly digesting a weakening narrative rather than overreacting to one scary headline.`;
  }

  return `The headline tape is not giving a strong directional push either way, so the quant read should carry more weight than the latest burst of financial media noise.`;
}

function formatOwnershipPercent(value: number | null) {
  return value == null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function formatEventDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildEarningsSummary({
  symbol,
  hasUpcomingEarnings,
  daysUntilEarnings,
}: {
  symbol: string;
  hasUpcomingEarnings: boolean;
  daysUntilEarnings: number | null;
}) {
  if (!hasUpcomingEarnings || daysUntilEarnings == null) {
    return `${symbol} does not have a scheduled earnings catalyst inside the next 30 days.`;
  }

  if (daysUntilEarnings <= 7) {
    return `${symbol} reports earnings within the next week, so event risk is now part of the thesis whether you like it or not.`;
  }

  if (daysUntilEarnings <= 14) {
    return `${symbol} has earnings coming up soon, which means the current tape still has to survive a meaningful volatility event.`;
  }

  return `${symbol} has an earnings catalyst on deck inside the next month, but the setup still has some time to work before the event hits.`;
}

function buildEarningsExplanation({
  hasUpcomingEarnings,
  nextEarningsDate,
  daysUntilEarnings,
  momentumScore,
  volatilityAdjustedScore,
  recommendation,
}: {
  hasUpcomingEarnings: boolean;
  nextEarningsDate: string | null;
  daysUntilEarnings: number | null;
  momentumScore: number;
  volatilityAdjustedScore: number;
  recommendation: QuantLensAnalysis["recommendation"];
}) {
  if (!hasUpcomingEarnings || daysUntilEarnings == null) {
    return `There is no scheduled earnings event in the next 30 days, which matters because the current quant read is less likely to be interrupted by a single binary catalyst. In plain English, if the thesis changes from here, it will probably be because the tape itself changes rather than because one management update resets the stock overnight.`;
  }

  const dateText = formatEventDate(nextEarningsDate);

  if (daysUntilEarnings <= 7 && momentumScore > 0.12) {
    return `The next earnings print is scheduled for ${dateText}, just ${daysUntilEarnings} days away. A quant would treat that as a real caution flag: the momentum setup may be valid, but once you are this close to earnings the next move is often dominated by guidance, not by trend persistence, so waiting for the event to clear is usually the cleaner trade.`;
  }

  if (daysUntilEarnings <= 7) {
    return `The next earnings print is scheduled for ${dateText}, just ${daysUntilEarnings} days away. That is close enough that the stock is entering event-volatility territory, so any signal you see today should be treated as provisional rather than durable until the company gives the market a fresh information set.`;
  }

  if (
    daysUntilEarnings <= 21 &&
    recommendation === "Buy" &&
    momentumScore > 0.18 &&
    volatilityAdjustedScore > 0.14
  ) {
    return `The next earnings print is scheduled for ${dateText}, which leaves about ${daysUntilEarnings} days before the binary event. The constructive read still has merit because momentum and the volatility-adjusted composite are both doing enough work on their own, but position sizing matters more than usual since a single earnings miss can invalidate a perfectly good trend signal.`;
  }

  if (daysUntilEarnings <= 21) {
    return `The next earnings print is scheduled for ${dateText}, around ${daysUntilEarnings} days from now. In practice that compresses the shelf life of the signal: unless the setup is unusually strong, a quant would be reluctant to lean too hard before a catalyst that can reset both sentiment and realized volatility in one night.`;
  }

  return `The next earnings print is scheduled for ${dateText}, about ${daysUntilEarnings} days away. That is close enough to keep on the radar, but not so close that it automatically invalidates the current setup yet, which means the thesis can still trade on its own merits as long as you remember there is a volatility deadline approaching.`;
}

function buildInstitutionalOwnershipSummary({
  symbol,
  trend,
}: {
  symbol: string;
  trend: "Rising" | "Falling" | "Flat" | "Unknown";
}) {
  if (trend === "Rising") {
    return `Institutional ownership in ${symbol} has been trending higher over the last two quarters.`;
  }

  if (trend === "Falling") {
    return `Institutional ownership in ${symbol} has been drifting lower over the last two quarters.`;
  }

  if (trend === "Flat") {
    return `Institutional ownership in ${symbol} has been broadly stable over the last two quarters.`;
  }

  return `Institutional ownership trend data for ${symbol} is incomplete, so this read is directional rather than definitive.`;
}

function buildInstitutionalOwnershipExplanation({
  trend,
  currentPercentHeld,
  previousQuarterPercentHeld,
  twoQuartersAgoPercentHeld,
  momentumScore,
}: {
  trend: "Rising" | "Falling" | "Flat" | "Unknown";
  currentPercentHeld: number | null;
  previousQuarterPercentHeld: number | null;
  twoQuartersAgoPercentHeld: number | null;
  momentumScore: number;
}) {
  const currentText = formatOwnershipPercent(currentPercentHeld);
  const previousText = formatOwnershipPercent(previousQuarterPercentHeld);
  const olderText = formatOwnershipPercent(twoQuartersAgoPercentHeld);

  if (trend === "Rising" && momentumScore > 0.12) {
    return `Institutions now hold about ${currentText} of the stock, up from ${olderText} two quarters ago and ${previousText} last quarter. That is the kind of confirmation a quant likes to see: price is acting well and large professional holders are still leaning in, which makes the momentum signal more credible rather than more speculative.`;
  }

  if (trend === "Falling" && momentumScore > 0.12) {
    return `Institutions still hold roughly ${currentText} of the stock, but that ownership has been fading from ${olderText} to ${previousText} to today. In plain English, the tape may look healthy, but the patient capital base is thinning out underneath it, which makes the momentum signal less comfortable than the headline chart suggests.`;
  }

  if (trend === "Rising") {
    return `Institutional ownership has been rising from ${olderText} to ${previousText} to ${currentText}. When bigger money keeps accumulating while the signal stack is in play, it usually tells you the stock is being sponsored rather than simply bounced around by retail flows.`;
  }

  if (trend === "Falling") {
    return `Institutional ownership has been falling from ${olderText} to ${previousText} to ${currentText}. A quant would read that as a soft warning: if large holders are stepping back while the setup is only marginally attractive, the trade has less sponsorship than you would ideally want.`;
  }

  if (trend === "Flat") {
    return `Institutional ownership is roughly stable around ${currentText}. That means institutions are not providing a strong secondary signal either way, so the thesis should lean more heavily on the live momentum and mean-reversion evidence than on holder rotation.`;
  }

  return `Current institutional ownership is about ${currentText}, but the quarter-over-quarter filing history is not clean enough to make a confident trend call. The practical takeaway is that ownership is a secondary input here, not the deciding one.`;
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

function computeSignalSnapshot(closes: number[], volumes: number[], latestIndex: number) {
  if (latestIndex < 59) {
    throw new Error("Not enough history to compute signal snapshot.");
  }

  const trailing20 = closes.slice(latestIndex - 19, latestIndex + 1);
  const trailing60 = closes.slice(latestIndex - 59, latestIndex + 1);
  const trailing90Start = Math.max(0, latestIndex - 89);
  const trailing90 = closes.slice(trailing90Start, latestIndex + 1);
  const trailing20Avg = average(trailing20);
  const trailingVolumeAvg = average(volumes.slice(latestIndex - 19, latestIndex + 1));
  const latestClose = closes[latestIndex];
  const latestVolume = volumes[latestIndex] ?? trailingVolumeAvg;
  const volumeRatio = trailingVolumeAvg === 0 ? 1 : latestVolume / trailingVolumeAvg;
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

  return {
    latestClose,
    volumeRatio,
    slope20,
    slope60,
    deviation,
    deviationZScore,
    realizedVolatility,
    momentumScore,
    meanReversionScore,
    volatilityAdjustedScore,
    convictionScore,
    sharpeEstimate,
    recommendation,
  };
}

function buildStressedSeries(history: PricePoint[]) {
  const stressedCloses: number[] = [];
  const stressedVolumes: number[] = [];
  const closes = history.map((point) => point.close);
  const volumes = history.map((point) => point.volume);
  const start = closes[0];

  stressedCloses[0] = start;
  stressedVolumes[0] = volumes[0] * 1.15;

  for (let index = 1; index < closes.length; index += 1) {
    const baseReturn = closes[index] / closes[index - 1] - 1;
    const ramp = index / Math.max(closes.length - 1, 1);
    const stressedReturn = baseReturn * 1.9 - 0.0032 - ramp * 0.0014;
    const nextClose = stressedCloses[index - 1] * (1 + stressedReturn);
    stressedCloses[index] = Math.max(nextClose, start * 0.42);
    stressedVolumes[index] = volumes[index] * (1.2 + ramp * 0.45);
  }

  const targetLatest = closes.at(-1)! * 0.8;
  const scale = targetLatest / stressedCloses.at(-1)!;

  return {
    closes: stressedCloses.map((close) => close * scale),
    volumes: stressedVolumes,
  };
}

function buildStressTest(
  quote: QuoteFundamentals,
  history: PricePoint[],
  baseAnalysis: Pick<
    QuantLensAnalysis,
    | "convictionScore"
    | "recommendation"
    | "momentum"
    | "meanReversion"
    | "volatilityAdjusted"
    | "diagnostics"
    | "thesis"
    | "risk"
    | "sharpeEstimate"
  >,
) {
  const stressedSeries = buildStressedSeries(history);
  const latestSnapshot = computeSignalSnapshot(
    stressedSeries.closes,
    stressedSeries.volumes,
    stressedSeries.closes.length - 1,
  );
  const momentum: SignalSummary = {
    name: "Momentum",
    score: latestSnapshot.momentumScore,
    label: percentileLabel(latestSnapshot.momentumScore),
    explanation: buildMomentumExplanation({
      symbol: quote.symbol,
      slope20: latestSnapshot.slope20,
      slope60: latestSnapshot.slope60,
      volumeRatio: latestSnapshot.volumeRatio,
      score: latestSnapshot.momentumScore,
    }),
  };
  const meanReversion: SignalSummary = {
    name: "Mean Reversion",
    score: latestSnapshot.meanReversionScore,
    label: percentileLabel(latestSnapshot.meanReversionScore),
    explanation: buildMeanReversionExplanation({
      symbol: quote.symbol,
      deviation: latestSnapshot.deviation,
      zScore: latestSnapshot.deviationZScore,
    }),
  };
  const volatilityAdjusted: SignalSummary = {
    name: "Volatility-Adjusted Composite",
    score: latestSnapshot.volatilityAdjustedScore,
    label: percentileLabel(latestSnapshot.volatilityAdjustedScore),
    explanation: buildVolatilityAdjustedExplanation({
      momentumScore: latestSnapshot.momentumScore,
      meanReversionScore: latestSnapshot.meanReversionScore,
      realizedVolatility: latestSnapshot.realizedVolatility,
      combinedScore: latestSnapshot.volatilityAdjustedScore,
    }),
  };
  const stressed = {
    convictionScore: latestSnapshot.convictionScore,
    recommendation: latestSnapshot.recommendation,
    sharpeEstimate: latestSnapshot.sharpeEstimate,
    momentum,
    meanReversion,
    volatilityAdjusted,
    risk: buildRiskNarrative({
      recommendation: latestSnapshot.recommendation,
      realizedVolatility: latestSnapshot.realizedVolatility,
      priceVs20DayAverage: latestSnapshot.deviation,
      volumeRatio: latestSnapshot.volumeRatio,
      daysUntilEarnings: quote.daysUntilEarnings,
    }),
    thesis: buildInstitutionalThesis({
      companyName: quote.shortName,
      recommendation: latestSnapshot.recommendation,
      convictionScore: latestSnapshot.convictionScore,
      momentum,
      meanReversion,
      volatilityAdjusted,
    }),
    diagnostics: {
      momentumScore: latestSnapshot.momentumScore,
      meanReversionScore: latestSnapshot.meanReversionScore,
      volatilityAdjustedScore: latestSnapshot.volatilityAdjustedScore,
      realizedVolatility: latestSnapshot.realizedVolatility,
      priceVs20DayAverage: latestSnapshot.deviation,
      volumeRatio: latestSnapshot.volumeRatio,
    },
  };
  const convictionDelta = stressed.convictionScore - baseAnalysis.convictionScore;

  return {
    stressed,
    convictionDelta,
    holdsUp:
      convictionDelta >= -1 &&
      (stressed.recommendation === baseAnalysis.recommendation ||
        stressed.recommendation === "Hold"),
    explanation: buildStressExplanation({
      symbol: quote.symbol,
      baseConviction: baseAnalysis.convictionScore,
      stressedConviction: stressed.convictionScore,
      baseRecommendation: baseAnalysis.recommendation,
      stressedRecommendation: stressed.recommendation,
    }),
    thesisShift: buildStressThesisShift({
      companyName: quote.shortName,
      baseRecommendation: baseAnalysis.recommendation,
      stressedRecommendation: stressed.recommendation,
      stressedVolatility: stressed.diagnostics.realizedVolatility,
    }),
  };
}

function buildSignalHistory(closes: number[], volumes: number[], timestamps: number[]) {
  const history: QuantLensAnalysis["signalHistory"] = [];

  for (let index = Math.max(59, closes.length - 90); index < closes.length; index += 1) {
    const snapshot = computeSignalSnapshot(closes, volumes, index);
    const forwardIndex = index + 10;
    const forwardReturn10Day =
      forwardIndex < closes.length ? closes[forwardIndex] / closes[index] - 1 : null;

    history.push({
      timestamp: timestamps[index],
      momentum: snapshot.momentumScore,
      meanReversion: snapshot.meanReversionScore,
      volatilityAdjusted: snapshot.volatilityAdjustedScore,
      recommendation: snapshot.recommendation,
      price: closes[index],
      forwardReturn10Day,
    });
  }

  return history;
}

function buildSignalReliability(
  symbol: string,
  signalHistory: QuantLensAnalysis["signalHistory"],
): QuantLensAnalysis["signalReliability"] {
  const buyReturns = signalHistory
    .filter((point) => point.recommendation === "Buy" && point.forwardReturn10Day != null)
    .map((point) => point.forwardReturn10Day as number);
  const sellReturns = signalHistory
    .filter((point) => point.recommendation === "Sell" && point.forwardReturn10Day != null)
    .map((point) => point.forwardReturn10Day as number);
  const averageBuyReturn10Day = averageOrNull(buyReturns);
  const averageSellReturn10Day = averageOrNull(sellReturns);

  const explanation =
    buyReturns.length === 0 && sellReturns.length === 0
      ? `Over the recent 90-day window, ${symbol} did not generate many high-conviction trigger points, so the signal history is more useful as a regime map than as a hard backtest.`
      : buyReturns.length > 0 && sellReturns.length > 0
        ? `When the model flashed buy on ${symbol}, the next 10 trading days averaged ${formatAverageReturn(
            averageBuyReturn10Day,
          )}. When it flashed sell, the next 10 trading days averaged ${formatAverageReturn(
            averageSellReturn10Day,
          )}, which gives you a quick read on whether the signal has actually had bite instead of just looking elegant on a chart.`
        : buyReturns.length > 0
          ? `Buy triggers on ${symbol} averaged ${formatAverageReturn(
              averageBuyReturn10Day,
            )} over the next 10 trading days. There were not enough recent sell triggers to say much statistically, so treat the chart as a directional check rather than a complete scorecard.`
          : `Sell triggers on ${symbol} averaged ${formatAverageReturn(
              averageSellReturn10Day,
            )} over the next 10 trading days. There were not enough recent buy triggers to say much statistically, so this is more about downside behavior than a full two-sided test.`;

  return {
    buySignals: buyReturns.length,
    sellSignals: sellReturns.length,
    averageBuyReturn10Day,
    averageSellReturn10Day,
    explanation,
  };
}

export function analyzeQuantLensData(
  quote: QuoteFundamentals,
  history: PricePoint[],
  insiderTransactions: InsiderTransaction[] = [],
  newsHeadlines: NewsHeadline[] = [],
  institutionalOwnershipData: InstitutionalOwnershipData | null = null,
): QuantLensAnalysis {
  if (history.length < 90) {
    throw new Error("Not enough price history to compute signals.");
  }

  const closes = history.map((point) => point.close);
  const volumes = history.map((point) => point.volume);
  const timestamps = history.map((point) => point.timestamp);
  const latestSnapshot = computeSignalSnapshot(closes, volumes, closes.length - 1);
  const latestClose = latestSnapshot.latestClose;
  const signalHistory = buildSignalHistory(closes, volumes, timestamps);
  const signalReliability = buildSignalReliability(quote.symbol, signalHistory);

  const momentum: SignalSummary = {
    name: "Momentum",
    score: latestSnapshot.momentumScore,
    label: percentileLabel(latestSnapshot.momentumScore),
    explanation: buildMomentumExplanation({
      symbol: quote.symbol,
      slope20: latestSnapshot.slope20,
      slope60: latestSnapshot.slope60,
      volumeRatio: latestSnapshot.volumeRatio,
      score: latestSnapshot.momentumScore,
    }),
  };

  const meanReversion: SignalSummary = {
    name: "Mean Reversion",
    score: latestSnapshot.meanReversionScore,
    label: percentileLabel(latestSnapshot.meanReversionScore),
    explanation: buildMeanReversionExplanation({
      symbol: quote.symbol,
      deviation: latestSnapshot.deviation,
      zScore: latestSnapshot.deviationZScore,
    }),
  };

  const volatilityAdjusted: SignalSummary = {
    name: "Volatility-Adjusted Composite",
    score: latestSnapshot.volatilityAdjustedScore,
    label: percentileLabel(latestSnapshot.volatilityAdjustedScore),
    explanation: buildVolatilityAdjustedExplanation({
      momentumScore: latestSnapshot.momentumScore,
      meanReversionScore: latestSnapshot.meanReversionScore,
      realizedVolatility: latestSnapshot.realizedVolatility,
      combinedScore: latestSnapshot.volatilityAdjustedScore,
    }),
  };
  const buyCount = insiderTransactions.filter((transaction) =>
    /buy|purchase|acquire/i.test(transaction.transactionType),
  ).length;
  const sellCount = insiderTransactions.filter((transaction) =>
    /sell|sale|dispose/i.test(transaction.transactionType),
  ).length;
  const netShares = insiderTransactions.reduce((sum, transaction) => {
    if (/buy|purchase|acquire/i.test(transaction.transactionType)) {
      return sum + transaction.shares;
    }

    if (/sell|sale|dispose/i.test(transaction.transactionType)) {
      return sum - transaction.shares;
    }

    return sum;
  }, 0);
  const netValue = insiderTransactions.reduce((sum, transaction) => {
    if (/buy|purchase|acquire/i.test(transaction.transactionType)) {
      return sum + transaction.value;
    }

    if (/sell|sale|dispose/i.test(transaction.transactionType)) {
      return sum - transaction.value;
    }

    return sum;
  }, 0);
  const sentiment: NonNullable<QuantLensAnalysis["insiderActivity"]>["sentiment"] =
    buyCount === 0 && sellCount === 0
      ? "Quiet"
      : buyCount > 0 && sellCount === 0
        ? "Buying"
        : sellCount > 0 && buyCount === 0
          ? "Selling"
          : Math.abs(netShares) < 1
            ? "Mixed"
            : netShares > 0
              ? "Buying"
              : "Selling";
  const insiderActivity =
    insiderTransactions.length === 0
      ? null
      : {
          sentiment,
          buyCount,
          sellCount,
          netShares,
          netValue,
          latestDate: insiderTransactions[0]?.date ?? null,
          transactions: insiderTransactions.slice(0, 5),
          summary: buildInsiderSummary({
            symbol: quote.symbol,
            sentiment,
          }),
          explanation: buildInsiderExplanation({
            sentiment,
            netShares,
            buyCount,
            sellCount,
            momentumScore: latestSnapshot.momentumScore,
          }),
        };
  const shortFloat = quote.shortPercentOfFloat ?? 0;
  const daysToCover = quote.daysToCover ?? 0;
  const squeezeProbability = clamp(
    shortFloat * 180 + daysToCover * 5.5 + Math.max(latestSnapshot.momentumScore, 0) * 26,
    0,
    100,
  );
  const shortSqueeze: QuantLensAnalysis["shortSqueeze"] =
    quote.shortPercentOfFloat == null && quote.daysToCover == null
      ? null
      : {
          probabilityScore: squeezeProbability,
          shortPercentOfFloat: quote.shortPercentOfFloat,
          daysToCover: quote.daysToCover,
          sentiment:
            squeezeProbability >= 70
              ? "High"
              : squeezeProbability >= 45
                ? "Moderate"
                : "Low",
          summary: buildShortSqueezeSummary({
            symbol: quote.symbol,
            probabilityScore: squeezeProbability,
          }),
          explanation: buildShortSqueezeExplanation({
            symbol: quote.symbol,
            probabilityScore: squeezeProbability,
            shortPercentOfFloat: quote.shortPercentOfFloat,
            daysToCover: quote.daysToCover,
            momentumScore: latestSnapshot.momentumScore,
          }),
        };
  const scoredHeadlines = newsHeadlines.slice(0, 10).map((headline) => ({
    ...headline,
    sentimentScore: scoreHeadline(headline.title),
  }));
  const averageHeadlineScore = averageOrNull(
    scoredHeadlines.map((headline) => headline.sentimentScore),
  );
  const headlineSentiment: NonNullable<QuantLensAnalysis["newsSentiment"]>["sentiment"] =
    averageHeadlineScore == null
      ? "Neutral"
      : averageHeadlineScore > 0.35
        ? "Positive"
        : averageHeadlineScore < -0.35
          ? "Negative"
          : "Neutral";
  const headlineAlignment: NonNullable<QuantLensAnalysis["newsSentiment"]>["alignment"] =
    headlineSentiment === "Neutral"
      ? "Mixed"
      : (headlineSentiment === "Positive" && latestSnapshot.momentumScore > 0.12) ||
          (headlineSentiment === "Negative" && latestSnapshot.momentumScore < -0.12)
        ? "Aligned"
        : "Conflicting";
  const newsSentiment: QuantLensAnalysis["newsSentiment"] =
    scoredHeadlines.length === 0
      ? null
      : {
          score: clamp(((averageHeadlineScore ?? 0) + 3) * (100 / 6), 0, 100),
          sentiment: headlineSentiment,
          alignment: headlineAlignment,
          headlines: scoredHeadlines,
          summary: buildNewsSummary({
            symbol: quote.symbol,
            alignment: headlineAlignment,
          }),
          explanation: buildNewsExplanation({
            alignment: headlineAlignment,
            sentiment: headlineSentiment,
            momentumScore: latestSnapshot.momentumScore,
          }),
        };
  const hasUpcomingEarnings =
    quote.daysUntilEarnings != null && quote.daysUntilEarnings >= 0 && quote.daysUntilEarnings <= 30;
  const earningsRiskLevel: NonNullable<QuantLensAnalysis["earningsCatalyst"]>["riskLevel"] =
    !hasUpcomingEarnings
      ? "Low"
      : quote.daysUntilEarnings != null && quote.daysUntilEarnings <= 7
        ? "High"
        : quote.daysUntilEarnings != null && quote.daysUntilEarnings <= 21
          ? "Moderate"
          : "Low";
  const earningsCatalyst: QuantLensAnalysis["earningsCatalyst"] =
    quote.nextEarningsDate == null && quote.daysUntilEarnings == null
      ? null
      : {
          hasUpcomingEarnings,
          nextEarningsDate: quote.nextEarningsDate,
          daysUntilEarnings: quote.daysUntilEarnings,
          riskLevel: earningsRiskLevel,
          summary: buildEarningsSummary({
            symbol: quote.symbol,
            hasUpcomingEarnings,
            daysUntilEarnings: quote.daysUntilEarnings,
          }),
          explanation: buildEarningsExplanation({
            hasUpcomingEarnings,
            nextEarningsDate: quote.nextEarningsDate,
            daysUntilEarnings: quote.daysUntilEarnings,
            momentumScore: latestSnapshot.momentumScore,
            volatilityAdjustedScore: latestSnapshot.volatilityAdjustedScore,
            recommendation: latestSnapshot.recommendation,
          }),
        };
  const institutionalOwnership: QuantLensAnalysis["institutionalOwnership"] =
    institutionalOwnershipData == null
      ? null
      : {
          ...institutionalOwnershipData,
          summary: buildInstitutionalOwnershipSummary({
            symbol: quote.symbol,
            trend: institutionalOwnershipData.trend,
          }),
          explanation: buildInstitutionalOwnershipExplanation({
            trend: institutionalOwnershipData.trend,
            currentPercentHeld: institutionalOwnershipData.currentPercentHeld,
            previousQuarterPercentHeld: institutionalOwnershipData.previousQuarterPercentHeld,
            twoQuartersAgoPercentHeld: institutionalOwnershipData.twoQuartersAgoPercentHeld,
            momentumScore: latestSnapshot.momentumScore,
          }),
        };

  const baseAnalysis = {
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
    convictionScore: latestSnapshot.convictionScore,
    recommendation: latestSnapshot.recommendation,
    sharpeEstimate: latestSnapshot.sharpeEstimate,
    momentum,
    meanReversion,
    volatilityAdjusted,
    risk: buildRiskNarrative({
      recommendation: latestSnapshot.recommendation,
      realizedVolatility: latestSnapshot.realizedVolatility,
      priceVs20DayAverage: latestSnapshot.deviation,
      volumeRatio: latestSnapshot.volumeRatio,
      daysUntilEarnings: quote.daysUntilEarnings,
    }),
    thesis: buildInstitutionalThesis({
      companyName: quote.shortName,
      recommendation: latestSnapshot.recommendation,
      convictionScore: latestSnapshot.convictionScore,
      momentum,
      meanReversion,
      volatilityAdjusted,
    }),
    sparkline: closes.slice(-30),
    signalHistory,
    signalReliability,
    shortSqueeze,
    newsSentiment,
    earningsCatalyst,
    institutionalOwnership,
    insiderActivity,
    sectorContext: null,
    diagnostics: {
      momentumScore: latestSnapshot.momentumScore,
      meanReversionScore: latestSnapshot.meanReversionScore,
      volatilityAdjustedScore: latestSnapshot.volatilityAdjustedScore,
      realizedVolatility: latestSnapshot.realizedVolatility,
      priceVs20DayAverage: latestSnapshot.deviation,
      volumeRatio: latestSnapshot.volumeRatio,
    },
  };

  return {
    ...baseAnalysis,
    stressTest: buildStressTest(quote, history, baseAnalysis),
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
  const stressWinner =
    left.stressTest.stressed.convictionScore >= right.stressTest.stressed.convictionScore
      ? left
      : right;
  const stressLoser = stressWinner.symbol === left.symbol ? right : left;
  const stressConvictionGap = Math.abs(
    left.stressTest.stressed.convictionScore - right.stressTest.stressed.convictionScore,
  );

  return {
    left,
    right,
    winner,
    loser,
    convictionGap,
    signalGaps,
    explanation: buildComparisonExplanation(winner, loser, convictionGap, signalGaps),
    summary: buildComparisonSummary(winner, loser, convictionGap),
    stressTest: {
      winnerSymbol: stressWinner.symbol,
      loserSymbol: stressLoser.symbol,
      convictionGap: stressConvictionGap,
      explanation: `${stressWinner.symbol} has the stronger quant case under the stress scenario, leading ${stressLoser.symbol} by ${stressConvictionGap.toFixed(
        1,
      )} conviction points after forcing both names through a 20% market drawdown and higher-volatility tape.`,
      summary: `Under stress, the model would still rather own ${stressWinner.symbol} than ${stressLoser.symbol}.`,
    },
  };
}
