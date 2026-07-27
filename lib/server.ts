import { env } from "cloudflare:workers";
import type { User } from "./types";

type RuntimeEnv = {
  DB: D1Database;
  AVATARS: R2Bucket;
};

type UserRow = {
  id: string;
  nickname: string;
  avatar_emoji: string;
  avatar_key: string | null;
  created_at: string;
};

const SESSION_COOKIE = "mranking_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
let schemaPromise: Promise<void> | null = null;

export function runtimeEnv() {
  return env as unknown as RuntimeEnv;
}

export function getD1() {
  return runtimeEnv().DB;
}

export async function ensureSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = initializeSchema().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function initializeSchema() {
  const db = getD1();
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      nickname_key TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      avatar_emoji TEXT NOT NULL DEFAULT '🎧',
      avatar_key TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS packs (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'youtube',
      source_url TEXT NOT NULL,
      cover_type TEXT NOT NULL DEFAULT 'thumbnail',
      cover_value TEXT NOT NULL,
      item_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS pack_items (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'YouTube',
      video_id TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      youtube_url TEXT NOT NULL,
      duration TEXT,
      FOREIGN KEY (pack_id) REFERENCES packs(id)
    )`,
    `CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pack_id TEXT NOT NULL,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (pack_id) REFERENCES packs(id)
    )`,
    `CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pack_id TEXT NOT NULL,
      champion_item_id TEXT NOT NULL,
      session_json TEXT NOT NULL,
      pack_json TEXT,
      completed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (pack_id) REFERENCES packs(id)
    )`,
    "CREATE INDEX IF NOT EXISTS packs_owner_id_idx ON packs(owner_id)",
    "CREATE INDEX IF NOT EXISTS pack_items_pack_id_idx ON pack_items(pack_id, position)",
    "CREATE INDEX IF NOT EXISTS results_user_id_idx ON results(user_id, completed_at)",
    "CREATE UNIQUE INDEX IF NOT EXISTS runs_user_pack_idx ON runs(user_id, pack_id)",
  ];
  await db.batch(statements.map((sql) => db.prepare(sql)));
  const resultColumns = (await db.prepare("PRAGMA table_info(results)").all<{
    name: string;
  }>()).results;
  if (!resultColumns.some((column) => column.name === "pack_json"))
    await db.prepare("ALTER TABLE results ADD COLUMN pack_json TEXT").run();
}

export function normalizeNickname(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export async function hashPassword(password: string, saltBase64?: string) {
  const salt = saltBase64 ? base64ToBytes(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" }, key, 256);
  return { salt: bytesToBase64(salt), hash: bytesToBase64(new Uint8Array(bits)) };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = await hashPassword(password, salt);
  const left = base64ToBytes(actual.hash);
  const right = base64ToBytes(expectedHash);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function createSession(userId: string, request: Request) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_SECONDS * 1000);
  await getD1().prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), userId, tokenHash, expiresAt.toISOString(), createdAt.toISOString()).run();
  return {
    token,
    cookie: sessionCookie(token, SESSION_SECONDS, request),
  };
}

export async function destroySession(request: Request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) await getD1().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return sessionCookie("", 0, request);
}

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  await ensureSchema();
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await getD1().prepare(
    `SELECT u.id, u.nickname, u.avatar_emoji, u.avatar_key, u.created_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.deleted_at IS NULL`,
  ).bind(await sha256(token), new Date().toISOString()).first<UserRow>();
  return row ? serializeUser(row) : null;
}

export async function requireUser(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { user: null, response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  return { user, response: null };
}

export function serializeUser(row: UserRow): User {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarEmoji: row.avatar_emoji,
    avatarUrl: row.avatar_key ? `/api/avatar?user=${encodeURIComponent(row.id)}` : null,
    createdAt: row.created_at,
  };
}

export function jsonError(
  error: unknown,
  fallback = "Unexpected error",
  status = 500,
) {
  const message = error instanceof Error ? error.message : fallback;
  return Response.json({ error: message }, { status });
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function getCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function sessionCookie(token: string, maxAge: number, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
