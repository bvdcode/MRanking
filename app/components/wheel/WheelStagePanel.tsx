"use client";

import type { ReactNode, RefCallback } from "react";
import type { PackItem, WheelRun } from "../../../lib/types";
import {
  wheelEntryLabel,
  type WheelEntry,
  type WheelSegment,
  type WheelSpinSample,
} from "../../domain/wheel";
import { useI18n } from "../../i18n/I18nContext";

type WheelStagePanelProps = {
  run: WheelRun;
  entries: WheelEntry[];
  activeEntries: WheelEntry[];
  segments: WheelSegment[];
  landed: PackItem | null;
  winner: PackItem | null;
  archived: boolean;
  complete: boolean;
  spinning: boolean;
  spinPhase: WheelSpinSample["phase"] | "idle";
  showSoClose: boolean;
  wheelRotationRef: RefCallback<SVGGElement>;
  hoveredId: string | null;
  landedId: string | null;
  labelsVisible: boolean;
  toolbar?: ReactNode;
  onHover: (itemId: string | null) => void;
  onSpin: () => void | Promise<void>;
  onSkip: () => void;
  onToggleAuto: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetChances: () => void;
  onResetGame: () => void;
  onCancel?: () => void;
};

export function WheelStagePanel({
  run,
  entries,
  activeEntries,
  segments,
  landed,
  winner,
  archived,
  complete,
  spinning,
  spinPhase,
  showSoClose,
  wheelRotationRef,
  hoveredId,
  landedId,
  labelsVisible,
  toolbar,
  onHover,
  onSpin,
  onSkip,
  onToggleAuto,
  onUndo,
  onRedo,
  onResetChances,
  onResetGame,
  onCancel,
}: WheelStagePanelProps) {
  const { t } = useI18n();
  const landedColor = landed
    ? entries.find((entry) => entry.itemId === landed.id)?.color
    : undefined;
  const actionsVisible =
    !archived &&
    (run.state.status === "active" ||
      (run.state.mode === "lastOneStanding" &&
        run.state.undoStack.length > 0));
  const sideVisible = Boolean(
    toolbar ||
      (landed && !complete) ||
      actionsVisible ||
      !labelsVisible,
  );
  return (
    <aside className="wheel-stage-panel">
      <div className={`wheel-stage-layout ${sideVisible ? "" : "stage-only"}`}>
        <div className="wheel-stage-column">
          <div
            className={`wheel-stage ${spinning ? "spinning" : ""} ${showSoClose ? "suspense" : ""} ${landedId ? "landed" : ""}`}
            data-spin-phase={spinPhase}
          >
        <span className="wheel-pointer" aria-hidden="true">
          <i />
        </span>
        <svg
          viewBox="0 0 500 500"
          role="img"
          aria-label={t("Weighted selection wheel")}
        >
          <circle className="wheel-shadow" cx="250" cy="250" r="244" />
          <g ref={wheelRotationRef}>
            {segments.map((segment) => {
              const highlighted =
                hoveredId === segment.entry.itemId ||
                landedId === segment.entry.itemId;
              const muted =
                complete && segment.entry.itemId !== winner?.id;
              return (
                <path
                  key={segment.entry.itemId}
                  d={segment.path}
                  fill={segment.entry.color}
                  className={`${highlighted ? "highlighted" : ""} ${muted ? "muted" : ""}`}
                  onMouseEnter={() => onHover(segment.entry.itemId)}
                  onMouseLeave={() => onHover(null)}
                />
              );
            })}
            {labelsVisible &&
              segments.map((segment) => (
                <text
                  key={`label-${segment.entry.itemId}`}
                  x={segment.labelX}
                  y={segment.labelY}
                  transform={`rotate(${segment.labelRotation} ${segment.labelX} ${segment.labelY})`}
                  textAnchor="middle"
                  className={
                    hoveredId === segment.entry.itemId ? "highlighted" : ""
                  }
                >
                  {truncateLabel(
                    wheelEntryLabel(segment.entry),
                    segment.sweepAngle,
                  )}
                </text>
              ))}
          </g>
        </svg>

        <div
          className={`wheel-so-close ${showSoClose ? "visible" : ""}`}
          role="status"
          aria-hidden={!showSoClose}
        >
          <b>{t("SO CLOSE")}</b>
          <small>{t("LAST SECONDS")}</small>
        </div>

        {!archived && run.state.status === "active" && (
          <button
            className="wheel-spin-button"
            disabled={spinning || activeEntries.length < 2}
            onClick={() => void onSpin()}
          >
            <span>
              {spinning ? t("SPINNING") : t("SPIN")}
            </span>
            <small>
              {`${activeEntries.length} ${t("ENTRIES")}`}
            </small>
          </button>
        )}
        {complete && winner && (
          <div className="wheel-center-winner">
            <span>★</span>
            <small>{t("WINNER")}</small>
          </div>
        )}
          </div>
        </div>

        {sideVisible && (
          <div className="wheel-stage-side">
            {toolbar}
            {landed && !complete && (
              <div className="wheel-landed-card" role="status">
                <span aria-hidden="true">
                  <svg viewBox="0 0 10 78" preserveAspectRatio="none">
                    <rect
                      width="10"
                      height="78"
                      fill={landedColor ?? "#b8ff2c"}
                    />
                  </svg>
                </span>
                <div>
                  <small>{t("REMOVED")}</small>
                  <b>{landed.title}</b>
                  <p>{landed.channel}</p>
                </div>
              </div>
            )}

            {actionsVisible && (
              <div
                className={`wheel-actions-panel ${run.state.status === "complete" ? "completed" : ""}`}
              >
          {run.state.status === "active" && (spinning ? (
            <>
              <button className="wheel-skip-spin" onClick={onSkip}>
                {t("SKIP SPINNING")}
              </button>
              {run.state.mode === "lastOneStanding" && run.state.auto && (
                <button className="wheel-auto active" onClick={onToggleAuto}>
                  <span>Ⅱ</span>
                  {t("PAUSE AUTO")}
                </button>
              )}
            </>
          ) : run.state.mode === "lastOneStanding" ? (
            <button
              className={`wheel-auto ${run.state.auto ? "active" : ""}`}
              onClick={onToggleAuto}
            >
              <span>{run.state.auto ? "Ⅱ" : "▶"}</span>
              {t(run.state.auto ? "PAUSE AUTO" : "AUTO")}
            </button>
          ) : (
            <span />
          ))}
          <div className="wheel-history-controls">
            <button
              disabled={spinning || run.state.undoStack.length === 0}
              onClick={onUndo}
            >
              ↶ {t("Undo")}
            </button>
            <button
              disabled={spinning || run.state.redoStack.length === 0}
              onClick={onRedo}
            >
              {t("Redo")} ↷
            </button>
          </div>
          {run.state.status === "active" && (
            <>
              <button disabled={spinning} onClick={onResetChances}>
                {t("RESET CHANCES")}
              </button>
              <button disabled={spinning} onClick={onResetGame}>
                {t("RESET RUN")}
              </button>
              {onCancel && (
                <button className="danger" disabled={spinning} onClick={onCancel}>
                  {t("CANCEL RUN")}
                </button>
              )}
            </>
          )}
              </div>
            )}

            {!labelsVisible && (
              <small className="wheel-label-note">
                {t("Labels are hidden above 64 entries.")}
              </small>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function truncateLabel(value: string, sweepAngle: number) {
  const maximum = sweepAngle < 8 ? 12 : sweepAngle < 16 ? 18 : 26;
  return value.length > maximum
    ? `${value.slice(0, Math.max(3, maximum - 1))}…`
    : value;
}
