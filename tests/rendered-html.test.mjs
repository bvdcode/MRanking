import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const applicationSources = [
  "../app/api/runs/route.ts",
  "../app/MRankingApp.tsx",
  "../app/components/MRankingApp.tsx",
  "../app/components/auth/LoginModal.tsx",
  "../app/components/home/HomeView.tsx",
  "../app/components/hooks/usePrivateLibrary.ts",
  "../app/components/hooks/useTournamentRun.ts",
  "../app/components/hooks/useWheelRun.ts",
  "../app/components/layout/Header.tsx",
  "../app/components/modes/KingLibraryView.tsx",
  "../app/components/modes/ModeView.tsx",
  "../app/components/modes/WheelLibraryView.tsx",
  "../app/components/packs/MusicSourceChooser.tsx",
  "../app/components/packs/PackEditor.tsx",
  "../app/components/packs/PackLibraryView.tsx",
  "../app/components/packs/ProfilePlaylistPicker.tsx",
  "../app/components/packs/UploadView.tsx",
  "../app/components/shared/FlowBack.tsx",
  "../app/components/shared/MediaPlayer.tsx",
  "../app/components/shared/RemoteImage.tsx",
  "../app/components/tournament/BattleView.tsx",
  "../app/components/tournament/ResultView.tsx",
  "../app/components/tournament/TournamentBracket.tsx",
  "../app/components/tournament/TournamentRoundExplorer.tsx",
  "../app/components/wheel/WheelView.tsx",
  "../app/domain/pack.ts",
  "../app/domain/tournament.ts",
  "../app/domain/wheel.ts",
  "../app/domain/wheelSound.ts",
  "../app/domain/wheelState.ts",
  "../app/i18n/translations/ru.ts",
  "../app/i18n/translations/uk.ts",
  "../app/state/preferences.ts",
  "../app/types.ts",
];

async function readApplicationSource() {
  const sources = await Promise.all(
    applicationSources.map((path) =>
      readFile(new URL(path, import.meta.url), "utf8"),
    ),
  );
  return sources.join("\n");
}

async function readStyles() {
  const paths = [
    "../app/styles/base.css",
    "../app/styles/features.css",
    "../app/styles/responsive.css",
    "../app/styles/wheel.css",
  ];
  const sources = await Promise.all(
    paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  return sources.join("\n");
}

async function readYouTubeSource() {
  const paths = [
    "../lib/youtube/index.ts",
    "../lib/youtube/client.ts",
    "../lib/youtube/playlist.ts",
    "../lib/youtube/profile.ts",
    "../lib/youtube/renderers.ts",
  ];
  const sources = await Promise.all(
    paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  return sources.join("\n");
}

test("ships the redesigned application shell", async () => {
  const [page, layout, client] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readApplicationSource(),
  ]);
  assert.match(page, /MRanking — Upload\. Compare\. Crown\./);
  assert.match(layout, /multiple ranking modes/);
  assert.match(client, /LOADING ARENA/);
  assert.doesNotMatch(
    `${page}${layout}${client}`,
    /codex-preview|Your site is taking shape/,
  );
});

test("client includes the private playlist-to-tournament flow", async () => {
  const source = await readApplicationSource();

  assert.match(source, /type View = "home" \| "upload" \| "packs" \| "modes" \| "hill"/);
  assert.match(source, /Create account/);
  assert.match(source, /onRegister/);
  assert.doesNotMatch(source, /AdminView|onAdmin|\/api\/admin/);
  assert.match(source, /onNavigate\("upload"\)/);
  assert.match(source, /King of the Hill/);
  assert.match(source, /YouTube Playlist/);
  assert.match(source, /YouTube Music/);
  assert.match(source, /Music Service/);
  assert.match(source, /YouTube \/ YouTube Music/);
  assert.match(source, /Yandex Music/);
  assert.match(source, /MUSIC_SERVICE_TILES/);
  assert.match(source, /\/api\/spotify/);
  assert.match(source, /\/api\/yandex-music/);
  assert.match(source, /mediaPlayerUrl/);
  assert.match(source, /open\.spotify\.com\/embed\/track/);
  assert.match(source, /\/api\/yandex-music\/playback\?trackId=/);
  assert.match(source, /<audio/);
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
  assert.match(
    source,
    /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/,
  );
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
  assert.match(source, /function reshuffle\(\)/);
  assert.match(source, /Full ranking/);
  assert.match(source, /function TournamentRoundExplorer/);
  assert.match(source, /const pageSize = 8/);
  assert.match(source, /className="result-history-card"/);
  assert.match(source, /onOpenResult/);
  assert.match(source, /onDeleteResult/);
  assert.match(source, /className="result-history-delete"/);
  assert.match(source, /Delete history/);
  assert.match(source, /Reshuffle pair/);
  const packLibrary = await readFile(
    new URL("../app/components/packs/PackLibraryView.tsx", import.meta.url),
    "utf8",
  );
  assert.match(packLibrary, /onAdd/);
  assert.match(packLibrary, /onPlay/);
  assert.match(packLibrary, /PackTypeBadge/);
  const kingLibrary = await readFile(
    new URL("../app/components/modes/KingLibraryView.tsx", import.meta.url),
    "utf8",
  );
  assert.match(kingLibrary, /onStart/);
  assert.match(kingLibrary, /onContinue/);
  assert.match(kingLibrary, /onCancelRun/);
  assert.match(kingLibrary, /Cancel run/);
  assert.match(source, /async function cancelRun\(pack: Pack\)/);
  assert.match(source, /DELETE FROM runs WHERE user_id = \? AND pack_id = \?/);
  assert.match(source, /media-play-close" : "media-play-open/);
  assert.match(source, /const currentPair = Math\.min/);
  assert.match(source, /\{currentPair\} \/ \{totalPairs\}/);
  assert.doesNotMatch(source, /keyName="A"|className="choice-key"/);
  assert.match(kingLibrary, /className="pack-tile add-pack-tile"/);
  assert.match(kingLibrary, /onClick=\{onPacks\}/);
  assert.match(kingLibrary, /Add a pack/);
  assert.match(kingLibrary, /<FlowBack label="Back"/);
  assert.doesNotMatch(source, /DEMO_PACKS|VLAD_HOBBIES|POP_PUNK_TOP_64/);
});

