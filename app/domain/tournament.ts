import type { Session, UndoSnapshot } from "../../lib/types";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function createRound(
  ids: string[],
  packId: string,
  round = 1,
  base?: Pick<Session, "id" | "matches" | "eliminated" | "startedAt">,
): Session {
  const shuffled = shuffle(ids);
  const carryId = shuffled.length % 2 === 1 ? (shuffled.pop() ?? null) : null;
  const pairs: [string, string][] = [];
  for (let index = 0; index < shuffled.length; index += 2) {
    pairs.push([shuffled[index], shuffled[index + 1]]);
  }
  const activePair = pairs.shift();
  if (!activePair) {
    throw new Error("A round needs at least two items");
  }
  return {
    id: base?.id ?? `run-${crypto.randomUUID()}`,
    packId,
    round,
    roundStartCount: ids.length,
    activePair,
    pendingPairs: pairs,
    roundWinners: [],
    carryId,
    isCarryMatch: false,
    matches: base?.matches ?? [],
    eliminated: base?.eliminated ?? [],
    startedAt: base?.startedAt ?? new Date().toISOString(),
    status: "active",
    championId: null,
  };
}

export function snapshot(session: Session): UndoSnapshot {
  return {
    round: session.round,
    roundStartCount: session.roundStartCount,
    activePair: [...session.activePair],
    pendingPairs: session.pendingPairs.map(
      (pair) => [...pair] as [string, string],
    ),
    roundWinners: [...session.roundWinners],
    carryId: session.carryId,
    isCarryMatch: session.isCarryMatch,
    matchCount: session.matches.length,
    eliminationCount: session.eliminated.length,
    status: session.status,
    championId: session.championId,
  };
}

export function restore(session: Session, state: UndoSnapshot): Session {
  return {
    ...session,
    round: state.round,
    roundStartCount: state.roundStartCount,
    activePair: [...state.activePair],
    pendingPairs: state.pendingPairs.map(
      (pair) => [...pair] as [string, string],
    ),
    roundWinners: [...state.roundWinners],
    carryId: state.carryId,
    isCarryMatch: state.isCarryMatch,
    matches: session.matches.slice(0, state.matchCount),
    eliminated: session.eliminated.slice(0, state.eliminationCount),
    status: state.status,
    championId: state.championId,
  };
}

export function cloneSession(session: Session): Session {
  return JSON.parse(JSON.stringify(session)) as Session;
}
