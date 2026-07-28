import type {
  Pack,
  WheelEntryState,
  WheelRun,
  WheelSessionState,
  WheelStateSnapshot,
} from "../../lib/types";
import {
  createWheelEntries,
  equalizeWheelChances,
  type WheelEntry,
} from "./wheel";

export function hydrateWheelEntries(
  pack: Pack,
  entries: WheelEntryState[],
): WheelEntry[] {
  const stateById = new Map(entries.map((entry) => [entry.itemId, entry]));
  return pack.items.flatMap((item, index) => {
    const state = stateById.get(item.id);
    if (!state) {
      return [];
    }
    return [{
      itemId: item.id,
      position: item.position ?? index,
      title: item.title,
      artist: item.channel,
      chance: state.chance,
      color: state.color,
      enabled: state.enabled,
      eliminated: state.eliminated,
    }];
  });
}

export function persistWheelEntries(entries: WheelEntry[]): WheelEntryState[] {
  return entries.map(({ itemId, chance, color, enabled, eliminated }) => ({
    itemId,
    chance,
    color,
    enabled,
    eliminated,
  }));
}

export function makeWheelSnapshot(
  entries: WheelEntry[] | WheelEntryState[],
  winnerItemId: string | null,
  rotation: number,
): WheelStateSnapshot {
  const persisted = entries.map((entry) => ({
    itemId: entry.itemId,
    chance: entry.chance,
    color: entry.color,
    enabled: entry.enabled,
    eliminated: entry.eliminated,
  }));
  return { entries: persisted, winnerItemId, rotation };
}

export function createWheelRun(pack: Pack): WheelRun {
  const now = new Date().toISOString();
  const entries = equalizeWheelChances(createWheelEntries(pack.items));
  return {
    id: `wheel-${crypto.randomUUID()}`,
    packId: pack.id,
    updatedAt: now,
    state: {
      mode: "classic",
      entries: persistWheelEntries(entries),
      status: "active",
      winnerItemId: null,
      auto: false,
      undoStack: [],
      redoStack: [],
      rotation: 0,
      updatedAt: now,
    },
  };
}

export function resetWheelSession(
  pack: Pack,
  previous: WheelSessionState,
): WheelSessionState {
  const entries = equalizeWheelChances(createWheelEntries(pack.items));
  const now = new Date().toISOString();
  return {
    ...previous,
    entries: persistWheelEntries(entries),
    status: "active",
    winnerItemId: null,
    auto: false,
    undoStack: [],
    redoStack: [],
    rotation: 0,
    updatedAt: now,
  };
}

export function withWheelState(
  run: WheelRun,
  update: Partial<WheelSessionState>,
): WheelRun {
  const now = new Date().toISOString();
  return {
    ...run,
    updatedAt: now,
    state: { ...run.state, ...update, updatedAt: now },
  };
}
