"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActiveRun, Pack, SavedResult, User } from "../../../lib/types";
import type { Translate } from "../../i18n/I18nContext";
import { api } from "../../lib/api";
import type { EditablePack } from "../../types";

type UsePrivateLibraryResult = {
  booting: boolean;
  user: User | null;
  packs: Pack[];
  results: SavedResult[];
  savedRuns: Record<string, ActiveRun>;
  setResults: React.Dispatch<React.SetStateAction<SavedResult[]>>;
  setSavedRuns: React.Dispatch<React.SetStateAction<Record<string, ActiveRun>>>;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  savePack: (draft: EditablePack) => Promise<Pack>;
  deletePack: (pack: Pack) => Promise<void>;
  deleteResult: (result: SavedResult) => Promise<boolean>;
};

export function usePrivateLibrary(
  t: Translate,
  onToast: (message: string) => void,
): UsePrivateLibraryResult {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [results, setResults] = useState<SavedResult[]>([]);
  const [savedRuns, setSavedRuns] = useState<Record<string, ActiveRun>>({});

  const loadPrivateData = useCallback(async () => {
    const [packData, resultData, runData] = await Promise.all([
      api<{ packs: Pack[] }>("/api/packs"),
      api<{ results: SavedResult[] }>("/api/results"),
      api<{ runs: Array<{ packId: string; run: ActiveRun }> }>("/api/runs"),
    ]);
    setPacks(packData.packs);
    setResults(resultData.results);
    setSavedRuns(
      Object.fromEntries(
        runData.runs.map((entry) => [entry.packId, entry.run]),
      ),
    );
  }, []);

  useEffect(() => {
    api<{ user: User | null }>("/api/auth")
      .then(async ({ user: sessionUser }) => {
        setUser(sessionUser);
        if (sessionUser) {
          await loadPrivateData();
        }
      })
      .finally(() => setBooting(false));
  }, [loadPrivateData]);

  async function login(nickname: string, password: string): Promise<void> {
    const data = await api<{ user: User }>("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        nickname: nickname.trim(),
        password: password.trim(),
      }),
    });
    setUser(data.user);
    await loadPrivateData();
  }

  async function register(nickname: string, password: string): Promise<void> {
    const data = await api<{ user: User }>("/api/auth", {
      method: "PUT",
      body: JSON.stringify({
        nickname: nickname.trim(),
        password: password.trim(),
      }),
    });
    setUser(data.user);
    await loadPrivateData();
    onToast(t("Account created"));
  }

  async function logout(): Promise<void> {
    await api("/api/auth", { method: "DELETE" });
    setUser(null);
    setPacks([]);
    setResults([]);
    setSavedRuns({});
  }

  async function savePack(draft: EditablePack): Promise<Pack> {
    const normalizedDraft = {
      ...draft,
      name: draft.name.trim(),
      sourceUrl: draft.sourceUrl.trim(),
    };
    const data = await api<{ pack: Pack }>("/api/packs", {
      method: "POST",
      body: JSON.stringify(normalizedDraft),
    });
    setPacks((current) =>
      draft.id
        ? current.map((pack) => (pack.id === data.pack.id ? data.pack : pack))
        : [data.pack, ...current],
    );
    onToast(t("Pack saved"));
    return data.pack;
  }

  async function deletePack(pack: Pack): Promise<void> {
    if (!window.confirm(t("Delete “{name}”?", { name: pack.name }))) {
      return;
    }
    await api(`/api/packs?id=${encodeURIComponent(pack.id)}`, {
      method: "DELETE",
    });
    setPacks((current) => current.filter((item) => item.id !== pack.id));
    setSavedRuns((current) => {
      const next = { ...current };
      delete next[pack.id];
      return next;
    });
    onToast(t("Pack deleted"));
  }

  async function deleteResult(result: SavedResult): Promise<boolean> {
    const pack =
      result.pack ??
      packs.find((item) => item.id === result.packId) ??
      null;
    const name = pack?.name ?? t("Archived result");
    if (!window.confirm(t("Delete saved tournament “{name}”?", { name }))) {
      return false;
    }

    try {
      await api(`/api/results?id=${encodeURIComponent(result.id)}`, {
        method: "DELETE",
      });
      setResults((current) =>
        current.filter((item) => item.id !== result.id),
      );
      onToast(t("Tournament deleted"));
      return true;
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("Something went wrong"),
      );
      return false;
    }
  }

  return {
    booting,
    user,
    packs,
    results,
    savedRuns,
    setResults,
    setSavedRuns,
    login,
    register,
    logout,
    savePack,
    deletePack,
    deleteResult,
  };
}
