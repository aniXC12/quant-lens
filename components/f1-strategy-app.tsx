"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DRIVER_OPTIONS, type DriverOption } from "@/lib/f1-drivers";
import {
  buildHistoricalRaceProfile,
  type HistoricalRaceProfile,
  type HistoricalSeasonData,
} from "@/lib/f1-historical";
import { RACE_OPTIONS_2025 } from "@/lib/f1-races";
import {
  getPitStopRecommendation,
  type PitStrategyInput,
  type PitStrategyRecommendation,
} from "@/lib/f1-strategy";

type StrategyFormState = PitStrategyInput & {
  driverId: string;
  raceId: string;
};

type ViewMode = "single" | "head-to-head" | "replay";

const FIELD_HELP: Record<string, string> = {
  "View Mode": "This changes how you use the app: one driver, two drivers, or a race replay.",
  "Lead Driver": "This is the main driver currently being highlighted in the app.",
  "Primary Bet Value": "This is the app's overall rating for whether a live top-3 bet looks attractive.",
  "Historical Data": "This shows whether the app is using real completed 2025 race data behind the scenes.",
  "Comparison Edge": "This tells you which driver currently looks stronger according to the model.",
  "Driver and team": "Pick the driver you want the app to analyze.",
  Driver: "Pick the driver whose race you want to replay.",
  "Completed 2025 race": "Choose a race that already happened so the replay can use real historical data.",
  "2025 race": "Choose the circuit you want to model. The lap count updates automatically.",
  "Current lap": "This is the lap the car is on right now.",
  "Total laps": "This is the full race distance at this circuit.",
  "Current tire age": "This is how many laps the current tires have already completed.",
  Weather: "Tell the app whether the track is dry or wet because that changes tire life.",
  "Tire compound": "This is the tire type on the car. Softer tires are faster but usually wear out sooner.",
  "Gap to car behind (sec)": "This is how close the next car behind is. Small gaps increase pressure to pit.",
  "Race position": "Tell the app whether this driver is leading, because leaders can extend longer.",
  "Safety car likelihood": "Turn this on if you think a safety car is likely soon, which can make a pit stop cheaper.",
  Inputs: "This section is where you describe the race situation in simple terms.",
  "Live race state": "Fill in the current race conditions and the app will calculate a recommendation.",
  "Historical race playback": "This lets you step through a real 2025 race and watch the advice update lap by lap.",
  "Recommended call": "This is the most important output: the app's current pit strategy recommendation.",
  "Model confidence": "This is how strongly the app believes in the current recommendation.",
  "Safety Car Scenario": "This compares the normal strategy with a scenario where a safety car is likely soon.",
  "Window Start": "This is the earliest lap where pitting starts to make sense.",
  "Window End": "This is the latest lap where the current strategy still looks strong.",
  "Risk Alert": "This warns you about threats or opportunities that could change the strategy quickly.",
  "Betting Implications": "This shows how the strategy might affect finishing position and live betting value.",
  "Finish odds": "This estimates how the strategy affects the driver's chance of finishing strongly.",
  "Strategy impact": "This explains in plain English how the recommendation could change race position.",
  "Live bet value": "This is the app's summary score for whether now looks like a good betting moment.",
  "Strategic Notes": "These are the main reasons the model is making this recommendation.",
  "Historical Calibration": "This shows how the app is using real 2025 race data to ground the prediction.",
  "Replay Timeline": "This lets you compare the live recommendation with what actually happened in the race.",
  "Replay Status": "This shows where you are in the replay right now.",
  Playback: "Use this to start or pause the lap-by-lap replay.",
  Controls: "Use this to reset the replay back to the beginning.",
  Speed: "This controls how quickly the replay moves through the laps.",
  Race: "This shows the race the replay or analysis is based on.",
  "Actual stop count": "This is how many times the selected driver really pitted in that race.",
  "Decision match": "This shows whether the app agreed with the real pit call when the stop happened.",
  "Head To Head": "This section compares two drivers side by side so you can quickly see who looks stronger.",
};

const FIELD_TOOLTIP: Record<string, string> = {
  "Tire compound":
    "Soft tires are faster but wear out sooner. Hard tires are slower but usually last longer.",
  "Undercut threat":
    "An undercut is when a car pits earlier, gets fresh tires, and jumps ahead when others stop later.",
  "Overcut opportunity":
    "An overcut is when a car stays out longer and gains time while rivals are in the pits or in traffic.",
  "Bet value":
    "This is a simple 1-10 score for how attractive a top-3 live bet looks right now.",
};

const initialRace =
  RACE_OPTIONS_2025.find((race) => race.id === "great-britain") ??
  RACE_OPTIONS_2025[0];

const initialForm = createInitialForm("lewis-hamilton", initialRace.id);
const initialChallengerForm = createInitialForm("max-verstappen", initialRace.id);
const initialReplayForm = createInitialReplayForm("lewis-hamilton", initialRace.id);

