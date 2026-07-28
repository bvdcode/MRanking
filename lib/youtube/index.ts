import type {
  PlaylistPreview,
  ProfilePlaylistPreview,
  YouTubeImportResult,
  YouTubeProfilePreview,
} from "../types";
import {
  defaultContext,
  innertubeCall,
  innertubeRequest,
  parseSubmittedUrl,
  RESOLVE_URL,
} from "./client";
import { isObject, stringValue, thumbnailValue } from "./json";
import {
  collectMusicPlaylist,
  collectWebPlaylist,
  issueCount,
} from "./playlist";
import {
  collectMusicProfilePages,
  collectProfilePlaylists,
  findChannelMetadata,
  findPlaylistsTab,
} from "./profile";

export async function parseYouTubeInput(
  input: string,
  signal?: AbortSignal,
): Promise<YouTubeImportResult> {
  const submitted = parseSubmittedUrl(input);
  if (submitted.searchParams.get("list")) {
    return {
      kind: "playlist",
      playlist: await parseYouTubePlaylist(input, signal),
    };
  }
  return { kind: "profile", profile: await parseYouTubeProfile(input, signal) };
}

export async function parseYouTubeProfile(
  input: string,
  signal?: AbortSignal,
): Promise<YouTubeProfilePreview> {
  const submitted = parseSubmittedUrl(input);
  const context = defaultContext();
  const profilePath = /^\/(?:channel|browse)\/(UC[A-Za-z0-9_-]+)\/?$/i;
  const resolvableProfilePath = /^\/(?:@[^/]+|user\/[^/]+|c\/[^/]+)\/?$/i;
  const directChannelId = submitted.pathname.match(profilePath)?.[1] ?? "";
  if (!directChannelId && !resolvableProfilePath.test(submitted.pathname)) {
    throw new Error("This link does not contain a YouTube profile");
  }
  let browseId = directChannelId;

  if (!browseId) {
    const resolvable = new URL(submitted.toString());
    resolvable.protocol = "https:";
    resolvable.hostname = "www.youtube.com";
    resolvable.search = "";
    resolvable.hash = "";
    const resolved = await innertubeCall(
      RESOLVE_URL,
      { context, url: resolvable.toString() },
      signal,
    );
    const endpoint =
      isObject(resolved.endpoint) && isObject(resolved.endpoint.browseEndpoint)
        ? resolved.endpoint.browseEndpoint
        : {};
    browseId = stringValue(endpoint.browseId);
  }

  if (!browseId) {
    throw new Error("This link does not contain a YouTube profile");
  }
  const channelPage = await innertubeRequest({ context, browseId }, signal);
  const metadata = findChannelMetadata(channelPage);
  const playlistsTab = findPlaylistsTab(channelPage);
  const playlists = new Map<string, ProfilePlaylistPreview>();

  if (playlistsTab) {
    let page = await innertubeRequest(
      {
        context,
        browseId: playlistsTab.browseId || browseId,
        params: playlistsTab.params,
      },
      signal,
    );
    let token = collectProfilePlaylists(page, playlists, submitted);
    const usedTokens = new Set<string>();
    let pageCount = 0;
    while (token && !usedTokens.has(token) && pageCount < 1_000) {
      usedTokens.add(token);
      pageCount += 1;
      page = await innertubeRequest({ context, continuation: token }, signal);
      token = collectProfilePlaylists(page, playlists, submitted);
    }
  }

  try {
    await collectMusicProfilePages(browseId, submitted, playlists, signal);
  } catch (error) {
    if (playlists.size === 0) {
      throw error;
    }
  }

  const sourceType =
    submitted.hostname.toLowerCase() === "music.youtube.com"
      ? "youtubeMusic"
      : "youtube";
  return {
    title: stringValue(metadata.title) || "YouTube profile",
    sourceUrl: submitted.toString(),
    sourceType,
    avatarUrl: thumbnailValue(metadata.avatar),
    playlists: [...playlists.values()],
  };
}

export async function parseYouTubePlaylist(
  input: string,
  signal?: AbortSignal,
): Promise<PlaylistPreview> {
  const submitted = parseSubmittedUrl(input);
  const playlistId = submitted.searchParams.get("list")?.trim() ?? "";
  if (!playlistId) {
    throw new Error("This link does not contain a playlist");
  }

  const [webCollection, musicCollection] = await Promise.all([
    collectWebPlaylist(playlistId, signal).catch((error) => {
      if ((error as Error).name === "AbortError") {
        throw error;
      }
      return null;
    }),
    collectMusicPlaylist(playlistId, signal).catch((error) => {
      if ((error as Error).name === "AbortError") {
        throw error;
      }
      return null;
    }),
  ]);
  if (!webCollection && !musicCollection) {
    throw new Error("YouTube did not return this playlist");
  }

  // YouTube Music often exposes playable songs that the regular public
  // playlist response omits. Keep the fuller response's order, then append
  // anything unique found by the other client.
  const primary =
    musicCollection &&
    (!webCollection ||
      musicCollection.items.length >= webCollection.items.length)
      ? musicCollection
      : webCollection!;
  const secondary =
    primary === musicCollection ? webCollection : musicCollection;
  const collected = new Map(primary.items.map((item) => [item.videoId, item]));
  for (const item of secondary?.items ?? []) {
    if (!collected.has(item.videoId)) {
      collected.set(item.videoId, item);
    }
  }
  const items = [...collected.values()];
  if (items.length === 0) {
    throw new Error(
      "The playlist is private, unavailable or contains no playable videos",
    );
  }

  const declaredCount = Math.max(
    webCollection?.declaredCount ?? 0,
    musicCollection?.declaredCount ?? 0,
  );
  const duplicates = Math.max(
    webCollection?.duplicates ?? 0,
    musicCollection?.duplicates ?? 0,
  );
  const skipped = Math.max(
    primary.skipped,
    declaredCount - items.length - duplicates,
    0,
  );
  const duplicateSource =
    (musicCollection?.duplicates ?? 0) > (webCollection?.duplicates ?? 0)
      ? musicCollection
      : webCollection;
  const issues = [
    ...primary.issues.filter((issue) => issue.reason === "skipped"),
    ...(duplicateSource?.issues.filter(
      (issue) => issue.reason === "duplicate",
    ) ?? []),
  ];
  const listedSkipped = issueCount(issues, "skipped");
  const listedDuplicates = issueCount(issues, "duplicate");
  if (listedSkipped < skipped) {
    issues.push({
      title: "Unavailable tracks",
      channel: "YouTube",
      reason: "skipped",
      count: skipped - listedSkipped,
    });
  }
  if (listedDuplicates < duplicates) {
    issues.push({
      title: "Repeated tracks",
      channel: "YouTube",
      reason: "duplicate",
      count: duplicates - listedDuplicates,
    });
  }
  const sourceType =
    submitted.hostname.toLowerCase() === "music.youtube.com"
      ? "youtubeMusic"
      : "youtube";
  return {
    title:
      primary.title.trim() ||
      secondary?.title.trim() ||
      "Imported YouTube playlist",
    sourceUrl: submitted.toString(),
    sourceType,
    cover: items[0].thumbnailUrl,
    skipped,
    duplicates,
    issues,
    items,
  };
}
