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

type FeatureLink = {
  name: string;
  description: string;
  targetId: string;
  mode?: Mode;
  ticker?: string;
  compareTickers?: [string, string];
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

const MARKETING_FEATURES: FeatureLink[] = [
  {
    name: "Single Name Analysis",
    description: "Run the full Quant Lens stack on one stock and get a clean conviction-driven thesis in plain English.",
    targetId: "app-workspace",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Head to Head Comparison",
    description: "Put two names side by side and see which stock has the stronger quant case right now.",
    targetId: "compare-workspace",
    mode: "compare",
    compareTickers: ["NVDA", "AMD"],
  },
  {
    name: "Momentum Signal",
    description: "Measures whether price strength is being supported by trend persistence and participation.",
    targetId: "signal-momentum",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Mean Reversion Signal",
    description: "Shows whether the stock has drifted too far from trend and is due for a reset.",
    targetId: "signal-mean-reversion",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Volatility Adjusted Signal",
    description: "Balances momentum and reversion while discounting noisy setups that look cleaner than they trade.",
    targetId: "signal-volatility-adjusted",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Sector Context",
    description: "Compares the stock’s setup to the broader sector so you can tell leadership from beta.",
    targetId: "sector-context-card",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "90 Day Signal History Chart",
    description: "Visualizes how the signals have behaved recently and where the model would have triggered buys or sells.",
    targetId: "signal-history-chart",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Market Stress Test",
    description: "Re-runs the thesis under a tougher volatility regime to see whether conviction holds up.",
    targetId: "market-stress-test",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Earnings Catalyst Detector",
    description: "Flags nearby earnings risk and explains whether the current setup is worth owning before the event.",
    targetId: "earnings-catalyst",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Insider Activity Tracker",
    description: "Reads recent executive buying and selling to see whether management is confirming or weakening the tape.",
    targetId: "insider-activity",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Short Squeeze Probability",
    description: "Combines short interest and momentum to estimate how likely a squeeze is in the near term.",
    targetId: "short-squeeze-risk",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "News Sentiment Overlay",
    description: "Scores the latest headlines and checks whether the news tape is aligned with the quant read.",
    targetId: "news-sentiment",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Institutional Ownership Tracker",
    description: "Shows whether large professional holders are leaning in or stepping back underneath the setup.",
    targetId: "institutional-ownership",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Conviction Score",
    description: "Synthesizes the full signal stack into a simple out-of-10 read on how compelling the trade is.",
    targetId: "conviction-score",
    mode: "single",
    ticker: "NVDA",
  },
  {
    name: "Sharpe Ratio Estimate",
    description: "Estimates the quality of the return stream so you can judge edge, not just direction.",
    targetId: "sharpe-ratio",
    mode: "single",
    ticker: "NVDA",
  },
];

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
    return "ql-pill text-emerald-200";
  }

  if (recommendation === "Sell") {
    return "ql-pill text-rose-200";
  }

  return "ql-pill text-amber-100";
}

