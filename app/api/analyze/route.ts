import { NextResponse } from "next/server";

import {
  analyzeQuantLensData,
  attachSectorContext,
  compareQuantLensAnalyses,
  type InstitutionalOwnershipData,
  type InsiderTransaction,
  type NewsHeadline,
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
      defaultKeyStatistics?: {
        shortPercentOfFloat?: { raw?: number };
        shortRatio?: { raw?: number };
      };
      calendarEvents?: {
        earnings?: {
          earningsDate?: Array<{ raw?: number; fmt?: string }>;
        };
      };
      majorHoldersBreakdown?: {
        institutionsPercentHeld?: { raw?: number };
      };
      institutionOwnership?: {
        ownershipList?: Array<{
          reportDate?: { raw?: number; fmt?: string };
          pctHeld?: { raw?: number };
        }>;
      };
      assetProfile?: {
        sector?: string;
      };
      insiderTransactions?: {
        transactions?: Array<{
          startDate?: { raw?: number; fmt?: string };
          filerName?: string;
          filerRelation?: string;
          transactionText?: string;
          shares?: { raw?: number };
          sharesText?: string;
          value?: { raw?: number };
          moneyText?: string;
        }>;
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

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "User-Agent": "Mozilla/5.0 QuantLens/1.0",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`News request failed with status ${response.status}.`);
  }

  return response.text();
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
  const earningsDates =
    result?.calendarEvents?.earnings?.earningsDate
      ?.map((entry) => entry.raw)
      .filter((value): value is number => value != null && Number.isFinite(value))
      .sort((left, right) => left - right) ?? [];
  const nowSeconds = Date.now() / 1000;
  const nextEarningsTimestamp = earningsDates.find((value) => value >= nowSeconds) ?? null;
  const daysUntilEarnings =
    nextEarningsTimestamp == null
      ? null
      : Math.max(0, Math.ceil((nextEarningsTimestamp - nowSeconds) / 86_400));

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
    shortPercentOfFloat:
      result?.defaultKeyStatistics?.shortPercentOfFloat?.raw ?? null,
    daysToCover: result?.defaultKeyStatistics?.shortRatio?.raw ?? null,
    nextEarningsDate:
      nextEarningsTimestamp == null
        ? null
        : new Date(nextEarningsTimestamp * 1000).toISOString(),
    daysUntilEarnings,
  };
}

function parseNumericText(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseInsiderTransactions(data: YahooQuoteSummaryResponse): InsiderTransaction[] {
  const transactions =
    data.quoteSummary?.result?.[0]?.insiderTransactions?.transactions ?? [];
  const cutoffSeconds = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;

  return transactions
    .flatMap((transaction) => {
      const rawDate = transaction.startDate?.raw;

      if (!rawDate || rawDate < cutoffSeconds) {
        return [];
      }

      const shares = transaction.shares?.raw ?? parseNumericText(transaction.sharesText);
      const value = transaction.value?.raw ?? parseNumericText(transaction.moneyText);

      return [
        {
          filerName: transaction.filerName ?? "Unknown insider",
          relation: transaction.filerRelation ?? "Executive",
          transactionType: transaction.transactionText ?? "Unknown",
          shares,
          value,
          date:
            transaction.startDate?.fmt ??
            new Date(rawDate * 1000).toISOString().slice(0, 10),
        },
      ];
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function parseNewsHeadlines(xml: string): NewsHeadline[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return items.slice(0, 10).flatMap((item) => {
    const title = extractTag(item, "title");
    const link = extractTag(item, "link");
    const publishedAt = extractTag(item, "pubDate");

    if (!title || !link) {
      return [];
    }

    return [{ title, link, publishedAt }];
  });
}

function parseInstitutionalOwnership(
  data: YahooQuoteSummaryResponse,
): InstitutionalOwnershipData | null {
  const result = data.quoteSummary?.result?.[0];
  const currentPercentHeld =
    result?.majorHoldersBreakdown?.institutionsPercentHeld?.raw ?? null;
  const ownershipList = result?.institutionOwnership?.ownershipList ?? [];

  const byQuarter = new Map<number, number>();
  ownershipList.forEach((entry) => {
    const reportDate = entry.reportDate?.raw;
    const pctHeld = entry.pctHeld?.raw;

    if (!reportDate || pctHeld == null) {
      return;
    }

    byQuarter.set(reportDate, (byQuarter.get(reportDate) ?? 0) + pctHeld);
  });

  const sortedDates = [...byQuarter.keys()].sort((left, right) => right - left);
  const previousQuarterPercentHeld =
    sortedDates.length > 0 ? (currentPercentHeld ?? byQuarter.get(sortedDates[0]) ?? null) : null;
  const twoQuartersAgoPercentHeld =
    sortedDates.length > 1 ? byQuarter.get(sortedDates[1]) ?? null : null;

  const trend: InstitutionalOwnershipData["trend"] =
    previousQuarterPercentHeld == null || twoQuartersAgoPercentHeld == null
      ? "Unknown"
      : previousQuarterPercentHeld - twoQuartersAgoPercentHeld > 0.003
        ? "Rising"
        : previousQuarterPercentHeld - twoQuartersAgoPercentHeld < -0.003
          ? "Falling"
          : "Flat";

  if (currentPercentHeld == null && previousQuarterPercentHeld == null && twoQuartersAgoPercentHeld == null) {
    return null;
  }

  return {
    currentPercentHeld,
    previousQuarterPercentHeld,
    twoQuartersAgoPercentHeld,
    trend,
  };
}

async function fetchAnalysis(ticker: string): Promise<QuantLensAnalysis> {
  const [historyResponse, summaryResponse, newsXml] = await Promise.all([
    fetchJson<YahooChartResponse>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y&includePrePost=false`,
    ),
    fetchJson<YahooQuoteSummaryResponse>(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail,defaultKeyStatistics,calendarEvents,majorHoldersBreakdown,institutionOwnership,assetProfile,insiderTransactions`,
    ),
    fetchText(`https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(ticker)}`),
  ]);

  const history = parseHistory(historyResponse);
  const quote = parseQuote(ticker, summaryResponse);
  const insiderTransactions = parseInsiderTransactions(summaryResponse);
  const newsHeadlines = parseNewsHeadlines(newsXml);
  const institutionalOwnership = parseInstitutionalOwnership(summaryResponse);

  return analyzeQuantLensData(
    quote,
    history,
    insiderTransactions,
    newsHeadlines,
    institutionalOwnership,
  );
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
