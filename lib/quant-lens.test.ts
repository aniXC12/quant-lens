import { describe, expect, it } from "vitest";

import { analyzeQuantLensData, type PricePoint, type QuoteFundamentals } from "@/lib/quant-lens";

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
  price: 100,
  changePercent: 0.01,
  marketCap: 5_000_000_000,
  trailingPe: 20,
  fiftyTwoWeekLow: 70,
  fiftyTwoWeekHigh: 130,
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
});
