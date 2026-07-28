import type { PackItem } from "../../lib/types";
import {
  deceleratingWheelProgress,
  isWheelLandingNearBoundary,
  wheelSliceGeometry,
} from "./wheelGeometry";

export {
  countWheelBoundaryCrossings,
  isWheelLandingNearBoundary,
  normalizedAngularSpeed,
  wheelLandingBoundaryDistance,
} from "./wheelGeometry";

export const WHEEL_TOTAL_PERCENT = 100;
export const MIN_WHEEL_CHANCE = 0.01;
export const SUSPENSE_CHANCE = 0.05;
export const SUSPENSE_WINDOW_MS = 1_000;
export const SO_CLOSE_BOUNDARY_DEGREES = 3;
export const SO_CLOSE_APPROACH_DEGREES = 12;

export type WheelMode = "classic" | "lastOneStanding";
export type WheelSort = "original" | "title" | "chance";

export type WheelEntry = {
  itemId: string; position: number; title: string; artist: string;
  chance: number; color: string; enabled: boolean; eliminated: boolean;
};

export type WheelSnapshot = { entries: WheelEntry[]; winnerId: string | null };

export type WheelSegment = {
  entry: WheelEntry; index: number; startAngle: number; endAngle: number;
  midAngle: number; sweepAngle: number; path: string;
  labelX: number; labelY: number; labelRotation: number;
};

export type WheelSpinPlan = {
  winnerId: string; startRotation: number; targetRotation: number;
  startedAt: number; durationMs: number; suspense: boolean;
};

export type WheelSpinSample = {
  rotation: number; progress: number; elapsedMs: number;
  phase: "accelerating" | "coasting" | "suspense" | "complete";
  done: boolean;
};

type RandomSource = () => number;
type GeometryOptions = {
  centerX?: number; centerY?: number; radius?: number; startAngle?: number;
};

