import { jsonError, requireUser } from "../../../lib/server";
import { parseYandexMusicPlaylist } from "../../../lib/yandex-music";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url?.trim())
      return Response.json(
        { error: "Paste a Yandex Music playlist URL" },
        { status: 400 },
      );
    return Response.json({
      kind: "playlist",
      playlist: await parseYandexMusicPlaylist(body.url, request.signal),
    });
  } catch (error) {
    const status =
      error instanceof Error && /playlist|Yandex|link|URL|region/i.test(error.message)
        ? 400
        : 500;
    return jsonError(error, "Yandex Music import failed", status);
  }
}
