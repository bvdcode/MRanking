import { getD1, jsonError, requireUser, uid } from "../../../lib/server";
import type {
  Pack,
  PackItem,
  PackVisibility,
  SourceType,
  WheelEntryState,
  WheelMode,
  WheelResult,
  WheelResultSnapshot,
} from "../../../lib/types";

type ResultRow = {
  id: string;
  pack_id: string;
  winner_item_id: string;
  mode: WheelMode;
  state_json: string;
  pack_json: string;
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
  visibility: PackVisibility;
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

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type ResultInput = {
  id?: string;
  packId?: string;
  winnerItemId?: string;
  mode?: WheelMode;
  state?: JsonValue;
};

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }
    const rows = (
      await getD1()
        .prepare(
          `SELECT id, pack_id, winner_item_id, mode, state_json, pack_json, completed_at
           FROM wheel_results WHERE user_id = ? ORDER BY completed_at DESC`,
        )
        .bind(auth.user.id)
        .all<ResultRow>()
    ).results;
    const results = rows.flatMap((row): WheelResult[] => {
      const state = parseResultState(row.state_json);
      const pack = parseStoredPack(row.pack_json);
      if (
        !state ||
        !pack ||
        row.mode !== state.mode ||
        row.winner_item_id !== state.winnerItemId ||
        !entriesMatchPack(state.entries, pack)
      ) {
        return [];
      }
      return [
        {
          id: row.id,
          packId: row.pack_id,
          winnerItemId: row.winner_item_id,
          mode: row.mode,
          state,
          pack,
          completedAt: row.completed_at,
        },
      ];
    });
    return Response.json({ results });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }
    const body = (await request.json()) as { result?: ResultInput };
    const input = body.result;
    const packId = input?.packId?.trim() ?? "";
    const state = sanitizeResultState(input?.state);
    if (
      !input ||
      !packId ||
      !state ||
      input.mode !== state.mode ||
      input.winnerItemId !== state.winnerItemId
    ) {
      return Response.json({ error: "Completed wheel result required" }, { status: 400 });
    }
    const pack = await loadPackSnapshot(packId, true);
    if (!pack || pack.ownerId !== auth.user.id) {
      return Response.json({ error: "Pack not found" }, { status: 404 });
    }
    if (
      !entriesMatchPack(state.entries, pack) ||
      !winnerIsActive(state.entries, state.winnerItemId)
    ) {
      return Response.json(
        { error: "Wheel entries or winner do not match this pack" },
        { status: 400 },
      );
    }
    const db = getD1();
    const requestedId = input.id?.trim();
    if (requestedId) {
      const owner = await db
        .prepare("SELECT user_id FROM wheel_results WHERE id = ?")
        .bind(requestedId)
        .first<{ user_id: string }>();
      if (owner && owner.user_id !== auth.user.id) {
        return Response.json({ error: "Wheel result id is unavailable" }, { status: 409 });
      }
    }
    const id = requestedId || uid("wheel-result");
    const completedAt = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO wheel_results
           (id, user_id, pack_id, winner_item_id, mode, state_json, pack_json, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           user_id = excluded.user_id,
           pack_id = excluded.pack_id,
           winner_item_id = excluded.winner_item_id,
           mode = excluded.mode,
           state_json = excluded.state_json,
           pack_json = excluded.pack_json,
           completed_at = excluded.completed_at`,
      )
      .bind(
        id,
        auth.user.id,
        packId,
        state.winnerItemId,
        state.mode,
        JSON.stringify(state),
        JSON.stringify(pack),
        completedAt,
      )
      .run();
    await db
      .prepare(
        "DELETE FROM wheel_runs WHERE id = ? AND user_id = ? AND pack_id = ?",
      )
      .bind(id, auth.user.id, packId)
      .run();
    const result: WheelResult = {
      id,
      packId,
      winnerItemId: state.winnerItemId,
      mode: state.mode,
      state,
      pack,
      completedAt,
    };
    return Response.json({ result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }
    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return Response.json({ error: "Wheel result id required" }, { status: 400 });
    }
    await getD1()
      .prepare("DELETE FROM wheel_results WHERE id = ? AND user_id = ?")
      .bind(id, auth.user.id)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

function parseResultState(value: string) {
  try {
    return sanitizeResultState(JSON.parse(value) as JsonValue);
  } catch {
    return null;
  }
}

function sanitizeResultState(value: JsonValue | undefined): WheelResultSnapshot | null {
  if (!isRecord(value) || value.status !== "complete") {
    return null;
  }
  if (value.mode !== "classic" && value.mode !== "lastOneStanding") {
    return null;
  }
  const entries = sanitizeEntries(value.entries);
  const winnerItemId =
    typeof value.winnerItemId === "string" ? value.winnerItemId : "";
  if (!entries || !winnerIsActive(entries, winnerItemId)) {
    return null;
  }
  return {
    mode: value.mode,
    status: "complete",
    entries,
    winnerItemId,
    rotation: finiteNumber(value.rotation, 0),
  };
}

function sanitizeEntries(value: JsonValue | undefined): WheelEntryState[] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }
  const ids = new Set<string>();
  const entries: WheelEntryState[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }
    const itemId = typeof item.itemId === "string" ? item.itemId.trim() : "";
    const chance = typeof item.chance === "number" ? item.chance : Number.NaN;
    const color = typeof item.color === "string" ? item.color : "";
    if (
      !itemId ||
      ids.has(itemId) ||
      !Number.isFinite(chance) ||
      chance < 0 ||
      chance > 100 ||
      color.length > 64 ||
      !isSafeWheelColor(color) ||
      typeof item.enabled !== "boolean" ||
      typeof item.eliminated !== "boolean"
    ) {
      return null;
    }
    ids.add(itemId);
    entries.push({
      itemId,
      chance,
      color,
      enabled: item.enabled,
      eliminated: item.eliminated,
    });
  }
  return hasValidChanceDistribution(entries) ? entries : null;
}

function entriesMatchPack(entries: WheelEntryState[], pack: Pack) {
  if (entries.length !== pack.items.length) {
    return false;
  }
  const membership = new Set(pack.items.map((item) => item.id));
  return entries.every((entry) => membership.has(entry.itemId));
}

function winnerIsActive(entries: WheelEntryState[], winnerItemId: string) {
  return entries.some(
    (entry) =>
      entry.itemId === winnerItemId && entry.enabled && !entry.eliminated,
  );
}

function hasValidChanceDistribution(entries: WheelEntryState[]) {
  let activeCount = 0;
  let total = 0;
  for (const entry of entries) {
    if (entry.enabled && !entry.eliminated) {
      if (entry.chance <= 0) {
        return false;
      }
      activeCount += 1;
      total += entry.chance;
    } else if (entry.chance !== 0) {
      return false;
    }
  }
  return activeCount > 0 && Math.abs(total - 100) <= 0.001;
}

function isSafeWheelColor(color: string) {
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
    return true;
  }
  const match = color.match(
    /^hsl\((\d{1,3}(?:\.\d{1,2})?) (\d{1,3}(?:\.\d{1,2})?)% (\d{1,3}(?:\.\d{1,2})?)%\)$/,
  );
  if (!match) {
    return false;
  }
  const [, hue, saturation, lightness] = match.map(Number);
  return hue <= 360 && saturation <= 100 && lightness <= 100;
}

async function loadPackSnapshot(packId: string, activeOnly = false) {
  const row = await getD1()
    .prepare(
      `SELECT p.*, u.nickname AS owner_nickname
       FROM packs p LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.id = ? ${activeOnly ? "AND p.deleted_at IS NULL" : ""}`,
    )
    .bind(packId)
    .first<PackRow>();
  if (!row) {
    return null;
  }
  const items = (
    await getD1()
      .prepare("SELECT * FROM pack_items WHERE pack_id = ? ORDER BY position ASC")
      .bind(packId)
      .all<ItemRow>()
  ).results;
  return packFromRow(row, items);
}

function packFromRow(row: PackRow, items: ItemRow[]): Pack {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerNickname: row.owner_nickname ?? "Deleted user",
    name: row.name,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    coverType: row.cover_type,
    coverValue: row.cover_value,
    visibility: row.visibility,
    itemCount: row.item_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map(itemFromRow),
  };
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

function parseStoredPack(value: string): Pack | null {
  try {
    const parsed = JSON.parse(value) as Pack;
    return parsed && Array.isArray(parsed.items)
      ? {
          ...parsed,
          visibility: parsed.visibility === "public" ? "public" : "private",
        }
      : null;
  } catch {
    return null;
  }
}

function finiteNumber(value: JsonValue | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