const PRECISION = 1_000_000_000;
const TURNS_PER_SECOND = 0.4;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteChance(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function precise(value: number) {
  return Math.round(value * PRECISION) / PRECISION;
}

function distribute(weights: number[], total: number, minimum = MIN_WHEEL_CHANCE) {
  if (!weights.length) {
    return [];
  }
  const floor = Math.min(minimum, total / weights.length);
  const safeWeights = weights.map(finiteChance);
  const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
  const distributable = Math.max(0, total - floor * weights.length);
  let assigned = 0;
  return safeWeights.map((weight, index) => {
    const ratio = weightTotal ? weight / weightTotal : 1 / weights.length;
    const value = index === weights.length - 1
      ? precise(total - assigned)
      : precise(floor + distributable * ratio);
    assigned += value;
    return value;
  });
}

export function positiveModulo(value: number, divisor = 360) {
  return ((value % divisor) + divisor) % divisor;
}

export function wheelEntryLabel(entry: Pick<WheelEntry, "title" | "artist">) {
  return entry.artist ? `${entry.title} — ${entry.artist}` : entry.title;
}

export function deterministicWheelColor(index: number, total: number) {
  const safeTotal = Math.max(1, total);
  const hue = positiveModulo(index * 137.508 + (index % 3) * (27 / safeTotal), 360);
  const saturation = 68 + (index % 4) * 4;
  const lightness = 48 + (index % 3) * 5;
  return `hsl(${hue.toFixed(2)} ${saturation}% ${lightness}%)`;
}

export function createWheelEntries(items: Pick<PackItem, "id" | "position" | "title" | "channel">[]): WheelEntry[] {
  const chance = items.length ? WHEEL_TOTAL_PERCENT / items.length : 0;
  return items.map((item, index) => ({
    itemId: item.id,
    position: item.position,
    title: item.title,
    artist: item.channel,
    chance,
    color: deterministicWheelColor(index, items.length),
    enabled: true,
    eliminated: false,
  }));
}

export function activeWheelEntries(entries: WheelEntry[]) {
  return entries.filter((entry) => entry.enabled && !entry.eliminated);
}

export function cloneWheelEntries(entries: WheelEntry[]) {
  return entries.map((entry) => ({ ...entry }));
}

export function wheelSnapshot(entries: WheelEntry[], winnerId: string | null = null): WheelSnapshot {
  return { entries: cloneWheelEntries(entries), winnerId };
}

export function restoreWheelSnapshot(snapshot: WheelSnapshot) {
  return {
    entries: cloneWheelEntries(snapshot.entries),
    winnerId: snapshot.winnerId,
  };
}

export function equalizeWheelChances(entries: WheelEntry[]) {
  const activeCount = activeWheelEntries(entries).length;
  const equalChance = activeCount ? WHEEL_TOTAL_PERCENT / activeCount : 0;
  let assigned = 0;
  let remaining = activeCount;
  return entries.map((entry) => {
    if (!entry.enabled || entry.eliminated) {
      return { ...entry, chance: 0 };
    }
    remaining -= 1;
    const chance = remaining === 0
      ? precise(WHEEL_TOTAL_PERCENT - assigned)
      : precise(equalChance);
    assigned += chance;
    return { ...entry, chance };
  });
}

export function normalizeWheelChances(entries: WheelEntry[]) {
  const active = activeWheelEntries(entries);
  if (!active.length) {
    return entries.map((entry) => ({ ...entry, chance: 0 }));
  }
  const chances = distribute(active.map((entry) => entry.chance), WHEEL_TOTAL_PERCENT);
  let activeIndex = 0;
  return entries.map((entry) => {
    if (!entry.enabled || entry.eliminated) {
      return { ...entry, chance: 0 };
    }
    const chance = chances[activeIndex] ?? 0;
    activeIndex += 1;
    return { ...entry, chance };
  });
}

export function changeWheelChance(
  entries: WheelEntry[], itemId: string, requestedChance: number,
  minimumChance = MIN_WHEEL_CHANCE,
) {
  const active = activeWheelEntries(entries);
  const target = active.find((entry) => entry.itemId === itemId);
  if (!target || active.length < 2) {
    return normalizeWheelChances(entries);
  }
  const safeMinimum = clamp(minimumChance, Number.EPSILON, WHEEL_TOTAL_PERCENT / active.length);
  const maximum = WHEEL_TOTAL_PERCENT - safeMinimum * (active.length - 1);
  const targetChance = clamp(
    Number.isFinite(requestedChance) ? requestedChance : target.chance,
    safeMinimum,
    maximum,
  );
  const others = active.filter((entry) => entry.itemId !== itemId);
  const remainingTotal = WHEEL_TOTAL_PERCENT - targetChance;
  const chances = distribute(
    others.map((entry) => entry.chance),
    remainingTotal,
    safeMinimum,
  );
  let otherIndex = 0;
  return entries.map((entry) => {
    if (!entry.enabled || entry.eliminated) {
      return { ...entry, chance: 0 };
    }
    if (entry.itemId === itemId) {
      return { ...entry, chance: precise(targetChance) };
    }
    const chance = chances[otherIndex] ?? safeMinimum;
    otherIndex += 1;
    return { ...entry, chance };
  });
}

export function setWheelEntryEnabled(entries: WheelEntry[], itemId: string, enabled: boolean) {
  const updated = entries.map((entry) =>
    entry.itemId === itemId && !entry.eliminated ? { ...entry, enabled } : { ...entry },
  );
  return normalizeWheelChances(updated);
}

function shuffledIndexes(length: number, random: RandomSource) {
  const indexes = Array.from({ length }, (_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clamp(random(), 0, 0.999999999) * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }
  return indexes;
}

export function quickSelectWheelEntries(entries: WheelEntry[], requestedCount: number, random: RandomSource = Math.random) {
  const available = entries.filter((entry) => !entry.eliminated);
  const count = clamp(Math.floor(requestedCount), 0, available.length);
  const chosen = new Set(
    shuffledIndexes(available.length, random)
      .slice(0, count)
      .map((index) => available[index].itemId),
  );
  return equalizeWheelChances(
    entries.map((entry) => ({
      ...entry,
      enabled: !entry.eliminated && chosen.has(entry.itemId),
    })),
  );
}

export function chooseWeightedWheelEntry(entries: WheelEntry[], random: RandomSource = Math.random) {
  const normalized = normalizeWheelChances(entries);
  const active = activeWheelEntries(normalized);
  if (!active.length) {
    return null;
  }
  let cursor = clamp(random(), 0, 0.999999999) * WHEEL_TOTAL_PERCENT;
  for (const entry of active) {
    cursor -= entry.chance;
    if (cursor < 0) {
      return entry;
    }
  }
  return active[active.length - 1];
}

export function buildWheelSegments(entries: WheelEntry[], options: GeometryOptions = {}): WheelSegment[] {
  const centerX = options.centerX ?? 50;
  const centerY = options.centerY ?? 50;
  const radius = options.radius ?? 49;
  const startAngle = options.startAngle ?? 0;
  const active = activeWheelEntries(normalizeWheelChances(entries));
  let cursor = startAngle;
  return active.map((entry, index) => {
    const sweepAngle = index === active.length - 1
      ? startAngle + 360 - cursor
      : (entry.chance / WHEEL_TOTAL_PERCENT) * 360;
    const endAngle = cursor + sweepAngle;
    const midAngle = cursor + sweepAngle / 2;
    const geometry = wheelSliceGeometry(
      centerX,
      centerY,
      radius,
      cursor,
      endAngle,
      midAngle,
    );
    const segment = {
      entry,
      index,
      startAngle: cursor,
      endAngle,
      midAngle,
      sweepAngle,
      path: geometry.path,
      labelX: geometry.labelX,
      labelY: geometry.labelY,
      labelRotation: positiveModulo(midAngle) > 180 ? midAngle + 90 : midAngle - 90,
    };
    cursor = endAngle;
    return segment;
  });
}

export function targetRotationForSegment(
  currentRotation: number, segment: Pick<WheelSegment, "midAngle">,
  extraTurns = 6, pointerAngle = 0,
) {
  const alignment = positiveModulo(pointerAngle - segment.midAngle - currentRotation);
  return currentRotation + Math.max(1, Math.floor(extraTurns)) * 360 + alignment;
}

export function shouldShowWheelSoClose(
  plan: WheelSpinPlan,
  now = Date.now(),
) {
  const elapsedMs = now - plan.startedAt;
  return plan.suspense
    && elapsedMs >= Math.max(0, plan.durationMs - SUSPENSE_WINDOW_MS)
    && elapsedMs < plan.durationMs
    && plan.targetRotation - sampleWheelSpin(plan, now).rotation
      <= SO_CLOSE_APPROACH_DEGREES;
}

export function createWheelSpinPlan(
  entries: WheelEntry[],
  currentRotation: number,
  durationSeconds: number,
  options: {
    now?: number;
    random?: RandomSource;
    suspenseChance?: number;
    extraTurns?: number;
  } = {},
): WheelSpinPlan | null {
  const random = options.random ?? Math.random;
  const winner = chooseWeightedWheelEntry(entries, random);
  if (!winner) {
    return null;
  }
  const segment = buildWheelSegments(entries).find(
    (candidate) => candidate.entry.itemId === winner.itemId,
  );
  if (!segment) {
    return null;
  }
  const duration = clamp(durationSeconds, 3, 180);
  const turnRandom = options.extraTurns === undefined ? random() : 0;
  const requestSoClose = random() < clamp(
    options.suspenseChance ?? SUSPENSE_CHANCE,
    0,
    1,
  );
  const randomTurns = duration >= 6 ? Math.floor(turnRandom * 2) : 0;
  const extraTurns = options.extraTurns ?? Math.max(
    1,
    Math.floor(duration * TURNS_PER_SECOND) + randomTurns,
  );
  const nearBoundaryThreshold = Math.min(
    SO_CLOSE_BOUNDARY_DEGREES,
    segment.sweepAngle * 0.2,
  );
  const boundaryInset = Math.max(
    Number.EPSILON * 4,
    nearBoundaryThreshold * 0.65,
  );
  const landingAngle = requestSoClose
    ? (turnRandom < 0.5
      ? segment.startAngle + boundaryInset
      : segment.endAngle - boundaryInset)
    : segment.midAngle;
  const suspense = requestSoClose
    && isWheelLandingNearBoundary(
      segment,
      landingAngle,
      SO_CLOSE_BOUNDARY_DEGREES,
    );
  return {
    winnerId: winner.itemId,
    startRotation: currentRotation,
    targetRotation: targetRotationForSegment(
      currentRotation,
      { midAngle: landingAngle },
      extraTurns,
    ),
    startedAt: options.now ?? Date.now(),
    durationMs: duration * 1_000,
    suspense,
  };
}

export function sampleWheelSpin(plan: WheelSpinPlan, now = Date.now()): WheelSpinSample {
  const elapsedMs = clamp(now - plan.startedAt, 0, plan.durationMs);
  const done = elapsedMs >= plan.durationMs;
  const progress = done
    ? 1
    : deceleratingWheelProgress(elapsedMs, plan.durationMs);
  const phase: WheelSpinSample["phase"] = done ? "complete" : "coasting";
  return {
    rotation: plan.startRotation + (plan.targetRotation - plan.startRotation) * progress,
    progress,
    elapsedMs,
    phase,
    done,
  };
}

export function skipWheelSpin(
  plan: WheelSpinPlan, currentRotation: number, now = Date.now(), durationMs = 800,
): WheelSpinPlan {
  return {
    ...plan,
    startRotation: currentRotation,
    targetRotation: currentRotation + 360 + positiveModulo(plan.targetRotation - currentRotation),
    startedAt: now,
    durationMs: Math.max(250, durationMs),
    suspense: false,
  };
}

export function eliminateWheelEntry(entries: WheelEntry[], itemId: string) {
  return normalizeWheelChances(
    entries.map((entry) =>
      entry.itemId === itemId
        ? { ...entry, enabled: false, eliminated: true, chance: 0 }
        : { ...entry },
    ),
  );
}

export function sortWheelEntries(entries: WheelEntry[], sort: WheelSort) {
  const copy = [...entries];
  if (sort === "title") {
    return copy.sort((first, second) =>
      wheelEntryLabel(first).localeCompare(wheelEntryLabel(second), undefined, {
        sensitivity: "base",
      }),
    );
  }
  if (sort === "chance") {
    return copy.sort((first, second) =>
      second.chance - first.chance || first.position - second.position,
    );
  }
  return copy.sort((first, second) => first.position - second.position);
}
