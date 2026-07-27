import { jsonError, requireUser } from "../../../lib/server";
import { parseYouTubeInput } from "../../../lib/youtube";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response) return auth.response;
    const body = (await request.json()) as { url?: string };
    if (!body.url?.trim())
      return Response.json({ error: "Paste a YouTube URL" }, { status: 400 });
    return Response.json(await parseYouTubeInput(body.url, request.signal));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      return Response.json({ error: "Import cancelled" }, { status: 499 });
    if (
      error instanceof Error &&
      /playlist|profile|YouTube|videos|link|page/i.test(error.message)
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
