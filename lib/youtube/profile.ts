import type { ProfilePlaylistPreview } from "../types";
import { musicContext, musicInnertubeRequest } from "./client";
import {
  contentValue,
  isObject,
  stringValue,
  textValue,
  thumbnailValue,
  walk,
  walkValues,
} from "./json";
import { lockupThumbnailValue } from "./renderers";
import type { JsonObject, JsonValue } from "./types";

export function findChannelMetadata(root: JsonValue): JsonObject {
  let found: JsonObject = {};
  walk(root, (node) => {
    if (!Object.keys(found).length && isObject(node.channelMetadataRenderer)) {
      found = node.channelMetadataRenderer;
    }
  });
  return found;
}

export function findPlaylistsTab(
  root: JsonValue,
): { browseId: string; params: string } | null {
  let found: { browseId: string; params: string } | null = null;
  walk(root, (node) => {
    if (found || !isObject(node.tabRenderer)) {
      return;
    }
    const tab = node.tabRenderer;
    if (stringValue(tab.title).toLowerCase() !== "playlists") {
      return;
    }
    const endpoint =
      isObject(tab.endpoint) && isObject(tab.endpoint.browseEndpoint)
        ? tab.endpoint.browseEndpoint
        : {};
    found = {
      browseId: stringValue(endpoint.browseId),
      params: stringValue(endpoint.params),
    };
  });
  return found;
}

export async function collectMusicProfilePages(
  browseId: string,
  source: URL,
  playlists: Map<string, ProfilePlaylistPreview>,
  signal?: AbortSignal,
) {
  const context = musicContext();
  let page = await musicInnertubeRequest({ context, browseId }, signal);
  let token = collectMusicProfilePlaylists(page, playlists, source);
  const usedTokens = new Set<string>();
  let pageCount = 0;
  while (token && !usedTokens.has(token) && pageCount < 1_000) {
    usedTokens.add(token);
    pageCount += 1;
    page = await musicInnertubeRequest(
      { context, continuation: token },
      signal,
    );
    token = collectMusicProfilePlaylists(page, playlists, source);
  }
}

function collectMusicProfilePlaylists(
  root: JsonValue,
  playlists: Map<string, ProfilePlaylistPreview>,
  source: URL,
) {
  walk(root, (node) => {
    if (!isObject(node.musicTwoRowItemRenderer)) {
      return;
    }
    const renderer = node.musicTwoRowItemRenderer;
    const endpoint =
      isObject(renderer.navigationEndpoint) &&
      isObject(renderer.navigationEndpoint.browseEndpoint)
        ? renderer.navigationEndpoint.browseEndpoint
        : {};
    const playlistId = stringValue(endpoint.browseId).replace(/^VL/, "");
    if (!playlistId || playlists.has(playlistId)) {
      return;
    }
    const thumbnailRenderer =
      isObject(renderer.thumbnailRenderer) &&
      isObject(renderer.thumbnailRenderer.musicThumbnailRenderer)
        ? renderer.thumbnailRenderer.musicThumbnailRenderer
        : {};
    playlists.set(playlistId, {
      playlistId,
      title: textValue(renderer.title) || "Untitled playlist",
      url: profilePlaylistUrl(source, playlistId),
      thumbnailUrl:
        thumbnailValue(thumbnailRenderer.thumbnail) ||
        "https://i.ytimg.com/img/no_thumbnail.jpg",
      itemCount: findItemCount(renderer),
    });
  });
  return findContinuationToken(root);
}

export function collectProfilePlaylists(
  root: JsonValue,
  playlists: Map<string, ProfilePlaylistPreview>,
  source: URL,
) {
  walk(root, (node) => {
    if (isObject(node.lockupViewModel)) {
      const lockup = node.lockupViewModel;
      const contentType = stringValue(lockup.contentType);
      if (contentType && contentType.includes("PLAYLIST")) {
        addLockupPlaylist(lockup, playlists, source);
      }
    }
    if (isObject(node.gridPlaylistRenderer)) {
      addClassicPlaylist(node.gridPlaylistRenderer, playlists, source);
    }
  });
  return findContinuationToken(root);
}

function addLockupPlaylist(
  lockup: JsonObject,
  playlists: Map<string, ProfilePlaylistPreview>,
  source: URL,
) {
  const playlistId = stringValue(lockup.contentId).replace(/^VL/, "");
  if (!playlistId || playlists.has(playlistId)) {
    return;
  }
  const metadata =
    isObject(lockup.metadata) &&
    isObject(lockup.metadata.lockupMetadataViewModel)
      ? lockup.metadata.lockupMetadataViewModel
      : {};
  const collection =
    isObject(lockup.contentImage) &&
    isObject(lockup.contentImage.collectionThumbnailViewModel)
      ? lockup.contentImage.collectionThumbnailViewModel
      : {};
  const primary =
    isObject(collection.primaryThumbnail) &&
    isObject(collection.primaryThumbnail.thumbnailViewModel)
      ? collection.primaryThumbnail.thumbnailViewModel
      : {};
  playlists.set(playlistId, {
    playlistId,
    title: contentValue(metadata.title) || "Untitled playlist",
    url: profilePlaylistUrl(source, playlistId),
    thumbnailUrl:
      lockupThumbnailValue(primary) ||
      "https://i.ytimg.com/img/no_thumbnail.jpg",
    itemCount: findItemCount(lockup),
  });
}

function addClassicPlaylist(
  renderer: JsonObject,
  playlists: Map<string, ProfilePlaylistPreview>,
  source: URL,
) {
  const playlistId = stringValue(renderer.playlistId).replace(/^VL/, "");
  if (!playlistId || playlists.has(playlistId)) {
    return;
  }
  playlists.set(playlistId, {
    playlistId,
    title: textValue(renderer.title) || "Untitled playlist",
    url: profilePlaylistUrl(source, playlistId),
    thumbnailUrl:
      thumbnailValue(renderer.thumbnail) ||
      "https://i.ytimg.com/img/no_thumbnail.jpg",
    itemCount: findItemCount(renderer),
  });
}

function profilePlaylistUrl(source: URL, playlistId: string) {
  const host =
    source.hostname.toLowerCase() === "music.youtube.com"
      ? "music.youtube.com"
      : "www.youtube.com";
  return `https://${host}/playlist?list=${encodeURIComponent(playlistId)}`;
}

function findItemCount(root: JsonValue) {
  let found: number | null = null;
  walkValues(root, (value) => {
    if (found !== null) {
      return;
    }
    const match = value.match(/(\d[\d,.\s]*)\s+(?:videos?|tracks?)/i);
    if (!match) {
      return;
    }
    const count = Number(match[1].replace(/\D/g, ""));
    if (Number.isFinite(count)) {
      found = count;
    }
  });
  return found;
}

export function findContinuationToken(root: JsonValue) {
  const tokens: string[] = [];
  walk(root, (node) => {
    if (!isObject(node.continuationItemRenderer)) {
      return;
    }
    const continuation = node.continuationItemRenderer.continuationEndpoint;
    if (
      !isObject(continuation) ||
      !isObject(continuation.continuationCommand)
    ) {
      return;
    }
    const token = stringValue(continuation.continuationCommand.token);
    if (token) {
      tokens.push(token);
    }
  });
  return tokens.at(-1) ?? null;
}
