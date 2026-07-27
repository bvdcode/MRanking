import { jsonError, requireUser } from "../../../lib/server";
import { parseSpotifyPlaylist } from "../../../lib/spotify";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url?.trim())
      return Response.json(
        { error: "Paste a Spotify playlist URL" },
        { status: 400 },
      );
    return Response.json({
      kind: "playlist",
      playlist: await parseSpotifyPlaylist(body.url, request.signal),
    });
  } catch (error) {
    const status =
      error instanceof Error && /playlist|Spotify|link|URL/i.test(error.message)
        ? 400
        : 500;
    return jsonError(error, "Spotify import failed", status);
  }
}
