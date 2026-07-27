import { createSession, destroySession, ensureSchema, getAuthenticatedUser, getD1, hashPassword, jsonError, normalizeNickname, serializeUser, uid, verifyPassword } from "../../../lib/server";

type LoginRow = {
  id: string;
  nickname: string;
  avatar_emoji: string;
  avatar_key: string | null;
  created_at: string;
  password_hash: string;
  password_salt: string;
};

export async function GET(request: Request) {
  try {
    return Response.json({ user: await getAuthenticatedUser(request) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json() as { nickname?: string; password?: string };
    const nicknameKey = normalizeNickname(body.nickname ?? "");
    const password = body.password ?? "";
    if (!nicknameKey || !password) return Response.json({ error: "Nickname and password are required" }, { status: 400 });
    const row = await getD1().prepare(
      `SELECT id, nickname, avatar_emoji, avatar_key, created_at, password_hash, password_salt
       FROM users WHERE nickname_key = ? AND deleted_at IS NULL`,
    ).bind(nicknameKey).first<LoginRow>();
    if (!row || !(await verifyPassword(password, row.password_salt, row.password_hash))) {
      return Response.json({ error: "Invalid nickname or password" }, { status: 401 });
    }
    const session = await createSession(row.id, request);
    return Response.json({ user: serializeUser(row) }, { headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json() as { nickname?: string; password?: string };
    const nickname = body.nickname?.trim() ?? "";
    const nicknameKey = normalizeNickname(nickname);
    const password = body.password ?? "";
    if (nickname.length < 2) return Response.json({ error: "Nickname is too short" }, { status: 400 });
    if (nickname.length > 40) return Response.json({ error: "Nickname is too long" }, { status: 400 });
    if (password.length < 6) return Response.json({ error: "Password needs at least 6 characters" }, { status: 400 });
    if (password.length > 128) return Response.json({ error: "Password is too long" }, { status: 400 });

    const db = getD1();
    const exists = await db.prepare(
      "SELECT id FROM users WHERE nickname_key = ? AND deleted_at IS NULL",
    ).bind(nicknameKey).first<{ id: string }>();
    if (exists) return Response.json({ error: "Nickname is already taken" }, { status: 409 });

    const passwordData = await hashPassword(password);
    const now = new Date().toISOString();
    const row = {
      id: uid("user"),
      nickname,
      avatar_emoji: "🎧",
      avatar_key: null,
      created_at: now,
    };
    try {
      await db.prepare(
        `INSERT INTO users
          (id, nickname, nickname_key, password_hash, password_salt, avatar_emoji, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(row.id, nickname, nicknameKey, passwordData.hash, passwordData.salt, row.avatar_emoji, now, now).run();
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        return Response.json({ error: "Nickname is already taken" }, { status: 409 });
      }
      throw error;
    }

    const session = await createSession(row.id, request);
    return Response.json(
      { user: serializeUser(row) },
      { status: 201, headers: { "Set-Cookie": session.cookie } },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSchema();
    const cookie = await destroySession(request);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
  } catch (error) {
    return jsonError(error);
  }
}
