import type { PlaylistPreview } from "../types";
import {
  defaultContext,
  innertubeRequest,
  musicContext,
  musicInnertubeRequest,
} from "./client";
import {
  collectMusicPlaylistPage,
  collectPage,
  findDeclaredCount,
  findMusicPlaylistTitle,
  findPlaylistTitle,
} from "./renderers";
import type { FoundVideo, MarkImportIssue, PlaylistCollection } from "./types";

export async function collectWebPlaylist(
  playlistId: string,
  signal?: AbortSignal,
): Promise<PlaylistCollection> {
  const context = defaultContext();
  const firstPage = await innertubeRequest(
    { context, browseId: `VL${playlistId}` },
    signal,
  );
  const collected = new Map<string, FoundVideo>();
  const issues: PlaylistPreview["issues"] = [];
  let skipped = 0;
  let duplicates = 0;
  const mark: MarkImportIssue = (kind, details) => {
    if (kind === "skipped") {
      skipped += 1;
    } else {
      duplicates += 1;
    }
    if (details) {
      issues.push({ ...details, reason: kind, count: 1 });
    }
  };

  let token = collectPage(firstPage, collected, mark);
  const usedTokens = new Set<string>();
  let pageCount = 0;
  while (token && !usedTokens.has(token) && pageCount < 1_000) {
    usedTokens.add(token);
    pageCount += 1;
    const page = await innertubeRequest(
      { context, continuation: token },
      signal,
    );
    token = collectPage(page, collected, mark);
  }

  return {
    title: findPlaylistTitle(firstPage),
    declaredCount: findDeclaredCount(firstPage),
    skipped,
    duplicates,
    issues,
    items: [...collected.values()],
  };
}

export async function collectMusicPlaylist(
  playlistId: string,
  signal?: AbortSignal,
): Promise<PlaylistCollection> {
  const context = musicContext();
  const firstPage = await musicInnertubeRequest(
    { context, browseId: `VL${playlistId}` },
    signal,
  );
  const collected = new Map<string, FoundVideo>();
  const issues: PlaylistPreview["issues"] = [];
  let skipped = 0;
  let duplicates = 0;
  const mark: MarkImportIssue = (kind, details) => {
    if (kind === "skipped") {
      skipped += 1;
    } else {
      duplicates += 1;
    }
    if (details) {
      issues.push({ ...details, reason: kind, count: 1 });
    }
  };

  let token = collectMusicPlaylistPage(firstPage, collected, mark);
  const usedTokens = new Set<string>();
  let pageCount = 0;
  while (token && !usedTokens.has(token) && pageCount < 1_000) {
    usedTokens.add(token);
    pageCount += 1;
    const page = await musicInnertubeRequest(
      { context, continuation: token },
      signal,
    );
    token = collectMusicPlaylistPage(page, collected, mark);
  }

  return {
    title: findMusicPlaylistTitle(firstPage),
    declaredCount: findDeclaredCount(firstPage),
    skipped,
    duplicates,
    issues,
    items: [...collected.values()],
  };
}

export function issueCount(
  issues: PlaylistPreview["issues"],
  reason: "skipped" | "duplicate",
) {
  return issues
    .filter((issue) => issue.reason === reason)
    .reduce((total, issue) => total + issue.count, 0);
}
