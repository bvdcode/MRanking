"use client";

import type { ActiveRun, Pack, SavedResult } from "../../../lib/types";
import { KingLibraryView } from "../modes/KingLibraryView";
import { BattleView } from "./BattleView";
import { ResultView } from "./ResultView";

export function TournamentFlow({
  packs,
  results,
  runs,
  activeRun,
  selectedPack,
  viewedResult,
  onBackModes,
  onUpload,
  onStart,
  onClearResult,
  onOpenResult,
  onDeleteResult,
  onCancelRun,
  onPick,
  onUndo,
  onReshuffle,
  onExitRun,
}: {
  packs: Pack[];
  results: SavedResult[];
  runs: Record<string, ActiveRun>;
  activeRun: ActiveRun | null;
  selectedPack: Pack | null;
  viewedResult: SavedResult | null;
  onBackModes: () => void;
  onUpload: () => void;
  onStart: (pack: Pack, resume?: boolean) => void;
  onClearResult: () => void;
  onOpenResult: (result: SavedResult) => void;
  onDeleteResult: (result: SavedResult) => void;
  onCancelRun: (pack: Pack) => void;
  onPick: (winnerId: string) => void;
  onUndo: () => void;
  onReshuffle: () => void;
  onExitRun: () => void;
}) {
  const archivedPack = viewedResult
    ? (viewedResult.pack ??
      packs.find((pack) => pack.id === viewedResult.packId) ??
      null)
    : null;

  if (!activeRun && viewedResult && archivedPack) {
    const currentPack = packs.find((pack) => pack.id === viewedResult.packId);
    return (
      <ResultView
        pack={archivedPack}
        run={{ session: viewedResult.session, undoStack: [] }}
        completedAt={viewedResult.completedAt}
        archived
        onAgain={currentPack ? () => onStart(currentPack) : undefined}
        onBack={onClearResult}
        onDelete={() => onDeleteResult(viewedResult)}
      />
    );
  }

  if (!activeRun && !viewedResult) {
    return (
      <KingLibraryView
        packs={packs}
        results={results}
        runs={runs}
        onBack={onBackModes}
        onPacks={onUpload}
        onStart={(pack) => onStart(pack)}
        onContinue={(pack) => onStart(pack, true)}
        onCancelRun={onCancelRun}
        onOpenResult={(result) => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          onOpenResult(result);
        }}
        onDeleteResult={onDeleteResult}
      />
    );
  }

  if (activeRun && selectedPack && activeRun.session.status === "active") {
    return (
      <BattleView
        pack={selectedPack}
        run={activeRun}
        onPick={onPick}
        onUndo={onUndo}
        onReshuffle={onReshuffle}
        onExit={onExitRun}
      />
    );
  }

  if (activeRun && selectedPack && activeRun.session.status === "complete") {
    return (
      <ResultView
        pack={selectedPack}
        run={activeRun}
        onAgain={() => onStart(selectedPack)}
        onBack={onExitRun}
      />
    );
  }

  return null;
}
