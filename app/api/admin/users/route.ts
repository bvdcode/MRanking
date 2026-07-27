import { getD1, hashPassword, jsonError, normalizeNickname, requireAdmin, uid } from "../../../../lib/server";

const AVATARS = ["🎧", "🎸", "👾", "🧠", "🐸", "🦝", "🪩", "⚡", "🛹", "♛"];

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const rows = (await getD1().prepare(
      `SELECT u.id, u.nickname, u.role, u.avatar_emoji, u.avatar_key, u.created_at, u.deleted_at,
        COUNT(p.id) AS pack_count
       FROM users u LEFT JOIN packs p ON p.owner_id = u.id AND p.deleted_at IS NULL
       GROUP BY u.id ORDER BY u.created_at ASC`,
    ).all<{
      id: string; nickname: string; role: "admin" | "user"; avatar_emoji: string; avatar_key: string | null;
      created_at: string; deleted_at: string | null; pack_count: number;
    }>()).results;
    return Response.json({ users: rows.map((row) => ({
      id: row.id,
      nickname: row.nickname,
      role: row.role,
      avatarEmoji: row.avatar_emoji,
      avatarUrl: row.avatar_key ? `/api/avatar?user=${encodeURIComponent(row.id)}` : null,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
      packCount: Number(row.pack_count),
    })) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const body = await request.json() as { nickname?: string; password?: string; avatarEmoji?: string };
    const nickname = body.nickname?.trim() ?? "";
    const nicknameKey = normalizeNickname(nickname);
    const password = body.password ?? "";
    if (nickname.length < 2) return Response.json({ error: "Nickname is too short" }, { status: 400 });
    if (password.length < 6) return Response.json({ error: "Password needs at least 6 characters" }, { status: 400 });
    const exists = await getD1().prepare("SELECT id FROM users WHERE nickname_key = ?").bind(nicknameKey).first();
    if (exists) return Response.json({ error: "Nickname is already taken" }, { status: 409 });
    const passwordData = await hashPassword(password);
    const now = new Date().toISOString();
    const id = uid("user");
    const avatar = AVATARS.includes(body.avatarEmoji ?? "") ? body.avatarEmoji! : "🎧";
    await getD1().prepare(
      `INSERT INTO users (id, nickname, nickname_key, password_hash, password_salt, role, avatar_emoji, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?)`,
    ).bind(id, nickname, nicknameKey, passwordData.hash, passwordData.salt, avatar, now, now).run();
    return Response.json({ user: { id, nickname, role: "user", avatarEmoji: avatar, avatarUrl: null, createdAt: now, deletedAt: null, packCount: 0 } }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const body = await request.json() as { id?: string; password?: string; ownerId?: string };
    if (!body.id) return Response.json({ error: "User id required" }, { status: 400 });
    if (body.password !== undefined) {
      if (body.password.length < 6) return Response.json({ error: "Password needs at least 6 characters" }, { status: 400 });
      const passwordData = await hashPassword(body.password);
      await getD1().prepare("UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?")
        .bind(passwordData.hash, passwordData.salt, new Date().toISOString(), body.id).run();
      await getD1().prepare("DELETE FROM sessions WHERE user_id = ?").bind(body.id).run();
      return Response.json({ ok: true });
    }
    if (body.ownerId) {
      const target = await getD1().prepare("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL").bind(body.ownerId).first();
      if (!target) return Response.json({ error: "New owner not found" }, { status: 404 });
      await getD1().prepare("UPDATE packs SET owner_id = ?, updated_at = ? WHERE owner_id = ?")
        .bind(body.ownerId, new Date().toISOString(), body.id).run();
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response || !auth.user) return auth.response;
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) return Response.json({ error: "User id required" }, { status: 400 });
    if (id === auth.user.id) return Response.json({ error: "You cannot delete your own admin account" }, { status: 400 });
    const now = new Date().toISOString();
    await getD1().batch([
      getD1().prepare("UPDATE users SET deleted_at = ?, nickname_key = ?, updated_at = ? WHERE id = ?")
        .bind(now, `deleted:${id}`, now, id),
      getD1().prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
      getD1().prepare("DELETE FROM runs WHERE user_id = ?").bind(id),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
