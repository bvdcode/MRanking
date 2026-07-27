import { ensureSchema, getD1, jsonError, requireUser, runtimeEnv } from "../../../lib/server";

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const userId = new URL(request.url).searchParams.get("user") ?? "";
    if (!userId) return new Response("Not found", { status: 404 });
    const row = await getD1().prepare("SELECT avatar_key FROM users WHERE id = ?").bind(userId).first<{ avatar_key: string | null }>();
    if (!row?.avatar_key) return new Response("Not found", { status: 404 });
    const object = await runtimeEnv().AVATARS.get(row.avatar_key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, max-age=300");
    return new Response(object.body, { headers });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Unexpected error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) return auth.response;
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) return Response.json({ error: "Choose an image" }, { status: 400 });
    if (!file.type.startsWith("image/")) return Response.json({ error: "Avatar must be an image" }, { status: 400 });
    if (file.size > 2_000_000) return Response.json({ error: "Avatar must be smaller than 2 MB" }, { status: 400 });
    const key = `avatars/${auth.user.id}/${crypto.randomUUID()}`;
    await runtimeEnv().AVATARS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    const previous = await getD1().prepare("SELECT avatar_key FROM users WHERE id = ?").bind(auth.user.id).first<{ avatar_key: string | null }>();
    await getD1().prepare("UPDATE users SET avatar_key = ?, updated_at = ? WHERE id = ?")
      .bind(key, new Date().toISOString(), auth.user.id).run();
    if (previous?.avatar_key) await runtimeEnv().AVATARS.delete(previous.avatar_key);
    return Response.json({ avatarUrl: `/api/avatar?user=${encodeURIComponent(auth.user.id)}&v=${Date.now()}` });
  } catch (error) {
    return jsonError(error);
  }
}
