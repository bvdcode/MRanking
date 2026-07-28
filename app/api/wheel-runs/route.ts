import { getD1, jsonError, requireUser, uid } from "../../../lib/server";
import type {
  WheelEntryState,
  WheelRun,
  WheelSessionState,
  WheelStateSnapshot,
} from "../../../lib/types";

type RunRow = {
  id: string;
  pack_id: string;
  state_json: string;
  updated_at: string;
};

type MembershipRow = { pack_id: string; item_id: string };

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type RunPayload = {
  run?: {
    id?: string;
    packId?: string;
    state?: JsonValue;
    updatedAt?: string;
  };
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
          `SELECT wr.id, wr.pack_id, wr.state_json, wr.updated_at
           FROM wheel_runs wr
           JOIN packs p ON p.id = wr.pack_id
           WHERE wr.user_id = ? AND p.deleted_at IS NULL
           ORDER BY wr.updated_at DESC`,
        )
        .bind(auth.user.id)
        .all<RunRow>()
    ).results;
    const membershipRows = (
      await getD1()
        .prepare(
          `SELECT pi.pack_id, pi.id AS item_id
           FROM pack_items pi
           JOIN wheel_runs wr ON wr.pack_id = pi.pack_id
           JOIN packs p ON p.id = pi.pack_id
           WHERE wr.user_id = ? AND p.deleted_at IS NULL`,
        )
        .bind(auth.user.id)
        .all<MembershipRow>()
    ).results;
    const memberships = membershipMap(membershipRows);
    const runs = rows.flatMap((row): WheelRun[] => {
      const state = parseSessionState(row.state_json);
      return state &&
        state.status === "active" &&
        entriesMatchMembership(state.entries, memberships.get(row.pack_id))
        ? [{ id: row.id, packId: row.pack_id, state, updatedAt: row.updated_at }]
        : [];
    });
    return Response.json({ runs });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }
    const body = (await request.json()) as RunPayload;
    const packId = body.run?.packId?.trim() ?? "";
    const state = sanitizeSessionState(body.run?.state);
    if (!packId || !state || state.status !== "active") {
      return Response.json({ error: "Active wheel run required" }, { status: 400 });
    }
    const db = getD1();
    const pack = await db
      .prepare("SELECT owner_id FROM packs WHERE id = ? AND deleted_at IS NULL")
      .bind(packId)
      .first<{ owner_id: string }>();
    if (!pack || pack.owner_id !== auth.user.id) {
      return Response.json({ error: "Pack not found" }, { status: 404 });
    }
    const membership = new Set(
      (
        await db
          .prepare("SELECT id FROM pack_items WHERE pack_id = ?")
          .bind(packId)
          .all<{ id: string }>()
      ).results.map((item) => item.id),
    );
    if (!entriesMatchMembership(state.entries, membership)) {
      return Response.json(
        { error: "Wheel entries must match every item in the pack" },
        { status: 400 },
      );
    }
    const requestedId = body.run?.id?.trim();
    if (requestedId) {
      const owner = await db
        .prepare("SELECT user_id, pack_id FROM wheel_runs WHERE id = ?")
        .bind(requestedId)
        .first<{ user_id: string; pack_id: string }>();
      if (
        owner &&
        (owner.user_id !== auth.user.id || owner.pack_id !== packId)
      ) {
        return Response.json({ error: "Wheel run id is unavailable" }, { status: 409 });
      }
    }
    const id = requestedId || uid("wheel-run");
    const now = new Date().toISOString();
    const storedState: WheelSessionState = { ...state, updatedAt: now };
    await db
      .prepare(
        `INSERT INTO wheel_runs (id, user_id, pack_id, state_json, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, pack_id) DO UPDATE SET
           id = excluded.id,
           state_json = excluded.state_json,
           updated_at = excluded.updated_at`,
      )
      .bind(id, auth.user.id, packId, JSON.stringify(storedState), now)
      .run();
    const run: WheelRun = { id, packId, state: storedState, updatedAt: now };
    return Response.json({ run });
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
    const packId = new URL(request.url).searchParams.get("packId")?.trim() ?? "";
    if (!packId) {
      return Response.json({ error: "Pack id required" }, { status: 400 });
    }
    await getD1()
      .prepare("DELETE FROM wheel_runs WHERE user_id = ? AND pack_id = ?")
      .bind(auth.user.id, packId)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

function parseSessionState(value: string) {
  try {
    return sanitizeSessionState(JSON.parse(value) as JsonValue);
  } catch {
    return null;
  }
}

function sanitizeSessionState(value: JsonValue | undefined): WheelSessionState | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = sanitizeEntries(value.entries);
  if (!entries || entries.length < 2) {
    return null;
  }
  if (value.mode !== "classic" && value.mode !== "lastOneStanding") {
    return null;
  }
  if (value.status !== "active" && value.status !== "complete") {
    return null;
  }
  const winnerItemId =
    typeof value.winnerItemId === "string" &&
    entries.some((entry) => entry.itemId === value.winnerItemId)
      ? value.winnerItemId
      : null;
  if (
    value.status === "active" &&
    (winnerItemId !== null || activeEntryCount(entries) < 2)
  ) {
    return null;
  }
  const undoStack = sanitizeSnapshots(value.undoStack, entries);
  const redoStack = sanitizeSnapshots(value.redoStack, entries);
  if (!undoStack || !redoStack) {
    return null;
  }
  return {
    mode: value.mode,
    entries,
    status: value.status,
    winnerItemId,
    auto: value.auto === true,
    undoStack,
    redoStack,
    rotation: finiteNumber(value.rotation, 0),
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
  };
}

function sanitizeSnapshots(
  value: JsonValue | undefined,
  fallbackEntries: WheelEntryState[],
) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const snapshots: WheelStateSnapshot[] = [];
  for (const item of value.slice(-20)) {
    if (!isRecord(item)) {
      return null;
    }
    const entries = sanitizeEntries(item.entries);
    if (!entries || !sameEntryIds(entries, fallbackEntries)) {
      return null;
    }
    snapshots.push({
      entries,
      winnerItemId:
        typeof item.winnerItemId === "string" &&
        entries.some((entry) => entry.itemId === item.winnerItemId)
          ? item.winnerItemId
          : null,
      rotation: finiteNumber(item.rotation, 0),
    });
  }
  return snapshots;
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

function membershipMap(rows: MembershipRow[]) {
  const memberships = new Map<string, Set<string>>();
  for (const row of rows) {
    const membership = memberships.get(row.pack_id) ?? new Set<string>();
    membership.add(row.item_id);
    memberships.set(row.pack_id, membership);
  }
  return memberships;
}

function entriesMatchMembership(
  entries: WheelEntryState[],
  membership: Set<string> | undefined,
) {
  return Boolean(
    membership &&
      entries.length === membership.size &&
      entries.every((entry) => membership.has(entry.itemId)),
  );
}

function sameEntryIds(first: WheelEntryState[], second: WheelEntryState[]) {
  if (first.length !== second.length) {
    return false;
  }
  const ids = new Set(second.map((entry) => entry.itemId));
  return first.every((entry) => ids.has(entry.itemId));
}

function activeEntryCount(entries: WheelEntryState[]) {
  return entries.filter((entry) => entry.enabled && !entry.eliminated).length;
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

function finiteNumber(value: JsonValue | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