function SignalOrb({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const tone =
    score > 0.12 ? "text-emerald-200" : score < -0.12 ? "text-rose-200" : "text-amber-100";

  return (
    <div className="flex items-center gap-4">
      <div className="ql-signal-orb">
        <div
          className="h-7 w-7 rounded-full"
          style={{
            background:
              score > 0.12
                ? "linear-gradient(180deg, rgba(184,255,210,0.95), rgba(73,214,143,0.72))"
                : score < -0.12
                  ? "linear-gradient(180deg, rgba(255,206,206,0.95), rgba(239,113,113,0.72))"
                  : "linear-gradient(180deg, rgba(255,232,192,0.94), rgba(227,181,102,0.72))",
          }}
        />
      </div>
      <div>
        <p className="micro-label">{label}</p>
        <p className={`mt-1 text-base font-medium ${tone}`}>{score.toFixed(2)}</p>
      </div>
    </div>
  );
}

function LoadingSequence({ mode }: { mode: Mode }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const steps =
    mode === "single"
      ? [
          "Pulling live price data",
          "Computing momentum signal",
          "Analyzing sector context",
          "Building your thesis",
        ]
      : [
          "Pulling live price data",
          "Computing pairwise signals",
          "Comparing conviction strength",
          "Building your relative thesis",
        ];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % steps.length);
    }, 850);

    return () => window.clearInterval(interval);
  }, [steps.length]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="ql-panel overflow-hidden rounded-[36px] px-8 py-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="micro-label ql-kicker">Analysis In Motion</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-white">
            Building your read, step by step.
          </h2>
          <p className="mt-4 text-sm leading-8 ql-body">
            Quant Lens is pulling live market inputs, translating the signal stack, and assembling the most relevant context before it writes the final thesis.
          </p>
        </div>
        <div className="ql-signal-orb h-14 w-14 shrink-0">
          <motion.div
            animate={{ scale: [0.88, 1.08, 0.88], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-5 w-5 rounded-full bg-[linear-gradient(180deg,#ffd7af,#f5a35c)]"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        {steps.map((step, index) => {
          const isActive = index <= activeIndex;

          return (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: isActive ? 1 : 0.38,
                y: 0,
                scale: isActive ? 1 : 0.985,
              }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="ql-soft-panel rounded-[26px] px-5 py-5"
            >
              <div className="flex items-center gap-4">
                <div className="ql-signal-orb h-10 w-10 text-sm text-[#2b170b]">
                  <motion.div
                    animate={{
                      scale: isActive ? [0.92, 1.06, 0.92] : 1,
                      opacity: isActive ? [0.7, 1, 0.7] : 0.45,
                    }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    className="h-3 w-3 rounded-full bg-[linear-gradient(180deg,#ffd7af,#f5a35c)]"
                  />
                </div>
                <div>
                  <p className="micro-label">{`Step ${index + 1}`}</p>
                  <p className="mt-1 text-sm font-medium leading-7 text-white">{step}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

function scrollToSection(sectionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function MarketingHero({ onLaunch }: { onLaunch: (feature: FeatureLink) => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
      className="ql-hero-panel relative overflow-hidden rounded-[44px] px-8 py-18 sm:px-12 lg:px-16 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,163,92,0.14),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(255,232,205,0.08),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%)]" />
      </div>
      <div className="relative z-10 max-w-4xl">
        <p className="micro-label ql-kicker">Quant Lens</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.09em] text-white sm:text-6xl lg:text-[5.3rem] lg:leading-[0.92]">
          Institutional signal intelligence for the rest of the market.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-9 ql-body">
          Institutional quant signals translated into plain English for retail investors
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onLaunch(MARKETING_FEATURES[0])}
            className="ql-action rounded-full px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] transition hover:brightness-110"
          >
            Run Your First Analysis
          </button>
          <p className="text-sm ql-muted">
            Live market data, plain-English thesis, and disciplined timing context in one read.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function MarketingFeatures({ onLaunch }: { onLaunch: (feature: FeatureLink) => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.55 }}
      className="grid gap-8"
    >
      <div className="max-w-3xl">
        <p className="micro-label ql-kicker">Features</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.07em] text-white sm:text-5xl">
          Every major workflow, clearly surfaced.
        </h2>
        <p className="mt-4 text-base leading-8 ql-body">
          Explore the full Quant Lens product surface, then jump directly into the exact analysis feature you want to try.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {MARKETING_FEATURES.map((feature, index) => (
          <motion.article
            key={feature.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.14 }}
            transition={{ duration: 0.45, delay: index * 0.015 }}
            className="ql-panel rounded-[30px] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[18rem]">
                <p className="micro-label ql-kicker">Feature</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                  {feature.name}
                </h3>
              </div>
              <div className="ql-signal-orb h-11 w-11 text-sm text-[#2b170b]">
                {index + 1}
              </div>
            </div>
            <p className="mt-4 text-sm leading-8 ql-body">{feature.description}</p>
            <button
              type="button"
              onClick={() => onLaunch(feature)}
              className="ql-action-subtle mt-6 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] transition hover:text-[#ffd3a8]"
            >
              Open Feature
            </button>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

function HowItWorksSection() {
  const steps = [
    ["01", "Paste a ticker", "Start with any stock you care about, or use one of the guided example names."],
    ["02", "Run the signals", "Quant Lens pulls live market data and computes the momentum, reversion, and risk-adjusted stack."],
    ["03", "Read the thesis", "Get a plain-English explanation of conviction, timing, catalyst risk, and what matters most now."],
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.55 }}
      className="ql-panel rounded-[40px] px-8 py-10 sm:px-10"
    >
      <div className="max-w-3xl">
        <p className="micro-label ql-kicker">How It Works</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.07em] text-white sm:text-5xl">
          Three steps from ticker to thesis.
        </h2>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {steps.map(([number, title, body], index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.16 }}
            transition={{ duration: 0.45, delay: index * 0.06 }}
            className="ql-soft-panel rounded-[28px] p-6"
          >
            <p className="text-sm font-medium uppercase tracking-[0.22em] ql-accent-text">{number}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{title}</h3>
            <p className="mt-4 text-sm leading-8 ql-body">{body}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function SocialProofSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55 }}
      className="ql-panel rounded-[40px] px-8 py-10 sm:px-10"
    >
      <p className="micro-label ql-kicker">Signal Logic</p>
      <h2 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.07em] text-white sm:text-5xl">
        Built around the same style of signal logic used in strategies that achieved Sharpe ratios above 1.7 at a top quantitative hedge fund.
      </h2>
      <p className="mt-5 max-w-3xl text-base leading-8 ql-body">
        The point is not to imitate institutional mystique. It is to make disciplined signal interpretation legible, calm, and useful for investors who want to think more clearly about what the market is pricing in.
      </p>
    </motion.section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col gap-3 border-t border-white/6 py-8">
      <p className="text-xl font-semibold tracking-[-0.04em] text-white">Quant Lens</p>
      <p className="text-sm ql-muted">Institutional signal reading, made intelligible.</p>
    </footer>
  );
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

function SignalHistoryChart({
  analysis,
  sectionId,
}: {
  analysis: QuantLensAnalysis;
  sectionId?: string;
}) {
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
      id={sectionId}
      className="ql-soft-panel rounded-[34px] p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label ql-kicker">Signal History</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">90-day signal tape</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
          <span className="ql-data-chip px-3 py-1 text-[#f4d2ad]">
            Momentum
          </span>
          <span className="ql-data-chip px-3 py-1 text-[#e9c59b]">
            Mean reversion
          </span>
          <span className="ql-data-chip px-3 py-1 text-emerald-200">
            Buy trigger
          </span>
          <span className="ql-data-chip px-3 py-1 text-rose-200">
            Sell trigger
          </span>
        </div>
      </div>

      <div className="ql-soft-panel mt-8 rounded-[28px] p-5">
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
          <div className="ql-soft-panel rounded-[26px] p-5">
            <p className="micro-label">Buy triggers</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {analysis.signalReliability.buySignals}
            </p>
            <p className="mt-3 text-sm ql-muted">
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
          <div className="ql-soft-panel rounded-[26px] p-5">
            <p className="micro-label">Sell triggers</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {analysis.signalReliability.sellSignals}
            </p>
            <p className="mt-3 text-sm ql-muted">
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

        <div className="ql-soft-panel rounded-[26px] p-5">
          <p className="micro-label">Reliability Read</p>
          <p className="mt-4 text-sm leading-8 ql-body">
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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-[0.24em] uppercase ${recommendationStyles(
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
    <div className="ql-soft-panel ql-load-in rounded-[30px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="micro-label">Watchlist</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{entry.ticker}</h3>
          <p className="mt-1 text-sm ql-muted">
            {analysis?.companyName ?? entry.error ?? "Refreshing live scorecard"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(entry.ticker)}
          className="ql-action-subtle rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] transition hover:text-rose-100"
        >
          Remove
        </button>
      </div>

      {entry.error ? (
        <div className="ql-soft-panel mt-4 rounded-[24px] px-4 py-3 text-sm text-rose-100">
          {entry.error}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="ql-soft-panel rounded-[24px] p-4">
              <p className="micro-label">Conviction</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {analysis ? analysis.convictionScore.toFixed(1) : "--"}
              </p>
            </div>
            <div className="ql-soft-panel rounded-[24px] p-4">
              <p className="micro-label">Call</p>
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
            <div className="ql-soft-panel rounded-[24px] p-4">
              <p className="micro-label">Momentum</p>
              <p className={`mt-2 text-2xl font-semibold ${momentumTone}`}>{momentumDirection}</p>
            </div>
          </div>

          <div className="ql-soft-panel mt-5 flex items-center justify-between gap-4 rounded-[24px] px-4 py-3 text-sm">
            <span className="ql-muted">
              {analysis
                ? `${analysis.price.toFixed(2)} ${analysis.currency} | ${analysis.momentum.label} tape`
                : "Pulling live quote and signal stack"}
            </span>
            <button
              type="button"
              onClick={() => onOpen(entry.ticker)}
              className="ql-action-subtle rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-[#ffd3a8] transition hover:brightness-110"
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
      className="ql-panel rounded-[36px] p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label ql-kicker">Watchlist Dashboard</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white">
            Live mini scorecards
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 ql-body">
            Save up to 10 names and keep a live read on conviction, recommendation, and momentum direction without running each one manually.
          </p>
        </div>
        <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
          <p className="micro-label">Capacity</p>
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
          className="ql-input flex-1 rounded-[24px] px-5 py-4 text-base transition"
        />
        <button
          type="button"
          onClick={() => onAddTicker(watchlistInput)}
          disabled={remainingSlots === 0}
          className="ql-action rounded-[24px] px-6 py-4 text-sm font-semibold tracking-[0.18em] uppercase transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add To Watchlist
        </button>
      </div>

      {watchlistError ? (
        <div className="ql-soft-panel mt-4 rounded-[24px] px-4 py-3 text-sm text-rose-100">
          {watchlistError}
        </div>
      ) : (
        <p className="mt-4 text-sm ql-muted">
          {remainingSlots > 0
            ? `${remainingSlots} open slot${remainingSlots === 1 ? "" : "s"} left.`
            : "Watchlist is full. Remove a ticker to add another one."}
        </p>
      )}

      {entries.length === 0 ? (
        <div className="ql-soft-panel mt-5 rounded-[28px] px-6 py-9 text-sm leading-8 ql-body">
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
      className="ql-panel rounded-[36px] p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label ql-kicker">Market Leaderboard</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white">
            Top 20 S&amp;P 500 conviction ranks
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 ql-body">
            Quant Lens automatically runs the signal stack across a top-tier S&amp;P 500 basket and ranks the names from strongest to weakest by current conviction.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="ql-action-subtle rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition hover:text-[#ffd3a8] disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Refreshing" : "Refresh Board"}
        </button>
      </div>

      {error ? (
        <div className="ql-soft-panel mt-5 rounded-[24px] px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="ql-table mt-6 overflow-hidden rounded-[28px]">
        <div className="grid grid-cols-[0.45fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] px-5 py-4 text-[0.68rem] uppercase tracking-[0.22em] text-[#9e9285]">
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
              className="grid w-full grid-cols-[0.45fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] border-t border-white/5 px-5 py-4 text-left text-sm transition hover:bg-white/[0.025]"
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

      <p className="mt-5 text-sm leading-8 ql-muted">
        Universe note: this board uses a curated top-20 S&amp;P 500 large-cap basket for a fast live snapshot of where the strongest institutional-looking setups are clustering right now.
      </p>
    </motion.section>
  );
}

function SignalCard({
  signal,
  sectionId,
}: {
  signal: AnalysisView["momentum"];
  sectionId?: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      id={sectionId}
      className="ql-soft-panel ql-load-in rounded-[30px] p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="micro-label">{signal.name}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{signal.label}</h3>
        </div>
        <SignalOrb score={signal.score} label="Signal" />
      </div>
      <p className="text-sm leading-8 ql-body">{signal.explanation}</p>
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
      className="ql-hero-panel ql-load-in grid gap-8 rounded-[36px] p-8 lg:grid-cols-[1fr_360px]"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-4xl font-semibold tracking-[-0.06em] text-white">
            {analysis.companyName}
          </h2>
          <div className="ql-pill rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#d3c2b2]">
            {analysis.symbol}
          </div>
          <ScoreBadge recommendation={current.recommendation} />
          {stressMode ? (
            <span className="ql-pill inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-rose-100">
              Stress Mode
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-5xl font-semibold tracking-[-0.06em] text-white">
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
          <div className="text-sm ql-muted">
            <p>{analysis.exchange}</p>
            <p>Live data via Yahoo Finance</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div id="conviction-score" className="ql-soft-panel rounded-[26px] p-5">
            <p className="micro-label">Conviction</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {current.convictionScore.toFixed(1)}
              <span className="text-lg text-[#8f9bb2]">/10</span>
            </p>
          </div>
          <div id="sharpe-ratio" className="ql-soft-panel rounded-[26px] p-5">
            <p className="micro-label">Sharpe Est.</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {current.sharpeEstimate.toFixed(2)}
            </p>
          </div>
          <div className="ql-soft-panel rounded-[26px] p-5">
            <p className="micro-label">Market Cap</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {formatCompactNumber(analysis.marketCap)}
            </p>
          </div>
        </div>
      </div>

      <div className="ql-soft-panel rounded-[30px] p-6">
        <div className="flex items-center justify-between">
          <p className="micro-label">30-Day Tape</p>
          <p className="text-xs ql-muted">Recent close</p>
        </div>
        <div className="mt-4">
          <Sparkline values={analysis.sparkline} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="ql-soft-panel rounded-[22px] p-4">
            <p className="ql-muted">52W Range</p>
            <p className="mt-1 text-white">
              {analysis.fiftyTwoWeekLow && analysis.fiftyTwoWeekHigh
                ? `${formatCurrency(analysis.fiftyTwoWeekLow, analysis.currency)} - ${formatCurrency(analysis.fiftyTwoWeekHigh, analysis.currency)}`
                : "N/A"}
            </p>
          </div>
          <div className="ql-soft-panel rounded-[22px] p-4">
            <p className="ql-muted">Trailing P/E</p>
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
    <div className="ql-panel rounded-[34px] p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="micro-label ql-kicker">Head To Head</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {stressMode ? "Stress signal comparison" : "Signal comparison"}
          </h3>
        </div>
        <div className="text-right text-sm ql-muted">
          <p>{comparison.left.symbol} vs {comparison.right.symbol}</p>
          <p>
            {(stressMode ? comparison.stressTest.winnerSymbol : comparison.winner.symbol)} leads by{" "}
            {(stressMode ? comparison.stressTest.convictionGap : comparison.convictionGap).toFixed(1)} conviction points
          </p>
        </div>
      </div>

      <div className="ql-table mt-6 overflow-hidden rounded-[30px]">
        <div className="grid grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] px-5 py-4 text-xs uppercase tracking-[0.22em] text-[#9d9286]">
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
              className="grid grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] border-t border-white/5 px-5 py-4 text-sm"
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
      id="market-stress-test"
      className="ql-soft-panel rounded-[32px] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label">Market Stress Test</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">20% drawdown scenario</h3>
        </div>
        <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] ql-muted">Conviction Delta</p>
          <p className={`mt-1 text-xl font-semibold ${scoreStyles(analysis.stressTest.convictionDelta)}`}>
            {analysis.stressTest.convictionDelta >= 0 ? "+" : ""}
            {analysis.stressTest.convictionDelta.toFixed(1)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-body">{analysis.stressTest.explanation}</p>
      <p className="mt-4 text-sm leading-8 ql-muted">{analysis.stressTest.thesisShift}</p>
      <div className="ql-soft-panel mt-5 rounded-[24px] p-4 text-sm ql-body">
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
        id="earnings-catalyst"
        className="ql-soft-panel rounded-[32px] p-6"
      >
        <p className="micro-label">Earnings Catalyst</p>
        <p className="mt-4 text-sm leading-8 ql-body">
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
      : "rounded-[32px] p-6";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      id="earnings-catalyst"
      className={`ql-soft-panel ${shell}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label">Earnings Catalyst</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone}`}>
            {earningsCatalyst.hasUpcomingEarnings ? "Event In View" : "No Near-Term Event"}
          </h3>
        </div>
        <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] ql-muted">Risk</p>
          <p className={`mt-1 text-lg font-semibold ${tone}`}>{earningsCatalyst.riskLevel}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-body">{earningsCatalyst.explanation}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="ql-soft-panel rounded-[24px] p-4">
          <p className="micro-label">Next Earnings</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatEventDate(earningsCatalyst.nextEarningsDate)}
          </p>
        </div>
        <div className="ql-soft-panel rounded-[24px] p-4">
          <p className="micro-label">Days Out</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {earningsCatalyst.daysUntilEarnings == null
              ? "N/A"
              : `${earningsCatalyst.daysUntilEarnings}d`}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-muted">{earningsCatalyst.summary}</p>
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
      className="ql-soft-panel rounded-[32px] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label">Trade Timing</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone}`}>
            {tradeTiming.score.toFixed(1)}/10
          </h3>
        </div>
        <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] ql-muted">Read</p>
          <p className={`mt-1 text-lg font-semibold ${verdictTone}`}>{tradeTiming.verdict}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-body">{tradeTiming.explanation}</p>
      <p className="mt-4 text-sm leading-8 ql-muted">{tradeTiming.summary}</p>
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
        id="insider-activity"
        className="ql-soft-panel rounded-[32px] p-6"
      >
        <p className="micro-label">Insider Activity</p>
        <p className="mt-4 text-sm leading-8 ql-body">
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
      id="insider-activity"
      className="ql-soft-panel rounded-[32px] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label">Insider Activity</p>
          <h3 className={`mt-2 text-2xl font-semibold ${sentimentStyle}`}>
            {insiderActivity.sentiment}
          </h3>
        </div>
        <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] ql-muted">Net Shares</p>
          <p className={`mt-1 text-lg font-semibold ${scoreStyles(insiderActivity.netShares)}`}>
            {insiderActivity.netShares >= 0 ? "+" : ""}
            {new Intl.NumberFormat("en-US", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(insiderActivity.netShares)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-body">{insiderActivity.explanation}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="ql-soft-panel rounded-[24px] p-4">
          <p className="micro-label">Transactions</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {insiderActivity.buyCount} buys / {insiderActivity.sellCount} sells
          </p>
        </div>
        <div className="ql-soft-panel rounded-[24px] p-4">
          <p className="micro-label">Latest Filing</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {insiderActivity.latestDate ?? "N/A"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-muted">{insiderActivity.summary}</p>
      {insiderActivity.transactions.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {insiderActivity.transactions.slice(0, 3).map((transaction) => (
            <div
              key={`${transaction.date}-${transaction.filerName}-${transaction.transactionType}`}
              className="ql-soft-panel rounded-[22px] px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-white">{transaction.filerName}</span>
                <span className="ql-muted">{transaction.date}</span>
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
                id="short-squeeze-risk"
                className="ql-soft-panel rounded-[32px] p-6"
      >
        <p className="micro-label">Short Squeeze Risk</p>
        <p className="mt-4 text-sm leading-8 ql-body">
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
      id="short-squeeze-risk"
      className="ql-soft-panel rounded-[32px] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label">Short Squeeze Risk</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone}`}>
            {shortSqueeze.probabilityScore.toFixed(0)}/100
          </h3>
        </div>
        <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] ql-muted">Read</p>
          <p className={`mt-1 text-lg font-semibold ${tone}`}>{shortSqueeze.sentiment}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-body">{shortSqueeze.explanation}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="ql-soft-panel rounded-[24px] p-4">
          <p className="micro-label">Short % Float</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {shortSqueeze.shortPercentOfFloat == null
              ? "N/A"
              : `${(shortSqueeze.shortPercentOfFloat * 100).toFixed(1)}%`}
          </p>
        </div>
        <div className="ql-soft-panel rounded-[24px] p-4">
          <p className="micro-label">Days To Cover</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {shortSqueeze.daysToCover == null ? "N/A" : shortSqueeze.daysToCover.toFixed(1)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-muted">{shortSqueeze.summary}</p>
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
        id="news-sentiment"
        className="ql-soft-panel rounded-[32px] p-6"
      >
        <p className="micro-label">News Sentiment</p>
        <p className="mt-4 text-sm leading-8 ql-body">
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
      id="news-sentiment"
      className="ql-soft-panel rounded-[32px] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label">News Sentiment</p>
          <h3 className={`mt-2 text-2xl font-semibold ${tone}`}>
            {newsSentiment.score.toFixed(0)}/100
          </h3>
        </div>
        <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] ql-muted">Alignment</p>
          <p className={`mt-1 text-lg font-semibold ${alignmentTone}`}>
            {newsSentiment.alignment}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-body">{newsSentiment.explanation}</p>
      <p className="mt-4 text-sm leading-8 ql-muted">{newsSentiment.summary}</p>
      <div className="mt-5 grid gap-3">
        {newsSentiment.headlines.slice(0, 3).map((headline) => (
          <div
            key={headline.link}
            className="ql-soft-panel rounded-[22px] px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <span className={`font-medium ${scoreStyles(headline.sentimentScore)}`}>
                {headline.sentimentScore > 0
                  ? "Positive"
                  : headline.sentimentScore < 0
                    ? "Negative"
                    : "Neutral"}
              </span>
                <span className="ql-muted">
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
        id="institutional-ownership"
        className="ql-soft-panel rounded-[32px] p-6"
      >
        <p className="micro-label">Institutional Ownership</p>
        <p className="mt-4 text-sm leading-8 ql-body">
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
      id="institutional-ownership"
      className="ql-soft-panel rounded-[32px] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="micro-label">Institutional Ownership</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            {institutionalOwnership.currentPercentHeld == null
              ? "N/A"
              : `${(institutionalOwnership.currentPercentHeld * 100).toFixed(1)}%`}
          </h3>
        </div>
        <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] ql-muted">Trend</p>
          <p className={`mt-1 text-lg font-semibold ${trendTone}`}>
            {institutionalOwnership.trend}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-body">
        {institutionalOwnership.explanation}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="ql-soft-panel rounded-[24px] p-4">
          <p className="micro-label">Last Quarter</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {institutionalOwnership.previousQuarterPercentHeld == null
              ? "N/A"
              : `${(institutionalOwnership.previousQuarterPercentHeld * 100).toFixed(1)}%`}
          </p>
        </div>
        <div className="ql-soft-panel rounded-[24px] p-4">
          <p className="micro-label">Two Quarters Ago</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {institutionalOwnership.twoQuartersAgoPercentHeld == null
              ? "N/A"
              : `${(institutionalOwnership.twoQuartersAgoPercentHeld * 100).toFixed(1)}%`}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-8 ql-muted">{institutionalOwnership.summary}</p>
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
          id="sector-context-card"
          className="ql-soft-panel rounded-[32px] p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="micro-label">Sector Context</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {analysis.sectorContext.sectorName}
              </h3>
            </div>
            <div className="ql-soft-panel rounded-[24px] px-4 py-3 text-right">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] ql-muted">Vs Proxy</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {analysis.sectorContext.benchmarkSymbol}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-8 ql-body">
            {analysis.sectorContext.explanation}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="ql-soft-panel rounded-[24px] p-4">
              <p className="micro-label">Momentum Gap</p>
              <p className={`mt-2 text-2xl font-semibold ${scoreStyles(analysis.sectorContext.momentumGap)}`}>
                {analysis.sectorContext.momentumGap >= 0 ? "+" : ""}
                {analysis.sectorContext.momentumGap.toFixed(2)}
              </p>
            </div>
            <div className="ql-soft-panel rounded-[24px] p-4">
              <p className="micro-label">Conviction Gap</p>
              <p className={`mt-2 text-2xl font-semibold ${scoreStyles(analysis.sectorContext.convictionGap)}`}>
                {analysis.sectorContext.convictionGap >= 0 ? "+" : ""}
                {analysis.sectorContext.convictionGap.toFixed(1)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-8 ql-muted">
            {analysis.sectorContext.summary} The comparison uses {analysis.sectorContext.benchmarkName} as a liquid sector tape proxy for what the average setup in that group looks like right now.
          </p>
        </motion.section>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="ql-soft-panel rounded-[32px] p-6"
      >
        <p className="micro-label">Institutional Thesis</p>
        <p className="mt-4 text-sm leading-8 ql-body">{current.thesis}</p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="ql-soft-panel rounded-[32px] p-6"
      >
        <p className="micro-label">Biggest Risk Right Now</p>
        <p className="mt-4 text-sm leading-8 ql-body">{current.risk}</p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="ql-soft-panel rounded-[32px] p-6"
      >
        <p className="micro-label">Diagnostic Tape</p>
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
              className="ql-soft-panel flex items-center justify-between rounded-[22px] px-4 py-3 text-sm"
            >
              <span className="ql-muted">{label}</span>
              <span className="font-medium text-white">{value}</span>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function EmptyState({
  onSelectTicker,
}: {
  onSelectTicker: (ticker: string) => void;
}) {
  const examples = ["NVDA", "MSFT", "JPM"];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="ql-hero-panel relative overflow-hidden rounded-[40px] px-8 py-14 sm:px-10 lg:px-14"
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ x: [0, 18, 0], opacity: [0.18, 0.3, 0.18] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[8%] top-[18%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(245,163,92,0.16),transparent_68%)] blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -14, 0], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[10%] top-[14%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,214,175,0.12),transparent_72%)] blur-3xl"
        />
        <svg
          viewBox="0 0 1200 420"
          className="absolute inset-x-0 bottom-0 h-[68%] w-full opacity-55"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="empty-grid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
              <stop offset="55%" stopColor="rgba(245,163,92,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <linearGradient id="empty-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,210,168,0.04)" />
              <stop offset="50%" stopColor="rgba(245,163,92,0.42)" />
              <stop offset="100%" stopColor="rgba(255,210,168,0.04)" />
            </linearGradient>
          </defs>
          {[80, 160, 240, 320].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="1200"
              y2={y}
              stroke="url(#empty-grid)"
              strokeWidth="1"
            />
          ))}
          <motion.path
            initial={{ pathLength: 0.7, opacity: 0.35 }}
            animate={{ pathLength: [0.72, 1, 0.72], opacity: [0.24, 0.46, 0.24] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            d="M0 292 C120 270, 180 238, 260 248 S420 310, 510 274 670 164, 740 186 896 300, 980 260 1110 194, 1200 212"
            fill="none"
            stroke="url(#empty-line)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <motion.path
            initial={{ pathLength: 0.8, opacity: 0.16 }}
            animate={{ pathLength: [0.82, 1, 0.82], opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            d="M0 326 C110 318, 210 282, 302 294 S460 340, 552 322 712 240, 804 250 964 332, 1048 306 1144 262, 1200 274"
            fill="none"
            stroke="rgba(255,240,223,0.18)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-3xl">
        <p className="micro-label ql-kicker">Start Here</p>
        <h2 className="mt-4 text-5xl font-semibold tracking-[-0.08em] text-white sm:text-6xl">
          See what the tape is saying before you commit capital.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-9 ql-body">
          Quant Lens translates institutional quant analysis into plain English, helping you understand momentum, mean reversion, volatility, and timing in one clear read.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          {examples.map((ticker) => (
            <motion.button
              key={ticker}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onSelectTicker(ticker)}
              className="ql-action-subtle rounded-full px-5 py-3 text-sm font-medium tracking-[0.18em] uppercase transition hover:text-[#ffd3a8]"
            >
              {ticker}
            </motion.button>
          ))}
        </div>

        <p className="mt-5 text-sm ql-muted">
          Pick an example to instantly run a live analysis and see the full thesis, conviction score, catalyst risk, and timing read.
        </p>
      </div>
    </motion.section>
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
  const [pendingFeatureTarget, setPendingFeatureTarget] = useState<string | null>(null);
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

  function launchFeature(feature: FeatureLink) {
    const nextMode = feature.mode ?? "single";
    setPendingFeatureTarget(feature.targetId);

    if (nextMode === "compare" && feature.compareTickers) {
      const [left, right] = feature.compareTickers;
      setMode("compare");
      setLeftTicker(left);
      setRightTicker(right);
      scrollToSection("app-workspace");
      void runComparison(left, right);
      return;
    }

    const nextTicker = feature.ticker ?? ticker;
    setMode("single");
    setTicker(nextTicker);
    scrollToSection("app-workspace");
    void runSingleAnalysis(nextTicker);
  }

  useEffect(() => {
    if (!pendingFeatureTarget || isPending) {
      return;
    }

    if (pendingFeatureTarget === "app-workspace" || pendingFeatureTarget === "compare-workspace") {
      scrollToSection(pendingFeatureTarget);
      setPendingFeatureTarget(null);
      return;
    }

    if ((mode === "single" && state.analysis) || (mode === "compare" && state.comparison)) {
      const timeout = window.setTimeout(() => {
        scrollToSection(pendingFeatureTarget);
        setPendingFeatureTarget(null);
      }, 140);

      return () => window.clearTimeout(timeout);
    }
  }, [isPending, mode, pendingFeatureTarget, state.analysis, state.comparison]);

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
    <main className="ql-shell relative min-h-screen overflow-hidden px-4 py-8 text-white sm:px-8 lg:px-12">
      <section className="relative mx-auto flex max-w-[1440px] flex-col gap-8">
        <MarketingHero onLaunch={launchFeature} />
        <MarketingFeatures onLaunch={launchFeature} />
        <HowItWorksSection />
        <SocialProofSection />

        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          id="app-workspace"
          className="ql-hero-panel grid gap-8 rounded-[40px] p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10"
        >
          <div className="space-y-7">
            <div className="flex items-center gap-3">
              <div className="ql-signal-orb flex h-12 w-12 items-center justify-center text-sm font-semibold tracking-[0.2em] text-[#29160d]">
                QL
              </div>
              <div>
                <p className="micro-label ql-kicker">Quant Lens</p>
                <p className="text-sm ql-muted">Institutional signals, translated with clarity.</p>
              </div>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.08em] text-white sm:text-6xl lg:text-[4.5rem] lg:leading-[0.95]">
                A calmer way to read market signals with institutional discipline.
              </h1>
              <p className="max-w-2xl text-lg leading-9 ql-body">
                Quant Lens turns live quantitative analysis into confident, plain-English guidance for investors who want signal quality, timing context, and a premium product experience instead of terminal clutter.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                ["single", "Single Name"],
                ["compare", "Head To Head"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value as Mode)}
                  className={`tag-button rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition ${
                    mode === value
                      ? ""
                      : ""
                  }`}
                  data-active={mode === value}
                >
                  {label}
                </button>
                ))}
              <button
                type="button"
                onClick={() => setStressMode((current) => !current)}
                className="tag-button rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition"
                data-active={stressMode}
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
                    className="ql-input flex-1 rounded-[24px] px-5 py-4 text-base transition"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="ql-action rounded-[24px] px-6 py-4 text-sm font-semibold tracking-[0.18em] uppercase transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                  >
                    {isPending ? "Analyzing" : "Run Analysis"}
                  </button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addToWatchlist(ticker)}
                    className="ql-action-subtle rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition hover:text-[#ffd3a8]"
                  >
                    Save To Watchlist
                  </button>
                </div>
              </div>
            ) : (
              <form
                id="compare-workspace"
                onSubmit={handleCompareSubmit}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <label className="sr-only" htmlFor="leftTicker">
                  Left ticker
                </label>
                <input
                  id="leftTicker"
                  value={leftTicker}
                  onChange={(event) => setLeftTicker(event.target.value.toUpperCase())}
                  placeholder="First ticker"
                  className="ql-input rounded-[24px] px-5 py-4 text-base transition"
                />
                <label className="sr-only" htmlFor="rightTicker">
                  Right ticker
                </label>
                <input
                  id="rightTicker"
                  value={rightTicker}
                  onChange={(event) => setRightTicker(event.target.value.toUpperCase())}
                  placeholder="Second ticker"
                  className="ql-input rounded-[24px] px-5 py-4 text-base transition"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="ql-action rounded-[24px] px-6 py-4 text-sm font-semibold tracking-[0.18em] uppercase transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
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
                    className="tag-button rounded-full px-3 py-1.5 text-xs tracking-[0.22em] uppercase transition"
                    data-active={false}
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
                    className="tag-button rounded-full px-3 py-1.5 text-xs tracking-[0.22em] uppercase transition"
                    data-active={false}
                  >
                    {left} vs {right}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ql-panel grid gap-5 rounded-[32px] p-7">
            <p className="micro-label ql-kicker">
              {mode === "single" ? "Signal Stack" : "Comparison Stack"}
            </p>
            <div className="grid gap-4 text-sm leading-8 ql-body">
              <p><span className="text-white">Momentum:</span> asks whether price strength is being confirmed by real participation.</p>
              <p><span className="text-white">Mean reversion:</span> asks whether the stock has wandered too far from its own trend.</p>
              <p><span className="text-white">Volatility-adjusted:</span> blends both while punishing noisy setups that look better on paper than they trade in reality.</p>
              {mode === "compare" ? (
                <p><span className="text-white">Head to head:</span> ranks both names signal by signal and explains why the winner is more attractive now.</p>
              ) : null}
            </div>
            <div className="ql-soft-panel rounded-[24px] p-5 text-sm leading-8 ql-body">
              {mode === "single"
                ? "The output is not a target price. It is a disciplined read on whether the current setup deserves offensive capital, patient capital, or no capital."
                : "Comparison mode is built for relative decisions: if you only want one expression in a crowded sector, it helps identify which tape has the cleaner institutional case."}
            </div>
          </div>
        </motion.header>

        {state.error ? (
          <div className="ql-soft-panel rounded-[28px] px-5 py-4 text-sm text-rose-100">
            {state.error}
          </div>
        ) : null}

        {isPending ? <LoadingSequence mode={mode} /> : null}

        {!analysis ? (
          <EmptyState
            onSelectTicker={(nextTicker) => {
              setMode("single");
              setTicker(nextTicker);
              void runSingleAnalysis(nextTicker);
            }}
          />
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
              <SignalHistoryChart analysis={analysis} sectionId="signal-history-chart" />
              <div className="grid gap-6 xl:grid-cols-3">
                <SignalCard
                  signal={getCurrentView(analysis).momentum}
                  sectionId="signal-momentum"
                />
                <SignalCard
                  signal={getCurrentView(analysis).meanReversion}
                  sectionId="signal-mean-reversion"
                />
                <SignalCard
                  signal={getCurrentView(analysis).volatilityAdjusted}
                  sectionId="signal-volatility-adjusted"
                />
              </div>
            </div>
            <AnalysisSidebar
              analysis={analysis}
              current={getCurrentView(analysis)}
              stressMode={stressMode}
            />
          </section>
        )}

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
        <Footer />
      </section>
    </main>
  );
}
