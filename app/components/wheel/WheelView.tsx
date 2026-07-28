"use client";

import { useMemo } from "react";
import type {
  Pack,
  WheelRun,
  WheelSettings,
} from "../../../lib/types";
import { buildWheelSegments } from "../../domain/wheel";
import { hydrateWheelEntries, withWheelState } from "../../domain/wheelState";
import { FlowBack } from "../shared/FlowBack";
import { WheelHeader, WheelToolbar, WheelWinner } from "./WheelChrome";
import { WheelEntryPanel } from "./WheelEntryPanel";
import { WheelStagePanel } from "./WheelStagePanel";
import { useWheelEditor } from "./useWheelEditor";
import { useWheelSpin } from "./useWheelSpin";

type WheelViewProps = {
  pack: Pack;
  run: WheelRun;
  settings: WheelSettings;
  archived?: boolean;
  completedAt?: string;
  onChange?: (run: WheelRun) => void;
  onSettings?: (settings: WheelSettings) => void;
  onBack: () => void;
  onCancel?: () => void;
};

export function WheelView({
  pack,
  run,
  settings,
  archived = false,
  completedAt,
  onChange,
  onSettings,
  onBack,
  onCancel,
}: WheelViewProps) {
  const entries = useMemo(
    () => hydrateWheelEntries(pack, run.state.entries),
    [pack, run.state.entries],
  );
  const segments = useMemo(
    () =>
      buildWheelSegments(entries, {
        centerX: 250,
        centerY: 250,
        radius: 242,
      }),
    [entries],
  );
  const itemById = useMemo(
    () => new Map(pack.items.map((item) => [item.id, item])),
    [pack.items],
  );
  const spinState = useWheelSpin({
    run,
    entries,
    settings,
    archived,
    onChange,
  });
  const editor = useWheelEditor({
    pack,
    run,
    entries,
    settings,
    archived,
    spinning: spinState.spinning,
    onChange,
    onSettings,
  });
  const winner = run.state.winnerItemId
    ? itemById.get(run.state.winnerItemId) ?? null
    : null;
  const landed = spinState.landedId
    ? itemById.get(spinState.landedId) ?? null
    : null;
  const availableCount = entries.filter((entry) => !entry.eliminated).length;
  const labelsVisible = editor.activeEntries.length <= 64;
  const complete = run.state.status === "complete" && Boolean(winner);
  const eliminatedCount = entries.filter((entry) => entry.eliminated).length;

  function goBack() {
    spinState.cancelAnimation();
    onBack();
  }

  function startSpin() {
    editor.setPlayerOpen(false);
    return spinState.spin();
  }

  function toggleAuto() {
    onChange?.(withWheelState(run, { auto: !run.state.auto }));
  }

  return (
    <section className={`wheel-view ${archived ? "archived" : ""}`}>
      <FlowBack label="Back" onClick={goBack} />

      <WheelHeader
        pack={pack}
        run={run}
        archived={archived}
        completedAt={completedAt}
        activeCount={editor.activeEntries.length}
        eliminatedCount={eliminatedCount}
      />

      {complete && winner && (
        <WheelWinner
          pack={pack}
          winner={winner}
          archived={archived}
          playerOpen={editor.playerOpen}
          onTogglePlayer={() => editor.setPlayerOpen((open) => !open)}
          onPlayAgain={editor.playAgain}
        />
      )}

      <div className="wheel-workspace">
        <WheelEntryPanel
          run={run}
          visibleEntries={editor.visibleEntries}
          itemById={itemById}
          activeCount={editor.activeEntries.length}
          availableCount={availableCount}
          archived={archived}
          spinning={spinState.spinning}
          query={editor.query}
          sort={editor.sort}
          chanceDrafts={editor.chanceDrafts}
          hoveredId={editor.hoveredId}
          landedId={spinState.landedId}
          onQuery={editor.setQuery}
          onSort={editor.setSort}
          onHover={editor.setHoveredId}
          onToggle={editor.toggleEntry}
          onQuickSelect={editor.quickSelect}
          onChanceDraft={editor.setChanceDraft}
          onChanceDiscard={editor.discardChanceDraft}
          onChanceCommit={editor.commitChanceDraft}
        />

        <WheelStagePanel
          run={run}
          entries={entries}
          activeEntries={editor.activeEntries}
          segments={segments}
          landed={landed}
          winner={winner}
          archived={archived}
          complete={complete}
          spinning={spinState.spinning}
          spinPhase={spinState.spinPhase}
          showSoClose={spinState.showSoClose}
          wheelRotationRef={spinState.wheelRotationRef}
          hoveredId={editor.hoveredId}
          landedId={spinState.landedId}
          labelsVisible={labelsVisible}
          toolbar={
            !archived && run.state.status === "active" ? (
              <WheelToolbar
                run={run}
                settings={settings}
                spinning={spinState.spinning}
                onMode={editor.changeMode}
                onSettings={editor.updateSettings}
              />
            ) : undefined
          }
          onHover={editor.setHoveredId}
          onSpin={startSpin}
          onSkip={spinState.skipSpinning}
          onToggleAuto={toggleAuto}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onResetChances={editor.resetChances}
          onResetGame={editor.resetGame}
          onCancel={onCancel}
        />
      </div>
    </section>
  );
}

export { wheelResultAsRun } from "./wheelRunAdapter";
