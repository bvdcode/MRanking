import type { PlaylistPreview } from "../types";
export type { JsonObject, JsonValue } from "../json-value";
export type FoundVideo = PlaylistPreview["items"][number];
export type ImportIssueDetails = { title: string; channel: string };
export type MarkImportIssue = (
  kind: "skipped" | "duplicate",
  details?: ImportIssueDetails,
) => void;
export type PlaylistCollection = {
  items: FoundVideo[];
  title: string;
  declaredCount: number;
  skipped: number;
  duplicates: number;
  issues: PlaylistPreview["issues"];
};
