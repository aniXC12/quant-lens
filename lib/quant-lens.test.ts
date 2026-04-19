import { describe, expect, it } from "vitest";

import {
  analyzeQuantLensData,
  attachSectorContext,
  compareQuantLensAnalyses,
  type InstitutionalOwnershipData,
  type NewsHeadline,
  type PricePoint,
  type QuoteFundamentals,
} from "@/lib/quant-lens";

function makeHistory(prices: number[], baseVolume: number): PricePoint[] {
  return prices.map((close, index) => ({
    close,
    volume: baseVolume + index * 1000,
    timestamp: 1_700_000_000 + index * 86_400,
  }));
}

const quote: QuoteFundamentals = {
  symbol: "TEST",
  shortName: "Test Corp",
  currency: "USD",
  exchange: "NASDAQ",
  sector: "Technology",
  price: 100,
  changePercent: 0.01,
  marketCap: 5_000_000_000,
  trailingPe: 20,
  fiftyTwoWeekLow: 70,
  fiftyTwoWeekHigh: 130,
  shortPercentOfFloat: 0.14,
  daysToCover: 6.2,
  nextEarningsDate: null,
  daysUntilEarnings: null,
};

describe("analyzeQuantLensData", () => {
  it("produces a buy-leaning setup for persistent upward trends", () => {
    const prices = Array.from({ length: 100 }, (_, index) => 50 + index * 0.8);
    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_000_000));

    expect(analysis.momentum.score).toBeGreaterThan(0.2);
    expect(analysis.volatilityAdjusted.score).toBeGreaterThan(0);
    expect(["Buy", "Hold"]).toContain(analysis.recommendation);
  });

  it("produces a sell-leaning setup for persistent downward trends", () => {
    const prices = Array.from({ length: 100 }, (_, index) => 130 - index * 0.7);
    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 900_000));

    expect(analysis.momentum.score).toBeLessThan(-0.2);
    expect(analysis.volatilityAdjusted.score).toBeLessThan(0);
    expect(["Sell", "Hold"]).toContain(analysis.recommendation);
  });

  it("flags stretched conditions through mean reversion", () => {
    const prices = [
      ...Array.from({ length: 90 }, (_, index) => 100 + Math.sin(index / 8)),
      108,
      110,
      112,
      114,
      116,
      118,
      120,
      122,
      124,
      126,
    ];
    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_100_000));

    expect(analysis.meanReversion.score).toBeLessThan(0);
    expect(analysis.meanReversion.explanation).toContain("20-day average");
  });

  it("throws when there is not enough history", () => {
    expect(() =>
      analyzeQuantLensData(quote, makeHistory(Array.from({ length: 20 }, () => 100), 500_000)),
    ).toThrow("Not enough price history");
  });

  it("compares two analyses and identifies the stronger setup", () => {
    const stronger = analyzeQuantLensData(
      { ...quote, symbol: "AAA", shortName: "Alpha Co" },
      makeHistory(Array.from({ length: 100 }, (_, index) => 80 + index * 0.95), 1_300_000),
    );
    const weaker = analyzeQuantLensData(
      { ...quote, symbol: "BBB", shortName: "Beta Co" },
      makeHistory(Array.from({ length: 100 }, (_, index) => 130 - index * 0.5), 850_000),
    );

    const comparison = compareQuantLensAnalyses(stronger, weaker);

    expect(comparison.winner.symbol).toBe("AAA");
    expect(comparison.loser.symbol).toBe("BBB");
    expect(comparison.convictionGap).toBeGreaterThanOrEqual(0);
    expect(comparison.explanation).toContain("AAA");
  });

  it("adds sector context relative to a benchmark proxy", () => {
    const stock = analyzeQuantLensData(
      { ...quote, symbol: "NVDA", shortName: "Nvidia Proxy", sector: "Technology" },
      makeHistory(Array.from({ length: 100 }, (_, index) => 90 + index * 1.05), 1_400_000),
    );
    const sectorProxy = analyzeQuantLensData(
      { ...quote, symbol: "XLK", shortName: "Technology ETF", sector: "Technology" },
      makeHistory(Array.from({ length: 100 }, (_, index) => 95 + index * 0.5), 950_000),
    );

    const enriched = attachSectorContext(
      stock,
      sectorProxy,
      "XLK",
      "Technology Select Sector SPDR Fund",
    );

    expect(enriched.sectorContext?.benchmarkSymbol).toBe("XLK");
    expect(enriched.sectorContext?.sectorName).toBe("Technology");
    expect(enriched.sectorContext?.explanation).toContain("sector");
  });

  it("builds signal history and reliability stats", () => {
    const prices = [
      ...Array.from({ length: 120 }, (_, index) => 80 + index * 0.55),
      146,
      143,
      147,
      149,
      145,
      151,
      154,
      152,
      156,
      159,
    ];
    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_000_000));

    expect(analysis.signalHistory.length).toBeGreaterThan(20);
    expect(analysis.signalHistory.at(-1)?.momentum).toBeTypeOf("number");
    expect(analysis.signalReliability.explanation.length).toBeGreaterThan(20);
  });

  it("produces a distinct stress scenario with conviction change", () => {
    const prices = Array.from({ length: 140 }, (_, index) => 60 + index * 0.75);
    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_150_000));

    expect(analysis.stressTest.stressed.convictionScore).toBeGreaterThanOrEqual(0);
    expect(analysis.stressTest.explanation).toContain("20%");
    expect(analysis.stressTest.stressed.recommendation).toMatch(/Buy|Hold|Sell/);
  });

  it("summarizes recent insider buying activity", () => {
    const prices = Array.from({ length: 140 }, (_, index) => 60 + index * 0.65);
    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_150_000), [
      {
        filerName: "Jane Executive",
        relation: "CEO",
        transactionType: "Buy",
        shares: 25000,
        value: 2_500_000,
        date: "2026-03-01",
      },
      {
        filerName: "John Director",
        relation: "Director",
        transactionType: "Purchase",
        shares: 15000,
        value: 1_450_000,
        date: "2026-02-20",
      },
    ]);

    expect(analysis.insiderActivity?.sentiment).toBe("Buying");
    expect(analysis.insiderActivity?.buyCount).toBe(2);
    expect(analysis.insiderActivity?.explanation.toLowerCase()).toContain("executives");
  });

  it("scores short squeeze probability from short interest and momentum", () => {
    const prices = Array.from({ length: 140 }, (_, index) => 40 + index * 0.9);
    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_250_000));

    expect(analysis.shortSqueeze?.probabilityScore).toBeGreaterThan(0);
    expect(analysis.shortSqueeze?.sentiment).toMatch(/Low|Moderate|High/);
    expect(analysis.shortSqueeze?.explanation.toLowerCase()).toContain("short");
  });

  it("flags conflicting news sentiment against a bullish momentum setup", () => {
    const prices = Array.from({ length: 140 }, (_, index) => 45 + index * 0.85);
    const headlines: NewsHeadline[] = [
      {
        title: "Test Corp faces lawsuit as analysts warn of weak demand",
        link: "https://example.com/1",
        publishedAt: "2026-04-15T12:00:00Z",
      },
      {
        title: "Test Corp stock drops after downgrade and profit warning",
        link: "https://example.com/2",
        publishedAt: "2026-04-14T12:00:00Z",
      },
    ];

    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_150_000), [], headlines);

    expect(analysis.newsSentiment?.alignment).toBe("Conflicting");
    expect(analysis.newsSentiment?.sentiment).toBe("Negative");
    expect(analysis.newsSentiment?.explanation.toLowerCase()).toContain("risk");
  });

  it("summarizes rising institutional ownership", () => {
    const prices = Array.from({ length: 140 }, (_, index) => 55 + index * 0.8);
    const ownership: InstitutionalOwnershipData = {
      currentPercentHeld: 0.71,
      previousQuarterPercentHeld: 0.69,
      twoQuartersAgoPercentHeld: 0.65,
      trend: "Rising",
    };

    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_100_000), [], [], ownership);

    expect(analysis.institutionalOwnership?.trend).toBe("Rising");
    expect(analysis.institutionalOwnership?.summary.toLowerCase()).toContain("trending higher");
    expect(analysis.institutionalOwnership?.explanation.toLowerCase()).toContain("institutions");
  });

  it("flags near-term earnings as a catalyst risk to momentum", () => {
    const prices = Array.from({ length: 140 }, (_, index) => 55 + index * 0.9);
    const daysUntilEarnings = 5;
    const nextEarningsDate = new Date(Date.now() + daysUntilEarnings * 86_400_000).toISOString();

    const analysis = analyzeQuantLensData(
      {
        ...quote,
        nextEarningsDate,
        daysUntilEarnings,
      },
      makeHistory(prices, 1_200_000),
    );

    expect(analysis.earningsCatalyst?.hasUpcomingEarnings).toBe(true);
    expect(analysis.earningsCatalyst?.riskLevel).toBe("High");
    expect(analysis.earningsCatalyst?.summary.toLowerCase()).toContain("next week");
    expect(analysis.earningsCatalyst?.explanation.toLowerCase()).toContain("waiting");
    expect(analysis.tradeTiming.verdict).toBe("Wait For Earnings");
    expect(analysis.tradeTiming.score).toBeLessThan(7);
  });

  it("produces a trade timing read even when there is no near-term event risk", () => {
    const prices = [
      ...Array.from({ length: 110 }, (_, index) => 70 + index * 0.42),
      115,
      114.5,
      115.8,
      116.2,
      116.6,
      117.1,
      117.7,
      118.1,
      118.4,
      118.9,
      119.3,
      119.7,
      120.1,
      120.6,
      121,
      121.4,
      121.9,
      122.2,
      122.7,
      123.1,
      123.6,
      124,
      124.4,
      124.9,
      125.3,
      125.7,
      126.1,
      126.5,
      127,
    ];

    const analysis = analyzeQuantLensData(quote, makeHistory(prices, 1_050_000));

    expect(analysis.recommendation).toMatch(/Buy|Hold/);
    expect(analysis.tradeTiming.score).toBeGreaterThanOrEqual(1);
    expect(analysis.tradeTiming.score).toBeLessThanOrEqual(10);
    expect(analysis.tradeTiming.verdict).not.toBe("Wait For Earnings");
    expect(analysis.tradeTiming.explanation.length).toBeGreaterThan(40);
  });
});
