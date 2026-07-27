import type { PlaylistPreview } from "./types";

type JsonObject = Record<string, unknown>;

const YANDEX_PROXY_ORIGIN = "http://92.38.49.211:8787";

type YandexLocation =
  | { kind: "user"; userId: string; playlistKind: string }
  | { kind: "uuid"; playlistUuid: string };

export async function parseYandexMusicPlaylist(
  input: string,
  signal?: AbortSignal,
): Promise<PlaylistPreview> {
  const submitted = parseUrl(input);
  const location = playlistLocation(submitted);
  if (!location)
    throw new Error("This link does not contain a Yandex Music playlist");

  const data = await yandexProxyRequest(location, signal);
  const playlist = isObject(data.result) ? data.result : data;
  const rawTracks = Array.isArray(playlist.tracks)
    ? playlist.tracks.filter(isObject)
    : [];
  const richTracks = rawTracks.flatMap((entry) => {
    const track = isObject(entry.track) ? entry.track : entry;
    return stringValue(track.title) ? [track] : [];
  });
  const playlistCover = yandexCover(
    playlist.cover,
    "https://music.yandex.ru/favicon.ico",
  );
  const seen = new Set<string>();
  let skipped = 0;
  let duplicates = 0;
  const items: PlaylistPreview["items"] = [];
  const issues: PlaylistPreview["issues"] = [];

  for (const track of richTracks) {
    const id = stringish(track.id) || stringish(track.realId);
    const albums = Array.isArray(track.albums)
      ? track.albums.filter(isObject)
      : [];
    const album = albums[0] ?? {};
    const albumId = stringish(album.id) || stringish(track.albumId);
    const artists = Array.isArray(track.artists)
      ? track.artists.filter(isObject)
      : [];
    const channel =
      artists
        .map((artist) => stringValue(artist.name))
        .filter(Boolean)
        .join(", ") || "Yandex Music";
    const cover =
      yandexCover(track.coverUri, "") ||
      yandexCover(album.coverUri, "") ||
      playlistCover;
    if (!id || track.available === false) {
      skipped += 1;
      issues.push({
        title: stringValue(track.title) || "Unavailable track",
        channel,
        reason: "skipped",
        count: 1,
      });
      continue;
    }
    if (seen.has(id)) {
      duplicates += 1;
      issues.push({
        title: stringValue(track.title) || "Untitled track",
        channel,
        reason: "duplicate",
        count: 1,
      });
      continue;
    }
    seen.add(id);
    const externalUrl = albumId
      ? `https://music.yandex.ru/album/${encodeURIComponent(albumId)}/track/${encodeURIComponent(id)}`
      : `https://music.yandex.ru/track/${encodeURIComponent(id)}`;
    items.push({
      title: stringValue(track.title) || "Untitled track",
      channel,
      videoId: id,
      thumbnailUrl: cover,
      youtubeUrl: externalUrl,
      duration: formatDuration(numberValue(track.durationMs)),
    });
  }

  const declared = declaredTrackCount(playlist);
  const accountedFor = items.length + skipped + duplicates;
  if (declared > accountedFor) {
    const hiddenCount = declared - accountedFor;
    skipped += hiddenCount;
    issues.push({
      title: "Unavailable tracks",
      channel: "Yandex Music",
      reason: "skipped",
      count: hiddenCount,
    });
  }
  if (items.length === 0)
    throw new Error(
      "The Yandex Music playlist is private, unavailable or contains no playable tracks",
    );

  return {
    title: stringValue(playlist.title) || "Yandex Music playlist",
    sourceUrl: submitted.toString(),
    sourceType: "yandexMusic",
    cover: playlistCover || items[0].thumbnailUrl,
    skipped,
    duplicates,
    issues,
    items,
  };
}

function parseUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Paste a valid Yandex Music playlist URL");
  }
  const host = url.hostname.toLowerCase();
  if (!/^music\.yandex\.(?:ru|com|by|kz|uz|az)$/.test(host))
    throw new Error("Only Yandex Music links are supported here");
  return url;
}

function playlistLocation(url: URL): YandexLocation | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const usersIndex = parts.indexOf("users");
  if (
    usersIndex >= 0 &&
    parts[usersIndex + 1] &&
    parts[usersIndex + 2] === "playlists" &&
    parts[usersIndex + 3]
  ) {
    return {
      kind: "user",
      userId: decodeURIComponent(parts[usersIndex + 1]),
      playlistKind: decodeURIComponent(parts[usersIndex + 3]),
    };
  }
  const playlistsIndex = parts.indexOf("playlists");
  if (playlistsIndex >= 0 && parts[playlistsIndex + 1])
    return {
      kind: "uuid",
      playlistUuid: decodeURIComponent(parts[playlistsIndex + 1]),
    };
  const playlistIndex = parts.indexOf("playlist");
  if (playlistIndex >= 0 && parts[playlistIndex + 2])
    return {
      kind: "user",
      userId: decodeURIComponent(parts[playlistIndex + 1]),
      playlistKind: decodeURIComponent(parts[playlistIndex + 2]),
    };
  if (playlistIndex >= 0 && parts[playlistIndex + 1])
    return {
      kind: "uuid",
      playlistUuid: decodeURIComponent(parts[playlistIndex + 1]),
    };
  return null;
}

async function yandexProxyRequest(
  location: YandexLocation,
  signal?: AbortSignal,
) {
  const endpoint =
    location.kind === "user"
      ? `users/${encodeURIComponent(location.userId)}/playlists/${encodeURIComponent(location.playlistKind)}`
      : `playlist/${encodeURIComponent(location.playlistUuid)}`;
  const url = new URL(endpoint, `${YANDEX_PROXY_ORIGIN}/`);
  url.searchParams.set("richTracks", "true");
  const response = await fetch(url, {
    signal,
    headers: {
      accept: "application/json",
    },
  });
  const data = (await response.json().catch(() => ({}))) as JsonObject;
  if (!response.ok || isObject(data.error)) {
    if (response.status === 404)
      throw new Error("The Yandex Music playlist was not found");
    throw new Error("Yandex Music did not return this playlist");
  }
  return data;
}

function declaredTrackCount(playlist: JsonObject) {
  return (
    numberValue(playlist.trackCount) ||
    numberValue(playlist.tracksCount) ||
    0
  );
}

function yandexCover(value: unknown, fallback: string) {
  let uri = "";
  if (typeof value === "string") uri = value;
  if (isObject(value)) {
    uri = stringValue(value.uri);
    if (!uri && Array.isArray(value.itemsUri))
      uri = stringValue(value.itemsUri.find((item) => typeof item === "string"));
  }
  if (!uri) return fallback;
  uri = uri.replace("%%", "400x400");
  if (uri.startsWith("//")) return `https:${uri}`;
  if (!/^https?:\/\//i.test(uri)) return `https://${uri}`;
  return uri;
}

function formatDuration(milliseconds: number) {
  if (!milliseconds) return null;
  const seconds = Math.round(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringish(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
