"use client";

import { useEffect, useState } from "react";
import type { ActiveRun, Pack, PackItem, SourceType } from "../../../lib/types";
import { mediaEmbedUrl } from "../../domain/pack";
import { useI18n } from "../../i18n/I18nContext";
import { FlowBack } from "../shared/FlowBack";
import { RemoteImage } from "../shared/RemoteImage";

export function BattleView({
  pack,
  run,
  onPick,
  onUndo,
  onSkip,
  onExit,
}: {
  pack: Pack;
  run: ActiveRun;
  onPick: (id: string) => void;
  onUndo: () => void;
  onSkip: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState<string | null>(null);
  const left = pack.items.find(
    (item) => item.id === run.session.activePair[0],
  )!;
  const right = pack.items.find(
    (item) => item.id === run.session.activePair[1],
  )!;
  const decided =
    run.session.roundWinners.length +
    run.session.matches.filter((match) => match.round === run.session.round)
      .length;
  const total = Math.max(1, Math.ceil(run.session.roundStartCount / 2));
  const progress = Math.min(100, (decided / total) * 100);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (event.key.toLowerCase() === "a") {
        onPick(left.id);
      }
      if (event.key.toLowerCase() === "b") {
        onPick(right.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [left.id, right.id, onPick]);
  return (
    <section className="battle-view">
      <FlowBack label="Back" onClick={onExit} />
      <div className="battle-topline">
        <span aria-hidden="true" />
        <div>
          <span>{t("ROUND {count}", { count: run.session.round })}</span>
          <b>
            {run.session.roundStartCount} →{" "}
            {Math.floor(run.session.roundStartCount / 2)}
          </b>
        </div>
        <span>{pack.name}</span>
      </div>
      <progress
        aria-label={t("Full tournament bracket")}
        className="round-meter"
        max={100}
        value={progress}
      />
      <div className="battle-title">
        <h2>{t("Choose the one that stays")}</h2>
      </div>
      <div className="duel-board">
        <TrackChoice
          item={left}
          sourceType={pack.sourceType}
          keyName="A"
          playing={playing === left.id}
          onPlay={() => setPlaying(playing === left.id ? null : left.id)}
          onPick={() => {
            setPlaying(null);
            onPick(left.id);
          }}
        />
        <div className="duel-vs">
          <span>VS</span>
          <i>
            {run.session.isCarryMatch
              ? t("PLAYOFF")
              : t("{count} LEFT", {
                  count: run.session.pendingPairs.length + 1,
                })}
          </i>
        </div>
        <TrackChoice
          item={right}
          sourceType={pack.sourceType}
          keyName="B"
          playing={playing === right.id}
          onPlay={() => setPlaying(playing === right.id ? null : right.id)}
          onPick={() => {
            setPlaying(null);
            onPick(right.id);
          }}
        />
      </div>
      <div className="battle-controls">
        <button disabled={!run.undoStack.length} onClick={onUndo}>
          {t("Undo")}
        </button>
        <button onClick={onSkip}>{t("Skip pair")}</button>
      </div>
    </section>
  );
}

function TrackChoice({
  item,
  sourceType,
  keyName,
  playing,
  onPlay,
  onPick,
}: {
  item: PackItem;
  sourceType: SourceType;
  keyName: string;
  playing: boolean;
  onPlay: () => void;
  onPick: () => void;
}) {
  const { t } = useI18n();
  return (
    <article className="track-choice">
      <span className="choice-key">{keyName}</span>
      <div className="track-media">
        {playing ? (
          <iframe
            src={mediaEmbedUrl(sourceType, item)}
            title={item.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <RemoteImage src={item.thumbnailUrl} alt="" />
        )}
        <button className="media-play" onClick={onPlay}>
          {playing ? t("Close player") : t("Play track")}
          <span>{playing ? "×" : "▶"}</span>
        </button>
      </div>
      <div className="track-info">
        <div>
          <h3>{item.title}</h3>
          <p>
            {item.channel}
            {item.duration ? ` · ${item.duration}` : ""}
          </p>
        </div>
        <a
          href={item.youtubeUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={t("Open in music service")}
        >
          ↗
        </a>
      </div>
      <button className="choose-track" onClick={onPick}>
        {t("Choose this")}
        <span>↗</span>
      </button>
    </article>
  );
}
