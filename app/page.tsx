import type { Metadata } from "next";
import { MRankingApp } from "./MRankingApp";

export const metadata: Metadata = {
  title: "MRanking — Upload. Compare. Crown.",
  description: "Import a YouTube playlist, compare every contender and crown one winner.",
};

export default function Home() {
  return <MRankingApp />;
}
