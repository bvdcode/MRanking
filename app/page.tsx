import type { Metadata } from "next";
import { MRankingApp } from "./MRankingApp";

export const metadata: Metadata = {
  title: "MRanking — Upload. Compare. Crown.",
  description: "Turn playlists and collections into packs, then compare, tier, score or rank them your way.",
};

export default function Home() {
  return <MRankingApp />;
}
