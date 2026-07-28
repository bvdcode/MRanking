"use client";

import type { ActiveRun, Pack } from "../../../lib/types";
import { sourceName } from "../../domain/pack";
import { useI18n } from "../../i18n/I18nContext";
import { FlowBack } from "../shared/FlowBack";
import { RemoteImage } from "../shared/RemoteImage";
import { TournamentBracket } from "./TournamentBracket";

export function ResultView({
  pack,
  run,
  onAgain,
  onBack,
  onDelete,
  archived = false,
  completedAt,
}: {
  pack: Pack;
  run: ActiveRun;
  onAgain?: () => void;
  onBack: () => void;
  onDelete?: () => void;
  archived?: boolean;
  completedAt?: string;
}) {
  const { t, language } = useI18n();
  const champion = pack.items.find(
    (item) => item.id === run.session.championId,
  )!;
  const rankingIds = [
    champion.id,
    ...[...run.session.eliminated]
      .sort((a, b) => b.round - a.round || b.order - a.order)
      .map((item) => item.cardId),
  ];
  return (
    <section className="page-wrap result-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="result-stage">
        <div className="winner-copy">
          <div className="eyebrow">
            <span>●</span>
            {t(archived ? "Archived result" : "We have a winner")}
          </div>
          <h2>{t("Long live the champion.")}</h2>
          {completedAt && (
            <p className="result-completed">
              {t("Completed")} ·{" "}
              {new Date(completedAt).toLocaleString(
                language === "ru"
                  ? "ru-RU"
                  : language === "uk"
                    ? "uk-UA"
                    : "en-GB",
                { dateStyle: "long", timeStyle: "short" },
              )}
            </p>
          )}
          <div className="result-actions">
            {onAgain && (
              <button className="button primary" onClick={onAgain}>
                {t("Play again")}
              </button>
            )}
            {archived && onDelete && (
              <button className="button danger" onClick={onDelete}>
                {t("Delete history")}
              </button>
            )}
          </div>
        </div>
        <article className="winner-card">
          <span className="winner-crown">♛</span>
          <RemoteImage src={champion.thumbnailUrl} alt="" />
          <div>
            <b>{champion.title}</b>
            <small>{champion.channel}</small>
          </div>
          <a href={champion.youtubeUrl} target="_blank" rel="noreferrer">
            {t(sourceName(pack.sourceType))} ↗
          </a>
        </article>
      </div>
      <TournamentBracket pack={pack} session={run.session} />
      <div className="ranking-panel">
        <div className="section-line">
          <h3>{t("Full ranking")}</h3>
          <span>{rankingIds.length}</span>
        </div>
        {rankingIds.map((id, index) => {
          const item = pack.items.find((entry) => entry.id === id);
          if (!item) return null;
          return (
            <div className={`rank-row ${index === 0 ? "winner" : ""}`} key={id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <RemoteImage src={item.thumbnailUrl} alt="" />
              <p>
                <b>{item.title}</b>
                <small>{item.channel}</small>
              </p>
              {index === 0 && <i>♛</i>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
