import { findContinuationToken } from "./profile";
import {
  contentValue,
  isObject,
  stringValue,
  textValue,
  thumbnailValue,
  walk,
  walkValues,
} from "./json";
import type {
  FoundVideo,
  JsonObject,
  JsonValue,
  MarkImportIssue,
} from "./types";

export function collectMusicPlaylistPage(
  root: JsonValue,
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
  if (!videoId) {
    return mark("skipped", { title, channel });
  }
  if (videos.has(videoId)) {
    return mark("duplicate", { title, channel });
  }

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

function findVideoId(root: JsonValue) {
  let found = "";
  walk(root, (node) => {
    if (found) {
      return;
    }
    const candidate = stringValue(node.videoId);
    if (/^[A-Za-z0-9_-]{11}$/.test(candidate)) {
      found = candidate;
    }
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
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value)) {
      return value;
    }
  }
  return null;
}

export function collectPage(
  root: JsonValue,
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
    if (classicRenderer) {
      collectClassicVideo(classicRenderer, videos, mark);
    }

    if (isObject(node.lockupViewModel)) {
      collectLockupVideo(node.lockupViewModel, videos, mark);
    }

    if (isObject(node.continuationItemRenderer)) {
      const continuation = node.continuationItemRenderer.continuationEndpoint;
      if (
        isObject(continuation) &&
        isObject(continuation.continuationCommand)
      ) {
        const value = stringValue(continuation.continuationCommand.token);
        if (value) {
          continuationTokens.push(value);
        }
      }
    }

    if (isObject(node.continuationItemViewModel)) {
      const value = findNestedContinuationToken(node.continuationItemViewModel);
      if (value) {
        continuationViewModelTokens.push(value);
      }
    }
  });
  // Current YouTube pages can contain two continuation view models: the
  // playlist's next page first, followed by recommendations. Ignoring this
  // newer model stopped imports at 100 items and inflated the skipped count.
  return continuationViewModelTokens.at(0) ?? continuationTokens.at(-1) ?? null;
}

function findNestedContinuationToken(root: JsonObject) {
  let found = "";
  walk(root, (node) => {
    if (found || !isObject(node.continuationCommand)) {
      return;
    }
    const value = stringValue(node.continuationCommand.token);
    if (value) {
      found = value;
    }
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
  if (unavailable) {
    return mark("skipped", {
      title: title || "Unavailable track",
      channel,
    });
  }
  if (videos.has(videoId)) {
    return mark("duplicate", { title, channel });
  }
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
  if (contentType && !contentType.includes("VIDEO")) {
    return;
  }
  if (!videoId && !contentType.includes("VIDEO")) {
    return;
  }

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

  if (!videoId || lockup.isPlayable === false) {
    return mark("skipped", { title, channel });
  }
  if (videos.has(videoId)) {
    return mark("duplicate", { title, channel });
  }

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
    if (!isObject(row) || !Array.isArray(row.metadataParts)) {
      continue;
    }
    for (const part of row.metadataParts) {
      if (isObject(part) && isObject(part.text)) {
        const value = contentValue(part.text);
        if (value) {
          return value;
        }
      }
    }
  }
  return "";
}

function durationFromLockup(image: JsonObject): string | null {
  let found = "";
  walk(image, (node) => {
    if (found || !isObject(node.thumbnailBadgeViewModel)) {
      return;
    }
    const value = contentValue(node.thumbnailBadgeViewModel.text);
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value)) {
      found = value;
    }
  });
  return found || null;
}

export function lockupThumbnailValue(image: JsonObject) {
  const model = isObject(image.image) ? image.image : {};
  const sources = Array.isArray(model.sources)
    ? model.sources.filter(isObject)
    : [];
  return sources.length
    ? stringValue(sources.at(-1)?.url).replace(/^\/\//, "https://")
    : "";
}

export function findPlaylistTitle(root: JsonValue) {
  let found = "";
  walk(root, (node) => {
    if (found) {
      return;
    }
    if (isObject(node.playlistMetadataRenderer)) {
      found = stringValue(node.playlistMetadataRenderer.title);
    }
    if (!found && isObject(node.playlistSidebarPrimaryInfoRenderer)) {
      found = textValue(node.playlistSidebarPrimaryInfoRenderer.title);
    }
  });
  return found;
}

export function findMusicPlaylistTitle(root: JsonValue) {
  let found = "";
  walk(root, (node) => {
    if (found) {
      return;
    }
    if (isObject(node.musicDetailHeaderRenderer)) {
      found = textValue(node.musicDetailHeaderRenderer.title);
    }
    if (!found && isObject(node.musicResponsiveHeaderRenderer)) {
      found = textValue(node.musicResponsiveHeaderRenderer.title);
    }
  });
  return found || findPlaylistTitle(root);
}

export function findDeclaredCount(root: JsonValue) {
  let found = 0;
  walkValues(root, (value) => {
    const match = value.match(
      /(?:^|\D)(\d[\d,.\s]*)\s+(?:videos?|tracks?|songs?)(?:\D|$)/i,
    );
    if (!match) {
      return;
    }
    const count = Number(match[1].replace(/\D/g, ""));
    if (Number.isFinite(count)) {
      found = Math.max(found, count);
    }
  });
  return found;
}
