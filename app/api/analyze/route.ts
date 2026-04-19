import { NextResponse } from "next/server";

import {
  analyzeQuantLensData,
  type PricePoint,
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
    }>;
    error?: { description?: string | null };
  };
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
    price: livePrice,
    changePercent: price?.regularMarketChangePercent?.raw ?? 0,
    marketCap: summary?.marketCap?.raw ?? null,
    trailingPe: summary?.trailingPE?.raw ?? null,
    fiftyTwoWeekLow: summary?.fiftyTwoWeekLow?.raw ?? null,
    fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh?.raw ?? null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTicker = searchParams.get("ticker")?.trim();

  if (!rawTicker) {
    return NextResponse.json({ error: "Please provide a stock ticker." }, { status: 400 });
  }

  const ticker = rawTicker.toUpperCase();

  try {
    const [historyResponse, summaryResponse] = await Promise.all([
      fetchJson<YahooChartResponse>(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo&includePrePost=false`,
      ),
      fetchJson<YahooQuoteSummaryResponse>(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail`,
      ),
    ]);

    const history = parseHistory(historyResponse);
    const quote = parseQuote(ticker, summaryResponse);
    const analysis = analyzeQuantLensData(quote, history);

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze ticker.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
