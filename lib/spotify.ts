import type { PlaylistPreview } from "./types";

type JsonObject = Record<string, unknown>;

const SPOTIFY_HOSTS = new Set([
  "open.spotify.com",
  "play.spotify.com",
  "spotify.link",
]);

export async function parseSpotifyPlaylist(
  input: string,
  signal?: AbortSignal,
): Promise<PlaylistPreview> {
  const submitted = parseUrl(input);
  const resolved = await resolveSpotifyUrl(submitted, signal);
  const playlistId = spotifyEntityId(resolved, "playlist");
  if (!playlistId) throw new Error("This link does not contain a Spotify playlist");

  const sourceUrl = `https://open.spotify.com/playlist/${playlistId}`;
  const response = await fetch(
    `https://open.spotify.com/embed/playlist/${encodeURIComponent(playlistId)}`,
    {
      signal,
      headers: {
        accept: "text/html",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      },
    },
  );
  if (!response.ok) {
    if (response.status === 404) throw new Error("The Spotify playlist was not found");
    throw new Error("Spotify did not return this playlist");
  }

  const html = await response.text();
  const nextData = readNextData(html);
  const entity = objectPath(nextData, [
    "props",
    "pageProps",
    "state",
    "data",
    "entity",
  ]);
  const rawTracks = Array.isArray(entity.trackList)
    ? entity.trackList.filter(isObject)
    : [];
  const playlistCover = spotifyImage(entity.coverArt);
  const seen = new Set<string>();
  const issues: PlaylistPreview["issues"] = [];
  let skipped = 0;
  let duplicates = 0;

  const candidates = rawTracks.flatMap((track) => {
    const id = spotifyUriId(stringValue(track.uri), "track");
    if (!id || track.isPlayable === false) {
      skipped += 1;
      issues.push({
        title: stringValue(track.title) || "Unavailable track",
        channel: stringValue(track.subtitle) || "Spotify",
        reason: "skipped",
        count: 1,
      });
      return [];
    }
    if (seen.has(id)) {
      duplicates += 1;
      issues.push({
        title: stringValue(track.title) || "Untitled track",
        channel: stringValue(track.subtitle) || "Spotify",
        reason: "duplicate",
        count: 1,
      });
      return [];
    }
    seen.add(id);
    return [
      {
        id,
        title: stringValue(track.title) || "Untitled track",
        channel: stringValue(track.subtitle) || "Spotify",
        duration: formatDuration(numberValue(track.duration)),
      },
    ];
  });

  const covers = await mapWithConcurrency(candidates, 8, async (track) => {
    try {
      const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(
        `https://open.spotify.com/track/${track.id}`,
      )}`;
      const result = await fetch(url, { signal });
      if (!result.ok) return playlistCover;
      const data = (await result.json()) as JsonObject;
      return stringValue(data.thumbnail_url) || playlistCover;
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      return playlistCover;
    }
  });

  const items = candidates.map((track, index) => ({
    title: track.title,
    channel: track.channel,
    videoId: track.id,
    thumbnailUrl:
      covers[index] ||
      playlistCover ||
      "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png",
    youtubeUrl: `https://open.spotify.com/track/${track.id}`,
    duration: track.duration,
  }));

  if (items.length === 0)
    throw new Error(
      "The Spotify playlist is private, unavailable or contains no playable tracks",
    );

  return {
    title: stringValue(entity.name) || stringValue(entity.title) || "Spotify playlist",
    sourceUrl,
    sourceType: "spotify",
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
    throw new Error("Paste a valid Spotify playlist URL");
  }
  if (!SPOTIFY_HOSTS.has(url.hostname.toLowerCase()))
    throw new Error("Only Spotify links are supported here");
  return url;
}

async function resolveSpotifyUrl(url: URL, signal?: AbortSignal) {
  if (url.hostname.toLowerCase() !== "spotify.link") return url;
  const response = await fetch(url, {
    signal,
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0" },
  });
  return new URL(response.url);
}

function spotifyEntityId(url: URL, type: string) {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.indexOf(type);
  const id = index >= 0 ? parts[index + 1] : "";
  return /^[a-zA-Z0-9]{10,64}$/.test(id) ? id : "";
}

function spotifyUriId(uri: string, type: string) {
  const match = uri.match(new RegExp(`^spotify:${type}:([a-zA-Z0-9]+)$`));
  return match?.[1] ?? "";
}

function readNextData(html: string) {
  const match = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) throw new Error("Spotify did not return playlist tracks");
  try {
    return JSON.parse(match[1]) as JsonObject;
  } catch {
    throw new Error("Spotify returned an unreadable playlist");
  }
}

function spotifyImage(value: unknown) {
  if (!isObject(value) || !Array.isArray(value.sources)) return "";
  const sources = value.sources.filter(isObject);
  return sources.length ? stringValue(sources.at(-1)?.url) : "";
}

function objectPath(root: unknown, path: string[]) {
  let current = root;
  for (const key of path) {
    if (!isObject(current)) return {};
    current = current[key];
  }
  return isObject(current) ? current : {};
}

function formatDuration(milliseconds: number) {
  if (!milliseconds) return null;
  const seconds = Math.round(milliseconds / 1_000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await operation(values[index]);
      }
    }),
  );
  return results;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
