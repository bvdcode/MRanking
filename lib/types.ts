export type Language = "en" | "ru" | "uk";

export type PackVisibility = "private" | "public";

export type SourceType =
  | "youtube"
  | "youtubeMusic"
  | "spotify"
  | "yandexMusic";

export type User = {
  id: string;
  nickname: string;
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
  visibility: PackVisibility;
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

export type WheelMode = "classic" | "lastOneStanding";

export type WheelEntryState = {
  itemId: string;
  chance: number;
  color: string;
  enabled: boolean;
  eliminated: boolean;
};

export type WheelStateSnapshot = {
  entries: WheelEntryState[];
  winnerItemId: string | null;
  rotation: number;
};

export type WheelSessionState = WheelStateSnapshot & {
  mode: WheelMode;
  status: "active" | "complete";
  auto: boolean;
  undoStack: WheelStateSnapshot[];
  redoStack: WheelStateSnapshot[];
  updatedAt: string;
};

export type WheelRun = {
  id: string;
  packId: string;
  state: WheelSessionState;
  updatedAt: string;
};

export type WheelResultSnapshot = WheelStateSnapshot & {
  mode: WheelMode;
  status: "complete";
  winnerItemId: string;
};

export type WheelResult = {
  id: string;
  packId: string;
  winnerItemId: string;
  mode: WheelMode;
  state: WheelResultSnapshot;
  pack: Pack;
  completedAt: string;
};

export type WheelSettings = {
  durationSeconds: number;
  soundEnabled: boolean;
  volume: number;
};
