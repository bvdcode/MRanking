import { getD1, jsonError, requireUser } from "../../../lib/server";
import type { ActiveRun } from "../../../lib/types";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const rows = (await getD1().prepare("SELECT id, pack_id, state_json, updated_at FROM runs WHERE user_id = ? ORDER BY updated_at DESC")
      .bind(auth.user.id).all<{ id: string; pack_id: string; state_json: string; updated_at: string }>()).results;
    return Response.json({ runs: rows.flatMap((row) => {
      try { return [{ id: row.id, packId: row.pack_id, run: JSON.parse(row.state_json), updatedAt: row.updated_at }]; }
      catch { return []; }
    }) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const body = await request.json() as { run?: ActiveRun };
    const run = body.run;
    if (!run?.session?.id || !run.session.packId) return Response.json({ error: "Run state required" }, { status: 400 });
    const pack = await getD1().prepare("SELECT owner_id FROM packs WHERE id = ? AND deleted_at IS NULL")
      .bind(run.session.packId).first<{ owner_id: string }>();
    if (!pack || (pack.owner_id !== auth.user.id && auth.user.role !== "admin")) return Response.json({ error: "Pack not found" }, { status: 404 });
    const now = new Date().toISOString();
    await getD1().prepare(
      `INSERT INTO runs (id, user_id, pack_id, state_json, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, pack_id) DO UPDATE SET id = excluded.id, state_json = excluded.state_json, updated_at = excluded.updated_at`,
    ).bind(run.session.id, auth.user.id, run.session.packId, JSON.stringify(run), now).run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const packId = new URL(request.url).searchParams.get("packId") ?? "";
    await getD1().prepare("DELETE FROM runs WHERE user_id = ? AND pack_id = ?").bind(auth.user.id, packId).run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
