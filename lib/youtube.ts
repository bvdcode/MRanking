import type {
  PlaylistPreview,
  ProfilePlaylistPreview,
  YouTubeImportResult,
  YouTubeProfilePreview,
} from "./types";

type JsonObject = Record<string, unknown>;
type FoundVideo = PlaylistPreview["items"][number];
type ImportIssueDetails = { title: string; channel: string };
type MarkImportIssue = (
  kind: "skipped" | "duplicate",
  details?: ImportIssueDetails,
) => void;
type PlaylistCollection = {
  items: FoundVideo[];
  title: string;
  declaredCount: number;
  skipped: number;
  duplicates: number;
  issues: PlaylistPreview["issues"];
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);
const INNERTUBE_URL =
  "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false";
const MUSIC_INNERTUBE_URL =
  "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
const RESOLVE_URL =
  "https://www.youtube.com/youtubei/v1/navigation/resolve_url?prettyPrint=false";
const CLIENT_VERSION = "2.20260720.07.00";
const MUSIC_CLIENT_VERSION = "1.20260720.01.00";

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

  if (!browseId)
    throw new Error("This link does not contain a YouTube profile");
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
    if (playlists.size === 0) throw error;
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
  if (!playlistId) throw new Error("This link does not contain a playlist");

  const [webCollection, musicCollection] = await Promise.all([
    collectWebPlaylist(playlistId, signal).catch((error) => {
      if ((error as Error).name === "AbortError") throw error;
      return null;
    }),
    collectMusicPlaylist(playlistId, signal).catch((error) => {
      if ((error as Error).name === "AbortError") throw error;
      return null;
    }),
  ]);
  if (!webCollection && !musicCollection)
    throw new Error("YouTube did not return this playlist");

  // YouTube Music often exposes playable songs that the regular public
  // playlist response omits. Keep the fuller response's order, then append
  // anything unique found by the other client.
  const primary =
    musicCollection &&
    (!webCollection || musicCollection.items.length >= webCollection.items.length)
      ? musicCollection
      : webCollection!;
  const secondary = primary === musicCollection ? webCollection : musicCollection;
  const collected = new Map(primary.items.map((item) => [item.videoId, item]));
  for (const item of secondary?.items ?? []) {
    if (!collected.has(item.videoId)) collected.set(item.videoId, item);
  }
  const items = [...collected.values()];
  if (items.length === 0)
    throw new Error(
      "The playlist is private, unavailable or contains no playable videos",
    );

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

