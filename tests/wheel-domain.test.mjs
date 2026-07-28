import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../app/domain/wheel.ts", import.meta.url),
  "utf8",
);
const geometrySource = await readFile(
  new URL("../app/domain/wheelGeometry.ts", import.meta.url),
  "utf8",
);
const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
};
const geometryJavascript = ts.transpileModule(geometrySource, {
  compilerOptions,
}).outputText;
const geometryUrl = `data:text/javascript;base64,${Buffer.from(geometryJavascript).toString("base64")}`;
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    ...compilerOptions,
  },
}).outputText.replaceAll("./wheelGeometry", geometryUrl);
const wheel = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

const items = Array.from({ length: 4 }, (_, index) => ({
  id: `item-${index + 1}`,
  position: index,
  title: `Track ${index + 1}`,
  channel: `Artist ${index + 1}`,
}));

test("wheel chances stay positive and total exactly 100", () => {
  const initial = wheel.createWheelEntries(items);
  assert.deepEqual(initial.map((entry) => entry.chance), [25, 25, 25, 25]);

  const changed = wheel.changeWheelChance(initial, "item-1", 55);
  assert.equal(changed[0].chance, 55);
  assert.equal(sumActive(changed), 100);
  assert.ok(changed.slice(1).every((entry) => entry.chance > 0));

  const disabled = wheel.setWheelEntryEnabled(changed, "item-2", false);
  assert.equal(disabled[1].chance, 0);
  assert.equal(sumActive(disabled), 100);
});

test("weighted selection and elimination use only active entries", () => {
  const initial = wheel.createWheelEntries(items);
  assert.equal(wheel.chooseWeightedWheelEntry(initial, () => 0).itemId, "item-1");
  assert.equal(wheel.chooseWeightedWheelEntry(initial, () => 0.999999).itemId, "item-4");

  const eliminated = wheel.eliminateWheelEntry(initial, "item-2");
  assert.equal(wheel.activeWheelEntries(eliminated).length, 3);
  assert.equal(eliminated[1].chance, 0);
  assert.equal(sumActive(eliminated), 100);
});

test("skip and suspense never change the preselected winner", () => {
  const entries = wheel.createWheelEntries(items);
  const randomValues = [0.3, 0.4, 0.01];
  const plan = wheel.createWheelSpinPlan(entries, 17, 5, {
    now: 1_000,
    random: () => randomValues.shift() ?? 0,
    suspenseChance: 1,
  });
  assert.ok(plan);
  assert.equal(plan.suspense, true);

  const suspenseSample = wheel.sampleWheelSpin(plan, 5_200);
  assert.equal(suspenseSample.phase, "coasting");
  assert.equal(wheel.shouldShowWheelSoClose(plan, 4_999), false);
  assert.equal(wheel.shouldShowWheelSoClose(plan, 5_000), true);
  const complete = wheel.sampleWheelSpin(plan, 6_000);
  assert.equal(complete.rotation, plan.targetRotation);
  assert.equal(wheel.shouldShowWheelSoClose(plan, 6_000), false);

  const skipped = wheel.skipWheelSpin(plan, suspenseSample.rotation, 5_200, 800);
  assert.equal(skipped.winnerId, plan.winnerId);
  assert.equal(skipped.suspense, false);
  assert.ok(skipped.targetRotation > suspenseSample.rotation + 359);
});

test("spins continuously decelerate and make the final second very slow", () => {
  const entries = wheel.createWheelEntries(items);
  const randomValues = [0.3, 0.99];
  const plan = wheel.createWheelSpinPlan(entries, 0, 5, {
    now: 1_000,
    random: () => randomValues.shift() ?? 0.99,
    suspenseChance: 0,
    extraTurns: 2,
  });
  assert.ok(plan);

  const samples = Array.from({ length: 6 }, (_, index) =>
    wheel.sampleWheelSpin(plan, 1_000 + index * 1_000));
  const perSecondTravel = samples.slice(1).map(
    (sample, index) => sample.rotation - samples[index].rotation,
  );
  for (let index = 1; index < perSecondTravel.length; index += 1) {
    assert.ok(perSecondTravel[index] < perSecondTravel[index - 1]);
  }
  assert.ok(perSecondTravel.at(-1) > 0);
  assert.ok(perSecondTravel.at(-1) < 15);
  assert.equal(samples.at(-1).rotation, plan.targetRotation);
});

