import type { PackItem, PlaylistImportIssue, SourceType } from "../lib/types";

export type View = "home" | "upload" | "packs" | "modes" | "hill" | "wheel";

export type EditablePack = {
  id?: string;
  name: string;
  sourceType: SourceType;
  sourceUrl: string;
  coverType: "thumbnail" | "emoji";
  coverValue: string;
  visibility: "private" | "public";
  skipped: number;
  duplicates: number;
  issues: PlaylistImportIssue[];
  selectedVideoIds: string[];
  items: Array<Omit<PackItem, "id" | "position">>;
};
