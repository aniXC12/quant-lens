import type { Metadata } from "next";
import { F1StrategyApp } from "@/components/f1-strategy-app";

export const metadata: Metadata = {
  title: "F1 Pit Stop Strategy Predictor",
  description:
    "Predict a Formula 1 pit stop window from lap count, tire age, compound, and weather conditions.",
};

export default function Home() {
  return <F1StrategyApp />;
}
