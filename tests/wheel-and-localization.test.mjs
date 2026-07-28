import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(paths) {
  return (await Promise.all(paths.map((path) =>
    readFile(new URL(path, import.meta.url), "utf8"),
  ))).join("\n");
}

test("wheel mode supports weighted spins, elimination, sound and durable history", async () => {
  const [source, wheel, sound, runsApi, resultsApi, settingsApi, migration] = await Promise.all([
    read([
      "../app/components/MRankingApp.tsx",
      "../app/components/modes/ModeView.tsx",
      "../app/components/modes/WheelLibraryView.tsx",
      "../app/components/wheel/WheelView.tsx",
      "../app/components/wheel/WheelChrome.tsx",
      "../app/components/wheel/WheelEntryPanel.tsx",
      "../app/components/wheel/WheelStagePanel.tsx",
      "../app/components/wheel/useWheelEditor.ts",
      "../app/components/wheel/useWheelSpin.ts",
      "../app/components/hooks/useWheelRun.ts",
    ]),
    readFile(new URL("../app/domain/wheel.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/domain/wheelSound.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/wheel-runs/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/wheel-results/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/wheel-settings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_wheel_mode.sql", import.meta.url), "utf8"),
  ]);
  assert.match(source, /id: "wheel"/);
  assert.match(source, /Last One Standing/);
  assert.match(source, /SKIP SPINNING/);
  assert.match(source, /RESET CHANCES/);
  assert.match(source, /quickSelectWheelEntries/);
  assert.match(source, /chanceDrafts/);
  assert.match(source, /wheelResultAsRun/);
  assert.match(wheel, /SUSPENSE_CHANCE = 0\.05/);
  assert.match(wheel, /chooseWeightedWheelEntry/);
  assert.match(wheel, /targetRotationForSegment/);
  assert.match(wheel, /export function skipWheelSpin[\s\S]*\.\.\.plan/);
  assert.match(wheel, /eliminateWheelEntry/);
  assert.match(sound, /AudioContext/);
  assert.match(sound, /createBufferSource/);
  assert.match(sound, /tick\(intensity/);
  assert.match(sound, /winner\(\)/);
  assert.match(runsApi, /ON CONFLICT\(user_id, pack_id\)/);
  assert.match(resultsApi, /JSON\.stringify\(pack\)/);
  assert.match(resultsApi, /DELETE FROM wheel_results WHERE id = \? AND user_id = \?/);
  assert.match(settingsApi, /durationSeconds: 5/);
  assert.match(migration, /CREATE TABLE `wheel_runs`/);
  assert.match(migration, /CREATE TABLE `wheel_results`/);
  assert.match(migration, /ADD `visibility`/);
});

test("profile artwork and language controls remain complete", async () => {
  const [styles, source] = await Promise.all([
    read(["../app/styles/base.css", "../app/styles/features.css", "../app/styles/responsive.css"]),
    read([
      "../app/components/MRankingApp.tsx",
      "../app/components/layout/Header.tsx",
      "../app/i18n/translations/ru.ts",
      "../app/i18n/translations/uk.ts",
      "../app/state/preferences.ts",
    ]),
  ]);
  assert.match(styles, /\.profile-playlist-art \{[^}]*aspect-ratio: 1 \/ 1/);
  assert.match(styles, /data-art-shape="square"[^}]*width: 88%/);
  assert.match(source, /рузкий/);
  assert.match(source, /УкрАинский/);
  assert.match(source, /onLanguage\("ru"\)/);
  assert.match(source, /onLanguage\("uk"\)/);
  assert.match(source, /"King of the Hill": "Король горы"/);
  assert.match(source, /"King of the Hill": "Король гори"/);
  assert.doesNotMatch(source, /localStorage/);
  assert.match(source, /document\.documentElement\.lang = next/);
});
