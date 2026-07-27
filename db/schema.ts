import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  nicknameKey: text("nickname_key").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  avatarEmoji: text("avatar_emoji").notNull().default("🎧"),
  avatarKey: text("avatar_key"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [uniqueIndex("users_nickname_key_idx").on(table.nicknameKey)]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("sessions_token_hash_idx").on(table.tokenHash)]);

export const packs = sqliteTable("packs", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull().default("youtube"),
  sourceUrl: text("source_url").notNull(),
  coverType: text("cover_type", { enum: ["thumbnail", "emoji"] }).notNull().default("thumbnail"),
  coverValue: text("cover_value").notNull(),
  itemCount: integer("item_count").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const packItems = sqliteTable("pack_items", {
  id: text("id").primaryKey(),
  packId: text("pack_id").notNull().references(() => packs.id),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  channel: text("channel").notNull().default("YouTube"),
  videoId: text("video_id").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  duration: text("duration"),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  packId: text("pack_id").notNull().references(() => packs.id),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const results = sqliteTable("results", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  packId: text("pack_id").notNull().references(() => packs.id),
  championItemId: text("champion_item_id").notNull(),
  sessionJson: text("session_json").notNull(),
  packJson: text("pack_json"),
  completedAt: text("completed_at").notNull(),
});