export function F1StrategyApp() {
  const [viewMode, setViewMode] = useState<ViewMode>("replay");
  const [primaryForm, setPrimaryForm] = useState<StrategyFormState>(initialForm);
  const [secondaryForm, setSecondaryForm] =
    useState<StrategyFormState>(initialChallengerForm);
  const [replayForm, setReplayForm] = useState<StrategyFormState>(initialReplayForm);
  const [historicalData, setHistoricalData] = useState<HistoricalSeasonData | null>(
    null,
  );
  const [historicalStatus, setHistoricalStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 4>(1);
  const [replayPitEvent, setReplayPitEvent] = useState<{
    lap: number;
    matchedRecommendation: boolean;
  } | null>(null);

  const primaryDriver = getDriver(primaryForm.driverId);
  const secondaryDriver = getDriver(secondaryForm.driverId);
  const primaryHistoricalContext = buildHistoricalRaceProfile(
    historicalData,
    primaryForm.raceId,
    primaryForm.driverId,
  );
  const secondaryHistoricalContext = buildHistoricalRaceProfile(
    historicalData,
    secondaryForm.raceId,
    secondaryForm.driverId,
  );
  const replayHistoricalContext = buildHistoricalRaceProfile(
    historicalData,
    replayForm.raceId,
    replayForm.driverId,
  );
  const primaryStrategy = getPitStopRecommendation({
    ...primaryForm,
    historicalContext: primaryHistoricalContext,
  });
  const secondaryStrategy = getPitStopRecommendation({
    ...secondaryForm,
    historicalContext: secondaryHistoricalContext,
  });
  const primaryBaselineStrategy = getPitStopRecommendation({
    ...primaryForm,
    safetyCarLikely: false,
    historicalContext: primaryHistoricalContext,
  });
  const secondaryBaselineStrategy = getPitStopRecommendation({
    ...secondaryForm,
    safetyCarLikely: false,
    historicalContext: secondaryHistoricalContext,
  });
  const replayStrategy = getPitStopRecommendation({
    ...replayForm,
    historicalContext: replayHistoricalContext,
  });
  const replayBaselineStrategy = getPitStopRecommendation({
    ...replayForm,
    safetyCarLikely: false,
    historicalContext: replayHistoricalContext,
  });
  const shellStyle = {
    "--team-accent": primaryDriver.accent,
    "--team-accent-soft": primaryDriver.accentSoft,
  } as CSSProperties;

  const comparisonWinner =
    primaryStrategy.bettingValueScore === secondaryStrategy.bettingValueScore
      ? null
      : primaryStrategy.bettingValueScore > secondaryStrategy.bettingValueScore
        ? "primary"
        : "secondary";

  const replayDriver = getDriver(replayForm.driverId);
  const replayRace = getRace(replayForm.raceId);
  const replayActualPitLaps = useMemo(
    () => replayHistoricalContext?.driverPitLaps ?? [],
    [replayHistoricalContext],
  );
  const replayUpcomingPitLap =
    replayActualPitLaps.find((lap) => lap >= replayForm.currentLap) ?? null;

  useEffect(() => {
    let ignore = false;

    async function loadHistoricalData() {
      try {
        setHistoricalStatus("loading");
        const response = await fetch("/api/f1/historical?season=2025");

        if (!response.ok) {
          throw new Error(`Historical API failed with ${response.status}`);
        }

        const payload = (await response.json()) as HistoricalSeasonData;

        if (!ignore) {
          setHistoricalData(payload);
          setHistoricalStatus("ready");
        }
      } catch {
        if (!ignore) {
          setHistoricalStatus("error");
        }
      }
    }

    void loadHistoricalData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (
      viewMode !== "replay" ||
      !isReplayPlaying ||
      historicalStatus !== "ready" ||
      !replayHistoricalContext?.completed
    ) {
      return;
    }

    if (replayForm.currentLap >= replayForm.totalLaps) {
      setIsReplayPlaying(false);
      return;
    }

    const interval = window.setInterval(() => {
      const nextLap = Math.min(replayForm.currentLap + 1, replayForm.totalLaps);
      const didPit = replayActualPitLaps.includes(nextLap);

      if (didPit) {
        const windowStart = replayStrategy.windowStart ?? replayForm.totalLaps + 1;
        const windowEnd = replayStrategy.windowEnd ?? replayForm.totalLaps + 1;
        const matched =
          replayStrategy.windowStart != null &&
          nextLap >= windowStart &&
          nextLap <= windowEnd;

        setReplayPitEvent({
          lap: nextLap,
          matchedRecommendation: matched,
        });
      }

      setReplayForm((current) => ({
        ...current,
        currentLap: nextLap,
        tireAge: didPit ? 0 : current.tireAge + 1,
      }));

      if (nextLap >= replayForm.totalLaps) {
        setIsReplayPlaying(false);
      }
    }, 1200 / replaySpeed);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    historicalStatus,
    isReplayPlaying,
    replayActualPitLaps,
    replayForm,
    replayHistoricalContext,
    replaySpeed,
    replayStrategy,
    viewMode,
  ]);

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
        <header className="mb-8 flex flex-col gap-8 border-b border-white/10 pb-8 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p
              className="mb-4 inline-flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.4em]"
              style={{
                color:
                  "color-mix(in srgb, var(--team-accent) 76%, white 24%)",
              }}
            >
              <span
                className="h-2 w-2 rounded-full shadow-[0_0_16px_var(--team-accent)]"
                style={{ backgroundColor: "var(--team-accent)" }}
              />
              Race Strategy Console
            </p>
            <h1 className="max-w-4xl text-[3rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-[4rem]">
              See when an F1 driver should pit, and whether that helps a top-3 bet.
            </h1>
            <p className="mt-4 max-w-3xl text-[1rem] leading-7 text-white/72 sm:text-[1.08rem]">
              Pick a race, driver, and simple race situation. The app tells you
              the best pit window, the risk around that decision, and whether the
              setup looks good for a live top-3 bet.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/52">
              New here? Start with Replay Mode to watch a real 2025 race unfold
              lap by lap.
            </p>
          </div>

          <div className="grid w-full max-w-[720px] gap-3 self-start text-sm text-white/72 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="View Mode"
              value={
                viewMode === "single"
                  ? "Single"
                  : viewMode === "head-to-head"
                    ? "Head to head"
                    : "Replay"
              }
            />
            <MetricCard label="Lead Driver" value={primaryDriver.driver} />
            <MetricCard label="Primary Bet Value" value={`${primaryStrategy.bettingValueScore}/10`} />
            <MetricCard
              label="Historical Data"
              value={
                historicalStatus === "loading"
                  ? "Loading"
                  : historicalStatus === "ready"
                    ? "Live 2025"
                    : "Unavailable"
              }
            />
            <MetricCard
              label="Comparison Edge"
              value={
                viewMode === "single"
                  ? primaryStrategy.positionDeltaLabel
                  : viewMode === "replay"
                    ? replayPitEvent
                      ? replayPitEvent.matchedRecommendation
                        ? "Matched"
                        : "Diverged"
                      : "Tracking"
                  : comparisonWinner === null
                    ? "Even"
                    : comparisonWinner === "primary"
                      ? primaryDriver.driver.split(" ")[1] ?? primaryDriver.driver
                      : secondaryDriver.driver.split(" ")[1] ?? secondaryDriver.driver
              }
            />
          </div>
        </header>

        <section className="mb-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.34em] text-white/42">
                How To Use It
              </p>
              <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-white">
                Start with replay, then compare or customize.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Replay Mode shows a real race and is the fastest way to understand
                what the app does. Single Driver is best for a quick answer.
                Head to Head is best when you want to compare two possible bets.
              </p>
            </div>
            {viewMode === "replay" ? (
              <motion.button
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={() => setViewMode("replay")}
                className="rounded-[24px] border border-[#ff5f56]/50 bg-[linear-gradient(180deg,#ff5f56,#c91f16)] px-6 py-5 text-left shadow-[0_14px_48px_rgba(255,95,86,0.35)]"
              >
                <div className="text-[0.64rem] font-semibold uppercase tracking-[0.34em] text-white/80">
                  Hero Feature
                </div>
                <div className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-white">
                  Replay a real 2025 race
                </div>
              </motion.button>
            ) : null}
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-3">
          <ModeButton
            active={viewMode === "single"}
            label="Single Driver"
            description="One driver, full strategy and betting view."
            onClick={() => setViewMode("single")}
          />
          <ModeButton
            active={viewMode === "head-to-head"}
            label="Head to Head"
            description="Two drivers, separate race states, direct comparison."
            onClick={() => setViewMode("head-to-head")}
          />
          <ModeButton
            active={viewMode === "replay"}
            label="Replay Mode"
            description="Play through a completed 2025 race lap by lap."
            onClick={() => setViewMode("replay")}
          />
        </div>

        {viewMode === "single" ? (
          <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] 2xl:gap-6">
            <StrategyInputPanel
              title="Live race state"
              driver={primaryDriver}
              form={primaryForm}
              onChange={setPrimaryForm}
            />
            <StrategyOutputPanel
              driver={primaryDriver}
              strategy={primaryStrategy}
              baselineStrategy={primaryBaselineStrategy}
              safetyCarLikely={primaryForm.safetyCarLikely}
              historicalContext={primaryHistoricalContext}
              historicalStatus={historicalStatus}
            />
          </div>
        ) : viewMode === "head-to-head" ? (
          <div className="flex flex-1 flex-col gap-6">
            <ComparisonSummary
              primaryDriver={primaryDriver}
              secondaryDriver={secondaryDriver}
              primaryStrategy={primaryStrategy}
              secondaryStrategy={secondaryStrategy}
              winner={comparisonWinner}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-6">
                <StrategyInputPanel
                  title="Driver A race state"
                  driver={primaryDriver}
                  form={primaryForm}
                  onChange={setPrimaryForm}
                />
                <StrategyOutputPanel
                  driver={primaryDriver}
                  strategy={primaryStrategy}
                  baselineStrategy={primaryBaselineStrategy}
                  safetyCarLikely={primaryForm.safetyCarLikely}
                  historicalContext={primaryHistoricalContext}
                  historicalStatus={historicalStatus}
                />
              </div>

              <div className="space-y-6">
                <StrategyInputPanel
                  title="Driver B race state"
                  driver={secondaryDriver}
                  form={secondaryForm}
                  onChange={setSecondaryForm}
                />
                <StrategyOutputPanel
                  driver={secondaryDriver}
                  strategy={secondaryStrategy}
                  baselineStrategy={secondaryBaselineStrategy}
                  safetyCarLikely={secondaryForm.safetyCarLikely}
                  historicalContext={secondaryHistoricalContext}
                  historicalStatus={historicalStatus}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] 2xl:gap-6">
            <ReplayInputPanel
              driver={replayDriver}
              race={replayRace}
              form={replayForm}
              onChange={setReplayForm}
              historicalStatus={historicalStatus}
              historicalContext={replayHistoricalContext}
              isPlaying={isReplayPlaying}
              onTogglePlay={() => {
                if (replayForm.currentLap >= replayForm.totalLaps) {
                  setReplayForm((current) => ({
                    ...current,
                    currentLap: 1,
                    tireAge: 0,
                  }));
                  setReplayPitEvent(null);
                }

                setIsReplayPlaying((current) => !current);
              }}
              onReset={() => {
                setReplayForm((current) => ({
                  ...current,
                  currentLap: 1,
                  tireAge: 0,
                }));
                setReplayPitEvent(null);
                setIsReplayPlaying(false);
              }}
              replaySpeed={replaySpeed}
              onSpeedChange={setReplaySpeed}
              upcomingPitLap={replayUpcomingPitLap}
            />
            <ReplayOutputPanel
              driver={replayDriver}
              strategy={replayStrategy}
              baselineStrategy={replayBaselineStrategy}
              safetyCarLikely={replayForm.safetyCarLikely}
              historicalContext={replayHistoricalContext}
              historicalStatus={historicalStatus}
              currentLap={replayForm.currentLap}
              actualPitLaps={replayActualPitLaps}
              pitEvent={replayPitEvent}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function StrategyInputPanel({
  title,
  driver,
  form,
  onChange,
}: {
  title: string;
  driver: DriverOption;
  form: StrategyFormState;
  onChange: React.Dispatch<React.SetStateAction<StrategyFormState>>;
}) {
  const strategy = getPitStopRecommendation(form);
  const tireStatus = getTireStatus(strategy.tireLifeUsed);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-7"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.36em] text-white/38">
            Inputs
          </p>
          <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-white">
            {title}
          </h2>
        </div>
        <div
          className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
          style={{
            borderColor: `${driver.accent}66`,
            backgroundColor: driver.accentSoft,
            color: "color-mix(in srgb, white 28%, black 0%)",
          }}
        >
          {driver.team}
        </div>
      </div>

      <div className="grid gap-4">
        <StepCard
          step={1}
          title="Pick the race"
          description="Start by choosing the circuit. The app will automatically fill in the race distance."
        >
          <SelectField
            label="2025 race"
            value={form.raceId}
            onChange={(value) => {
              const selectedRace = getRace(value);
              onChange((current) => {
                const nextCurrentLap = Math.min(
                  current.currentLap,
                  selectedRace.laps - 1,
                );

                return {
                  ...current,
                  raceId: selectedRace.id,
                  totalLaps: selectedRace.laps,
                  currentLap: nextCurrentLap,
                  tireAge: Math.min(
                    current.tireAge,
                    Math.max(nextCurrentLap - 1, 0),
                  ),
                };
              });
            }}
            options={RACE_OPTIONS_2025.map((option) => ({
              label: `R${option.round} — ${option.grandPrix}`,
              value: option.id,
            }))}
            accent={driver.accent}
          />
        </StepCard>

        <StepCard
          step={2}
          title="Pick the driver"
          description="Choose the driver you want the app to analyze."
        >
          <SelectField
            label="Driver and team"
            value={form.driverId}
            onChange={(value) =>
              onChange((current) => ({
                ...current,
                driverId: value,
              }))
            }
            options={DRIVER_OPTIONS.map((option) => ({
              label: `${option.driver} — ${option.team}`,
              value: option.id,
            }))}
            accent={driver.accent}
          />
        </StepCard>

        <StepCard
          step={3}
          title="Describe the tires"
          description="Tell the app what tires the car is on and how worn they are."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              label="Current lap"
              value={form.currentLap}
              min={1}
              max={form.totalLaps}
              onChange={(value) =>
                onChange((current) => ({
                  ...current,
                  currentLap: value,
                  tireAge: Math.min(current.tireAge, value - 1),
                }))
              }
              accent={driver.accent}
            />
            <NumberField
              label="Total laps"
              value={form.totalLaps}
              min={2}
              max={90}
              onChange={(value) =>
                onChange((current) => ({
                  ...current,
                  totalLaps: value,
                  currentLap: Math.min(current.currentLap, value - 1),
                }))
              }
              accent={driver.accent}
            />
            <NumberField
              label="Current tire age"
              value={form.tireAge}
              min={0}
              max={Math.max(form.currentLap - 1, 0)}
              onChange={(value) =>
                onChange((current) => ({ ...current, tireAge: value }))
              }
              accent={driver.accent}
            />
            <SelectField
              label="Tire compound"
              value={form.compound}
              onChange={(value) =>
                onChange((current) => ({
                  ...current,
                  compound: value as PitStrategyInput["compound"],
                }))
              }
              options={[
                { label: "Soft", value: "soft" },
                { label: "Medium", value: "medium" },
                { label: "Hard", value: "hard" },
              ]}
              accent={driver.accent}
            />
            <SelectField
              label="Weather"
              value={form.weather}
              onChange={(value) =>
                onChange((current) => ({
                  ...current,
                  weather: value as PitStrategyInput["weather"],
                }))
              }
              options={[
                { label: "Dry", value: "dry" },
                { label: "Wet", value: "wet" },
              ]}
              accent={driver.accent}
            />
          </div>
        </StepCard>

        <StepCard
          step={4}
          title="Describe the race situation"
          description="Tell the app if the driver is under pressure or leading comfortably."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              label="Gap to car behind (sec)"
              value={form.gapBehindSeconds}
              min={0}
              max={30}
              step={0.1}
              onChange={(value) =>
                onChange((current) => ({
                  ...current,
                  gapBehindSeconds: value,
                }))
              }
              accent={driver.accent}
            />
            <ToggleField
              label="Race position"
              checked={form.isLeading}
              checkedLabel="Leading the race"
              uncheckedLabel="Not leading"
              accent={driver.accent}
              onChange={(checked) =>
                onChange((current) => ({
                  ...current,
                  isLeading: checked,
                }))
              }
            />
          </div>
        </StepCard>

        <div className="rounded-[26px] border border-[#f59e0b]/40 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(245,158,11,0.06))] p-5 shadow-[0_12px_32px_rgba(245,158,11,0.12)]">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-[#f59e0b] px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-black">
              Critical
            </div>
            <div>
              <h3 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-white">
                Safety car assumption
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/72">
                Turn this on only if you think a safety car is likely soon. It can
                significantly change the best pit timing because stops become cheaper.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ToggleField
              label="Safety car likelihood"
              checked={form.safetyCarLikely}
              checkedLabel="Safety car likely in next 10 laps"
              uncheckedLabel="Normal green-flag scenario"
              accent="#f59e0b"
              onChange={(checked) =>
                onChange((current) => ({
                  ...current,
                  safetyCarLikely: checked,
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-white/8 bg-black/28 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-white/44">
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
      </div>
    </motion.section>
  );
}

function ReplayInputPanel({
  driver,
  race,
  form,
  onChange,
  historicalStatus,
  historicalContext,
  isPlaying,
  onTogglePlay,
  onReset,
  replaySpeed,
  onSpeedChange,
  upcomingPitLap,
}: {
  driver: DriverOption;
  race: (typeof RACE_OPTIONS_2025)[number];
  form: StrategyFormState;
  onChange: React.Dispatch<React.SetStateAction<StrategyFormState>>;
  historicalStatus: "loading" | "ready" | "error";
  historicalContext: HistoricalRaceProfile | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  replaySpeed: 1 | 2 | 4;
  onSpeedChange: React.Dispatch<React.SetStateAction<1 | 2 | 4>>;
  upcomingPitLap: number | null;
}) {
  const completedRaceOptions = RACE_OPTIONS_2025;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-7"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.36em] text-white/38">
            Replay Mode
          </p>
          <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-white">
            Historical race playback
          </h2>
        </div>
        <div
          className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]"
          style={{
            borderColor: `${driver.accent}66`,
            backgroundColor: driver.accentSoft,
            color: "color-mix(in srgb, white 28%, black 0%)",
          }}
        >
          {driver.team}
        </div>
      </div>

      <div className="grid gap-5">
        <SelectField
          label="Driver"
          value={form.driverId}
          onChange={(value) => {
            onChange((current) => ({
              ...createInitialReplayForm(value, current.raceId),
            }));
          }}
          options={DRIVER_OPTIONS.map((option) => ({
            label: `${option.driver} — ${option.team}`,
            value: option.id,
          }))}
          accent={driver.accent}
        />
        <SelectField
          label="Completed 2025 race"
          value={form.raceId}
          onChange={(value) => {
            const selectedRace = getRace(value);
            onChange((current) => ({
              ...createInitialReplayForm(current.driverId, selectedRace.id),
            }));
          }}
          options={completedRaceOptions.map((option) => ({
            label: `R${option.round} — ${option.grandPrix}`,
            value: option.id,
          }))}
          accent={driver.accent}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-end">
        <div className="rounded-[24px] border border-white/8 bg-black/24 px-4 py-4">
          <LabelHeading label="Replay Status" />
          <AnimatedMetric
            value={`Lap ${form.currentLap}/${form.totalLaps}`}
            className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-white"
          />
          <p className="mt-2 text-sm leading-6 text-white/58">
            {historicalStatus === "loading"
              ? "Loading historical race data"
              : historicalContext
                ? `Next real pit: ${upcomingPitLap != null ? `lap ${upcomingPitLap}` : "none"}`
                : "Historical replay data unavailable for this selection"}
          </p>
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!historicalContext}
          className="min-h-[176px] min-w-[320px] rounded-[32px] border border-[#ff5f56]/60 bg-[linear-gradient(180deg,#ff5f56,#c91f16)] px-7 py-7 text-left shadow-[0_22px_64px_rgba(255,95,86,0.42)] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-white/82">
            Replay Control
          </div>
          <div className="mt-5 flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/12 text-4xl text-white">
              {isPlaying ? "||" : "▶"}
            </div>
            <div className="text-[2rem] font-semibold tracking-[-0.05em] text-white">
              {isPlaying ? "Pause replay" : form.currentLap >= form.totalLaps ? "Play replay again" : "Play race replay"}
            </div>
          </div>
          <p className="mt-4 text-[0.98rem] leading-7 text-white/84">
            Watch the race unfold lap by lap and compare the app’s strategy call
            with what the team actually did.
          </p>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="rounded-[24px] border border-white/10 bg-black/24 px-5 py-4 text-left transition"
        >
          <LabelHeading label="Controls" />
          <div className="mt-2 text-[1.2rem] font-semibold tracking-[-0.04em] text-white">
            Reset
          </div>
          <p className="mt-2 text-sm leading-6 text-white/58">
            Jump back to lap 1 and restart the race story.
          </p>
        </button>
      </div>

      <div className="mt-5">
        <p className="mb-2.5 block text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-white/42">
          Speed
        </p>
        <div className="flex gap-3">
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSpeedChange(speed as 1 | 2 | 4)}
              className="rounded-[20px] border px-4 py-3 text-sm font-semibold tracking-[-0.02em] transition"
              style={{
                borderColor:
                  replaySpeed === speed ? `${driver.accent}88` : "rgba(255,255,255,0.1)",
                backgroundColor:
                  replaySpeed === speed ? driver.accentSoft : "rgba(255,255,255,0.03)",
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <InsightCard
          label="Race"
          value={race.grandPrix}
          detail={historicalContext ? historicalContext.strategyTrend : "Awaiting completed-race data"}
          accent={driver.accent}
        />
        <InsightCard
          label="Actual stop count"
          value={
            historicalContext?.driverPitStops != null
              ? `${historicalContext.driverPitStops}`
              : "N/A"
          }
          detail={
            historicalContext?.driverPitLaps.length
              ? `Pit laps: ${historicalContext.driverPitLaps.join(", ")}`
              : "Pit-stop timeline unavailable"
          }
          accent={driver.accent}
        />
      </div>
    </motion.section>
  );
}

function ReplayOutputPanel({
  driver,
  strategy,
  baselineStrategy,
  safetyCarLikely,
  historicalContext,
  historicalStatus,
  currentLap,
  actualPitLaps,
  pitEvent,
}: {
  driver: DriverOption;
  strategy: PitStrategyRecommendation;
  baselineStrategy: PitStrategyRecommendation;
  safetyCarLikely: boolean;
  historicalContext: HistoricalRaceProfile | null;
  historicalStatus: "loading" | "ready" | "error";
  currentLap: number;
  actualPitLaps: number[];
  pitEvent: { lap: number; matchedRecommendation: boolean } | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <StrategyOutputPanel
        driver={driver}
        strategy={strategy}
        baselineStrategy={baselineStrategy}
        safetyCarLikely={safetyCarLikely}
        historicalContext={historicalContext}
        historicalStatus={historicalStatus}
      />

      <PremiumCard title="Replay Timeline">
        <div className="flex flex-col gap-4">
          <div className="rounded-[24px] border border-white/8 bg-black/24 px-4 py-4">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-white/42">
              Live replay state
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <AnimatedMetric
                value={`Lap ${currentLap}`}
                className="text-[2rem] font-semibold tracking-[-0.05em] text-white"
              />
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/64">
                {actualPitLaps.includes(currentLap)
                  ? "Actual pit this lap"
                  : "No actual pit this lap"}
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-black/24 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-white/42">
                Real pit lap markers
              </p>
              <p className="text-sm text-white/52">
                {actualPitLaps.length > 0 ? actualPitLaps.join(" • ") : "No pit stops recorded"}
              </p>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-white/8">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#ffffff,#ff5f56)]"
                style={{ width: `${Math.min(100, (currentLap / Math.max(currentLap, actualPitLaps[actualPitLaps.length - 1] ?? currentLap)) * 100)}%` }}
              />
              {actualPitLaps.map((lap) => (
                <div
                  key={lap}
                  className="absolute inset-y-[-3px] w-[3px] rounded-full bg-[#ff5f56] shadow-[0_0_14px_rgba(255,95,86,0.85)]"
                  style={{ left: `calc(${(lap / Math.max(currentLap, historicalContext?.winnerLaps ?? currentLap, 1)) * 100}% - 1px)` }}
                />
              ))}
            </div>
          </div>

          <InsightCard
            label="Decision match"
            value={
              pitEvent
                ? pitEvent.matchedRecommendation
                  ? "Matched real pit call"
                  : "Diverged from real pit call"
                : "Waiting for pit event"
            }
            detail={
              pitEvent
                ? `At lap ${pitEvent.lap}, the app ${pitEvent.matchedRecommendation ? "aligned with" : "disagreed with"} the actual team stop.`
                : "When the driver reaches a real pit stop lap, this will compare the app's recommendation to the historical decision."
            }
            accent={driver.accent}
          />
        </div>
      </PremiumCard>
    </div>
  );
}

function StrategyOutputPanel({
  driver,
  strategy,
  baselineStrategy,
  safetyCarLikely,
  historicalContext,
  historicalStatus,
}: {
  driver: DriverOption;
  strategy: PitStrategyRecommendation;
  baselineStrategy: PitStrategyRecommendation;
  safetyCarLikely: boolean;
  historicalContext: HistoricalRaceProfile | null;
  historicalStatus: "loading" | "ready" | "error";
}) {
  const hasScenarioChanges =
    safetyCarLikely &&
    (strategy.windowLabel !== baselineStrategy.windowLabel ||
      strategy.bettingValueScore !== baselineStrategy.bettingValueScore ||
      strategy.strategyAlertTitle !== baselineStrategy.strategyAlertTitle);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex flex-col gap-5"
    >
      <motion.div
        layout
        className="rounded-[30px] border p-5 shadow-[0_24px_80px_rgba(255,59,48,0.14)] sm:p-7"
        style={{
          borderColor: `${driver.accent}4d`,
          background: `linear-gradient(180deg, color-mix(in srgb, ${driver.accent} 22%, transparent), rgba(255,255,255,0.04))`,
          boxShadow: `0 24px 80px ${driver.accent}24`,
        }}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-start">
          <div>
            <LabelHeading label="Recommended call" />
            <AnimatePresence mode="wait">
              <motion.h2
                key={strategy.windowLabel}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="mt-3 text-[2.1rem] font-semibold tracking-[-0.06em] text-white sm:text-[2.8rem]"
              >
                {strategy.windowLabel}
              </motion.h2>
            </AnimatePresence>
            <p className="mt-3 text-base leading-7 text-white/84">
              This is the app’s plain-English answer for what the team should do next.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-[22px] border border-white/10 bg-black/30 px-4 py-4">
              <LabelHeading label="Live bet value" />
              <AnimatedMetric
                value={`${strategy.bettingValueScore}/10`}
                className="mt-2 text-[2.2rem] font-semibold tracking-[-0.06em] text-white"
              />
              <p className="mt-2 text-sm leading-6 text-white/58">
                A simple score for whether this looks like a strong top-3 live bet right now.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/30 px-4 py-4">
              <LabelHeading label="Model confidence" />
              <AnimatedMetric
                value={`${strategy.confidenceScore}%`}
                className="mt-2 text-[1.8rem] font-semibold tracking-[-0.05em] text-white"
              />
              <p className="mt-2 text-sm leading-6 text-white/58">
                How strongly the app believes in this recommendation.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-white/74">
          {strategy.reasoning}
        </p>
      </motion.div>

      {safetyCarLikely ? (
        <PremiumCard title="Safety Car Scenario">
          <h3 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-white">
            {hasScenarioChanges
              ? "Recommendation updated for likely safety car"
              : "Safety-car assumption does not materially change the call"}
          </h3>
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <InsightCard
              label="Window change"
              value={strategy.windowLabel}
              detail={`Normal scenario: ${baselineStrategy.windowLabel}`}
              accent={driver.accent}
            />
            <InsightCard
              label="Bet value"
              value={`${strategy.bettingValueScore}/10`}
              detail={`Normal scenario: ${baselineStrategy.bettingValueScore}/10`}
              accent={driver.accent}
            />
            <InsightCard
              label="Alert change"
              value={strategy.strategyAlertTitle}
              detail={`Normal scenario: ${baselineStrategy.strategyAlertTitle}`}
              accent={driver.accent}
            />
          </div>
        </PremiumCard>
      ) : null}

      {historicalStatus === "loading" || historicalContext ? (
        <PremiumCard title="Historical Calibration">
          {historicalStatus === "loading" ? (
            <p className="text-[0.96rem] leading-7 text-white/64">
              Loading completed 2025 race data from the Ergast-compatible feed.
            </p>
          ) : historicalContext ? (
            <>
              <h3 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-white">
                {strategy.historicalAdjustmentTitle ?? "Historical race profile active"}
              </h3>
              <p className="mt-4 text-[0.96rem] leading-7 text-white/74">
                {strategy.historicalAdjustmentBody ??
                  `This strategy is being calibrated using completed 2025 race data for ${historicalContext.raceName}.`}
              </p>
              <div className="mt-5 grid gap-3 xl:grid-cols-3">
                <InsightCard
                  label="Avg stops"
                  value={historicalContext.avgPitStops.toFixed(1)}
                  detail={historicalContext.strategyTrend}
                  accent={driver.accent}
                />
                <InsightCard
                  label="Median first stop"
                  value={
                    historicalContext.medianFirstPitLap != null
                      ? `Lap ${historicalContext.medianFirstPitLap}`
                      : "N/A"
                  }
                  detail={`Winner completed ${historicalContext.winnerLaps ?? "?"} laps`}
                  accent={driver.accent}
                />
                <InsightCard
                  label="Driver result"
                  value={
                    historicalContext.driverFinishPosition != null
                      ? `P${historicalContext.driverFinishPosition}`
                      : "No finish data"
                  }
                  detail={
                    historicalContext.driverPitStops != null
                      ? `Actual stops: ${historicalContext.driverPitStops}`
                      : "Driver-specific stop history unavailable"
                  }
                  accent={driver.accent}
                />
              </div>
            </>
          ) : null}
        </PremiumCard>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        <InsightCard
          label="Window Start"
          value={strategy.windowStartLabel}
          detail={strategy.urgencyNote}
          accent={driver.accent}
        />
        <InsightCard
          label="Window End"
          value={strategy.windowEndLabel}
          detail={strategy.extentNote}
          accent={driver.accent}
        />
      </div>

      <PremiumCard
        title="Risk Alert"
        borderColor={getAlertAccent(strategy.strategyAlertLevel, driver.accent)}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-white">
              {strategy.strategyAlertTitle}
            </h3>
            <p className="mt-4 max-w-2xl text-[0.96rem] leading-7 text-white/74">
              {strategy.strategyAlertBody}
            </p>
          </div>
          <div
            className="min-w-[150px] rounded-[22px] border px-4 py-3 text-right"
            style={{
              borderColor: getAlertAccent(strategy.strategyAlertLevel, driver.accent),
              backgroundColor: "rgba(0,0,0,0.24)",
            }}
          >
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-white/46">
              Alert level
            </p>
            <AnimatedMetric
              value={strategy.strategyAlertLevel.toUpperCase()}
              className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-white"
            />
          </div>
        </div>
      </PremiumCard>

      <PremiumCard title="Betting Implications">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-white">
              {strategy.bettingSignal}
            </h3>
          </div>
          <div
            className="min-w-[170px] rounded-[22px] border px-4 py-3 text-right"
            style={{
              borderColor: `${driver.accent}44`,
              backgroundColor: "rgba(0,0,0,0.24)",
            }}
          >
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-white/46">
              +/- positions
            </p>
            <AnimatedMetric
              value={strategy.positionDeltaLabel}
              className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-white"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <InsightCard
            label="Finish odds"
            value={strategy.finishOddsLabel}
            detail={`Confidence remains ${strategy.confidenceScore}% on the pit window model.`}
            accent={driver.accent}
          />
          <InsightCard
            label="Strategy impact"
            value={strategy.positionDeltaLabel}
            detail={strategy.bettingReasoning}
            accent={driver.accent}
          />
        </div>

        <div className="mt-3">
          <InsightCard
            label="Live bet value"
            value={`${strategy.bettingValueScore}/10`}
            detail={`${strategy.bettingValueLabel}. ${strategy.bettingValueReasoning}`}
            accent={driver.accent}
          />
        </div>

        <p className="mt-4 text-sm leading-6 text-white/48">
          This is a strategy-based betting signal derived from the predicted pit
          window and tire state, not live sportsbook pricing or market odds.
        </p>
      </PremiumCard>

      <PremiumCard title="Strategic Notes">
        <div className="mt-1 grid gap-3">
          {strategy.keyFactors.map((factor) => (
            <motion.div
              layout
              key={factor}
              className="rounded-[20px] border border-white/8 bg-black/22 px-4 py-4 text-sm leading-6 text-white/72"
            >
              {factor}
            </motion.div>
          ))}
        </div>
      </PremiumCard>
    </motion.section>
  );
}

function ComparisonSummary({
  primaryDriver,
  secondaryDriver,
  primaryStrategy,
  secondaryStrategy,
  winner,
}: {
  primaryDriver: DriverOption;
  secondaryDriver: DriverOption;
  primaryStrategy: PitStrategyRecommendation;
  secondaryStrategy: PitStrategyRecommendation;
  winner: "primary" | "secondary" | null;
}) {
  const headline =
    winner === null
      ? "Both drivers are rating as near-equal live spots."
      : winner === "primary"
        ? `${primaryDriver.driver} has the stronger strategic position right now.`
        : `${secondaryDriver.driver} has the stronger strategic position right now.`;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 backdrop-blur-xl sm:p-7"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/46">
            Head To Head
          </p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-white">
            {headline}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
            This comparison weights bet value, position swing, confidence, and
            alert severity to highlight which driver currently has the cleaner
            strategic path.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.72fr_1fr]">
        <ComparisonStat
          label={primaryDriver.driver}
          value={`${primaryStrategy.bettingValueScore}/10`}
          detail={`${primaryStrategy.windowLabel} • ${primaryStrategy.positionDeltaLabel}`}
          accent={primaryDriver.accent}
          emphasized={winner === "primary"}
        />
        <ComparisonStat
          label="Delta"
          value={`${primaryStrategy.bettingValueScore - secondaryStrategy.bettingValueScore >= 0 ? "+" : ""}${primaryStrategy.bettingValueScore - secondaryStrategy.bettingValueScore}`}
          detail="Bet value spread"
          accent="#ffffff"
          emphasized={false}
        />
        <ComparisonStat
          label={secondaryDriver.driver}
          value={`${secondaryStrategy.bettingValueScore}/10`}
          detail={`${secondaryStrategy.windowLabel} • ${secondaryStrategy.positionDeltaLabel}`}
          accent={secondaryDriver.accent}
          emphasized={winner === "secondary"}
        />
      </div>
    </motion.section>
  );
}

function ComparisonStat({
  label,
  value,
  detail,
  accent,
  emphasized,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
  emphasized: boolean;
}) {
  return (
    <motion.div
      layout
      className="rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))] p-5"
      style={{
        borderColor: emphasized ? `${accent}88` : `${accent}33`,
        boxShadow: emphasized ? `0 0 0 1px ${accent}33 inset` : undefined,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/42">
        {label}
      </p>
      <AnimatedMetric
        value={value}
        className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-white"
      />
      <p className="mt-2 text-sm leading-6 text-white/62">{detail}</p>
    </motion.div>
  );
}

function ModeButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      className="rounded-[22px] border px-4 py-3 text-left transition"
      style={{
        borderColor: active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)",
        backgroundColor: active ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.025)",
        boxShadow: active ? "0 0 0 1px rgba(255,255,255,0.08) inset" : undefined,
      }}
    >
      <div className="text-sm font-semibold tracking-[-0.02em] text-white">{label}</div>
      <div className="mt-1 text-sm leading-6 text-white/50">{description}</div>
    </motion.button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      layout
      className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))] px-4 py-4"
    >
      <LabelHeading label={label} />
      <AnimatedMetric
        value={value}
        className="mt-2 text-[1.15rem] font-semibold tracking-[-0.04em] text-white"
      />
      <p className="mt-2 text-sm leading-6 text-white/54">{FIELD_HELP[label]}</p>
    </motion.div>
  );
}

function StepCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.14))] p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-white/72">
          Step {step}
        </div>
        <div>
          <h3 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-white/58">{description}</p>
        </div>
      </div>
      <div>{children}</div>
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
    <motion.div
      layout
      className="rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))] p-5"
      style={{ borderColor: `${accent}33` }}
    >
      <LabelHeading label={label} />
      <AnimatedMetric
        value={value}
        className="mt-3 text-[1.65rem] font-semibold tracking-[-0.05em] text-white"
      />
      <p className="mt-2 text-sm leading-6 text-white/62">{detail}</p>
    </motion.div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  accent: string;
}) {
  return (
    <label className="block">
      <LabelHeading label={label} className="mb-2.5" />
      <input
        className="w-full rounded-[22px] border border-white/10 bg-black/28 px-4 py-3.5 text-[1rem] text-white outline-none transition focus:bg-black/34"
        style={{ boxShadow: "none" }}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = accent;
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        }}
      />
      <p className="mt-2 text-sm leading-6 text-white/54">{FIELD_HELP[label]}</p>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  checkedLabel,
  uncheckedLabel,
  onChange,
  accent,
}: {
  label: string;
  checked: boolean;
  checkedLabel: string;
  uncheckedLabel: string;
  onChange: (checked: boolean) => void;
  accent: string;
}) {
  return (
    <label className="block">
      <LabelHeading label={label} className="mb-2.5" />
      <button
        className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-black/28 px-4 py-3.5 text-left text-[1rem] text-white transition"
        type="button"
        onClick={() => onChange(!checked)}
      >
        <span>{checked ? checkedLabel : uncheckedLabel}</span>
        <span
          className="relative h-7 w-14 rounded-full transition"
          style={{
            backgroundColor: checked ? accent : "rgba(255,255,255,0.14)",
          }}
        >
          <span
            className="absolute top-1 h-5 w-5 rounded-full bg-white transition-[left]"
            style={{ left: checked ? "2rem" : "0.25rem" }}
          />
        </span>
      </button>
      <p className="mt-2 text-sm leading-6 text-white/54">{FIELD_HELP[label]}</p>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  accent,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  accent: string;
}) {
  return (
    <label className="block">
      <LabelHeading label={label} className="mb-2.5" />
      <select
        className="w-full appearance-none rounded-[22px] border border-white/10 bg-black/28 px-4 py-3.5 text-[1rem] text-white outline-none transition focus:bg-black/34"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = accent;
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
      <p className="mt-2 text-sm leading-6 text-white/54">{FIELD_HELP[label]}</p>
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
    <div className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
      <div className="relative flex items-center justify-center overflow-hidden rounded-[26px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(9,11,15,0.9)_62%)] p-6">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(circle at center, ${color}18, transparent 52%)`,
          }}
        />
        <div
          className="tire-shell relative flex h-52 w-52 items-center justify-center rounded-full border-[14px]"
          style={{
            borderColor: color,
            boxShadow: `0 0 60px ${color}40, inset 0 0 28px ${color}26`,
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
            <AnimatedMetric
              value={`${tireLifeUsed}%`}
              className="text-[2.7rem] font-semibold tracking-[-0.06em] text-white"
            />
            <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/50">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(9,11,15,0.96))] p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.26em] text-white/42">
            Stint stress
          </span>
          <span className="text-sm text-white/58">{statusLabel}</span>
        </div>
        <div className="relative h-5 overflow-hidden rounded-full bg-white/8">
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
      </div>
    </div>
  );
}

function PremiumCard({
  title,
  children,
  borderColor,
}: {
  title: string;
  children: React.ReactNode;
  borderColor?: string;
}) {
  return (
    <motion.div
      layout
      className="rounded-[30px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5 backdrop-blur-xl sm:p-7"
      style={{ borderColor: borderColor ?? "rgba(255,255,255,0.1)" }}
    >
      <LabelHeading label={title} />
      {FIELD_HELP[title] ? (
        <p className="mt-2 text-sm leading-6 text-white/54">{FIELD_HELP[title]}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}

function LabelHeading({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const tooltip = FIELD_TOOLTIP[label];

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-white/42">
          {label}
        </p>
        {tooltip ? <HelpTip text={tooltip} /> : null}
      </div>
    </div>
  );
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-white/12 text-[0.7rem] text-white/52">
      ?
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-[#101217] px-3 py-2 text-xs leading-5 text-white/78 shadow-[0_16px_40px_rgba(0,0,0,0.35)] group-hover:block">
        {text}
      </span>
    </span>
  );
}

function AnimatedMetric({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
        transition={{ duration: 0.22 }}
        className={className}
      >
        {value}
      </motion.div>
    </AnimatePresence>
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

function getAlertAccent(level: "high" | "medium" | "low", fallbackAccent: string) {
  if (level === "high") {
    return "#ef444455";
  }

  if (level === "medium") {
    return "#facc1555";
  }

  return `${fallbackAccent}55`;
}

function getDriver(driverId: string) {
  return DRIVER_OPTIONS.find((driver) => driver.id === driverId) ?? DRIVER_OPTIONS[0];
}

function getRace(raceId: string) {
  return RACE_OPTIONS_2025.find((race) => race.id === raceId) ?? RACE_OPTIONS_2025[0];
}

function createInitialForm(driverId: string, raceId: string): StrategyFormState {
  const race = getRace(raceId);

  return {
    driverId,
    raceId: race.id,
    currentLap: 22,
    totalLaps: race.laps,
    compound: "medium",
    tireAge: 14,
    weather: "dry",
    gapBehindSeconds: 1.8,
    isLeading: false,
    safetyCarLikely: false,
  };
}

function createInitialReplayForm(
  driverId: string,
  raceId: string,
): StrategyFormState {
  const race = getRace(raceId);

  return {
    driverId,
    raceId: race.id,
    currentLap: 1,
    totalLaps: race.laps,
    compound: "medium",
    tireAge: 0,
    weather: "dry",
    gapBehindSeconds: 3,
    isLeading: false,
    safetyCarLikely: false,
  };
}
