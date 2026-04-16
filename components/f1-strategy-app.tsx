"use client";

import { useState, type CSSProperties } from "react";
import { DRIVER_OPTIONS } from "@/lib/f1-drivers";
import {
  getPitStopRecommendation,
  type PitStrategyInput,
} from "@/lib/f1-strategy";

type StrategyFormState = PitStrategyInput & {
  driverId: string;
};

const initialForm: StrategyFormState = {
  driverId: "lewis-hamilton",
  currentLap: 22,
  totalLaps: 58,
  compound: "medium",
  tireAge: 14,
  weather: "dry",
};

export function F1StrategyApp() {
  const [form, setForm] = useState<StrategyFormState>(initialForm);
  const selectedDriver =
    DRIVER_OPTIONS.find((driver) => driver.id === form.driverId) ?? DRIVER_OPTIONS[0];
  const strategy = getPitStopRecommendation(form);
  const tireStatus = getTireStatus(strategy.tireLifeUsed);
  const shellStyle = {
    "--team-accent": selectedDriver.accent,
    "--team-accent-soft": selectedDriver.accentSoft,
  } as CSSProperties;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#050608] text-white"
      style={shellStyle}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,46,46,0.24),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_22%),linear-gradient(135deg,#07080b_0%,#111317_52%,#050608_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
        <div
          className="absolute inset-y-0 left-[8%] w-px opacity-80"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--team-accent), transparent)",
          }}
        />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p
              className="mb-4 inline-flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.38em]"
              style={{ color: "color-mix(in srgb, var(--team-accent) 76%, white 24%)" }}
            >
              <span
                className="h-2 w-2 rounded-full shadow-[0_0_16px_var(--team-accent)]"
                style={{ backgroundColor: "var(--team-accent)" }}
              />
              Race Strategy Console
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
              Predict the next pit window before tire life falls away.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
              Pick a 2025 driver, set the live race state, and get a pit window,
              confidence score, and a visual read on how close the tires are to
              the cliff.
            </p>
          </div>

          <div className="grid gap-3 self-start text-sm text-white/72 sm:grid-cols-4 lg:min-w-[500px]">
            <MetricCard label="Selected Driver" value={selectedDriver.driver} />
            <MetricCard label="Team" value={selectedDriver.team} />
            <MetricCard label="Tire Risk" value={strategy.riskLabel} />
            <MetricCard label="Confidence" value={`${strategy.confidenceScore}%`} />
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/42">
                  Inputs
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Live race state
                </h2>
              </div>
              <div
                className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
                style={{
                  borderColor: "color-mix(in srgb, var(--team-accent) 40%, transparent)",
                  backgroundColor: "var(--team-accent-soft)",
                  color: "color-mix(in srgb, var(--team-accent) 72%, white 28%)",
                }}
              >
                {selectedDriver.team}
              </div>
            </div>

            <div className="grid gap-5">
              <SelectField
                label="Driver and team"
                value={form.driverId}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    driverId: value,
                  }))
                }
                options={DRIVER_OPTIONS.map((driver) => ({
                  label: `${driver.driver} — ${driver.team}`,
                  value: driver.id,
                }))}
              />
              <p className="text-sm leading-6 text-white/55">
                Driver list uses the official Formula 1 2025 season grid and
                updates the dashboard accent to the selected team color.
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Current lap"
                value={form.currentLap}
                min={1}
                max={form.totalLaps}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    currentLap: value,
                    tireAge: Math.min(current.tireAge, value - 1),
                  }))
                }
              />
              <NumberField
                label="Total laps"
                value={form.totalLaps}
                min={2}
                max={90}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    totalLaps: value,
                    currentLap: Math.min(current.currentLap, value - 1),
                  }))
                }
              />
              <NumberField
                label="Current tire age"
                value={form.tireAge}
                min={0}
                max={Math.max(form.currentLap - 1, 0)}
                onChange={(value) =>
                  setForm((current) => ({ ...current, tireAge: value }))
                }
              />
              <SelectField
                label="Weather"
                value={form.weather}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    weather: value as PitStrategyInput["weather"],
                  }))
                }
                options={[
                  { label: "Dry", value: "dry" },
                  { label: "Wet", value: "wet" },
                ]}
              />
            </div>

            <div className="mt-5">
              <SelectField
                label="Tire compound"
                value={form.compound}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    compound: value as PitStrategyInput["compound"],
                  }))
                }
                options={[
                  { label: "Soft", value: "soft" },
                  { label: "Medium", value: "medium" },
                  { label: "Hard", value: "hard" },
                ]}
              />
            </div>

            <div className="mt-8 rounded-[28px] border border-white/8 bg-black/28 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/46">
                  Tire degradation
                </span>
                <span className="text-sm text-white/66">
                  {strategy.tireLifeUsed}% used
                </span>
              </div>
              <TireDegradationVisual
                tireLifeUsed={strategy.tireLifeUsed}
                statusLabel={tireStatus.label}
                color={tireStatus.color}
              />
              <p className="mt-4 text-sm leading-6 text-white/60">
                The tire graphic shifts from green to yellow to red as the stint
                ages, while the animated wear bar shows how quickly you are
                approaching the crossover or cliff phase.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div
              className="rounded-[32px] border p-6 shadow-[0_24px_80px_rgba(255,59,48,0.14)] sm:p-8"
              style={{
                borderColor: "color-mix(in srgb, var(--team-accent) 30%, transparent)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--team-accent) 18%, transparent), rgba(255,255,255,0.04))",
                boxShadow: "0 24px 80px color-mix(in srgb, var(--team-accent) 14%, transparent)",
              }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.34em]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--team-accent) 54%, white 46%)",
                    }}
                  >
                    Recommended call
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                    {strategy.windowLabel}
                  </h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/22 px-4 py-3 text-right">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/50">
                    Model confidence
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                    {strategy.confidenceScore}%
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/78">
                {strategy.reasoning}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InsightCard
                label="Window Start"
                value={strategy.windowStartLabel}
                detail={strategy.urgencyNote}
                accent={selectedDriver.accent}
              />
              <InsightCard
                label="Window End"
                value={strategy.windowEndLabel}
                detail={strategy.extentNote}
                accent={selectedDriver.accent}
              />
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/46">
                Strategic notes
              </p>
              <div className="mt-5 grid gap-4">
                {strategy.keyFactors.map((factor) => (
                  <div
                    key={factor}
                    className="rounded-2xl border border-white/8 bg-black/22 px-4 py-4 text-sm leading-6 text-white/72"
                  >
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/28 px-4 py-4">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
        {value}
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-[28px] border bg-white/6 p-5"
      style={{ borderColor: `${accent}33` }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/42">
        {label}
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
        {value}
      </h3>
      <p className="mt-2 text-sm leading-6 text-white/62">{detail}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.26em] text-white/42">
        {label}
      </span>
      <input
        className="w-full rounded-2xl border border-white/10 bg-black/28 px-4 py-4 text-lg text-white outline-none transition focus:bg-black/34"
        style={{
          boxShadow: "none",
        }}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = "var(--team-accent)";
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.26em] text-white/42">
        {label}
      </span>
      <select
        className="w-full appearance-none rounded-2xl border border-white/10 bg-black/28 px-4 py-4 text-lg text-white outline-none transition focus:bg-black/34"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = "var(--team-accent)";
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#111317]">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TireDegradationVisual({
  tireLifeUsed,
  statusLabel,
  color,
}: {
  tireLifeUsed: number;
  statusLabel: string;
  color: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="flex items-center justify-center rounded-[24px] border border-white/8 bg-[#090b0f] p-5">
        <div
          className="tire-shell relative flex h-40 w-40 items-center justify-center rounded-full border-[12px]"
          style={{
            borderColor: color,
            boxShadow: `0 0 36px ${color}33, inset 0 0 24px ${color}26`,
          }}
        >
          <div className="absolute inset-[18px] rounded-full border border-white/10 bg-black/30" />
          <div className="absolute inset-[34px] rounded-full border border-white/10 bg-[#111317]" />
          <div className="absolute inset-[7px] rounded-full border border-dashed border-white/12" />
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-0 animate-[spin_12s_linear_infinite] rounded-full">
            <div
              className="absolute left-1/2 top-1 h-6 w-[3px] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div
              className="absolute bottom-1 left-1/2 h-6 w-[3px] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div
              className="absolute left-1 top-1/2 h-[3px] w-6 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div
              className="absolute right-1 top-1/2 h-[3px] w-6 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-semibold tracking-[-0.04em] text-white">
              {tireLifeUsed}%
            </span>
            <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/50">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-[#090b0f] p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.26em] text-white/42">
            Stint stress
          </span>
          <span className="text-sm text-white/58">{statusLabel}</span>
        </div>
        <div className="relative h-4 overflow-hidden rounded-full bg-white/8">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#34d399_0%,#facc15_55%,#ef4444_100%)] opacity-90" />
          <div
            className="absolute inset-y-0 left-0 degradation-scan rounded-full"
            style={{
              width: `${Math.max(tireLifeUsed, 10)}%`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.42), rgba(255,255,255,0.1))",
            }}
          />
          <div
            className="absolute inset-y-[-4px] w-5 rounded-full border-2 border-white/90 bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-[left] duration-500"
            style={{ left: `calc(${tireLifeUsed}% - 10px)` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
          <div>Fresh</div>
          <div className="text-center">Managed</div>
          <div className="text-right">Cliff</div>
        </div>
        <div className="mt-5 space-y-3">
          {[
            { label: "Surface grip", width: `${Math.max(12, 100 - tireLifeUsed)}%` },
            { label: "Thermal load", width: `${Math.min(100, tireLifeUsed + 10)}%` },
            { label: "Pit pressure", width: `${Math.min(100, tireLifeUsed + 18)}%` },
          ].map((bar) => (
            <div key={bar.label}>
              <div className="mb-2 flex items-center justify-between text-sm text-white/58">
                <span>{bar.label}</span>
                <span>{bar.width}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: bar.width,
                    background:
                      "linear-gradient(90deg, #34d399 0%, #facc15 58%, #ef4444 100%)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getTireStatus(tireLifeUsed: number) {
  if (tireLifeUsed >= 78) {
    return { label: "Critical", color: "#ef4444" };
  }

  if (tireLifeUsed >= 52) {
    return { label: "Managed", color: "#facc15" };
  }

  return { label: "Stable", color: "#34d399" };
}
