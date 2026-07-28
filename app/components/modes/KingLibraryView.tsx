"use client";

import type { ActiveRun, Pack, SavedResult } from "../../../lib/types";
import { isYouTubeSource, sourceName } from "../../domain/pack";
import { useI18n } from "../../i18n/I18nContext";
import { PackCover } from "../packs/PackCard";
import { FlowBack } from "../shared/FlowBack";
import { RemoteImage } from "../shared/RemoteImage";

export function KingLibraryView({
  packs,
  results,
  runs,
  onBack,
  onPacks,
  onStart,
  onContinue,
  onOpenResult,
  onDeleteResult,
}: {
  packs: Pack[];
  results: SavedResult[];
  runs: Record<string, ActiveRun>;
  onBack: () => void;
  onPacks: () => void;
  onStart: (pack: Pack) => void;
  onContinue: (pack: Pack) => void;
  onOpenResult: (result: SavedResult) => void;
  onDeleteResult: (result: SavedResult) => void;
}) {
  const { t, language } = useI18n();
  return (
    <section className="page-wrap library-view king-library-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>
            {t("King of the Hill")}
          </div>
          <h2>{t("Choose a pack")}</h2>
          <p>
            {t("Select one of your private packs to start the tournament.")}
          </p>
        </div>
      </div>
      {packs.length === 0 ? (
        <div className="empty-library">
          <span>＋</span>
          <h3>{t("No packs yet")}</h3>
          <p>{t("Upload a pack before starting a mode.")}</p>
          <button className="button primary" onClick={onPacks}>
            {t("Go to packs")}
          </button>
        </div>
      ) : (
        <div className="pack-grid mode-pack-grid">
          <button className="pack-tile add-pack-tile" onClick={onPacks}>
            <span className="add-pack-plus" aria-hidden="true">
              +
            </span>
            <strong>{t("Add a pack")}</strong>
            <small>{t("Upload or import a new pack.")}</small>
            <b aria-hidden="true">↗</b>
          </button>
          {packs.map((pack) => (
            <article className="pack-tile" key={pack.id}>
              <button
                className="pack-art"
                onClick={() =>
                  runs[pack.id] ? onContinue(pack) : onStart(pack)
                }
              >
                <PackCover pack={pack} />
                <div className="pack-play-overlay">
                  <span>{t(runs[pack.id] ? "Continue" : "PLAY NOW")}</span>
                  <b>↗</b>
                </div>
              </button>
              <div className="pack-tile-body">
                <div className="pack-meta">
                  <span>{t(sourceName(pack.sourceType))}</span>
                  <span>
                    {pack.itemCount}{" "}
                    {t(isYouTubeSource(pack.sourceType) ? "videos" : "tracks")}
                  </span>
                </div>
                <h3>{pack.name}</h3>
                <div className="pack-owner">
                  <span>by {pack.ownerNickname}</span>
                  <b>{new Date(pack.updatedAt).toLocaleDateString()}</b>
                </div>
                <div className="pack-actions mode-pack-actions">
                  {runs[pack.id] ? (
                    <button
                      className="continue"
                      onClick={() => onContinue(pack)}
                    >
                      {t("Continue")}
                    </button>
                  ) : (
                    <button onClick={() => onStart(pack)}>{t("Play")}</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {results.length > 0 && (
        <div className="result-history">
          <div className="section-line">
            <div>
              <h3>{t("Tournament history")}</h3>
              <p>{t("Open any completed run and inspect every battle.")}</p>
            </div>
            <span>{results.length}</span>
          </div>
          <div className="result-history-grid">
            {results.map((result) => {
              const pack =
                result.pack ??
                packs.find((item) => item.id === result.packId) ??
                null;
              const champion = pack?.items.find(
                (item) => item.id === result.championItemId,
              );
              if (!pack || !champion) {
                return null;
              }
              return (
                <article className="result-history-card" key={result.id}>
                  <button
                    className="result-history-open"
                    onClick={() => onOpenResult(result)}
                    aria-label={`${t("View bracket")}: ${pack.name}`}
                  >
                    <span className="result-history-art">
                      <RemoteImage src={champion.thumbnailUrl} alt="" />
                      <i>♛</i>
                    </span>
                    <span className="result-history-copy">
                      <small>
                        {new Date(result.completedAt).toLocaleDateString(
                          language === "ru"
                            ? "ru-RU"
                            : language === "uk"
                              ? "uk-UA"
                              : "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </small>
                      <strong>{pack.name}</strong>
                      <span>{champion.title}</span>
                      <b>{t("View bracket")} ↗</b>
                    </span>
                  </button>
                  <button
                    className="result-history-delete"
                    onClick={() => onDeleteResult(result)}
                    aria-label={`${t("Delete history")}: ${pack.name}`}
                    title={t("Delete history")}
                  >
                    ×
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
