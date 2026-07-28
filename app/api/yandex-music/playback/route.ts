import {
  getD1,
  jsonError,
  requireUser,
} from "../../../../lib/server";
import { resolveYandexPreviewUrl } from "../../../../lib/yandex-playback";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }
  const trackId = new URL(request.url).searchParams.get("trackId")?.trim() ?? "";
  if (!/^\d+$/.test(trackId)) {
    return Response.json(
      { error: "Choose a valid Yandex Music track" },
      { status: 400 },
    );
  }

  const ownedTrack = await getD1()
    .prepare(
      `SELECT pi.id
       FROM pack_items pi
       JOIN packs p ON p.id = pi.pack_id
       WHERE p.owner_id = ?
         AND p.deleted_at IS NULL
         AND p.source_type = 'yandexMusic'
         AND pi.video_id = ?
       LIMIT 1`,
    )
    .bind(auth.user.id, trackId)
    .first<{ id: string }>();
  if (!ownedTrack) {
    return Response.json({ error: "Track not found" }, { status: 404 });
  }

  try {
    const previewUrl = await resolveYandexPreviewUrl(trackId, request.signal);
    return new Response(null, {
      status: 307,
      headers: {
        "cache-control": "private, no-store",
        location: previewUrl,
      },
    });
  } catch (error) {
    return jsonError(error, "Yandex Music preview failed", 502);
  }
}
