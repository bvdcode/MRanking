import { getD1, jsonError, requireUser, uid } from "../../../lib/server";
import type { Pack, PackItem, SourceType } from "../../../lib/types";

type PackRow = {
  id: string;
  owner_id: string;
  owner_nickname: string | null;
  name: string;
  source_type: SourceType;
  source_url: string;
  cover_type: "thumbnail" | "emoji";
  cover_value: string;
  item_count: number;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  pack_id: string;
  position: number;
  title: string;
  channel: string;
  video_id: string;
  thumbnail_url: string;
  youtube_url: string;
  duration: string | null;
};

type PackPayload = {
  id?: string;
  name?: string;
  sourceType?: SourceType;
  sourceUrl?: string;
  coverType?: "thumbnail" | "emoji";
  coverValue?: string;
  items?: Array<Partial<PackItem>>;
};

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const all = auth.user.role === "admin" && new URL(request.url).searchParams.get("scope") === "all";
    const query = `SELECT p.*, u.nickname AS owner_nickname
      FROM packs p LEFT JOIN users u ON u.id = p.owner_id
      WHERE p.deleted_at IS NULL ${all ? "" : "AND p.owner_id = ?"}
      ORDER BY p.updated_at DESC`;
    const rows = all
      ? (await getD1().prepare(query).all<PackRow>()).results
      : (await getD1().prepare(query).bind(auth.user.id).all<PackRow>()).results;
    return Response.json({ packs: await hydratePacks(rows) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const body = await request.json() as PackPayload;
    const validation = validatePack(body);
    if (validation) return Response.json({ error: validation }, { status: 400 });
    const db = getD1();
    const now = new Date().toISOString();
    let packId = body.id?.trim() ?? "";
    let ownerId = auth.user.id;
    if (packId) {
      const existing = await db.prepare("SELECT owner_id, created_at FROM packs WHERE id = ? AND deleted_at IS NULL")
        .bind(packId).first<{ owner_id: string; created_at: string }>();
      if (!existing) return Response.json({ error: "Pack not found" }, { status: 404 });
      if (existing.owner_id !== auth.user.id && auth.user.role !== "admin") return Response.json({ error: "Not allowed" }, { status: 403 });
      ownerId = existing.owner_id;
      await db.prepare("DELETE FROM pack_items WHERE pack_id = ?").bind(packId).run();
      await db.prepare(
        `UPDATE packs SET name = ?, source_type = ?, source_url = ?, cover_type = ?, cover_value = ?, item_count = ?, updated_at = ?
         WHERE id = ?`,
      ).bind(body.name!.trim(), body.sourceType, body.sourceUrl, body.coverType, body.coverValue, body.items!.length, now, packId).run();
    } else {
      packId = uid("pack");
      await db.prepare(
        `INSERT INTO packs (id, owner_id, name, source_type, source_url, cover_type, cover_value, item_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(packId, ownerId, body.name!.trim(), body.sourceType, body.sourceUrl, body.coverType, body.coverValue, body.items!.length, now, now).run();
    }
    await insertItems(packId, body.items!);
    const [row] = (await db.prepare(
      `SELECT p.*, u.nickname AS owner_nickname FROM packs p LEFT JOIN users u ON u.id = p.owner_id WHERE p.id = ?`,
    ).bind(packId).all<PackRow>()).results;
    const [pack] = await hydratePacks([row]);
    return Response.json({ pack }, { status: body.id ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const pack = await getD1().prepare("SELECT owner_id FROM packs WHERE id = ?").bind(id).first<{ owner_id: string }>();
    if (!pack) return Response.json({ error: "Pack not found" }, { status: 404 });
    if (pack.owner_id !== auth.user.id && auth.user.role !== "admin") return Response.json({ error: "Not allowed" }, { status: 403 });
    const db = getD1();
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("DELETE FROM runs WHERE pack_id = ?").bind(id),
      db.prepare("UPDATE packs SET deleted_at = ?, updated_at = ? WHERE id = ?").bind(now, now, id),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

function validatePack(body: PackPayload) {
  if (!body.name?.trim()) return "Pack name is required";
  if (!body.sourceUrl?.trim()) return "Source URL is required";
  if (!body.sourceType || !["youtube", "youtubeMusic", "spotify", "yandexMusic"].includes(body.sourceType)) return "Unknown source type";
  if (!body.coverType || !["thumbnail", "emoji"].includes(body.coverType)) return "Choose a cover";
  if (!body.coverValue?.trim()) return "Choose a cover";
  if (!Array.isArray(body.items) || body.items.length < 16) return "A pack needs at least 16 items";
  const ids = new Set<string>();
  for (const item of body.items) {
    if (!item.videoId || !item.title || !item.thumbnailUrl || !item.youtubeUrl) return "Every item needs complete metadata";
    if (ids.has(item.videoId)) return "Duplicate items are not allowed";
    ids.add(item.videoId);
  }
  return null;
}

async function insertItems(packId: string, items: Array<Partial<PackItem>>) {
  const db = getD1();
  const statements = items.map((item, index) => db.prepare(
    `INSERT INTO pack_items (id, pack_id, position, title, channel, video_id, thumbnail_url, youtube_url, duration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(uid("item"), packId, index, item.title, item.channel ?? "Music", item.videoId, item.thumbnailUrl, item.youtubeUrl, item.duration ?? null));
  for (let index = 0; index < statements.length; index += 100) await db.batch(statements.slice(index, index + 100));
}

async function hydratePacks(rows: PackRow[]): Promise<Pack[]> {
  if (rows.length === 0) return [];
  const db = getD1();
  const batches = await db.batch(rows.map((row) => db.prepare(
    "SELECT * FROM pack_items WHERE pack_id = ? ORDER BY position ASC",
  ).bind(row.id)));
  return rows.map((row, index) => ({
    id: row.id,
    ownerId: row.owner_id,
    ownerNickname: row.owner_nickname ?? "Deleted user",
    name: row.name,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    coverType: row.cover_type,
    coverValue: row.cover_value,
    itemCount: row.item_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: ((batches[index].results ?? []) as unknown as ItemRow[]).map((item) => ({
      id: item.id,
      position: item.position,
      title: item.title,
      channel: item.channel,
      videoId: item.video_id,
      thumbnailUrl: item.thumbnail_url,
      youtubeUrl: item.youtube_url,
      duration: item.duration,
    })),
  }));
}
