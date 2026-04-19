"use client";

import { motion } from "framer-motion";
import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";

import type { QuantLensAnalysis, QuantLensComparison } from "@/lib/quant-lens";

type Mode = "single" | "compare";

type ApiState = {
  analysis: QuantLensAnalysis | null;
  comparison: QuantLensComparison | null;
  error: string | null;
};

type WatchlistEntry = {
  ticker: string;
  analysis: QuantLensAnalysis | null;
  error: string | null;
};

type LeaderboardEntry = {
  ticker: string;
  analysis: QuantLensAnalysis | null;
  error: string | null;
};

const starterPairs = [
  ["NVDA", "AMD"],
  ["MSFT", "GOOGL"],
  ["JPM", "GS"],
];

const TOP_SP500_TICKERS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "BRK.B",
  "LLY",
  "AVGO",
  "JPM",
  "XOM",
  "V",
  "UNH",
  "COST",
  "MA",
  "HD",
  "PG",
  "JNJ",
  "NFLX",
  "ABBV",
];

const WATCHLIST_LIMIT = 10;
const WATCHLIST_STORAGE_KEY = "quant-lens-watchlist";

type AnalysisView = {
  convictionScore: number;
  recommendation: QuantLensAnalysis["recommendation"];
  sharpeEstimate: number;
  momentum: QuantLensAnalysis["momentum"];
  meanReversion: QuantLensAnalysis["meanReversion"];
  volatilityAdjusted: QuantLensAnalysis["volatilityAdjusted"];
  risk: string;
  thesis: string;
  diagnostics: QuantLensAnalysis["diagnostics"];
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);
}

function formatCompactNumber(value: number | null) {
  if (value == null) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
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

function scoreStyles(score: number) {
  if (score > 0.12) {
    return "text-emerald-200";
  }

  if (score < -0.12) {
    return "text-rose-200";
  }

  return "text-amber-100";
}

function recommendationStyles(recommendation: QuantLensAnalysis["recommendation"]) {
  if (recommendation === "Buy") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (recommendation === "Sell") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }

  return "border-amber-300/25 bg-amber-300/10 text-amber-100";
}

