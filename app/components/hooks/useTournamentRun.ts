"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ActiveRun, Pack, SavedResult, User } from "../../../lib/types";
import {
  cloneSession,
  createRound,
  restore,
  snapshot,
} from "../../domain/tournament";
import type { Translate } from "../../i18n/I18nContext";
import { api } from "../../lib/api";

type UseTournamentRunOptions = {
  user: User | null;
  packs: Pack[];
  results: SavedResult[];
  savedRuns: Record<string, ActiveRun>;
  setResults: Dispatch<SetStateAction<SavedResult[]>>;
  setSavedRuns: Dispatch<SetStateAction<Record<string, ActiveRun>>>;
  onToast: (message: string) => void;
  t: Translate;
};

export function useTournamentRun({
  user,
  packs,
  results,
  savedRuns,
  setResults,
  setSavedRuns,
  onToast,
  t,
}: UseTournamentRunOptions) {
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [modePack, setModePack] = useState<Pack | null>(null);
  const resultSaving = useRef(new Set<string>());

  useEffect(() => {
    if (!activeRun || activeRun.session.status !== "active" || !user) {
      return;
    }
    const timer = window.setTimeout(() => {
      void api("/api/runs", {
        method: "PUT",
        body: JSON.stringify({ run: activeRun }),
      });
      setSavedRuns((current) => ({
        ...current,
        [activeRun.session.packId]: activeRun,
      }));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeRun, setSavedRuns, user]);

  useEffect(() => {
    if (
      !activeRun ||
      activeRun.session.status !== "complete" ||
      !activeRun.session.championId ||
      resultSaving.current.has(activeRun.session.id)
    ) {
      return;
    }
    if (results.some((result) => result.id === activeRun.session.id)) {
      return;
    }

    resultSaving.current.add(activeRun.session.id);
    api<{ result: SavedResult }>("/api/results", {
      method: "POST",
      body: JSON.stringify({ session: activeRun.session }),
    })
      .then(({ result }) => {
        setResults((current) => [result, ...current]);
        setSavedRuns((current) => {
          const next = { ...current };
          delete next[activeRun.session.packId];
          return next;
        });
        onToast(t("Result saved"));
      })
      .catch((error) => {
        onToast(
          error instanceof Error ? error.message : t("Something went wrong"),
        );
      });
  }, [activeRun, onToast, results, setResults, setSavedRuns, t]);

  function startPack(pack: Pack, resume = false) {
    const run =
      resume && savedRuns[pack.id]
        ? savedRuns[pack.id]
        : {
            session: createRound(
              pack.items.map((item) => item.id),
              pack.id,
            ),
            undoStack: [],
          };
    setModePack(pack);
    setViewedResult(null);
    setActiveRun(run);
    setView("hill");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseWinner(winnerId: string) {
    setActiveRun((run) => {
      if (!run || run.session.status !== "active") {
        return run;
      }
      const previous = snapshot(run.session);
      const session = cloneSession(run.session);
      const [first, second] = session.activePair;
      const loserId = first === winnerId ? second : first;
      const order = session.matches.length + 1;
      session.matches.push({
        id: `match-${crypto.randomUUID()}`,
        round: session.round,
        winnerId,
        loserId,
        order,
        carryMatch: session.isCarryMatch,
      });
      session.eliminated.push({ cardId: loserId, round: session.round, order });
      if (session.isCarryMatch) {
        const nextIds = [...session.roundWinners, winnerId];
        if (nextIds.length === 1) {
          session.status = "complete";
          session.championId = nextIds[0];
          return { session, undoStack: [...run.undoStack, previous] };
        }
        return {
          session: createRound(
            nextIds,
            session.packId,
            session.round + 1,
            session,
          ),
          undoStack: [...run.undoStack, previous],
        };
      }
      session.roundWinners.push(winnerId);
      if (session.pendingPairs.length) {
        session.activePair = session.pendingPairs.shift()!;
        return { session, undoStack: [...run.undoStack, previous] };
      }
      if (session.carryId) {
        const opponentIndex = Math.floor(
          Math.random() * session.roundWinners.length,
        );
        const [opponent] = session.roundWinners.splice(opponentIndex, 1);
        session.activePair = shuffle([opponent, session.carryId]) as [
          string,
          string,
        ];
        session.carryId = null;
        session.isCarryMatch = true;
        return { session, undoStack: [...run.undoStack, previous] };
      }
      if (session.roundWinners.length === 1) {
        session.status = "complete";
        session.championId = session.roundWinners[0];
        return { session, undoStack: [...run.undoStack, previous] };
      }
      return {
        session: createRound(
          session.roundWinners,
          session.packId,
          session.round + 1,
          session,
        ),
        undoStack: [...run.undoStack, previous],
      };
    });
  }

  function undo() {
    setActiveRun((run) => {
      if (!run || !run.undoStack.length || run.session.status === "complete") {
        return run;
      }
      const stack = [...run.undoStack];
      return { session: restore(run.session, stack.pop()!), undoStack: stack };
    });
  }

  function skip() {
    setActiveRun((run) => {
      if (!run || run.session.status !== "active") {
        return run;
      }
      const session = cloneSession(run.session);
      if (session.isCarryMatch || !session.pendingPairs.length) {
        session.activePair = [session.activePair[1], session.activePair[0]];
      } else {
        session.pendingPairs.push(session.activePair);
        session.activePair = session.pendingPairs.shift()!;
      }
      return { session, undoStack: [...run.undoStack, snapshot(run.session)] };
    });
  }

  const selectedPack = activeRun
    ? (packs.find((pack) => pack.id === activeRun.session.packId) ?? modePack)
    : modePack;

  return {
    activeRun,
    selectedPack,
    setActiveRun,
    setModePack,
    startPack,
    chooseWinner,
    undo,
    skip,
  };
}
