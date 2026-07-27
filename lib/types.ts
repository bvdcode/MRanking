export type Language = "en" | "ru" | "uk";

export type SourceType =
  | "youtube"
  | "youtubeMusic"
  | "spotify"
  | "yandexMusic";

export type User = {
  id: string;
  nickname: string;
  role: "admin" | "user";
  avatarEmoji: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type PackItem = {
  id: string;
  position: number;
  title: string;
  channel: string;
  videoId: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  duration: string | null;
};

export type Pack = {
  id: string;
  ownerId: string;
  ownerNickname: string;
  name: string;
  sourceType: SourceType;
  sourceUrl: string;
  coverType: "thumbnail" | "emoji";
  coverValue: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  items: PackItem[];
};

export type PlaylistPreview = {
  title: string;
  sourceUrl: string;
  sourceType: SourceType;
  cover: string;
  skipped: number;
  duplicates: number;
  issues: PlaylistImportIssue[];
  items: Omit<PackItem, "id" | "position">[];
};

export type PlaylistImportIssue = {
  title: string;
  channel: string;
  reason: "skipped" | "duplicate";
  count: number;
};

export type ProfilePlaylistPreview = {
  playlistId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  itemCount: number | null;
};

export type YouTubeProfilePreview = {
  title: string;
  sourceUrl: string;
  sourceType: SourceType;
  avatarUrl: string;
  playlists: ProfilePlaylistPreview[];
};

export type YouTubeImportResult =
  | { kind: "playlist"; playlist: PlaylistPreview }
  | { kind: "profile"; profile: YouTubeProfilePreview };

export type SavedResult = {
  id: string;
  packId: string;
  championItemId: string;
  session: Session;
  pack: Pack | null;
  completedAt: string;
};

export type MatchRecord = {
  id: string;
  round: number;
  winnerId: string;
  loserId: string;
  order: number;
  carryMatch: boolean;
};

export type Elimination = { cardId: string; round: number; order: number };

export type Session = {
  id: string;
  packId: string;
  round: number;
  roundStartCount: number;
  activePair: [string, string];
  pendingPairs: [string, string][];
  roundWinners: string[];
  carryId: string | null;
  isCarryMatch: boolean;
  matches: MatchRecord[];
  eliminated: Elimination[];
  startedAt: string;
  status: "active" | "complete";
  championId: string | null;
};

export type UndoSnapshot = {
  round: number;
  roundStartCount: number;
  activePair: [string, string];
  pendingPairs: [string, string][];
  roundWinners: string[];
  carryId: string | null;
  isCarryMatch: boolean;
  matchCount: number;
  eliminationCount: number;
  status: "active" | "complete";
  championId: string | null;
};

export type ActiveRun = { session: Session; undoStack: UndoSnapshot[] };

export type AdminUser = User & {
  deletedAt: string | null;
  packCount: number;
};
