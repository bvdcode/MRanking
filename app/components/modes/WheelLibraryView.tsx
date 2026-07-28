"use client";

import type { Pack, WheelMode, WheelResult, WheelRun } from "../../../lib/types";
import { isYouTubeSource, sourceName } from "../../domain/pack";
import { useI18n } from "../../i18n/I18nContext";
import { PackCover, PackTypeBadge } from "../packs/PackCard";
import { FlowBack } from "../shared/FlowBack";
import { RemoteImage } from "../shared/RemoteImage";

export type WheelLibraryViewProps = {
  packs: Pack[];
  runs?: Record<string, WheelRun>;
  results?: WheelResult[];
  onBack: () => void;
  onUpload: () => void;
  onStart: (pack: Pack) => void;
  onContinue: (pack: Pack, run: WheelRun) => void;
  onOpenResult?: (result: WheelResult) => void;
  onDeleteResult?: (result: WheelResult) => void;
};

function modeLabel(mode: WheelMode) {
  return mode === "lastOneStanding" ? "Last One Standing" : "Classic";
}

export function WheelLibraryView({
  packs,
  runs = {},
  results = [],
  onBack,
  onUpload,
  onStart,
  onContinue,
  onOpenResult,
  onDeleteResult,
}: WheelLibraryViewProps) {
  const { t, language } = useI18n();
  const locale =
    language === "ru" ? "ru-RU" : language === "uk" ? "uk-UA" : "en-GB";

  return (
    <section className="page-wrap library-view wheel-library-view">
      <FlowBack label="Back" onClick={onBack} />

      <div className="page-heading wheel-library-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>
            {t("Wheel")}
          </div>
          <h2>{t("Choose a pack")}</h2>
        </div>
      </div>

      <div className="pack-grid mode-pack-grid wheel-pack-grid">
        <button className="pack-tile add-pack-tile" onClick={onUpload}>
          <span className="add-pack-plus" aria-hidden="true">
            +
          </span>
          <strong>{t("Add a pack")}</strong>
          <small>{t("Upload or import a new pack.")}</small>
          <b aria-hidden="true">↗</b>
        </button>

        {packs.map((pack) => {
          const run = runs[pack.id];
          const openPack = () =>
            run ? onContinue(pack, run) : onStart(pack);

          return (
            <article
              className={`pack-tile wheel-pack-tile ${run ? "has-wheel-run" : ""}`}
              key={pack.id}
            >
              <button className="pack-art" onClick={openPack}>
                <PackCover pack={pack} />
                <PackTypeBadge />
                {run && (
                  <span className="wheel-resume-badge">
                    {t("IN PROGRESS")}
                  </span>
                )}
                <div className="pack-play-overlay">
                  <span>{t(run ? "Resume wheel" : "PLAY NOW")}</span>
                  <b>↗</b>
                </div>
              </button>

              <div className="pack-tile-body">
                <div className="pack-meta">
                  <span>{t(sourceName(pack.sourceType))}</span>
                  <span>
                    {pack.itemCount}{" "}
                    {t(
                      isYouTubeSource(pack.sourceType) ? "videos" : "tracks",
                    )}
                  </span>
                </div>
                <h3>{pack.name}</h3>
                <div className="pack-owner">
                  <span>by {pack.ownerNickname}</span>
                  <b>{new Date(pack.updatedAt).toLocaleDateString(locale)}</b>
                </div>
                <div className="pack-actions mode-pack-actions wheel-pack-actions">
                  <button
                    className={run ? "continue" : undefined}
                    onClick={openPack}
                  >
                    {t(run ? "Continue" : "Play")}
                  </button>
                  {run && (
                    <span className="wheel-run-mode">
                      {t(modeLabel(run.state.mode))}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {packs.length === 0 && (
        <div className="empty-library wheel-empty-library">
          <h3>{t("No packs yet")}</h3>
          <p>{t("Upload a pack before starting a mode.")}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="result-history wheel-result-history">
          <div className="section-line">
            <div>
              <h3>{t("Wheel history")}</h3>
              <p>{t("Open a saved wheel to revisit its winner and chances.")}</p>
            </div>
            <span>{results.length}</span>
          </div>

          <div className="result-history-grid wheel-history-grid">
            {results.map((result) => {
              const pack =
                result.pack ??
                packs.find((candidate) => candidate.id === result.packId) ??
                null;
              const winner =
                pack?.items.find((item) => item.id === result.winnerItemId) ??
                null;
              const canOpen = Boolean(onOpenResult);

              return (
                <article
                  className="result-history-card wheel-history-card"
                  key={result.id}
                >
                  <button
                    className="result-history-open"
                    onClick={() => onOpenResult?.(result)}
                    disabled={!canOpen}
                    aria-label={`${t("View wheel result")}: ${pack?.name ?? t("Deleted pack")}`}
                  >
                    <span className="result-history-art wheel-history-art">
                      {winner ? (
                        <RemoteImage src={winner.thumbnailUrl} alt="" />
                      ) : pack ? (
                        <PackCover pack={pack} />
                      ) : (
                        <span
                          className="wheel-history-placeholder"
                          aria-hidden="true"
                        >
                          ◉
                        </span>
                      )}
                      <i aria-hidden="true">◉</i>
                    </span>
                    <span className="result-history-copy">
                      <small>
                        {new Date(result.completedAt).toLocaleDateString(locale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </small>
                      <strong>{pack?.name ?? t("Deleted pack")}</strong>
                      <span>{winner?.title ?? t("Deleted track")}</span>
                      <em className="wheel-history-mode">
                        {t(modeLabel(result.mode))}
                      </em>
                      <b>{t("View result")} ↗</b>
                    </span>
                  </button>

                  {onDeleteResult && (
                    <button
                      className="result-history-delete"
                      onClick={() => onDeleteResult(result)}
                      aria-label={`${t("Delete history")}: ${pack?.name ?? t("Deleted pack")}`}
                      title={t("Delete history")}
                    >
                      ×
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