function Sparkline({ values }: { values: number[] }) {
  const path = useMemo(() => {
    if (values.length === 0) {
      return "";
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [values]);

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-full overflow-visible">
      <defs>
        <linearGradient id="sparkline-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7fffd4" />
          <stop offset="100%" stopColor="#9bb8ff" />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="url(#sparkline-stroke)"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function SignalHistoryChart({ analysis }: { analysis: QuantLensAnalysis }) {
  const points = analysis.signalHistory;
  const bounds = useMemo(() => {
    const values = points.flatMap((point) => [point.momentum, point.meanReversion]);
    const min = Math.min(-1, ...values);
    const max = Math.max(1, ...values);
    const range = max - min || 1;

    return { min, max, range };
  }, [points]);

  const momentumPath = useMemo(() => {
    return points
      .map((point, index) => {
        const x = (index / Math.max(points.length - 1, 1)) * 100;
        const y = 100 - ((point.momentum - bounds.min) / bounds.range) * 100;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [bounds.min, bounds.range, points]);

  const meanReversionPath = useMemo(() => {
    return points
      .map((point, index) => {
        const x = (index / Math.max(points.length - 1, 1)) * 100;
        const y = 100 - ((point.meanReversion - bounds.min) / bounds.range) * 100;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [bounds.min, bounds.range, points]);

  function toY(value: number) {
    return 100 - ((value - bounds.min) / bounds.range) * 100;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Signal History</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">90-day signal tape</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em]">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
            Momentum
          </span>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-100">
            Mean reversion
          </span>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
            Buy trigger
          </span>
          <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100">
            Sell trigger
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,18,31,0.85),rgba(5,10,18,0.72))] p-4">
        <svg viewBox="0 0 100 100" className="h-72 w-full overflow-visible">
          {[0, 25, 50, 75, 100].map((line) => (
            <line
              key={line}
              x1="0"
              y1={line}
              x2="100"
              y2={line}
              stroke="rgba(148,163,184,0.14)"
              strokeWidth="0.45"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1="0"
            y1={toY(0)}
            x2="100"
            y2={toY(0)}
            stroke="rgba(255,255,255,0.22)"
            strokeDasharray="2.5 2.5"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={momentumPath}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="2.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={meanReversionPath}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point, index) => {
            if (point.recommendation === "Hold") {
              return null;
            }

            const x = (index / Math.max(points.length - 1, 1)) * 100;
            const y = point.recommendation === "Buy" ? toY(point.momentum) : toY(point.meanReversion);
            const fill = point.recommendation === "Buy" ? "#34d399" : "#fb7185";

            return (
              <circle
                key={`${point.timestamp}-${point.recommendation}`}
                cx={x}
                cy={y}
                r="1.8"
                fill={fill}
                stroke="rgba(3,7,13,0.9)"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
            <p className="micro-label text-[#7d8597]">Buy triggers</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {analysis.signalReliability.buySignals}
            </p>
            <p className="mt-2 text-sm text-[#aeb9cf]">
              Avg next 10D return{" "}
              <span className={scoreStyles(analysis.signalReliability.averageBuyReturn10Day ?? 0)}>
                {analysis.signalReliability.averageBuyReturn10Day == null
                  ? "N/A"
                  : `${analysis.signalReliability.averageBuyReturn10Day >= 0 ? "+" : ""}${(
                      analysis.signalReliability.averageBuyReturn10Day * 100
                    ).toFixed(1)}%`}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
            <p className="micro-label text-[#7d8597]">Sell triggers</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {analysis.signalReliability.sellSignals}
            </p>
            <p className="mt-2 text-sm text-[#aeb9cf]">
              Avg next 10D return{" "}
              <span className={scoreStyles(-(analysis.signalReliability.averageSellReturn10Day ?? 0))}>
                {analysis.signalReliability.averageSellReturn10Day == null
                  ? "N/A"
                  : `${analysis.signalReliability.averageSellReturn10Day >= 0 ? "+" : ""}${(
                      analysis.signalReliability.averageSellReturn10Day * 100
                    ).toFixed(1)}%`}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Reliability Read</p>
          <p className="mt-3 text-sm leading-8 text-[#d2d8e5]">
            {analysis.signalReliability.explanation}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function ScoreBadge({ recommendation }: { recommendation: QuantLensAnalysis["recommendation"] }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium tracking-[0.24em] uppercase ${recommendationStyles(
        recommendation,
      )}`}
    >
      {recommendation}
    </span>
  );
}

function WatchlistCard({
  entry,
  onOpen,
  onRemove,
}: {
  entry: WatchlistEntry;
  onOpen: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}) {
  const analysis = entry.analysis;
  const momentumScore = analysis?.momentum.score ?? 0;
  const momentumDirection =
    analysis == null
      ? "Loading"
      : momentumScore > 0.12
        ? "Up"
        : momentumScore < -0.12
          ? "Down"
          : "Flat";
  const momentumTone =
    analysis == null
      ? "text-[#d2d8e5]"
      : momentumScore > 0.12
        ? "text-emerald-200"
        : momentumScore < -0.12
          ? "text-rose-200"
          : "text-amber-100";

  return (
    <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="micro-label text-[#7d8597]">Watchlist</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{entry.ticker}</h3>
          <p className="mt-1 text-sm text-[#8fa1be]">
            {analysis?.companyName ?? entry.error ?? "Refreshing live scorecard"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(entry.ticker)}
          className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-[#91a1ba] transition hover:border-rose-300/30 hover:text-rose-100"
        >
          Remove
        </button>
      </div>

      {entry.error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {entry.error}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="micro-label text-[#7d8597]">Conviction</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {analysis ? analysis.convictionScore.toFixed(1) : "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="micro-label text-[#7d8597]">Call</p>
              <div className="mt-2">
                {analysis ? (
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium tracking-[0.22em] uppercase ${recommendationStyles(
                      analysis.recommendation,
                    )}`}
                  >
                    {analysis.recommendation}
                  </span>
                ) : (
                  <span className="text-lg text-white">--</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="micro-label text-[#7d8597]">Momentum</p>
              <p className={`mt-2 text-2xl font-semibold ${momentumTone}`}>{momentumDirection}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm">
            <span className="text-[#95a3bd]">
              {analysis
                ? `${analysis.price.toFixed(2)} ${analysis.currency} | ${analysis.momentum.label} tape`
                : "Pulling live quote and signal stack"}
            </span>
            <button
              type="button"
              onClick={() => onOpen(entry.ticker)}
              className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-cyan-100 transition hover:brightness-110"
            >
              Open
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function WatchlistDashboard({
  entries,
  watchlistInput,
  watchlistError,
  onWatchlistInputChange,
  onAddTicker,
  onOpenTicker,
  onRemoveTicker,
  remainingSlots,
}: {
  entries: WatchlistEntry[];
  watchlistInput: string;
  watchlistError: string | null;
  onWatchlistInputChange: (value: string) => void;
  onAddTicker: (ticker: string) => void;
  onOpenTicker: (ticker: string) => void;
  onRemoveTicker: (ticker: string) => void;
  remainingSlots: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Watchlist Dashboard</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            Live mini scorecards
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-[#b8c3d8]">
            Save up to 10 names and keep a live read on conviction, recommendation, and momentum direction without running each one manually.
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-right">
          <p className="micro-label text-[#7d8597]">Capacity</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {entries.length}/{WATCHLIST_LIMIT}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        <input
          value={watchlistInput}
          onChange={(event) => onWatchlistInputChange(event.target.value.toUpperCase())}
          placeholder="Add ticker to watchlist"
          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/[0.06]"
        />
        <button
          type="button"
          onClick={() => onAddTicker(watchlistInput)}
          disabled={remainingSlots === 0}
          className="rounded-2xl bg-[linear-gradient(135deg,#9fe8ff_0%,#6ed3cf_45%,#7393ff_100%)] px-6 py-4 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add To Watchlist
        </button>
      </div>

      {watchlistError ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {watchlistError}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#8fa1be]">
          {remainingSlots > 0
            ? `${remainingSlots} open slot${remainingSlots === 1 ? "" : "s"} left.`
            : "Watchlist is full. Remove a ticker to add another one."}
        </p>
      )}

      {entries.length === 0 ? (
        <div className="mt-5 rounded-[28px] border border-dashed border-white/12 bg-black/10 px-5 py-8 text-sm leading-8 text-[#b8c3d8]">
          Start with a few liquid names you care about. Quant Lens will keep a fresh mini scorecard on each one so you can spot changing conviction faster than running one-off searches all day.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {entries.map((entry) => (
            <WatchlistCard
              key={entry.ticker}
              entry={entry}
              onOpen={onOpenTicker}
              onRemove={onRemoveTicker}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}

function MarketLeaderboard({
  entries,
  isLoading,
  error,
  onOpenTicker,
  onRefresh,
}: {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  onOpenTicker: (ticker: string) => void;
  onRefresh: () => void;
}) {
  const rankedEntries = [...entries].sort((left, right) => {
    const leftScore = left.analysis?.convictionScore ?? -1;
    const rightScore = right.analysis?.convictionScore ?? -1;
    return rightScore - leftScore;
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Market Leaderboard</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            Top 20 S&amp;P 500 conviction ranks
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-[#b8c3d8]">
            Quant Lens automatically runs the signal stack across a top-tier S&amp;P 500 basket and ranks the names from strongest to weakest by current conviction.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#9aa7bf] transition hover:border-cyan-300/30 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Refreshing" : "Refresh Board"}
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-[28px] border border-white/8">
        <div className="grid grid-cols-[0.45fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] bg-white/[0.04] px-4 py-3 text-[0.68rem] uppercase tracking-[0.22em] text-[#8391aa]">
          <span>Rank</span>
          <span>Ticker</span>
          <span>Company</span>
          <span>Conviction</span>
          <span>Call</span>
          <span>Momentum</span>
        </div>

        {rankedEntries.map((entry, index) => {
          const analysis = entry.analysis;
          const momentumScore = analysis?.momentum.score ?? 0;
          const momentumDirection =
            analysis == null
              ? "Loading"
              : momentumScore > 0.12
                ? "Up"
                : momentumScore < -0.12
                  ? "Down"
                  : "Flat";

          return (
            <button
              key={entry.ticker}
              type="button"
              onClick={() => onOpenTicker(entry.ticker)}
              className="grid w-full grid-cols-[0.45fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] border-t border-white/8 px-4 py-4 text-left text-sm transition hover:bg-white/[0.03]"
            >
              <span className="text-[#8fa1be]">{index + 1}</span>
              <span className="font-medium text-white">{entry.ticker}</span>
              <span className="truncate pr-3 text-[#cfd6e4]">
                {analysis?.companyName ?? entry.error ?? "Refreshing..."}
              </span>
              <span className={analysis ? scoreStyles(analysis.convictionScore / 10 - 0.5) : "text-[#d2d8e5]"}>
                {analysis ? analysis.convictionScore.toFixed(1) : "--"}
              </span>
              <span>
                {analysis ? (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.2em] ${recommendationStyles(
                      analysis.recommendation,
                    )}`}
                  >
                    {analysis.recommendation}
                  </span>
                ) : (
                  <span className="text-[#d2d8e5]">--</span>
                )}
              </span>
              <span className={analysis ? scoreStyles(momentumScore) : "text-[#d2d8e5]"}>
                {momentumDirection}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm leading-7 text-[#8fa1be]">
        Universe note: this board uses a curated top-20 S&amp;P 500 large-cap basket for a fast live snapshot of where the strongest institutional-looking setups are clustering right now.
      </p>
    </motion.section>
  );
}

function SignalCard({ signal }: { signal: AnalysisView["momentum"] }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">{signal.name}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{signal.label}</h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Signal</p>
          <p className={`mt-1 text-2xl font-semibold ${scoreStyles(signal.score)}`}>
            {signal.score.toFixed(2)}
          </p>
        </div>
      </div>
      <p className="text-sm leading-7 text-[#c6cbda]">{signal.explanation}</p>
    </motion.article>
  );
}

function AnalysisHero({
  analysis,
  current,
  stressMode,
}: {
  analysis: QuantLensAnalysis;
  current: AnalysisView;
  stressMode: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="grid gap-5 rounded-[32px] border border-white/8 bg-white/[0.03] p-6 lg:grid-cols-[1fr_320px]"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            {analysis.companyName}
          </h2>
          <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#9aa7bf]">
            {analysis.symbol}
          </div>
          <ScoreBadge recommendation={current.recommendation} />
          {stressMode ? (
            <span className="inline-flex rounded-full border border-rose-300/25 bg-rose-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-rose-100">
              Stress Mode
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-4xl font-semibold text-white">
              {formatCurrency(analysis.price, analysis.currency)}
            </p>
            <p
              className={`mt-2 text-sm ${
                analysis.changePercent >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {analysis.changePercent >= 0 ? "+" : ""}
              {(analysis.changePercent * 100).toFixed(2)}% today
            </p>
          </div>
          <div className="text-sm text-[#95a3bd]">
            <p>{analysis.exchange}</p>
            <p>Live data via Yahoo Finance</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
            <p className="micro-label text-[#7d8597]">Conviction</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {current.convictionScore.toFixed(1)}
              <span className="text-lg text-[#8f9bb2]">/10</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
            <p className="micro-label text-[#7d8597]">Sharpe Est.</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {current.sharpeEstimate.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
            <p className="micro-label text-[#7d8597]">Market Cap</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {formatCompactNumber(analysis.marketCap)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,18,31,0.92),rgba(5,10,18,0.78))] p-5">
        <div className="flex items-center justify-between">
          <p className="micro-label text-[#7d8597]">30-Day Tape</p>
          <p className="text-xs text-[#9aa7bf]">Recent close</p>
        </div>
        <div className="mt-4">
          <Sparkline values={analysis.sparkline} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[#8593ac]">52W Range</p>
            <p className="mt-1 text-white">
              {analysis.fiftyTwoWeekLow && analysis.fiftyTwoWeekHigh
                ? `${formatCurrency(analysis.fiftyTwoWeekLow, analysis.currency)} - ${formatCurrency(analysis.fiftyTwoWeekHigh, analysis.currency)}`
                : "N/A"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[#8593ac]">Trailing P/E</p>
            <p className="mt-1 text-white">
              {analysis.trailingPe ? analysis.trailingPe.toFixed(1) : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function SignalComparisonTable({
  comparison,
  stressMode,
}: {
  comparison: QuantLensComparison;
  stressMode: boolean;
}) {
  const leftMomentum = stressMode
    ? comparison.left.stressTest.stressed.momentum.score
    : comparison.left.momentum.score;
  const rightMomentum = stressMode
    ? comparison.right.stressTest.stressed.momentum.score
    : comparison.right.momentum.score;
  const leftMeanReversion = stressMode
    ? comparison.left.stressTest.stressed.meanReversion.score
    : comparison.left.meanReversion.score;
  const rightMeanReversion = stressMode
    ? comparison.right.stressTest.stressed.meanReversion.score
    : comparison.right.meanReversion.score;
  const leftVolAdjusted = stressMode
    ? comparison.left.stressTest.stressed.volatilityAdjusted.score
    : comparison.left.volatilityAdjusted.score;
  const rightVolAdjusted = stressMode
    ? comparison.right.stressTest.stressed.volatilityAdjusted.score
    : comparison.right.volatilityAdjusted.score;
  const leftSharpe = stressMode
    ? comparison.left.stressTest.stressed.sharpeEstimate
    : comparison.left.sharpeEstimate;
  const rightSharpe = stressMode
    ? comparison.right.stressTest.stressed.sharpeEstimate
    : comparison.right.sharpeEstimate;
  const leftConviction = stressMode
    ? comparison.left.stressTest.stressed.convictionScore
    : comparison.left.convictionScore;
  const rightConviction = stressMode
    ? comparison.right.stressTest.stressed.convictionScore
    : comparison.right.convictionScore;
  const rows = [
    {
      label: "Momentum",
      left: leftMomentum,
      right: rightMomentum,
    },
    {
      label: "Mean Reversion",
      left: leftMeanReversion,
      right: rightMeanReversion,
    },
    {
      label: "Volatility-Adjusted",
      left: leftVolAdjusted,
      right: rightVolAdjusted,
    },
    {
      label: "Sharpe Est.",
      left: leftSharpe,
      right: rightSharpe,
    },
    {
      label: "Conviction",
      left: leftConviction,
      right: rightConviction,
    },
  ];

  return (
    <div className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Head To Head</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            {stressMode ? "Stress signal comparison" : "Signal comparison"}
          </h3>
        </div>
        <div className="text-right text-sm text-[#a6b3ca]">
          <p>{comparison.left.symbol} vs {comparison.right.symbol}</p>
          <p>
            {(stressMode ? comparison.stressTest.winnerSymbol : comparison.winner.symbol)} leads by{" "}
            {(stressMode ? comparison.stressTest.convictionGap : comparison.convictionGap).toFixed(1)} conviction points
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-white/8">
        <div className="grid grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-[0.22em] text-[#8391aa]">
          <span>Signal</span>
          <span>{comparison.left.symbol}</span>
          <span>{comparison.right.symbol}</span>
          <span>Leader</span>
        </div>
        {rows.map((row) => {
          const leader =
            row.left === row.right
              ? "Even"
              : row.left > row.right
                ? comparison.left.symbol
                : comparison.right.symbol;

          return (
            <div
              key={row.label}
              className="grid grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] border-t border-white/8 px-4 py-4 text-sm"
            >
              <span className="text-[#d9deeb]">{row.label}</span>
              <span className={scoreStyles(row.left)}>{row.left.toFixed(2)}</span>
              <span className={scoreStyles(row.right)}>{row.right.toFixed(2)}</span>
              <span className="text-white">{leader}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StressCard({ analysis }: { analysis: QuantLensAnalysis }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-[32px] border border-rose-300/12 bg-[linear-gradient(180deg,rgba(251,113,133,0.06),rgba(255,255,255,0.03))] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Market Stress Test</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">20% drawdown scenario</h3>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Conviction Delta</p>
          <p className={`mt-1 text-xl font-semibold ${scoreStyles(analysis.stressTest.convictionDelta)}`}>
            {analysis.stressTest.convictionDelta >= 0 ? "+" : ""}
            {analysis.stressTest.convictionDelta.toFixed(1)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{analysis.stressTest.explanation}</p>
      <p className="mt-4 text-sm leading-8 text-[#bfc8d9]">{analysis.stressTest.thesisShift}</p>
      <div className="mt-5 rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-[#d8deea]">
        {analysis.stressTest.holdsUp
          ? "The conviction score mostly holds up under stress. This thesis looks more robust than fragile."
          : "The conviction score does not hold up especially well under stress. This thesis is more sensitive to regime change than the live tape suggests."}
      </div>
    </motion.section>
  );
}

function EarningsCatalystCard({ analysis }: { analysis: QuantLensAnalysis }) {
  if (!analysis.earningsCatalyst) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
      >
        <p className="micro-label text-[#7d8597]">Earnings Catalyst</p>
        <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">
          An upcoming earnings date was not available for this ticker, so there is no clean event
          risk read to layer on top of the quant setup.
        </p>
      </motion.section>
    );
  }

  const { earningsCatalyst } = analysis;
  const tone =
    earningsCatalyst.riskLevel === "High"
      ? "text-rose-200"
      : earningsCatalyst.riskLevel === "Moderate"
        ? "text-amber-100"
        : "text-emerald-200";
  const shell =
    earningsCatalyst.hasUpcomingEarnings
      ? "rounded-[32px] border border-amber-300/16 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(255,255,255,0.03))] p-6"
      : "rounded-[32px] border border-white/8 bg-white/[0.03] p-6";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={shell}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Earnings Catalyst</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone}`}>
            {earningsCatalyst.hasUpcomingEarnings ? "Event In View" : "No Near-Term Event"}
          </h3>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Risk</p>
          <p className={`mt-1 text-lg font-semibold ${tone}`}>{earningsCatalyst.riskLevel}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{earningsCatalyst.explanation}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Next Earnings</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatEventDate(earningsCatalyst.nextEarningsDate)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Days Out</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {earningsCatalyst.daysUntilEarnings == null
              ? "N/A"
              : `${earningsCatalyst.daysUntilEarnings}d`}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[#b8c3d8]">{earningsCatalyst.summary}</p>
    </motion.section>
  );
}

function TradeTimingCard({ analysis }: { analysis: QuantLensAnalysis }) {
  const { tradeTiming } = analysis;
  const tone =
    tradeTiming.score >= 7.5
      ? "text-emerald-200"
      : tradeTiming.score >= 5.5
        ? "text-amber-100"
        : "text-rose-200";
  const verdictTone =
    tradeTiming.verdict === "Optimal Now"
      ? "text-emerald-200"
      : tradeTiming.verdict === "Good But Stretched" || tradeTiming.verdict === "Wait For Pullback"
        ? "text-amber-100"
        : "text-rose-200";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Trade Timing</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone}`}>
            {tradeTiming.score.toFixed(1)}/10
          </h3>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Read</p>
          <p className={`mt-1 text-lg font-semibold ${verdictTone}`}>{tradeTiming.verdict}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{tradeTiming.explanation}</p>
      <p className="mt-4 text-sm leading-7 text-[#b8c3d8]">{tradeTiming.summary}</p>
    </motion.section>
  );
}

function InsiderActivityCard({ analysis }: { analysis: QuantLensAnalysis }) {
  if (!analysis.insiderActivity) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
      >
        <p className="micro-label text-[#7d8597]">Insider Activity</p>
        <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">
          Recent insider transaction data was not available in the last 90 days, so the thesis is
          leaning entirely on price action and market data rather than executive behavior.
        </p>
      </motion.section>
    );
  }

  const { insiderActivity } = analysis;
  const sentimentStyle =
    insiderActivity.sentiment === "Buying"
      ? "text-emerald-200"
      : insiderActivity.sentiment === "Selling"
        ? "text-rose-200"
        : insiderActivity.sentiment === "Mixed"
          ? "text-amber-100"
          : "text-[#d2d8e5]";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Insider Activity</p>
          <h3 className={`mt-2 text-2xl font-semibold ${sentimentStyle}`}>
            {insiderActivity.sentiment}
          </h3>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Net Shares</p>
          <p className={`mt-1 text-lg font-semibold ${scoreStyles(insiderActivity.netShares)}`}>
            {insiderActivity.netShares >= 0 ? "+" : ""}
            {new Intl.NumberFormat("en-US", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(insiderActivity.netShares)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{insiderActivity.explanation}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Transactions</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {insiderActivity.buyCount} buys / {insiderActivity.sellCount} sells
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Latest Filing</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {insiderActivity.latestDate ?? "N/A"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[#b8c3d8]">{insiderActivity.summary}</p>
      {insiderActivity.transactions.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {insiderActivity.transactions.slice(0, 3).map((transaction) => (
            <div
              key={`${transaction.date}-${transaction.filerName}-${transaction.transactionType}`}
              className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-white">{transaction.filerName}</span>
                <span className="text-[#96a4bd]">{transaction.date}</span>
              </div>
              <p className="mt-1 text-[#cfd6e4]">
                {transaction.relation} | {transaction.transactionType}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </motion.section>
  );
}

function ShortSqueezeCard({ analysis }: { analysis: QuantLensAnalysis }) {
  if (!analysis.shortSqueeze) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
      >
        <p className="micro-label text-[#7d8597]">Short Squeeze Risk</p>
        <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">
          Short interest data was not available for this ticker, so the squeeze read is inconclusive.
        </p>
      </motion.section>
    );
  }

  const { shortSqueeze } = analysis;
  const tone =
    shortSqueeze.sentiment === "High"
      ? "text-rose-200"
      : shortSqueeze.sentiment === "Moderate"
        ? "text-amber-100"
        : "text-[#d2d8e5]";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Short Squeeze Risk</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone}`}>
            {shortSqueeze.probabilityScore.toFixed(0)}/100
          </h3>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Read</p>
          <p className={`mt-1 text-lg font-semibold ${tone}`}>{shortSqueeze.sentiment}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{shortSqueeze.explanation}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Short % Float</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {shortSqueeze.shortPercentOfFloat == null
              ? "N/A"
              : `${(shortSqueeze.shortPercentOfFloat * 100).toFixed(1)}%`}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Days To Cover</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {shortSqueeze.daysToCover == null ? "N/A" : shortSqueeze.daysToCover.toFixed(1)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[#b8c3d8]">{shortSqueeze.summary}</p>
    </motion.section>
  );
}

function NewsSentimentCard({ analysis }: { analysis: QuantLensAnalysis }) {
  if (!analysis.newsSentiment) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
      >
        <p className="micro-label text-[#7d8597]">News Sentiment</p>
        <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">
          Recent headlines were not available for this ticker, so the thesis is leaning on price
          action rather than on a fresh news read.
        </p>
      </motion.section>
    );
  }

  const { newsSentiment } = analysis;
  const tone =
    newsSentiment.sentiment === "Positive"
      ? "text-emerald-200"
      : newsSentiment.sentiment === "Negative"
        ? "text-rose-200"
        : "text-amber-100";
  const alignmentTone =
    newsSentiment.alignment === "Aligned"
      ? "text-emerald-200"
      : newsSentiment.alignment === "Conflicting"
        ? "text-rose-200"
        : "text-amber-100";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">News Sentiment</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone}`}>
            {newsSentiment.score.toFixed(0)}/100
          </h3>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Alignment</p>
          <p className={`mt-1 text-lg font-semibold ${alignmentTone}`}>
            {newsSentiment.alignment}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{newsSentiment.explanation}</p>
      <p className="mt-4 text-sm leading-7 text-[#b8c3d8]">{newsSentiment.summary}</p>
      <div className="mt-5 grid gap-3">
        {newsSentiment.headlines.slice(0, 3).map((headline) => (
          <div
            key={headline.link}
            className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <span className={`font-medium ${scoreStyles(headline.sentimentScore)}`}>
                {headline.sentimentScore > 0
                  ? "Positive"
                  : headline.sentimentScore < 0
                    ? "Negative"
                    : "Neutral"}
              </span>
              <span className="text-[#96a4bd]">
                {headline.publishedAt ? new Date(headline.publishedAt).toLocaleDateString() : ""}
              </span>
            </div>
            <p className="mt-2 text-[#d7deea]">{headline.title}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function InstitutionalOwnershipCard({ analysis }: { analysis: QuantLensAnalysis }) {
  if (!analysis.institutionalOwnership) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
      >
        <p className="micro-label text-[#7d8597]">Institutional Ownership</p>
        <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">
          Institutional ownership history was not available for this ticker, so the thesis is not
          using a holder-rotation signal here.
        </p>
      </motion.section>
    );
  }

  const { institutionalOwnership } = analysis;
  const trendTone =
    institutionalOwnership.trend === "Rising"
      ? "text-emerald-200"
      : institutionalOwnership.trend === "Falling"
        ? "text-rose-200"
        : "text-amber-100";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label text-[#7d8597]">Institutional Ownership</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            {institutionalOwnership.currentPercentHeld == null
              ? "N/A"
              : `${(institutionalOwnership.currentPercentHeld * 100).toFixed(1)}%`}
          </h3>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Trend</p>
          <p className={`mt-1 text-lg font-semibold ${trendTone}`}>
            {institutionalOwnership.trend}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">
        {institutionalOwnership.explanation}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Last Quarter</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {institutionalOwnership.previousQuarterPercentHeld == null
              ? "N/A"
              : `${(institutionalOwnership.previousQuarterPercentHeld * 100).toFixed(1)}%`}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
          <p className="micro-label text-[#7d8597]">Two Quarters Ago</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {institutionalOwnership.twoQuartersAgoPercentHeld == null
              ? "N/A"
              : `${(institutionalOwnership.twoQuartersAgoPercentHeld * 100).toFixed(1)}%`}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[#b8c3d8]">{institutionalOwnership.summary}</p>
    </motion.section>
  );
}

function AnalysisSidebar({
  analysis,
  current,
  stressMode,
}: {
  analysis: QuantLensAnalysis;
  current: AnalysisView;
  stressMode: boolean;
}) {
  return (
    <div className="grid gap-6">
      <EarningsCatalystCard analysis={analysis} />
      <TradeTimingCard analysis={analysis} />
      <StressCard analysis={analysis} />
      <ShortSqueezeCard analysis={analysis} />
      <NewsSentimentCard analysis={analysis} />
      <InstitutionalOwnershipCard analysis={analysis} />
      <InsiderActivityCard analysis={analysis} />
      {analysis.sectorContext ? (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[32px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(125,211,252,0.06),rgba(255,255,255,0.03))] p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="micro-label text-[#7d8597]">Sector Context</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {analysis.sectorContext.sectorName}
              </h3>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-right">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#7d8597]">Vs Proxy</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {analysis.sectorContext.benchmarkSymbol}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">
            {analysis.sectorContext.explanation}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="micro-label text-[#7d8597]">Momentum Gap</p>
              <p className={`mt-2 text-2xl font-semibold ${scoreStyles(analysis.sectorContext.momentumGap)}`}>
                {analysis.sectorContext.momentumGap >= 0 ? "+" : ""}
                {analysis.sectorContext.momentumGap.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <p className="micro-label text-[#7d8597]">Conviction Gap</p>
              <p className={`mt-2 text-2xl font-semibold ${scoreStyles(analysis.sectorContext.convictionGap)}`}>
                {analysis.sectorContext.convictionGap >= 0 ? "+" : ""}
                {analysis.sectorContext.convictionGap.toFixed(1)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#b8c3d8]">
            {analysis.sectorContext.summary} The comparison uses {analysis.sectorContext.benchmarkName} as a liquid sector tape proxy for what the average setup in that group looks like right now.
          </p>
        </motion.section>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
      >
        <p className="micro-label text-[#7d8597]">Institutional Thesis</p>
        <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{current.thesis}</p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
      >
        <p className="micro-label text-[#7d8597]">Biggest Risk Right Now</p>
        <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{current.risk}</p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
      >
        <p className="micro-label text-[#7d8597]">Diagnostic Tape</p>
        <div className="mt-4 grid gap-3">
          {[
            ["Sector", analysis.sector ?? "N/A"],
            ["Mode", stressMode ? "Stress" : "Live"],
            ["Momentum score", current.diagnostics.momentumScore.toFixed(2)],
            ["Mean reversion score", current.diagnostics.meanReversionScore.toFixed(2)],
            [
              "Volatility-adjusted score",
              current.diagnostics.volatilityAdjustedScore.toFixed(2),
            ],
            ["Realized volatility", `${(current.diagnostics.realizedVolatility * 100).toFixed(1)}%`],
            ["Price vs 20D average", `${(current.diagnostics.priceVs20DayAverage * 100).toFixed(1)}%`],
            ["Volume ratio", `${current.diagnostics.volumeRatio.toFixed(2)}x`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm"
            >
              <span className="text-[#96a4bd]">{label}</span>
              <span className="font-medium text-white">{value}</span>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
        <p className="micro-label text-[#7d8597]">Workflow</p>
        <div className="mt-5 space-y-4">
          {[
            "Pull live quote, six months of daily price history, and key valuation fields.",
            "Transform the raw tape into momentum, mean reversion, and volatility-adjusted signals.",
            "Translate the result into conviction, risk, thesis quality, or compare two names side by side.",
          ].map((step, index) => (
            <div key={step} className="flex gap-4 rounded-2xl border border-white/8 bg-black/10 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-sm text-cyan-100">
                {index + 1}
              </div>
              <p className="text-sm leading-7 text-[#c6cbda]">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
        <p className="micro-label text-[#7d8597]">What You Get</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            "Single-stock readout",
            "Head-to-head comparison mode",
            "Signal-by-signal leader board",
            "Plain-English winner explanation",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-[#d0d6e4]"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function QuantLensApp() {
  const [mode, setMode] = useState<Mode>("single");
  const [stressMode, setStressMode] = useState(false);
  const [ticker, setTicker] = useState("NVDA");
  const [leftTicker, setLeftTicker] = useState("NVDA");
  const [rightTicker, setRightTicker] = useState("AMD");
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistEntries, setWatchlistEntries] = useState<WatchlistEntry[]>([]);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [state, setState] = useState<ApiState>({
    analysis: null,
    comparison: null,
    error: null,
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as unknown;

      if (!Array.isArray(parsed)) {
        return;
      }

      const sanitized = parsed
        .map((value) => (typeof value === "string" ? value.trim().toUpperCase() : ""))
        .filter(Boolean)
        .slice(0, WATCHLIST_LIMIT);

      setWatchlist(sanitized);
    } catch {
      window.localStorage.removeItem(WATCHLIST_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    let cancelled = false;

    if (watchlist.length === 0) {
      setWatchlistEntries([]);
      return;
    }

    setWatchlistEntries((current) =>
      watchlist.map((tickerSymbol) => current.find((entry) => entry.ticker === tickerSymbol) ?? {
        ticker: tickerSymbol,
        analysis: null,
        error: null,
      }),
    );

    void Promise.all(
      watchlist.map(async (tickerSymbol) => {
        try {
          const response = await fetch(`/api/analyze?ticker=${encodeURIComponent(tickerSymbol)}`);
          const payload = (await response.json()) as {
            analysis?: QuantLensAnalysis;
            error?: string;
          };

          if (!response.ok || !payload.analysis) {
            throw new Error(payload.error ?? "Unable to refresh ticker.");
          }

          return {
            ticker: tickerSymbol,
            analysis: payload.analysis,
            error: null,
          } satisfies WatchlistEntry;
        } catch (error) {
          return {
            ticker: tickerSymbol,
            analysis: null,
            error: error instanceof Error ? error.message : "Unable to refresh ticker.",
          } satisfies WatchlistEntry;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      setWatchlistEntries(entries);
    });

    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  const refreshLeaderboard = useCallback(async () => {
    setIsLeaderboardLoading(true);
    setLeaderboardError(null);
    setLeaderboardEntries((current) =>
      TOP_SP500_TICKERS.map(
        (tickerSymbol) =>
          current.find((entry) => entry.ticker === tickerSymbol) ?? {
            ticker: tickerSymbol,
            analysis: null,
            error: null,
          },
      ),
    );

    try {
      const nextEntries = await Promise.all(
        TOP_SP500_TICKERS.map(async (tickerSymbol) => {
          try {
            const response = await fetch(`/api/analyze?ticker=${encodeURIComponent(tickerSymbol)}`);
            const payload = (await response.json()) as {
              analysis?: QuantLensAnalysis;
              error?: string;
            };

            if (!response.ok || !payload.analysis) {
              throw new Error(payload.error ?? "Unable to analyze ticker.");
            }

            return {
              ticker: tickerSymbol,
              analysis: payload.analysis,
              error: null,
            } satisfies LeaderboardEntry;
          } catch (error) {
            return {
              ticker: tickerSymbol,
              analysis: null,
              error: error instanceof Error ? error.message : "Unable to analyze ticker.",
            } satisfies LeaderboardEntry;
          }
        }),
      );

      setLeaderboardEntries(nextEntries);
    } catch (error) {
      setLeaderboardError(
        error instanceof Error
          ? error.message
          : "Unable to refresh the market leaderboard.",
      );
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  const runSingleAnalysis = useCallback(async (nextTicker: string) => {
    startTransition(async () => {
      setState((current) => ({ ...current, error: null, comparison: null }));

      try {
        const response = await fetch(`/api/analyze?ticker=${encodeURIComponent(nextTicker)}`);
        const payload = (await response.json()) as {
          analysis?: QuantLensAnalysis;
          error?: string;
        };

        if (!response.ok || !payload.analysis) {
          throw new Error(payload.error ?? "Unable to analyze this ticker.");
        }

        setState({ analysis: payload.analysis, comparison: null, error: null });
      } catch (error) {
        setState({
          analysis: null,
          comparison: null,
          error: error instanceof Error ? error.message : "Unable to analyze this ticker.",
        });
      }
    });
  }, []);

  const runComparison = useCallback(async (nextLeft: string, nextRight: string) => {
    startTransition(async () => {
      setState((current) => ({ ...current, error: null }));

      try {
        const response = await fetch(
          `/api/analyze?ticker=${encodeURIComponent(nextLeft)}&compareTo=${encodeURIComponent(nextRight)}`,
        );
        const payload = (await response.json()) as {
          analysis?: QuantLensAnalysis;
          comparison?: QuantLensComparison;
          error?: string;
        };

        if (!response.ok || !payload.analysis || !payload.comparison) {
          throw new Error(payload.error ?? "Unable to compare these tickers.");
        }

        setState({
          analysis: payload.analysis,
          comparison: payload.comparison,
          error: null,
        });
      } catch (error) {
        setState({
          analysis: null,
          comparison: null,
          error: error instanceof Error ? error.message : "Unable to compare these tickers.",
        });
      }
    });
  }, []);

  useEffect(() => {
    if (mode === "single") {
      void runSingleAnalysis("NVDA");
      return;
    }

    void runComparison("NVDA", "AMD");
  }, [mode, runComparison, runSingleAnalysis]);

  function handleSingleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSingleAnalysis(ticker.trim().toUpperCase());
  }

  function handleCompareSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runComparison(leftTicker.trim().toUpperCase(), rightTicker.trim().toUpperCase());
  }

  const analysis = state.analysis;
  const comparison = state.comparison;

  function addToWatchlist(rawTicker: string) {
    const normalized = rawTicker.trim().toUpperCase();

    if (!normalized) {
      setWatchlistError("Enter a ticker before adding it to the watchlist.");
      return;
    }

    if (watchlist.includes(normalized)) {
      setWatchlistError(`${normalized} is already on the watchlist.`);
      return;
    }

    if (watchlist.length >= WATCHLIST_LIMIT) {
      setWatchlistError("Watchlist limit reached. Remove a ticker before adding another one.");
      return;
    }

    setWatchlist((current) => [...current, normalized]);
    setWatchlistInput("");
    setWatchlistError(null);
  }

  function removeFromWatchlist(tickerToRemove: string) {
    setWatchlist((current) => current.filter((currentTicker) => currentTicker !== tickerToRemove));
    setWatchlistError(null);
  }

  function openFromWatchlist(nextTicker: string) {
    setMode("single");
    setTicker(nextTicker);
    void runSingleAnalysis(nextTicker);
  }

  function getCurrentView(nextAnalysis: QuantLensAnalysis): AnalysisView {
    return stressMode
      ? nextAnalysis.stressTest.stressed
      : {
          convictionScore: nextAnalysis.convictionScore,
          recommendation: nextAnalysis.recommendation,
          sharpeEstimate: nextAnalysis.sharpeEstimate,
          momentum: nextAnalysis.momentum,
          meanReversion: nextAnalysis.meanReversion,
          volatilityAdjusted: nextAnalysis.volatilityAdjusted,
          risk: nextAnalysis.risk,
          thesis: nextAnalysis.thesis,
          diagnostics: nextAnalysis.diagnostics,
        };
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(72,163,255,0.18),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(0,255,163,0.08),transparent_24%),linear-gradient(180deg,#07111f_0%,#050914_60%,#03070d_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(137,150,173,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(137,150,173,0.12)_1px,transparent_1px)] [background-size:72px_72px]" />

      <section className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="grid gap-5 rounded-[32px] border border-[#1c2738] bg-[#08111d]/85 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[1.25fr_0.75fr]"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-semibold tracking-[0.2em] text-cyan-100">
                QL
              </div>
              <div>
                <p className="micro-label text-cyan-200/70">Quant Lens</p>
                <p className="text-sm text-[#95a3bd]">Institutional signals, translated for real people.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Read one stock like a systematic desk or pit two names against each other.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#b5bfd3]">
                Quant Lens now supports both single-name analysis and a head-to-head mode that shows which stock has the stronger quant case, by how much, and why that edge matters right now.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["single", "Single Name"],
                ["compare", "Head To Head"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value as Mode)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] transition ${
                    mode === value
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-white/[0.04] text-[#99a6bf]"
                  }`}
                >
                  {label}
                </button>
                ))}
              <button
                type="button"
                onClick={() => setStressMode((current) => !current)}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] transition ${
                  stressMode
                    ? "border-rose-300/40 bg-rose-300/10 text-rose-100"
                    : "border-white/10 bg-white/[0.04] text-[#99a6bf]"
                }`}
              >
                {stressMode ? "Stress On" : "Stress Off"}
              </button>
            </div>

            {mode === "single" ? (
              <div className="flex flex-col gap-3">
                <form onSubmit={handleSingleSubmit} className="flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="ticker">
                    Stock ticker
                  </label>
                  <input
                    id="ticker"
                    value={ticker}
                    onChange={(event) => setTicker(event.target.value.toUpperCase())}
                    placeholder="Enter ticker, e.g. AAPL"
                    className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/[0.06]"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-2xl bg-[linear-gradient(135deg,#b6f09c_0%,#6ed3cf_40%,#7393ff_100%)] px-6 py-4 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                  >
                    {isPending ? "Analyzing" : "Run Analysis"}
                  </button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addToWatchlist(ticker)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#9aa7bf] transition hover:border-cyan-300/30 hover:text-cyan-100"
                  >
                    Save To Watchlist
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCompareSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="sr-only" htmlFor="leftTicker">
                  Left ticker
                </label>
                <input
                  id="leftTicker"
                  value={leftTicker}
                  onChange={(event) => setLeftTicker(event.target.value.toUpperCase())}
                  placeholder="First ticker"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/[0.06]"
                />
                <label className="sr-only" htmlFor="rightTicker">
                  Right ticker
                </label>
                <input
                  id="rightTicker"
                  value={rightTicker}
                  onChange={(event) => setRightTicker(event.target.value.toUpperCase())}
                  placeholder="Second ticker"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/[0.06]"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-2xl bg-[linear-gradient(135deg,#b6f09c_0%,#6ed3cf_40%,#7393ff_100%)] px-6 py-4 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                >
                  {isPending ? "Comparing" : "Compare"}
                </button>
              </form>
            )}

            {mode === "single" ? (
              <div className="flex flex-wrap gap-2">
                {["NVDA", "MSFT", "AMZN", "JPM", "XOM"].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setTicker(suggestion);
                      void runSingleAnalysis(suggestion);
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs tracking-[0.22em] text-[#9aa7bf] uppercase transition hover:border-cyan-300/30 hover:text-cyan-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {starterPairs.map(([left, right]) => (
                  <button
                    key={`${left}-${right}`}
                    type="button"
                    onClick={() => {
                      setLeftTicker(left);
                      setRightTicker(right);
                      void runComparison(left, right);
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs tracking-[0.22em] text-[#9aa7bf] uppercase transition hover:border-cyan-300/30 hover:text-cyan-100"
                  >
                    {left} vs {right}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
            <p className="micro-label text-[#8aa2c5]">
              {mode === "single" ? "Signal Stack" : "Comparison Stack"}
            </p>
            <div className="grid gap-3 text-sm leading-7 text-[#c3ccdc]">
              <p><span className="text-white">Momentum:</span> asks whether price strength is being confirmed by real participation.</p>
              <p><span className="text-white">Mean reversion:</span> asks whether the stock has wandered too far from its own trend.</p>
              <p><span className="text-white">Volatility-adjusted:</span> blends both while punishing noisy setups that look better on paper than they trade in reality.</p>
              {mode === "compare" ? (
                <p><span className="text-white">Head to head:</span> ranks both names signal by signal and explains why the winner is more attractive now.</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.05] p-4 text-sm leading-7 text-cyan-50/90">
              {mode === "single"
                ? "The output is not a target price. It is a disciplined read on whether the current setup deserves offensive capital, patient capital, or no capital."
                : "Comparison mode is built for relative decisions: if you only want one expression in a crowded sector, it helps identify which tape has the cleaner institutional case."}
            </div>
          </div>
        </motion.header>

        {state.error ? (
          <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {state.error}
          </div>
        ) : null}

        <WatchlistDashboard
          entries={watchlistEntries}
          watchlistInput={watchlistInput}
          watchlistError={watchlistError}
          onWatchlistInputChange={setWatchlistInput}
          onAddTicker={addToWatchlist}
          onOpenTicker={openFromWatchlist}
          onRemoveTicker={removeFromWatchlist}
          remainingSlots={WATCHLIST_LIMIT - watchlist.length}
        />

        <MarketLeaderboard
          entries={leaderboardEntries}
          isLoading={isLeaderboardLoading}
          error={leaderboardError}
          onOpenTicker={openFromWatchlist}
          onRefresh={() => {
            void refreshLeaderboard();
          }}
        />

        {!analysis ? (
          <EmptyState />
        ) : comparison ? (
          <section className="grid gap-6">
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-[32px] border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(182,240,156,0.08),rgba(115,147,255,0.06))] p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="micro-label text-[#9ec8c2]">Stronger Quant Case</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                    {stressMode
                      ? `${comparison.stressTest.winnerSymbol} Under Stress`
                      : `${comparison.winner.companyName} (${comparison.winner.symbol})`}
                  </h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-right">
                  <p className="micro-label text-[#8aa2c5]">Advantage</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {(stressMode ? comparison.stressTest.convictionGap : comparison.convictionGap).toFixed(1)}
                    <span className="text-lg text-[#8f9bb2]"> pts</span>
                  </p>
                </div>
              </div>
              <p className="mt-4 max-w-5xl text-sm leading-8 text-[#d7deea]">
                {stressMode ? comparison.stressTest.explanation : comparison.explanation}
              </p>
            </motion.section>

            <div className="grid gap-6 xl:grid-cols-2">
              <AnalysisHero
                analysis={comparison.left}
                current={getCurrentView(comparison.left)}
                stressMode={stressMode}
              />
              <AnalysisHero
                analysis={comparison.right}
                current={getCurrentView(comparison.right)}
                stressMode={stressMode}
              />
            </div>

            <SignalComparisonTable comparison={comparison} stressMode={stressMode} />

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="grid gap-6">
                <div className="grid gap-6 xl:grid-cols-3">
                  <SignalCard signal={getCurrentView(comparison.left).momentum} />
                  <SignalCard signal={getCurrentView(comparison.left).meanReversion} />
                  <SignalCard signal={getCurrentView(comparison.left).volatilityAdjusted} />
                </div>
                <SignalHistoryChart analysis={comparison.left} />
                <AnalysisSidebar
                  analysis={comparison.left}
                  current={getCurrentView(comparison.left)}
                  stressMode={stressMode}
                />
              </div>

              <div className="grid gap-6">
                <div className="grid gap-6 xl:grid-cols-3">
                  <SignalCard signal={getCurrentView(comparison.right).momentum} />
                  <SignalCard signal={getCurrentView(comparison.right).meanReversion} />
                  <SignalCard signal={getCurrentView(comparison.right).volatilityAdjusted} />
                </div>
                <SignalHistoryChart analysis={comparison.right} />
                <AnalysisSidebar
                  analysis={comparison.right}
                  current={getCurrentView(comparison.right)}
                  stressMode={stressMode}
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-6">
              <AnalysisHero
                analysis={analysis}
                current={getCurrentView(analysis)}
                stressMode={stressMode}
              />
              <SignalHistoryChart analysis={analysis} />
              <div className="grid gap-6 xl:grid-cols-3">
                <SignalCard signal={getCurrentView(analysis).momentum} />
                <SignalCard signal={getCurrentView(analysis).meanReversion} />
                <SignalCard signal={getCurrentView(analysis).volatilityAdjusted} />
              </div>
            </div>
            <AnalysisSidebar
              analysis={analysis}
              current={getCurrentView(analysis)}
              stressMode={stressMode}
            />
          </section>
        )}
      </section>
    </main>
  );
}