test("long spins use fewer turns, keep moving, and land at the exact target", () => {
  const entries = wheel.createWheelEntries(items);
  const randomValues = [0.2, 0.5, 0.99];
  const plan = wheel.createWheelSpinPlan(entries, 23, 180, {
    now: 10_000,
    random: () => randomValues.shift() ?? 0.99,
  });
  assert.ok(plan);
  assert.equal(plan.suspense, false);
  assert.ok(plan.targetRotation - plan.startRotation > 72 * 360);
  assert.ok(plan.targetRotation - plan.startRotation < 75 * 360);

  const middle = wheel.sampleWheelSpin(plan, 100_000);
  const oneSecondLater = wheel.sampleWheelSpin(plan, 101_000);
  assert.equal(middle.phase, "coasting");
  assert.ok(oneSecondLater.rotation - middle.rotation > 80);
  assert.ok(oneSecondLater.rotation - middle.rotation < 250);
  assert.ok(middle.progress > 0.7 && middle.progress < 0.8);

  const finalSecond = wheel.sampleWheelSpin(plan, 189_000);
  assert.ok(plan.targetRotation - finalSecond.rotation < 2);

  const complete = wheel.sampleWheelSpin(plan, 190_000);
  assert.equal(complete.done, true);
  assert.equal(complete.rotation, plan.targetRotation);
});

test("SO CLOSE is a final-second visual flag and never changes motion", () => {
  const entries = wheel.createWheelEntries(items);
  const randomValues = [0.2, 0.5, 0.01];
  const plan = wheel.createWheelSpinPlan(entries, 31, 180, {
    now: 5_000,
    random: () => randomValues.shift() ?? 0,
    suspenseChance: 1,
  });
  assert.ok(plan);
  assert.equal(plan.suspense, true);

  assert.equal(wheel.shouldShowWheelSoClose(plan, 183_999), false);
  assert.equal(wheel.shouldShowWheelSoClose(plan, 184_000), true);
  const finalSecond = wheel.sampleWheelSpin(plan, 184_000);
  assert.equal(finalSecond.phase, "coasting");
  assert.ok(plan.targetRotation - finalSecond.rotation < 2);

  const visualFlagDisabled = { ...plan, suspense: false };
  for (const now of [5_000, 95_000, 184_000, 184_750, 185_000]) {
    assert.equal(
      wheel.sampleWheelSpin(plan, now).rotation,
      wheel.sampleWheelSpin(visualFlagDisabled, now).rotation,
    );
  }

  const complete = wheel.sampleWheelSpin(plan, 185_000);
  assert.equal(complete.rotation, plan.targetRotation);
  assert.equal(complete.done, true);
});

test("suspense always lands inside even the smallest legal sector", () => {
  const entries = wheel.changeWheelChance(
    wheel.createWheelEntries(items),
    "item-1",
    0.01,
  );
  const randomValues = [0, 0.4, 0];
  const plan = wheel.createWheelSpinPlan(entries, 19, 5, {
    now: 2_000,
    random: () => randomValues.shift() ?? 0,
    suspenseChance: 1,
  });
  assert.ok(plan);
  assert.equal(plan.winnerId, "item-1");
  const segment = wheel.buildWheelSegments(entries)[0];
  const pointerAngle = wheel.positiveModulo(-plan.targetRotation);
  assert.ok(pointerAngle > segment.startAngle);
  assert.ok(pointerAngle < segment.endAngle);
  assert.equal(
    wheel.isWheelLandingNearBoundary(segment, pointerAngle),
    true,
  );
  assert.equal(
    wheel.isWheelLandingNearBoundary(segment, segment.midAngle),
    false,
  );
});

function sumActive(entries) {
  return wheel.activeWheelEntries(entries).reduce(
    (total, entry) => total + entry.chance,
    0,
  );
}
