"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  User,
  WheelResult,
  WheelRun,
} from "../../../lib/types";
import type { Translate } from "../../i18n/I18nContext";
import { api } from "../../lib/api";

type PendingWheelResult = { run: WheelRun; attempt: number };
type RunsState = Record<string, WheelRun>;

export function useWheelPersistence({
  activeRun,
  user,
  setRuns,
  setResults,
  onToast,
  t,
}: {
  activeRun: WheelRun | null;
  user: User | null;
  setRuns: Dispatch<SetStateAction<RunsState>>;
  setResults: Dispatch<SetStateAction<WheelResult[]>>;
  onToast: (message: string) => void;
  t: Translate;
}) {
  const activeRunRef = useRef<WheelRun | null>(null);
  const resultSaving = useRef(new Set<string>());
  const savedResultIds = useRef(new Set<string>());
  const pendingResults = useRef(new Map<string, PendingWheelResult>());
  const retractedResults = useRef(new Set<string>());
  const resultRetryTimers = useRef(new Map<string, number>());
  const retractionRetryTimers = useRef(new Map<string, number>());
  const retractionSaving = useRef(new Set<string>());
  const packQueues = useRef(new Map<string, Promise<void>>());
  const packGenerations = useRef(new Map<string, number>());
  const packSaveRevisions = useRef(new Map<string, number>());
  const runSaveTimers = useRef(new Map<string, number>());
  const persistResultRef = useRef<(run: WheelRun, attempt?: number) => void>(
    () => undefined,
  );
  const retractResultRef = useRef<
    (packId: string, resultId: string, attempt?: number) => void
  >(() => undefined);

  useEffect(() => () => {
    runSaveTimers.current.forEach((timer) => window.clearTimeout(timer));
    resultRetryTimers.current.forEach((timer) => window.clearTimeout(timer));
    retractionRetryTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const queuePackOperation = useCallback(
    (packId: string, operation: () => Promise<void>) => {
      const previous = packQueues.current.get(packId) ?? Promise.resolve();
      const next = previous.catch(() => undefined).then(operation);
      const tracked = next.finally(() => {
        if (packQueues.current.get(packId) === tracked) {
          packQueues.current.delete(packId);
        }
      });
      packQueues.current.set(packId, tracked);
      return tracked;
    },
    [],
  );

  const clearRunSaveTimer = useCallback((packId: string) => {
    const timer = runSaveTimers.current.get(packId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      runSaveTimers.current.delete(packId);
    }
  }, []);

  const persistActiveRun = useCallback((run: WheelRun) => {
    const settledRun = { ...run, state: { ...run.state, auto: false } };
    const generation = packGenerations.current.get(run.packId) ?? 0;
    const revision = (packSaveRevisions.current.get(run.packId) ?? 0) + 1;
    packGenerations.current.set(run.packId, generation);
    packSaveRevisions.current.set(run.packId, revision);
    setRuns((current) => ({ ...current, [run.packId]: settledRun }));
    return queuePackOperation(run.packId, async () => {
      if ((packGenerations.current.get(run.packId) ?? 0) !== generation) {
        return;
      }
      const { run: savedRun } = await api<{ run: WheelRun }>(
        "/api/wheel-runs",
        { method: "PUT", body: JSON.stringify({ run: settledRun }) },
      );
      if (
        (packGenerations.current.get(run.packId) ?? 0) === generation &&
        packSaveRevisions.current.get(run.packId) === revision
      ) {
        setRuns((current) => ({ ...current, [savedRun.packId]: savedRun }));
      }
    });
  }, [queuePackOperation, setRuns]);

  const removeSavedResult = useCallback(async (id: string) => {
    await api(`/api/wheel-results?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }, []);

  const queueResultRetraction = useCallback((
    packId: string,
    resultId: string,
    attempt = 0,
  ) => {
    if (
      !retractedResults.current.has(resultId) ||
      retractionSaving.current.has(resultId) ||
      retractionRetryTimers.current.has(resultId)
    ) {
      return;
    }
    retractionSaving.current.add(resultId);
    void queuePackOperation(packId, () => removeSavedResult(resultId))
      .then(() => {
        retractedResults.current.delete(resultId);
        savedResultIds.current.delete(resultId);
      })
      .catch(() => {
        if (!retractedResults.current.has(resultId)) {
          return;
        }
        const delay = Math.min(30_000, 1_500 * 2 ** Math.min(attempt, 5));
        const timer = window.setTimeout(() => {
          retractionRetryTimers.current.delete(resultId);
          retractResultRef.current(packId, resultId, attempt + 1);
        }, delay);
        retractionRetryTimers.current.set(resultId, timer);
      })
      .finally(() => retractionSaving.current.delete(resultId));
  }, [queuePackOperation, removeSavedResult]);

  useEffect(() => {
    retractResultRef.current = queueResultRetraction;
  }, [queueResultRetraction]);

  const persistCompletedResult = useCallback((run: WheelRun, attempt = 0) => {
    if (
      run.state.status !== "complete" ||
      !run.state.winnerItemId ||
      savedResultIds.current.has(run.id)
    ) {
      return;
    }
    retractedResults.current.delete(run.id);
    const retractionTimer = retractionRetryTimers.current.get(run.id);
    if (retractionTimer !== undefined) {
      window.clearTimeout(retractionTimer);
      retractionRetryTimers.current.delete(run.id);
    }
    if (resultSaving.current.has(run.id) || resultRetryTimers.current.has(run.id)) {
      return;
    }
    if (!pendingResults.current.has(run.id)) {
      packGenerations.current.set(
        run.packId,
        (packGenerations.current.get(run.packId) ?? 0) + 1,
      );
    }
    pendingResults.current.set(run.id, { run, attempt });
    resultSaving.current.add(run.id);
    setRuns((current) => removeMatchingRun(current, run));
    void queuePackOperation(run.packId, async () => {
      if (!pendingResults.current.has(run.id)) {
        return;
      }
      const { result } = await api<{ result: WheelResult }>(
        "/api/wheel-results",
        {
          method: "POST",
          body: JSON.stringify({
            result: {
              id: run.id,
              packId: run.packId,
              mode: run.state.mode,
              winnerItemId: run.state.winnerItemId,
              state: run.state,
            },
          }),
        },
      );
      if (!pendingResults.current.has(run.id)) {
        if (retractedResults.current.has(run.id)) {
          queueResultRetraction(run.packId, run.id);
        }
        return;
      }
      pendingResults.current.delete(run.id);
      retractedResults.current.delete(run.id);
      savedResultIds.current.add(run.id);
      const retryTimer = resultRetryTimers.current.get(run.id);
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
        resultRetryTimers.current.delete(run.id);
      }
      setResults((current) => [
        result,
        ...current.filter((item) => item.id !== result.id),
      ]);
      setRuns((current) => removeMatchingRun(current, run));
      onToast(t("Wheel result saved"));
    }).catch(() => {
      if (!pendingResults.current.has(run.id)) {
        return;
      }
      const delay = Math.min(30_000, 1_500 * 2 ** Math.min(attempt, 5));
      const timer = window.setTimeout(() => {
        resultRetryTimers.current.delete(run.id);
        const latest = pendingResults.current.get(run.id);
        if (latest) {
          persistResultRef.current(latest.run, attempt + 1);
        }
      }, delay);
      resultRetryTimers.current.set(run.id, timer);
    }).finally(() => {
      resultSaving.current.delete(run.id);
      const desired = activeRunRef.current;
      if (
        desired?.id === run.id &&
        desired.state.status === "complete" &&
        desired.state.winnerItemId &&
        !savedResultIds.current.has(run.id)
      ) {
        queueMicrotask(() => persistResultRef.current(desired));
      }
    });
  }, [onToast, queuePackOperation, queueResultRetraction, setResults, setRuns, t]);

  useEffect(() => {
    persistResultRef.current = persistCompletedResult;
  }, [persistCompletedResult]);

  useEffect(() => {
    if (activeRun?.state.status === "complete") {
      persistCompletedResult(activeRun);
    }
  }, [activeRun, persistCompletedResult]);

  useEffect(() => {
    if (!activeRun || activeRun.state.status !== "active" || !user) {
      return;
    }
    const timers = runSaveTimers.current;
    clearRunSaveTimer(activeRun.packId);
    const timer = window.setTimeout(() => {
      timers.delete(activeRun.packId);
      void persistActiveRun(activeRun).catch(() => undefined);
    }, 500);
    timers.set(activeRun.packId, timer);
    return () => {
      if (timers.get(activeRun.packId) === timer) {
        window.clearTimeout(timer);
        timers.delete(activeRun.packId);
      }
    };
  }, [activeRun, clearRunSaveTimer, persistActiveRun, user]);

  const updateActiveRun = useCallback((run: WheelRun | null) => {
    const previous = activeRunRef.current;
    if (
      run?.state.status === "active" &&
      previous?.state.status === "complete" &&
      run.id === previous.id
    ) {
      retractedResults.current.add(run.id);
      pendingResults.current.delete(run.id);
      savedResultIds.current.delete(run.id);
      const retryTimer = resultRetryTimers.current.get(run.id);
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
        resultRetryTimers.current.delete(run.id);
      }
      setResults((current) => current.filter((result) => result.id !== run.id));
      queueResultRetraction(run.packId, run.id);
    }
    activeRunRef.current = run;
  }, [queueResultRetraction, setResults]);

  const leaveRun = useCallback((run: WheelRun | null) => {
    if (run?.state.status === "active") {
      clearRunSaveTimer(run.packId);
      void persistActiveRun(run).catch(() => undefined);
    } else if (run?.state.status === "complete") {
      persistCompletedResult(run);
    }
    activeRunRef.current = null;
  }, [clearRunSaveTimer, persistActiveRun, persistCompletedResult]);

  const cancelRun = useCallback((packId: string) => {
    clearRunSaveTimer(packId);
    packGenerations.current.set(
      packId,
      (packGenerations.current.get(packId) ?? 0) + 1,
    );
    return queuePackOperation(packId, async () => {
      await api(`/api/wheel-runs?packId=${encodeURIComponent(packId)}`, {
        method: "DELETE",
      });
    });
  }, [clearRunSaveTimer, queuePackOperation]);

  const registerSavedResults = useCallback((results: WheelResult[]) => {
    savedResultIds.current = new Set(results.map((result) => result.id));
  }, []);

  const forgetSavedResult = useCallback((id: string) => {
    savedResultIds.current.delete(id);
  }, []);

  const clear = useCallback(() => {
    runSaveTimers.current.forEach((timer) => window.clearTimeout(timer));
    resultRetryTimers.current.forEach((timer) => window.clearTimeout(timer));
    retractionRetryTimers.current.forEach((timer) => window.clearTimeout(timer));
    runSaveTimers.current.clear();
    resultRetryTimers.current.clear();
    retractionRetryTimers.current.clear();
    pendingResults.current.clear();
    resultSaving.current.clear();
    savedResultIds.current.clear();
    packGenerations.current.forEach((generation, packId) => {
      packGenerations.current.set(packId, generation + 1);
    });
    activeRunRef.current = null;
  }, []);

  return {
    updateActiveRun,
    leaveRun,
    cancelRun,
    registerSavedResults,
    forgetSavedResult,
    clear,
  };
}

function removeMatchingRun(current: RunsState, run: WheelRun) {
  if (current[run.packId]?.id !== run.id) {
    return current;
  }
  const next = { ...current };
  delete next[run.packId];
  return next;
}
