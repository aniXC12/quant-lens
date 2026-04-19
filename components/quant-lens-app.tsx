"use client";

import { motion } from "framer-motion";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import type { QuantLensAnalysis } from "@/lib/quant-lens";

type ApiState = {
  analysis: QuantLensAnalysis | null;
  error: string | null;
};

const starterTickers = ["NVDA", "MSFT", "AMZN", "JPM", "XOM"];

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

function ScoreBadge({ recommendation }: { recommendation: QuantLensAnalysis["recommendation"] }) {
  const styles =
    recommendation === "Buy"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : recommendation === "Sell"
        ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
        : "border-amber-300/30 bg-amber-300/10 text-amber-100";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium tracking-[0.24em] uppercase ${styles}`}>
      {recommendation}
    </span>
  );
}

function SignalCard({ signal }: { signal: QuantLensAnalysis["momentum"] }) {
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
          <p className="mt-1 text-2xl font-semibold text-white">{signal.score.toFixed(2)}</p>
        </div>
      </div>
      <p className="text-sm leading-7 text-[#c6cbda]">{signal.explanation}</p>
    </motion.article>
  );
}

export function QuantLensApp() {
  const [ticker, setTicker] = useState("NVDA");
  const [state, setState] = useState<ApiState>({ analysis: null, error: null });
  const [isPending, startTransition] = useTransition();

  const runAnalysis = useCallback(async (nextTicker: string) => {
    startTransition(async () => {
      setState((current) => ({ ...current, error: null }));

      try {
        const response = await fetch(`/api/analyze?ticker=${encodeURIComponent(nextTicker)}`);
        const payload = (await response.json()) as {
          analysis?: QuantLensAnalysis;
          error?: string;
        };

        if (!response.ok || !payload.analysis) {
          throw new Error(payload.error ?? "Unable to analyze this ticker.");
        }

        setState({ analysis: payload.analysis, error: null });
      } catch (error) {
        setState({
          analysis: null,
          error: error instanceof Error ? error.message : "Unable to analyze this ticker.",
        });
      }
    });
  }, []);

  useEffect(() => {
    void runAnalysis("NVDA");
  }, [runAnalysis]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAnalysis(ticker.trim().toUpperCase());
  }

  const analysis = state.analysis;

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
                See how a systematic desk would read a stock before you decide what to do with it.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#b5bfd3]">
                Quant Lens pulls live market data, runs three signal families, and explains the result in plain English instead of hiding behind jargon. Think Bloomberg discipline with a smart-friend tone.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
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
              {starterTickers.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setTicker(suggestion);
                    void runAnalysis(suggestion);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs tracking-[0.22em] text-[#9aa7bf] uppercase transition hover:border-cyan-300/30 hover:text-cyan-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
            <p className="micro-label text-[#8aa2c5]">Signal Stack</p>
            <div className="grid gap-3 text-sm leading-7 text-[#c3ccdc]">
              <p><span className="text-white">Momentum:</span> asks whether price strength is being confirmed by real participation.</p>
              <p><span className="text-white">Mean reversion:</span> asks whether the stock has wandered too far from its own trend.</p>
              <p><span className="text-white">Volatility-adjusted:</span> blends both while punishing noisy setups that look better on paper than they trade in reality.</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.05] p-4 text-sm leading-7 text-cyan-50/90">
              The output is not a target price. It is a disciplined read on whether the current setup deserves offensive capital, patient capital, or no capital.
            </div>
          </div>
        </motion.header>

        {state.error ? (
          <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {state.error}
          </div>
        ) : null}

        {!analysis ? (
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
              <p className="micro-label text-[#7d8597]">Workflow</p>
              <div className="mt-5 space-y-4">
                {[
                  "Pull live quote, six months of daily price history, and key valuation fields.",
                  "Transform the raw tape into momentum, mean reversion, and volatility-adjusted signals.",
                  "Translate the result into conviction, risk, and a thesis written for a non-specialist.",
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
                  "Overall conviction score",
                  "Buy / hold / sell call",
                  "Sharpe ratio estimate",
                  "Key risk to the thesis",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-[#d0d6e4]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-6">
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
                    <ScoreBadge recommendation={analysis.recommendation} />
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
                        {analysis.convictionScore.toFixed(1)}
                        <span className="text-lg text-[#8f9bb2]">/10</span>
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                      <p className="micro-label text-[#7d8597]">Sharpe Est.</p>
                      <p className="mt-2 text-3xl font-semibold text-white">
                        {analysis.sharpeEstimate.toFixed(2)}
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

              <div className="grid gap-6 xl:grid-cols-3">
                <SignalCard signal={analysis.momentum} />
                <SignalCard signal={analysis.meanReversion} />
                <SignalCard signal={analysis.volatilityAdjusted} />
              </div>
            </div>

            <div className="grid gap-6">
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
              >
                <p className="micro-label text-[#7d8597]">Institutional Thesis</p>
                <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{analysis.thesis}</p>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6"
              >
                <p className="micro-label text-[#7d8597]">Biggest Risk Right Now</p>
                <p className="mt-4 text-sm leading-8 text-[#d2d8e5]">{analysis.risk}</p>
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
                    ["Momentum score", analysis.diagnostics.momentumScore.toFixed(2)],
                    ["Mean reversion score", analysis.diagnostics.meanReversionScore.toFixed(2)],
                    [
                      "Volatility-adjusted score",
                      analysis.diagnostics.volatilityAdjustedScore.toFixed(2),
                    ],
                    [
                      "Realized volatility",
                      `${(analysis.diagnostics.realizedVolatility * 100).toFixed(1)}%`,
                    ],
                    [
                      "Price vs 20D average",
                      `${(analysis.diagnostics.priceVs20DayAverage * 100).toFixed(1)}%`,
                    ],
                    [
                      "Volume ratio",
                      `${analysis.diagnostics.volumeRatio.toFixed(2)}x`,
                    ],
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
          </section>
        )}
      </section>
    </main>
  );
}