async function collectWebPlaylist(
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
    if (kind === "skipped") skipped += 1;
    else duplicates += 1;
    if (details)
      issues.push({ ...details, reason: kind, count: 1 });
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

async function collectMusicPlaylist(
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
    if (kind === "skipped") skipped += 1;
    else duplicates += 1;
    if (details)
      issues.push({ ...details, reason: kind, count: 1 });
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

function issueCount(
  issues: PlaylistPreview["issues"],
  reason: "skipped" | "duplicate",
) {
  return issues
    .filter((issue) => issue.reason === reason)
    .reduce((total, issue) => total + issue.count, 0);
}

function parseSubmittedUrl(input: string) {
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

function defaultContext(): JsonObject {
  return {
    client: {
      clientName: "WEB",
      clientVersion: CLIENT_VERSION,
      hl: "en",
      gl: "US",
    },
  };
}

function musicContext(): JsonObject {
  return {
    client: {
      clientName: "WEB_REMIX",
      clientVersion: MUSIC_CLIENT_VERSION,
      hl: "en",
      gl: "US",
    },
  };
}

async function innertubeRequest(body: JsonObject, signal?: AbortSignal) {
  return innertubeCall(INNERTUBE_URL, body, signal);
}

async function musicInnertubeRequest(body: JsonObject, signal?: AbortSignal) {
  return innertubeCall(
    MUSIC_INNERTUBE_URL,
    body,
    signal,
    "67",
    MUSIC_CLIENT_VERSION,
  );
}

async function innertubeCall(
  endpoint: string,
  body: JsonObject,
  signal?: AbortSignal,
  clientName = "1",
  clientVersion = CLIENT_VERSION,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-youtube-client-name": clientName,
      "x-youtube-client-version": clientVersion,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 404)
      throw new Error("The YouTube page was not found");
    throw new Error("YouTube did not return this page");
  }
  return response.json() as Promise<JsonObject>;
}

function findChannelMetadata(root: unknown): JsonObject {
  let found: JsonObject = {};
  walk(root, (node) => {
    if (!Object.keys(found).length && isObject(node.channelMetadataRenderer)) {
      found = node.channelMetadataRenderer;
    }
  });
  return found;
}

function findPlaylistsTab(
  root: unknown,
): { browseId: string; params: string } | null {
  let found: { browseId: string; params: string } | null = null;
  walk(root, (node) => {
    if (found || !isObject(node.tabRenderer)) return;
    const tab = node.tabRenderer;
    if (stringValue(tab.title).toLowerCase() !== "playlists") return;
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

async function collectMusicProfilePages(
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
  root: unknown,
  playlists: Map<string, ProfilePlaylistPreview>,
  source: URL,
) {
  walk(root, (node) => {
    if (!isObject(node.musicTwoRowItemRenderer)) return;
    const renderer = node.musicTwoRowItemRenderer;
    const endpoint =
      isObject(renderer.navigationEndpoint) &&
      isObject(renderer.navigationEndpoint.browseEndpoint)
        ? renderer.navigationEndpoint.browseEndpoint
        : {};
    const playlistId = stringValue(endpoint.browseId).replace(/^VL/, "");
    if (!playlistId || playlists.has(playlistId)) return;
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

function collectProfilePlaylists(
  root: unknown,
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
  if (!playlistId || playlists.has(playlistId)) return;
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
  if (!playlistId || playlists.has(playlistId)) return;
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

function findItemCount(root: unknown) {
  let found: number | null = null;
  walkValues(root, (value) => {
    if (found !== null) return;
    const match = value.match(/(\d[\d,.\s]*)\s+(?:videos?|tracks?)/i);
    if (!match) return;
    const count = Number(match[1].replace(/\D/g, ""));
    if (Number.isFinite(count)) found = count;
  });
  return found;
}

function findContinuationToken(root: unknown) {
  const tokens: string[] = [];
  walk(root, (node) => {
    if (!isObject(node.continuationItemRenderer)) return;
    const continuation = node.continuationItemRenderer.continuationEndpoint;
    if (!isObject(continuation) || !isObject(continuation.continuationCommand))
      return;
    const token = stringValue(continuation.continuationCommand.token);
    if (token) tokens.push(token);
  });
  return tokens.at(-1) ?? null;
}

function collectMusicPlaylistPage(
  root: unknown,
  videos: Map<string, FoundVideo>,
  mark: MarkImportIssue,
) {
  walk(root, (node) => {
    if (isObject(node.musicResponsiveListItemRenderer)) {
      collectMusicTrack(node.musicResponsiveListItemRenderer, videos, mark);
    }
  });
  return findContinuationToken(root);
}

function collectMusicTrack(
  renderer: JsonObject,
  videos: Map<string, FoundVideo>,
  mark: MarkImportIssue,
) {
  const playlistData = isObject(renderer.playlistItemData)
    ? renderer.playlistItemData
    : {};
  const title = musicFlexColumnText(renderer, 0) || "Untitled track";
  const channel = musicFlexColumnText(renderer, 1) || "YouTube Music";
  const videoId = stringValue(playlistData.videoId) || findVideoId(renderer);
  if (!videoId) return mark("skipped", { title, channel });
  if (videos.has(videoId)) return mark("duplicate", { title, channel });

  const thumbnailRenderer =
    isObject(renderer.thumbnail) &&
    isObject(renderer.thumbnail.musicThumbnailRenderer)
      ? renderer.thumbnail.musicThumbnailRenderer
      : {};
  videos.set(videoId, {
    title,
    channel,
    videoId,
    thumbnailUrl:
      thumbnailValue(thumbnailRenderer.thumbnail) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    duration: musicDuration(renderer),
  });
}

function findVideoId(root: unknown) {
  let found = "";
  walk(root, (node) => {
    if (found) return;
    const candidate = stringValue(node.videoId);
    if (/^[A-Za-z0-9_-]{11}$/.test(candidate)) found = candidate;
  });
  return found;
}

function musicFlexColumnText(renderer: JsonObject, index: number) {
  const columns = Array.isArray(renderer.flexColumns)
    ? renderer.flexColumns.filter(isObject)
    : [];
  const column = columns[index];
  const model =
    column && isObject(column.musicResponsiveListItemFlexColumnRenderer)
      ? column.musicResponsiveListItemFlexColumnRenderer
      : {};
  return textValue(model.text);
}

function musicDuration(renderer: JsonObject): string | null {
  const columns = Array.isArray(renderer.fixedColumns)
    ? renderer.fixedColumns.filter(isObject)
    : [];
  for (const column of columns) {
    const model = isObject(column.musicResponsiveListItemFixedColumnRenderer)
      ? column.musicResponsiveListItemFixedColumnRenderer
      : {};
    const value = textValue(model.text);
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value)) return value;
  }
  return null;
}

export function collectPage(
  root: unknown,
  videos: Map<string, FoundVideo>,
  mark: MarkImportIssue,
) {
  const continuationTokens: string[] = [];
  const continuationViewModelTokens: string[] = [];
  walk(root, (node) => {
    const classicRenderer =
      (isObject(node.playlistVideoRenderer) && node.playlistVideoRenderer) ||
      (isObject(node.playlistPanelVideoRenderer) &&
        node.playlistPanelVideoRenderer);
    if (classicRenderer) collectClassicVideo(classicRenderer, videos, mark);

    if (isObject(node.lockupViewModel))
      collectLockupVideo(node.lockupViewModel, videos, mark);

    if (isObject(node.continuationItemRenderer)) {
      const continuation = node.continuationItemRenderer.continuationEndpoint;
      if (
        isObject(continuation) &&
        isObject(continuation.continuationCommand)
      ) {
        const value = stringValue(continuation.continuationCommand.token);
        if (value) continuationTokens.push(value);
      }
    }

    if (isObject(node.continuationItemViewModel)) {
      const value = findNestedContinuationToken(
        node.continuationItemViewModel,
      );
      if (value) continuationViewModelTokens.push(value);
    }
  });
  // Current YouTube pages can contain two continuation view models: the
  // playlist's next page first, followed by recommendations. Ignoring this
  // newer model stopped imports at 100 items and inflated the skipped count.
  return (
    continuationViewModelTokens.at(0) ?? continuationTokens.at(-1) ?? null
  );
}

function findNestedContinuationToken(root: JsonObject) {
  let found = "";
  walk(root, (node) => {
    if (found || !isObject(node.continuationCommand)) return;
    const value = stringValue(node.continuationCommand.token);
    if (value) found = value;
  });
  return found;
}

function collectClassicVideo(
  renderer: JsonObject,
  videos: Map<string, FoundVideo>,
  mark: MarkImportIssue,
) {
  const videoId = stringValue(renderer.videoId);
  const title = textValue(renderer.title);
  const channel =
    textValue(renderer.shortBylineText) ||
    textValue(renderer.longBylineText) ||
    textValue(renderer.ownerText) ||
    "YouTube";
  const thumbnailUrl = thumbnailValue(renderer.thumbnail);
  const unavailable =
    renderer.isPlayable === false ||
    !videoId ||
    /^\[(?:private|deleted) video\]$/i.test(title);
  if (unavailable)
    return mark("skipped", {
      title: title || "Unavailable track",
      channel,
    });
  if (videos.has(videoId)) return mark("duplicate", { title, channel });
  videos.set(videoId, {
    title: title || "Untitled video",
    channel,
    videoId,
    thumbnailUrl:
      thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    duration: textValue(renderer.lengthText) || null,
  });
}

function collectLockupVideo(
  lockup: JsonObject,
  videos: Map<string, FoundVideo>,
  mark: MarkImportIssue,
) {
  const videoId = stringValue(lockup.contentId);
  const contentType = stringValue(lockup.contentType);
  if (contentType && !contentType.includes("VIDEO")) return;
  if (!videoId && !contentType.includes("VIDEO")) return;

  const metadata =
    isObject(lockup.metadata) &&
    isObject(lockup.metadata.lockupMetadataViewModel)
      ? lockup.metadata.lockupMetadataViewModel
      : {};
  const titleModel = isObject(metadata.title) ? metadata.title : {};
  const title = contentValue(titleModel) || "Untitled video";
  const channel = channelFromLockup(metadata) || "YouTube";
  const image =
    isObject(lockup.contentImage) &&
    isObject(lockup.contentImage.thumbnailViewModel)
      ? lockup.contentImage.thumbnailViewModel
      : {};
  const thumbnailUrl = lockupThumbnailValue(image);

  if (!videoId || lockup.isPlayable === false)
    return mark("skipped", { title, channel });
  if (videos.has(videoId)) return mark("duplicate", { title, channel });

  videos.set(videoId, {
    title,
    channel,
    videoId,
    thumbnailUrl:
      thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    duration: durationFromLockup(image),
  });
}

function channelFromLockup(metadata: JsonObject) {
  const contentMetadata =
    isObject(metadata.metadata) &&
    isObject(metadata.metadata.contentMetadataViewModel)
      ? metadata.metadata.contentMetadataViewModel
      : {};
  const rows = Array.isArray(contentMetadata.metadataRows)
    ? contentMetadata.metadataRows
    : [];
  for (const row of rows) {
    if (!isObject(row) || !Array.isArray(row.metadataParts)) continue;
    for (const part of row.metadataParts) {
      if (isObject(part) && isObject(part.text)) {
        const value = contentValue(part.text);
        if (value) return value;
      }
    }
  }
  return "";
}

function durationFromLockup(image: JsonObject): string | null {
  let found = "";
  walk(image, (node) => {
    if (found || !isObject(node.thumbnailBadgeViewModel)) return;
    const value = contentValue(node.thumbnailBadgeViewModel.text);
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value)) found = value;
  });
  return found || null;
}

function lockupThumbnailValue(image: JsonObject) {
  const model = isObject(image.image) ? image.image : {};
  const sources = Array.isArray(model.sources)
    ? model.sources.filter(isObject)
    : [];
  return sources.length
    ? stringValue(sources.at(-1)?.url).replace(/^\/\//, "https://")
    : "";
}

function findPlaylistTitle(root: unknown) {
  let found = "";
  walk(root, (node) => {
    if (found) return;
    if (isObject(node.playlistMetadataRenderer))
      found = stringValue(node.playlistMetadataRenderer.title);
    if (!found && isObject(node.playlistSidebarPrimaryInfoRenderer))
      found = textValue(node.playlistSidebarPrimaryInfoRenderer.title);
  });
  return found;
}

function findMusicPlaylistTitle(root: unknown) {
  let found = "";
  walk(root, (node) => {
    if (found) return;
    if (isObject(node.musicDetailHeaderRenderer))
      found = textValue(node.musicDetailHeaderRenderer.title);
    if (!found && isObject(node.musicResponsiveHeaderRenderer))
      found = textValue(node.musicResponsiveHeaderRenderer.title);
  });
  return found || findPlaylistTitle(root);
}

function findDeclaredCount(root: unknown) {
  let found = 0;
  walkValues(root, (value) => {
    const match = value.match(
      /(?:^|\D)(\d[\d,.\s]*)\s+(?:videos?|tracks?|songs?)(?:\D|$)/i,
    );
    if (!match) return;
    const count = Number(match[1].replace(/\D/g, ""));
    if (Number.isFinite(count)) found = Math.max(found, count);
  });
  return found;
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (!isObject(value)) return "";
  if (typeof value.simpleText === "string") return value.simpleText;
  if (Array.isArray(value.runs))
    return value.runs
      .map((run) => (isObject(run) ? stringValue(run.text) : ""))
      .join("");
  return contentValue(value);
}

function contentValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (!isObject(value)) return "";
  if (typeof value.content === "string") return value.content;
  if (typeof value.simpleText === "string") return value.simpleText;
  if (Array.isArray(value.runs))
    return value.runs
      .map((run) => (isObject(run) ? stringValue(run.text) : ""))
      .join("");
  return "";
}

function thumbnailValue(value: unknown) {
  if (!isObject(value) || !Array.isArray(value.thumbnails)) return "";
  const thumbnails = value.thumbnails.filter(isObject);
  return thumbnails.length
    ? stringValue(thumbnails.at(-1)?.url).replace(/^\/\//, "https://")
    : "";
}

function walk(value: unknown, visit: (node: JsonObject) => void) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!isObject(value)) return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}

function walkValues(value: unknown, visit: (text: string) => void) {
  if (typeof value === "string") return visit(value);
  if (Array.isArray(value))
    return value.forEach((item) => walkValues(item, visit));
  if (isObject(value))
    Object.values(value).forEach((item) => walkValues(item, visit));
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
