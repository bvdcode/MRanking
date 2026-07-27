import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the redesigned application shell", async () => {
  const [page, layout, client] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/MRankingApp.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /MRanking — Upload\. Compare\. Crown\./);
  assert.match(layout, /MRanking tournament bracket/);
  assert.match(client, /LOADING ARENA/);
  assert.doesNotMatch(
    `${page}${layout}${client}`,
    /codex-preview|Your site is taking shape/,
  );
});

test("client includes the private playlist-to-tournament flow", async () => {
  const source = await readFile(
    new URL("../app/MRankingApp.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /type View = "home" \| "packs" \| "modes" \| "hill"/,
  );
  assert.match(source, /Create account/);
  assert.match(source, /onRegister/);
  assert.doesNotMatch(source, /AdminView|onAdmin|\/api\/admin/);
  assert.match(source, /onNavigate\("packs"\)/);
  assert.match(source, /onNavigate\("modes"\)/);
  assert.match(source, /King of the Hill/);
  assert.match(source, /YouTube Playlist/);
  assert.match(source, /YouTube Music/);
  assert.match(source, /Music Service/);
  assert.match(source, /YouTube \/ YouTube Music/);
  assert.match(source, /Yandex Music/);
  assert.match(source, /MUSIC_SERVICE_TILES/);
  assert.match(source, /\/api\/spotify/);
  assert.match(source, /\/api\/yandex-music/);
  assert.match(source, /mediaEmbedUrl/);
  assert.match(source, /open\.spotify\.com\/embed\/track/);
  assert.match(source, /music\.yandex\.ru\/iframe\/track/);
  assert.match(source, /\/api\/youtube/);
  assert.match(source, /data\.kind === "profile"/);
  assert.match(source, /function ProfilePlaylistPicker/);
  assert.match(source, /image\.dataset\.artShape/);
  assert.match(source, /className="profile-avatar-placeholder"/);
  assert.match(source, /event\.currentTarget\.hidden = true/);
  assert.doesNotMatch(source, /className="skipped-track-panel"/);
  assert.doesNotMatch(source, /value\.skippedItems\.map/);
  assert.match(source, /selectedVideoIds/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /function selectRandom/);
  assert.match(source, /\[16, 32, 64, 128, 256, 512\]/);
  assert.match(source, /disabled=\{size > value\.items\.length\}/);
  assert.match(source, /selectRandom\("all"\)/);
  assert.match(source, /className="import-issues"/);
  assert.match(source, /window\.requestAnimationFrame/);
  assert.match(source, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(source, /Paste playlist or profile link/);
  assert.match(source, /Save pack/);
  assert.match(source, /Back to playlists/);
  assert.match(source, /function FlowBack/);
  assert.match(source, /className="flow-back"/);
  assert.match(source, /<FlowBack label="Back"/);
  assert.match(source, /function goHome\(\)/);
  assert.match(source, /controller\.current\?\.abort\(\)/);
  assert.match(source, /setUrl\(""\)/);
  assert.match(source, /selectedCount >= 16/);
  assert.match(source, /youtube-nocookie\.com\/embed/);
  assert.match(source, /Open on YouTube/);
  assert.match(source, /onPick/);
  assert.match(source, /undoStack/);
  assert.match(source, /isCarryMatch/);
  assert.match(source, /Full ranking/);
  assert.match(source, /function TournamentBracket/);
  assert.match(source, /className="result-history-card"/);
  assert.match(source, /onOpenResult/);
  assert.match(source, /onDeleteResult/);
  assert.match(source, /className="result-history-delete"/);
  assert.match(source, /Delete history/);
  assert.match(source, /Tier List/);
  assert.match(source, /Blind Ranking/);
  assert.match(source, /Single Elimination/);
  const packLibrary = source.slice(
    source.indexOf("function PackLibraryView"),
    source.indexOf("function KingLibraryView"),
  );
  assert.match(packLibrary, /onEdit/);
  assert.match(packLibrary, /onDelete/);
  assert.doesNotMatch(packLibrary, /onStart|onContinue|PLAY NOW/);
  const kingLibrary = source.slice(
    source.indexOf("function KingLibraryView"),
    source.indexOf("function PackCover"),
  );
  assert.match(kingLibrary, /onStart/);
  assert.match(kingLibrary, /onContinue/);
  assert.match(kingLibrary, /<FlowBack label="Back"/);
  assert.doesNotMatch(source, /DEMO_PACKS|VLAD_HOBBIES|POP_PUNK_TOP_64/);
});

test("home supporting copy is deliberately larger", async () => {
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(styles, /\.home-copy \.eyebrow \{ font-size: 13px/);
  assert.match(styles, /\.home-theses span \{[^}]*font-size: 11px/);
  assert.match(styles, /\.home-flow \{[^}]*font-size: 11px/);
  assert.match(styles, /\.button\.jumbo \{[^}]*font-size: 15px/);
});

test("profile playlist picker keeps artwork square and titles readable", async () => {
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(styles, /\.profile-playlist-art \{[^}]*aspect-ratio: 1 \/ 1/);
  assert.match(styles, /\.profile-playlist-art img \{[^}]*object-fit: cover/);
  assert.match(styles, /data-art-shape="square"[^}]*width: 88%/);
  assert.match(styles, /\.profile-playlist-copy strong \{[^}]*font: 750 18px/);
});

test("language control translates the whole interface", async () => {
  const source = await readFile(
    new URL("../app/MRankingApp.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /рузкий/);
  assert.match(source, /УкрАинский/);
  assert.match(source, /onLanguage\("ru"\)/);
  assert.match(source, /onLanguage\("uk"\)/);
  assert.match(source, /"King of the Hill": "Король горы"/);
  assert.match(source, /"King of the Hill": "Король гори"/);
  assert.match(source, /Packs: "Паки"/);
  assert.match(source, /Modes: "Режимы"/);
  assert.match(source, /Modes: "Режими"/);
  assert.match(source, /"Rate it\.": "Оцени\."/);
  assert.match(source, /"Rate it\.": "Оціни\."/);
  assert.match(source, /document\.documentElement\.lang = savedLanguage/);
  assert.match(source, /document\.documentElement\.lang = next/);
});

test("server supports self-registration, ownership and durable storage", async () => {
  const [server, auth, packs, results, schema, resultMigration, roleMigration, hosting] = await Promise.all([
    readFile(new URL("../lib/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/packs/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/results/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../drizzle/0000_cold_eternals.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../drizzle/0001_lying_korvac.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../drizzle/0002_absurd_garia.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(server, /PBKDF2/);
  assert.match(server, /210_000/);
  assert.match(server, /HttpOnly; SameSite=Lax/);
  assert.match(server, /protocol === "https:" \? "; Secure"/);
  assert.doesNotMatch(server, /requireAdmin|MRANKING_ADMIN|role TEXT/);
  assert.match(auth, /export async function PUT/);
  assert.match(auth, /Nickname is already taken/);
  assert.match(auth, /hashPassword\(password\)/);
  assert.match(auth, /createSession\(row\.id, request\)/);
  assert.doesNotMatch(auth, /'admin'|"admin"/);
  assert.match(packs, /body\.items\.length < 16/);
  assert.match(packs, /existing\.owner_id !== auth\.user\.id/);
  assert.match(packs, /Duplicate items are not allowed/);
  assert.doesNotMatch(packs, /DELETE FROM results WHERE pack_id/);
  assert.match(results, /pack_json/);
  assert.match(results, /JSON\.stringify\(pack\)/);
  assert.match(results, /loadPackSnapshot/);
  assert.match(results, /export async function DELETE/);
  assert.match(results, /DELETE FROM results WHERE id = \? AND user_id = \?/);
  assert.match(schema, /CREATE TABLE `users`/);
  assert.match(schema, /CREATE TABLE `packs`/);
  assert.match(schema, /CREATE TABLE `results`/);
  assert.match(resultMigration, /ADD `pack_json` text/);
  assert.match(roleMigration, /DROP COLUMN `role`/);
  assert.deepEqual(JSON.parse(hosting), { d1: "DB", r2: "AVATARS" });
});

test("YouTube importer handles current and classic playlist renderers", async () => {
  const importer = await readFile(
    new URL("../lib/youtube.ts", import.meta.url),
    "utf8",
  );
  assert.match(importer, /youtubei\/v1\/browse/);
  assert.match(importer, /browseId: `VL\$\{playlistId\}`/);
  assert.match(importer, /lockupViewModel/);
  assert.match(importer, /playlistVideoRenderer/);
  assert.match(importer, /continuationItemRenderer/);
  assert.match(importer, /continuationItemViewModel/);
  assert.match(importer, /findNestedContinuationToken/);
  assert.match(importer, /declaredCount/);
  assert.match(importer, /collectMusicPlaylist/);
  assert.match(importer, /collectMusicPlaylistPage/);
  assert.match(importer, /musicResponsiveListItemRenderer/);
  assert.match(importer, /musicResponsiveListItemFlexColumnRenderer/);
  assert.match(importer, /const \[webCollection, musicCollection\] = await Promise\.all/);
  assert.doesNotMatch(importer, /skippedItems/);
  assert.match(importer, /issues\.push/);
  assert.match(importer, /reason: "duplicate"/);
  assert.match(importer, /duplicates/);
  assert.match(importer, /parseYouTubeInput/);
  assert.match(importer, /navigation\/resolve_url/);
  assert.match(importer, /findPlaylistsTab/);
  assert.match(importer, /LOCKUP_CONTENT_TYPE_PLAYLIST|includes\("PLAYLIST"\)/);
  assert.match(importer, /collectProfilePlaylists/);
  assert.match(importer, /WEB_REMIX/);
  assert.match(importer, /musicTwoRowItemRenderer/);
  assert.match(importer, /collectMusicProfilePages/);
});

test("Spotify and Yandex Music import public playlists", async () => {
  const [spotify, yandex, packs, types] = await Promise.all([
    readFile(new URL("../lib/spotify.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/yandex-music.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/packs/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/types.ts", import.meta.url), "utf8"),
  ]);
  assert.match(spotify, /open\.spotify\.com\/embed\/playlist/);
  assert.match(spotify, /__NEXT_DATA__/);
  assert.match(spotify, /open\.spotify\.com\/oembed/);
  assert.match(spotify, /sourceType: "spotify"/);
  assert.doesNotMatch(spotify, /skippedItems/);
  assert.match(yandex, /92\.38\.49\.211:8787/);
  assert.match(yandex, /richTracks/);
  assert.match(yandex, /sourceType: "yandexMusic"/);
  assert.doesNotMatch(yandex, /skippedItems/);
  assert.match(yandex, /users\/.*playlists/);
  assert.match(yandex, /playlist\//);
  assert.match(packs, /"spotify", "yandexMusic"/);
  assert.match(types, /\| "spotify"/);
  assert.match(types, /\| "yandexMusic"/);
});