test("home keeps a clean primary hierarchy", async () => {
  const [home, styles] = await Promise.all([
    readFile(
      new URL("../app/components/home/HomeView.tsx", import.meta.url),
      "utf8",
    ),
    readStyles(),
  ]);
  assert.match(styles, /:lang\(en\) body \{ --font-display: var\(--font-impact\)/);
  assert.match(styles, /\.choice-preview \{/);
  assert.match(styles, /@keyframes preview-choice/);
  assert.match(home, /preview-ranking/);
  assert.doesNotMatch(home, /TournamentVisual|LIVE BRACKET/);
});

test("mobile layout is touch-first and respects phone safe areas", async () => {
  const [layout, client, styles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readApplicationSource(),
    readStyles(),
  ]);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /\.duel-board \{[^}]*grid-template-columns: 1fr/);
  assert.match(
    styles,
    /\.profile-playlist-grid \{ grid-template-columns: repeat\(2/,
  );
  assert.match(client, /<foreignObject/);
  assert.match(client, /element\.clientWidth <= 720/);
  assert.match(client, /width=\{boardWidth \* fitScale\}/);
});

test("tournament state stays independent from application navigation", async () => {
  const [application, tournament, tournamentDomain, library] =
    await Promise.all([
      readFile(
        new URL("../app/components/MRankingApp.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/components/hooks/useTournamentRun.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../app/domain/tournament.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/components/hooks/usePrivateLibrary.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.doesNotMatch(tournament, /\bsetView\(|\bsetViewedResult\(/);
  assert.match(tournament, /\bshuffle,/);
  assert.match(tournamentDomain, /export function shuffle/);
  assert.match(application, /function startTournament\(pack: Pack/);
  assert.match(application, /activeRunStatus === "complete"/);
  assert.match(application, /onAvatar=\{updateAvatar\}/);
  assert.doesNotMatch(application, /\bsetUser\(/);
  assert.match(library, /function updateAvatar\(avatarUrl: string\)/);
});

test("responsive layout prevents viewport and mobile overflow regressions", async () => {
  const [header, base, responsive] = await Promise.all([
    readFile(
      new URL("../app/components/layout/Header.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/styles/base.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/responsive.css", import.meta.url), "utf8"),
  ]);

  assert.match(base, /html \{ min-height: 100dvh/);
  assert.match(base, /\.app-shell \{ min-height: 100dvh/);
  assert.match(base, /\.flow-back \{ position: absolute/);
  assert.match(responsive, /@media \(max-width: 1024px\)/);
  assert.match(header, /className="profile-label"/);
  assert.match(responsive, /\.profile-chip > \.profile-label/);
  assert.doesNotMatch(responsive, /\.profile-chip > span/);
  assert.match(responsive, /\.choice-preview \{[^}]*grid-template-rows/);
  assert.match(responsive, /\.winner-card \{[^}]*transform: none/);
  assert.match(
    responsive,
    /@media \(min-width: 1025px\) and \(max-height: 820px\)/,
  );
});

test("server supports self-registration, ownership and durable storage", async () => {
  const [
    server,
    auth,
    packs,
    results,
    schema,
    resultMigration,
    roleMigration,
    hosting,
  ] = await Promise.all([
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
  assert.match(server, /PASSWORD_ITERATIONS = 100_000/);
  assert.doesNotMatch(server, /iterations: 210_000/);
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
  const hostingConfig = JSON.parse(hosting);
  assert.equal(hostingConfig.d1, "DB");
  assert.equal(hostingConfig.r2, "AVATARS");
  assert.match(hostingConfig.project_id, /^appgprj_/);
});

test("YouTube importer handles current and classic playlist renderers", async () => {
  const importer = await readYouTubeSource();
  assert.match(importer, /youtubei\/v1\/browse/);
  assert.match(importer, /youtubei\.googleapis\.com/);
  assert.match(importer, /"accept-language": "en-US,en;q=0\.9"/);
  assert.match(importer, /www\.youtube-nocookie\.com/);
  assert.match(importer, /m\.youtube\.com/);
  assert.match(importer, /isRetryableYouTubeStatus/);
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
  assert.match(
    importer,
    /const \[webCollection, musicCollection\] = await Promise\.all/,
  );
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
  assert.match(yandex, /horse\.datavale\.org:8787/);
  assert.match(yandex, /richTracks/);
  assert.match(yandex, /sourceType: "yandexMusic"/);
  assert.doesNotMatch(yandex, /skippedItems/);
  assert.match(yandex, /users\/.*playlists/);
  assert.match(yandex, /playlist\//);
  assert.match(packs, /"spotify", "yandexMusic"/);
  assert.match(types, /\| "spotify"/);
  assert.match(types, /\| "yandexMusic"/);
});
