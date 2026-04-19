import type { Metadata } from "next";
import { QuantLensApp } from "@/components/quant-lens-app";

export const metadata: Metadata = {
  title: "Quant Lens",
  description:
    "Translate institutional quant signals into plain English for retail investors using live market data.",
};

export default function Home() {
  return <QuantLensApp />;
}
