"use client";

import type {
  Pack,
  WheelResult,
  WheelRun,
  WheelSettings,
} from "../../../lib/types";
import { WheelLibraryView } from "../modes/WheelLibraryView";
import { WheelView, wheelResultAsRun } from "./WheelView";

export function WheelFlow({
  packs,
  runs,
  results,
  settings,
  activeRun,
  selectedPack,
  viewedResult,
  onViewedResult,
  onBackToModes,
  onUpload,
  onStart,
  onRunChange,
  onSettings,
  onLeave,
  onCancel,
  onDeleteResult,
}: {
  packs: Pack[];
  runs: Record<string, WheelRun>;
  results: WheelResult[];
  settings: WheelSettings;
  activeRun: WheelRun | null;
  selectedPack: Pack | null;
  viewedResult: WheelResult | null;
  onViewedResult: (result: WheelResult | null) => void;
  onBackToModes: () => void;
  onUpload: () => void;
  onStart: (pack: Pack, resume?: boolean) => void;
  onRunChange: (run: WheelRun | null) => void;
  onSettings: (settings: WheelSettings) => void;
  onLeave: () => void;
  onCancel: (pack: Pack) => void;
  onDeleteResult: (result: WheelResult) => void;
}) {
  if (activeRun && selectedPack) {
    return (
      <WheelView
        pack={selectedPack}
        run={activeRun}
        settings={settings}
        onChange={onRunChange}
        onSettings={onSettings}
        onBack={onLeave}
        onCancel={() => onCancel(selectedPack)}
      />
    );
  }

  if (viewedResult) {
    return (
      <WheelView
        pack={viewedResult.pack}
        run={wheelResultAsRun(viewedResult)}
        settings={settings}
        archived
        completedAt={viewedResult.completedAt}
        onBack={() => onViewedResult(null)}
        onSettings={onSettings}
      />
    );
  }

  return (
    <WheelLibraryView
      packs={packs}
      runs={runs}
      results={results}
      onBack={onBackToModes}
      onUpload={onUpload}
      onStart={(pack) => onStart(pack)}
      onContinue={(pack) => onStart(pack, true)}
      onOpenResult={onViewedResult}
      onDeleteResult={onDeleteResult}
    />
  );
}
