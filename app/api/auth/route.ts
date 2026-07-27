import { createSession, destroySession, ensureSchema, getAuthenticatedUser, getD1, jsonError, normalizeNickname, serializeUser, verifyPassword } from "../../../lib/server";

type LoginRow = {
  id: string;
  nickname: string;
  role: "admin" | "user";
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
      `SELECT id, nickname, role, avatar_emoji, avatar_key, created_at, password_hash, password_salt
       FROM users WHERE nickname_key = ? AND deleted_at IS NULL`,
    ).bind(nicknameKey).first<LoginRow>();
    if (!row || !(await verifyPassword(password, row.password_salt, row.password_hash))) {
      return Response.json({ error: "Invalid nickname or password" }, { status: 401 });
    }
    const session = await createSession(row.id);
    return Response.json({ user: serializeUser(row) }, { headers: { "Set-Cookie": session.cookie } });
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
