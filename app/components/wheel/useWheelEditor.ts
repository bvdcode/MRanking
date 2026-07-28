"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  Pack,
  WheelMode,
  WheelRun,
  WheelSettings,
} from "../../../lib/types";
import {
  activeWheelEntries,
  changeWheelChance,
  equalizeWheelChances,
  quickSelectWheelEntries,
  setWheelEntryEnabled,
  sortWheelEntries,
  wheelEntryLabel,
  type WheelEntry,
  type WheelSort,
} from "../../domain/wheel";
import {
  makeWheelSnapshot,
  persistWheelEntries,
  resetWheelSession,
  withWheelState,
} from "../../domain/wheelState";

type UseWheelEditorOptions = {
  pack: Pack;
  run: WheelRun;
  entries: WheelEntry[];
  settings: WheelSettings;
  archived: boolean;
  spinning: boolean;
  onChange?: (run: WheelRun) => void;
  onSettings?: (settings: WheelSettings) => void;
};

export function useWheelEditor({
  pack,
  run,
  entries,
  settings,
  archived,
  spinning,
  onChange,
  onSettings,
}: UseWheelEditorOptions) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<WheelSort>("original");
  const [draftState, setDraftState] = useState<{
    runId: string;
    values: Record<string, string>;
  }>({ runId: run.id, values: {} });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const chanceDrafts = useMemo(
    () => (draftState.runId === run.id ? draftState.values : {}),
    [draftState, run.id],
  );
  const activeEntries = useMemo(() => activeWheelEntries(entries), [entries]);
  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return sortWheelEntries(entries, sort).filter((entry) =>
      !needle || wheelEntryLabel(entry).toLocaleLowerCase().includes(needle),
    );
  }, [entries, query, sort]);

  const clearDrafts = useCallback(() => {
    setDraftState({ runId: run.id, values: {} });
  }, [run.id]);

  const commitEntries = useCallback(
    (
      nextEntries: WheelEntry[],
      extra: Parameters<typeof withWheelState>[1] = {},
    ) => {
      if (!onChange || archived || spinning) {
        return;
      }
      clearDrafts();
      onChange(
        withWheelState(run, {
          entries: persistWheelEntries(nextEntries),
          ...extra,
        }),
      );
    },
    [archived, clearDrafts, onChange, run, spinning],
  );

  const toggleEntry = useCallback(
    (itemId: string, enabled: boolean) => {
      if (!enabled && activeEntries.length <= 2) {
        return;
      }
      commitEntries(setWheelEntryEnabled(entries, itemId, enabled), {
        winnerItemId: null,
        status: "active",
        undoStack: [],
        redoStack: [],
      });
    },
    [activeEntries.length, commitEntries, entries],
  );

  const quickSelect = useCallback(
    (count: number | "all") => {
      const next =
        count === "all"
          ? equalizeWheelChances(
              entries.map((entry) => ({
                ...entry,
                enabled: !entry.eliminated,
              })),
            )
          : quickSelectWheelEntries(entries, count);
      commitEntries(next, {
        winnerItemId: null,
        status: "active",
        undoStack: [],
        redoStack: [],
      });
    },
    [commitEntries, entries],
  );

  const setChanceDraft = useCallback(
    (itemId: string, value: string) => {
      setDraftState((current) => ({
        runId: run.id,
        values: {
          ...(current.runId === run.id ? current.values : {}),
          [itemId]: value,
        },
      }));
    },
    [run.id],
  );

  const discardChanceDraft = useCallback(
    (itemId: string) => {
      setDraftState((current) => {
        if (current.runId !== run.id) {
          return { runId: run.id, values: {} };
        }
        const values = { ...current.values };
        delete values[itemId];
        return { runId: run.id, values };
      });
    },
    [run.id],
  );

  const commitChanceDraft = useCallback(
    (itemId: string, fallback: number) => {
      const raw = chanceDrafts[itemId];
      const next = raw === undefined || raw.trim() === "" ? fallback : Number(raw);
      if (Number.isFinite(next)) {
        commitEntries(changeWheelChance(entries, itemId, next));
      }
      discardChanceDraft(itemId);
    },
    [chanceDrafts, commitEntries, discardChanceDraft, entries],
  );

  const changeMode = useCallback(
    (mode: WheelMode) => {
      if (!onChange || archived || spinning || mode === run.state.mode) {
        return;
      }
      clearDrafts();
      const reset = resetWheelSession(pack, { ...run.state, mode });
      onChange({ ...run, state: reset, updatedAt: reset.updatedAt });
    },
    [archived, clearDrafts, onChange, pack, run, spinning],
  );

  const resetGame = useCallback(() => {
    if (!onChange || archived || spinning) {
      return;
    }
    clearDrafts();
    const reset = resetWheelSession(pack, run.state);
    onChange({ ...run, state: reset, updatedAt: reset.updatedAt });
  }, [archived, clearDrafts, onChange, pack, run, spinning]);

  const playAgain = useCallback(() => {
    if (!onChange || archived) {
      return;
    }
    clearDrafts();
    const reset = resetWheelSession(pack, run.state);
    onChange({
      id: `wheel-${crypto.randomUUID()}`,
      packId: pack.id,
      state: reset,
      updatedAt: reset.updatedAt,
    });
    setPlayerOpen(false);
  }, [archived, clearDrafts, onChange, pack, run.state]);

  const undo = useCallback(() => {
    if (!onChange || archived || spinning || run.state.undoStack.length === 0) {
      return;
    }
    const previous = run.state.undoStack.at(-1)!;
    const current = makeWheelSnapshot(
      entries,
      run.state.winnerItemId,
      run.state.rotation,
    );
    onChange(
      withWheelState(run, {
        entries: previous.entries,
        winnerItemId: previous.winnerItemId,
        rotation: previous.rotation,
        status: "active",
        auto: false,
        undoStack: run.state.undoStack.slice(0, -1),
        redoStack: [...run.state.redoStack.slice(-19), current],
      }),
    );
  }, [archived, entries, onChange, run, spinning]);

  const redo = useCallback(() => {
    if (!onChange || archived || spinning || run.state.redoStack.length === 0) {
      return;
    }
    const next = run.state.redoStack.at(-1)!;
    const current = makeWheelSnapshot(
      entries,
      run.state.winnerItemId,
      run.state.rotation,
    );
    onChange(
      withWheelState(run, {
        entries: next.entries,
        winnerItemId: next.winnerItemId,
        rotation: next.rotation,
        status: next.winnerItemId ? "complete" : "active",
        auto: false,
        undoStack: [...run.state.undoStack.slice(-19), current],
        redoStack: run.state.redoStack.slice(0, -1),
      }),
    );
  }, [archived, entries, onChange, run, spinning]);

  const updateSettings = useCallback(
    (next: Partial<WheelSettings>) => {
      onSettings?.({ ...settings, ...next });
    },
    [onSettings, settings],
  );

  return {
    query,
    setQuery,
    sort,
    setSort,
    chanceDrafts,
    setChanceDraft,
    discardChanceDraft,
    commitChanceDraft,
    hoveredId,
    setHoveredId,
    playerOpen,
    setPlayerOpen,
    activeEntries,
    visibleEntries,
    toggleEntry,
    quickSelect,
    resetChances: () => commitEntries(equalizeWheelChances(entries)),
    changeMode,
    resetGame,
    playAgain,
    undo,
    redo,
    updateSettings,
  };
}
