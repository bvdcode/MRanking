import type { JsonObject } from "./types";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);
const INNERTUBE_URL =
  "https://youtubei.googleapis.com/youtubei/v1/browse?prettyPrint=false";
const MUSIC_INNERTUBE_URL =
  "https://youtubei.googleapis.com/youtubei/v1/browse?prettyPrint=false";
export const RESOLVE_URL =
  "https://youtubei.googleapis.com/youtubei/v1/navigation/resolve_url?prettyPrint=false";
const CLIENT_VERSION = "2.20260720.07.00";
const MUSIC_CLIENT_VERSION = "1.20260720.01.00";

export function parseSubmittedUrl(input: string) {
  let submitted: URL;
  try {
    submitted = new URL(input.trim());
  } catch {
    throw new Error("Paste a valid YouTube or YouTube Music URL");
  }
  if (!YOUTUBE_HOSTS.has(submitted.hostname.toLowerCase())) {
    throw new Error("Only YouTube and YouTube Music links are supported");
  }
  return submitted;
}

export function defaultContext(): JsonObject {
  return {
    client: {
      clientName: "WEB",
      clientVersion: CLIENT_VERSION,
      hl: "en",
      gl: "US",
    },
  };
}

export function musicContext(): JsonObject {
  return {
    client: {
      clientName: "WEB_REMIX",
      clientVersion: MUSIC_CLIENT_VERSION,
      hl: "en",
      gl: "US",
    },
  };
}

export async function innertubeRequest(body: JsonObject, signal?: AbortSignal) {
  return innertubeCall(INNERTUBE_URL, body, signal);
}

export async function musicInnertubeRequest(
  body: JsonObject,
  signal?: AbortSignal,
) {
  return innertubeCall(
    MUSIC_INNERTUBE_URL,
    body,
    signal,
    "67",
    MUSIC_CLIENT_VERSION,
  );
}

export async function innertubeCall(
  endpoint: string,
  body: JsonObject,
  signal?: AbortSignal,
  clientName = "1",
  clientVersion = CLIENT_VERSION,
) {
  const origin =
    clientName === "67"
      ? "https://music.youtube.com"
      : "https://www.youtube.com";
  const headers = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    origin,
    referer: `${origin}/`,
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
    "x-youtube-client-name": clientName,
    "x-youtube-client-version": clientVersion,
  };
  const request = {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify(body),
  } satisfies RequestInit;
  const attempts: { host: string; status: number | "network" }[] = [];
  let response: Response | null = null;

  for (const candidate of innertubeEndpoints(endpoint, clientName)) {
    try {
      response = await fetch(candidate, request);
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      attempts.push({ host: candidate.hostname, status: "network" });
      continue;
    }
    if (response.ok) {
      return response.json() as Promise<JsonObject>;
    }

    attempts.push({ host: candidate.hostname, status: response.status });
    if (!isRetryableYouTubeStatus(response.status)) {
      break;
    }
  }

  if (response?.status === 404) {
    throw new Error("The YouTube page was not found");
  }
  throw new Error("YouTube did not return this page");
}

function innertubeEndpoints(endpoint: string, clientName: string) {
  const requested = new URL(endpoint);
  const hosts = [
    requested.hostname,
    "www.youtube-nocookie.com",
    "m.youtube.com",
    clientName === "67" ? "music.youtube.com" : "www.youtube.com",
  ];

  return [...new Set(hosts)].map((hostname) => {
    const candidate = new URL(requested);
    candidate.hostname = hostname;
    return candidate;
  });
}

function isRetryableYouTubeStatus(status: number) {
  return status === 403 || status === 408 || status === 429 || status >= 500;
}
