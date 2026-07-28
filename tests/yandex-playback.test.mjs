import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Yandex Music previews use signed storage URLs", async () => {
  const { md5Hex, resolveYandexPreviewUrl } = await import(
    new URL("../lib/yandex-playback.ts", import.meta.url)
  );
  assert.equal(md5Hex(""), "d41d8cd98f00b204e9800998ecf8427e");
  assert.equal(md5Hex("MRanking"), "b76a1ead1b24aac501d4892b1fe29c71");

  const path = "/preview/example.mp3";
  const timestamp = "000657b15d148211";
  const secret = "abc123";
  const expectedSignature = createHash("md5")
    .update(`XGRlBW9FXlekgbPrRHuSiA${path.slice(1)}${secret}`)
    .digest("hex");
  const request = async (input) => {
    const url = String(input);
    if (url.includes("/download-info")) {
      return Response.json({
        result: [
          {
            codec: "mp3",
            preview: true,
            bitrateInKbps: 128,
            downloadInfoUrl:
              "https://storage.mds.yandex.net/file-download-info/example/preview",
          },
        ],
      });
    }
    if (url.startsWith("https://storage.mds.yandex.net/")) {
      return new Response(
        `<download-info><host>s1.storage.yandex.net</host><path>${path}</path><ts>${timestamp}</ts><s>${secret}</s></download-info>`,
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  assert.equal(
    await resolveYandexPreviewUrl("74254157", undefined, request),
    `https://s1.storage.yandex.net/get-mp3/${expectedSignature}/${timestamp}${path}`,
  );
});

test("Yandex Music playback stays scoped to owned tracks", async () => {
  const route = await readFile(
    new URL("../app/api/yandex-music/playback/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /requireUser\(request\)/);
  assert.match(route, /JOIN packs p ON p\.id = pi\.pack_id/);
  assert.match(route, /p\.owner_id = \?/);
  assert.match(route, /p\.deleted_at IS NULL/);
  assert.match(route, /p\.source_type = 'yandexMusic'/);
  assert.match(route, /status: 307/);
});
