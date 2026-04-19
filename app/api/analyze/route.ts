import { NextResponse } from "next/server";

import {
  analyzeQuantLensData,
  attachSectorContext,
  compareQuantLensAnalyses,
  type PricePoint,
  type QuantLensAnalysis,
  type QuoteFundamentals,
} from "@/lib/quant-lens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string | null };
  };
};

type YahooQuoteSummaryResponse = {
  quoteSummary?: {
    result?: Array<{
      price?: {
        shortName?: string;
        regularMarketPrice?: { raw?: number };
        regularMarketChangePercent?: { raw?: number };
        currency?: string;
        exchangeName?: string;
      };
      summaryDetail?: {
        marketCap?: { raw?: number };
        trailingPE?: { raw?: number };
        fiftyTwoWeekLow?: { raw?: number };
        fiftyTwoWeekHigh?: { raw?: number };
      };
      assetProfile?: {
        sector?: string;
      };
    }>;
    error?: { description?: string | null };
  };
};

const SECTOR_PROXY_MAP: Record<string, { symbol: string; name: string }> = {
  "Basic Materials": { symbol: "XLB", name: "Materials Select Sector SPDR Fund" },
  "Communication Services": {
    symbol: "XLC",
    name: "Communication Services Select Sector SPDR Fund",
  },
  "Consumer Cyclical": {
    symbol: "XLY",
    name: "Consumer Discretionary Select Sector SPDR Fund",
  },
  "Consumer Defensive": {
    symbol: "XLP",
    name: "Consumer Staples Select Sector SPDR Fund",
  },
  Energy: { symbol: "XLE", name: "Energy Select Sector SPDR Fund" },
  "Financial Services": { symbol: "XLF", name: "Financial Select Sector SPDR Fund" },
  Healthcare: { symbol: "XLV", name: "Health Care Select Sector SPDR Fund" },
  Industrials: { symbol: "XLI", name: "Industrial Select Sector SPDR Fund" },
  RealEstate: { symbol: "XLRE", name: "Real Estate Select Sector SPDR Fund" },
  "Real Estate": { symbol: "XLRE", name: "Real Estate Select Sector SPDR Fund" },
  Technology: { symbol: "XLK", name: "Technology Select Sector SPDR Fund" },
  Utilities: { symbol: "XLU", name: "Utilities Select Sector SPDR Fund" },
};

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 QuantLens/1.0",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Market data request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function parseHistory(data: YahooChartResponse): PricePoint[] {
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const closes = quote?.close ?? [];
  const volumes = quote?.volume ?? [];

  return timestamps.flatMap((timestamp, index) => {
    const close = closes[index];
    const volume = volumes[index];

    if (close == null || volume == null || !Number.isFinite(close) || !Number.isFinite(volume)) {
      return [];
    }

    return [{ timestamp, close, volume }];
  });
}

function parseQuote(symbol: string, data: YahooQuoteSummaryResponse): QuoteFundamentals {
  const result = data.quoteSummary?.result?.[0];
  const price = result?.price;
  const summary = result?.summaryDetail;
  const livePrice = price?.regularMarketPrice?.raw;

  if (livePrice == null) {
    throw new Error(`Could not load quote data for ${symbol}.`);
  }

  return {
    symbol,
    shortName: price?.shortName ?? symbol,
    currency: price?.currency ?? "USD",
    exchange: price?.exchangeName ?? "Unknown exchange",
    sector: result?.assetProfile?.sector ?? null,
    price: livePrice,
    changePercent: price?.regularMarketChangePercent?.raw ?? 0,
    marketCap: summary?.marketCap?.raw ?? null,
    trailingPe: summary?.trailingPE?.raw ?? null,
    fiftyTwoWeekLow: summary?.fiftyTwoWeekLow?.raw ?? null,
    fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh?.raw ?? null,
  };
}

async function fetchAnalysis(ticker: string): Promise<QuantLensAnalysis> {
  const [historyResponse, summaryResponse] = await Promise.all([
    fetchJson<YahooChartResponse>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo&includePrePost=false`,
    ),
    fetchJson<YahooQuoteSummaryResponse>(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail,assetProfile`,
    ),
  ]);

  const history = parseHistory(historyResponse);
  const quote = parseQuote(ticker, summaryResponse);

  return analyzeQuantLensData(quote, history);
}

async function fetchAnalysisWithSectorContext(
  ticker: string,
  cache: Map<string, Promise<QuantLensAnalysis>>,
): Promise<QuantLensAnalysis> {
  const primary = await fetchAnalysis(ticker);
  const sector = primary.sector;

  if (!sector) {
    return primary;
  }

  const proxy = SECTOR_PROXY_MAP[sector];

  if (!proxy) {
    return primary;
  }

  const benchmarkPromise = cache.get(proxy.symbol) ?? fetchAnalysis(proxy.symbol);
  cache.set(proxy.symbol, benchmarkPromise);
  const benchmark = await benchmarkPromise;

  return attachSectorContext(primary, benchmark, proxy.symbol, proxy.name);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTicker = searchParams.get("ticker")?.trim();
  const rawCompareTo = searchParams.get("compareTo")?.trim();

  if (!rawTicker) {
    return NextResponse.json({ error: "Please provide a stock ticker." }, { status: 400 });
  }

  const ticker = rawTicker.toUpperCase();
  const compareTo = rawCompareTo?.toUpperCase();
  const sectorCache = new Map<string, Promise<QuantLensAnalysis>>();

  try {
    if (compareTo) {
      if (compareTo === ticker) {
        return NextResponse.json(
          { error: "Please choose two different tickers for comparison." },
          { status: 400 },
        );
      }

      const [left, right] = await Promise.all([
        fetchAnalysisWithSectorContext(ticker, sectorCache),
        fetchAnalysisWithSectorContext(compareTo, sectorCache),
      ]);
      const comparison = compareQuantLensAnalyses(left, right);

      return NextResponse.json({ analysis: left, comparison });
    }

    const analysis = await fetchAnalysisWithSectorContext(ticker, sectorCache);

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze ticker.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
