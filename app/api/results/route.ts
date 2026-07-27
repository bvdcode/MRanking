import { getD1, jsonError, requireUser } from "../../../lib/server";
import type { Pack, PackItem, Session, SourceType } from "../../../lib/types";

type ResultRow = {
  id: string;
  pack_id: string;
  champion_item_id: string;
  session_json: string;
  pack_json: string | null;
  completed_at: string;
};

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
  position: number;
  title: string;
  channel: string;
  video_id: string;
  thumbnail_url: string;
  youtube_url: string;
  duration: string | null;
};

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const rows = (await getD1().prepare(
      `SELECT id, pack_id, champion_item_id, session_json, pack_json, completed_at
       FROM results WHERE user_id = ? ORDER BY completed_at DESC`,
    ).bind(auth.user.id).all<ResultRow>()).results;
    const fallbackPacks = new Map<string, Promise<Pack | null>>();
    const results = await Promise.all(rows.map(async (row) => {
      try {
        const session = JSON.parse(row.session_json) as Session;
        let pack = parseStoredPack(row.pack_json);
        if (!pack) {
          if (!fallbackPacks.has(row.pack_id))
            fallbackPacks.set(row.pack_id, loadPackSnapshot(row.pack_id));
          pack = (await fallbackPacks.get(row.pack_id)) ?? null;
          if (pack)
            await getD1().prepare(
              "UPDATE results SET pack_json = ? WHERE id = ? AND user_id = ?",
            ).bind(JSON.stringify(pack), row.id, auth.user.id).run();
        }
        return {
          id: row.id,
          packId: row.pack_id,
          championItemId: row.champion_item_id,
          session,
          pack,
          completedAt: row.completed_at,
        };
      } catch {
        return null;
      }
    }));
    return Response.json({ results: results.filter(Boolean) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const body = await request.json() as { session?: Session };
    const session = body.session;
    if (!session || session.status !== "complete" || !session.championId)
      return Response.json(
        { error: "Completed session required" },
        { status: 400 },
      );
    const pack = await loadPackSnapshot(session.packId, true);
    if (
      !pack ||
      (pack.ownerId !== auth.user.id && auth.user.role !== "admin")
    )
      return Response.json({ error: "Pack not found" }, { status: 404 });
    const completedAt = new Date().toISOString();
    await getD1().prepare(
      `INSERT OR REPLACE INTO results
        (id, user_id, pack_id, champion_item_id, session_json, pack_json, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      session.id,
      auth.user.id,
      session.packId,
      session.championId,
      JSON.stringify(session),
      JSON.stringify(pack),
      completedAt,
    ).run();
    await getD1().prepare(
      "DELETE FROM runs WHERE user_id = ? AND pack_id = ?",
    ).bind(auth.user.id, session.packId).run();
    return Response.json({
      result: {
        id: session.id,
        packId: session.packId,
        championItemId: session.championId,
        session,
        pack,
        completedAt,
      },
    }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;

    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id)
      return Response.json(
        { error: "Tournament result id is required" },
        { status: 400 },
      );

    const existing = await getD1().prepare(
      "SELECT id FROM results WHERE id = ? AND user_id = ?",
    ).bind(id, auth.user.id).first<{ id: string }>();
    if (!existing)
      return Response.json(
        { error: "Tournament result not found" },
        { status: 404 },
      );

    await getD1().prepare(
      "DELETE FROM results WHERE id = ? AND user_id = ?",
    ).bind(id, auth.user.id).run();

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

async function loadPackSnapshot(packId: string, activeOnly = false) {
  const row = await getD1().prepare(
    `SELECT p.*, u.nickname AS owner_nickname
     FROM packs p LEFT JOIN users u ON u.id = p.owner_id
     WHERE p.id = ? ${activeOnly ? "AND p.deleted_at IS NULL" : ""}`,
  ).bind(packId).first<PackRow>();
  if (!row) return null;
  const items = (await getD1().prepare(
    "SELECT * FROM pack_items WHERE pack_id = ? ORDER BY position ASC",
  ).bind(packId).all<ItemRow>()).results;
  return {
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
    items: items.map(itemFromRow),
  } satisfies Pack;
}

function itemFromRow(item: ItemRow): PackItem {
  return {
    id: item.id,
    position: item.position,
    title: item.title,
    channel: item.channel,
    videoId: item.video_id,
    thumbnailUrl: item.thumbnail_url,
    youtubeUrl: item.youtube_url,
    duration: item.duration,
  };
}

function parseStoredPack(value: string | null): Pack | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Pack;
    return parsed && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}
