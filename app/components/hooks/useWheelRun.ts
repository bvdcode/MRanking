"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Pack,
  User,
  WheelResult,
  WheelRun,
  WheelSettings,
} from "../../../lib/types";
import { createWheelRun } from "../../domain/wheelState";
import type { Translate } from "../../i18n/I18nContext";
import { api } from "../../lib/api";
import { useWheelPersistence } from "./useWheelPersistence";

const DEFAULT_SETTINGS: WheelSettings = {
  durationSeconds: 5,
  soundEnabled: true,
  volume: 0.65,
};

export function useWheelRun({
  user,
  onToast,
  t,
}: {
  user: User | null;
  onToast: (message: string) => void;
  t: Translate;
}) {
  const [runs, setRuns] = useState<Record<string, WheelRun>>({});
  const [results, setResults] = useState<WheelResult[]>([]);
  const [settings, setSettingsState] =
    useState<WheelSettings>(DEFAULT_SETTINGS);
  const [activeRun, setActiveRunState] = useState<WheelRun | null>(null);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const settingsSaveTimer = useRef<number | null>(null);
  const {
    updateActiveRun,
    leaveRun: persistBeforeLeaving,
    cancelRun: deletePersistedRun,
    registerSavedResults,
    forgetSavedResult,
    clear: clearPersistence,
  } = useWheelPersistence({
    activeRun,
    user,
    setRuns,
    setResults,
    onToast,
    t,
  });

  useEffect(() => () => {
    if (settingsSaveTimer.current !== null) {
      window.clearTimeout(settingsSaveTimer.current);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    let current = true;
    void Promise.all([
      api<{ runs: WheelRun[] }>("/api/wheel-runs"),
      api<{ results: WheelResult[] }>("/api/wheel-results"),
      api<{ settings: WheelSettings }>("/api/wheel-settings"),
    ]).then(([runData, resultData, settingsData]) => {
      if (!current) {
        return;
      }
      setRuns(Object.fromEntries(
        runData.runs.map((entry) => [entry.packId, entry]),
      ));
      setResults(resultData.results);
      registerSavedResults(resultData.results);
      setSettingsState(settingsData.settings);
    }).catch((error: Error) => {
      if (current) {
        onToast(error.message || t("Something went wrong"));
      }
    });
    return () => {
      current = false;
    };
  }, [onToast, registerSavedResults, t, user]);

  function startPack(pack: Pack, resume = false) {
    const run = resume && runs[pack.id] ? runs[pack.id] : createWheelRun(pack);
    const nextRun = structuredClone(run);
    setSelectedPack(pack);
    updateActiveRun(nextRun);
    setActiveRunState(nextRun);
    return run;
  }

  function setActiveRun(run: WheelRun | null) {
    updateActiveRun(run);
    setActiveRunState(run);
  }

  function leaveRun() {
    persistBeforeLeaving(activeRun);
    setActiveRunState(null);
    setSelectedPack(null);
  }

  async function cancelRun(pack: Pack) {
    if (!window.confirm(t("Cancel current wheel for “{name}”?", { name: pack.name }))) {
      return false;
    }
    updateActiveRun(null);
    setActiveRunState(null);
    setSelectedPack(null);
    try {
      await deletePersistedRun(pack.id);
    } catch (error) {
      onToast(error instanceof Error ? error.message : t("Something went wrong"));
      return false;
    }
    setRuns((current) => {
      const next = { ...current };
      delete next[pack.id];
      return next;
    });
    onToast(t("Wheel cancelled"));
    return true;
  }

  async function deleteResult(result: WheelResult) {
    const name = result.pack?.name ?? t("Archived result");
    if (!window.confirm(t("Delete saved wheel “{name}”?", { name }))) {
      return false;
    }
    await api(`/api/wheel-results?id=${encodeURIComponent(result.id)}`, {
      method: "DELETE",
    });
    forgetSavedResult(result.id);
    setResults((current) => current.filter((item) => item.id !== result.id));
    onToast(t("Wheel history deleted"));
    return true;
  }

  function setSettings(settingsUpdate: WheelSettings) {
    const next = {
      durationSeconds: Math.min(
        180,
        Math.max(3, Math.round(settingsUpdate.durationSeconds)),
      ),
      soundEnabled: settingsUpdate.soundEnabled,
      volume: Math.min(1, Math.max(0, settingsUpdate.volume)),
    };
    setSettingsState(next);
    if (settingsSaveTimer.current !== null) {
      window.clearTimeout(settingsSaveTimer.current);
    }
    settingsSaveTimer.current = window.setTimeout(() => {
      settingsSaveTimer.current = null;
      void api("/api/wheel-settings", {
        method: "PUT",
        body: JSON.stringify({ settings: next }),
      }).catch(() => {
        // A later settings change retries without interrupting the game.
      });
    }, 280);
  }

  function clear() {
    if (settingsSaveTimer.current !== null) {
      window.clearTimeout(settingsSaveTimer.current);
      settingsSaveTimer.current = null;
    }
    clearPersistence();
    setActiveRunState(null);
    setSelectedPack(null);
    setRuns({});
    setResults([]);
    setSettingsState(DEFAULT_SETTINGS);
  }

  return {
    runs,
    results,
    settings,
    activeRun,
    selectedPack,
    setActiveRun,
    setSelectedPack,
    setSettings,
    startPack,
    leaveRun,
    cancelRun,
    deleteResult,
    clear,
  };
}
