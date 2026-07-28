"use client";

import type {
  Pack,
  PackItem,
  WheelMode,
  WheelRun,
  WheelSettings,
} from "../../../lib/types";
import { useI18n } from "../../i18n/I18nContext";
import { MediaPlayer } from "../shared/MediaPlayer";
import { RemoteImage } from "../shared/RemoteImage";

type WheelHeaderProps = {
  pack: Pack;
  run: WheelRun;
  archived: boolean;
  completedAt?: string;
  activeCount: number;
  eliminatedCount: number;
};

export function WheelHeader({
  pack,
  run,
  archived,
  completedAt,
  activeCount,
  eliminatedCount,
}: WheelHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="wheel-page-header">
      <div>
        <span className="eyebrow">
          <i aria-hidden="true" />
          {t(archived ? "Saved wheel" : "Wheel")}
        </span>
        <h2>{pack.name}</h2>
        {completedAt && <small>{new Date(completedAt).toLocaleString()}</small>}
      </div>
      <div className="wheel-head-stats">
        <span>
          <b>{activeCount}</b>
          {t("ACTIVE")}
        </span>
        {run.state.mode === "lastOneStanding" && (
          <span>
            <b>{eliminatedCount}</b>
            {t("OUT")}
          </span>
        )}
      </div>
    </header>
  );
}

type WheelToolbarProps = {
  run: WheelRun;
  settings: WheelSettings;
  spinning: boolean;
  onMode: (mode: WheelMode) => void;
  onSettings: (settings: Partial<WheelSettings>) => void;
};

export function WheelToolbar({
  run,
  settings,
  spinning,
  onMode,
  onSettings,
}: WheelToolbarProps) {
  const { t } = useI18n();
  return (
    <div className="wheel-toolbar">
      <div
        className="wheel-mode-switch"
        role="group"
        aria-label={t("Wheel mode")}
      >
        <button
          className={run.state.mode === "classic" ? "selected" : ""}
          disabled={spinning}
          onClick={() => onMode("classic")}
        >
          <b>{t("Classic")}</b>
          <small>{t("One spin. One winner.")}</small>
        </button>
        <button
          className={
            run.state.mode === "lastOneStanding" ? "selected" : ""
          }
          disabled={spinning}
          onClick={() => onMode("lastOneStanding")}
        >
          <b>{t("Last One Standing")}</b>
          <small>{t("Remove each result until one remains.")}</small>
        </button>
      </div>

      <label className="wheel-duration-control">
        <span>{t("Spin duration")}</span>
        <span>
          <input
            key={settings.durationSeconds}
            type="number"
            min={3}
            max={180}
            defaultValue={settings.durationSeconds}
            disabled={spinning}
            onBlur={(event) =>
              onSettings({ durationSeconds: Number(event.target.value) })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
          <b>{t("SEC")}</b>
        </span>
      </label>

      <div className="wheel-sound-control">
        <button
          className={settings.soundEnabled ? "enabled" : ""}
          onClick={() =>
            onSettings({ soundEnabled: !settings.soundEnabled })
          }
        >
          <span aria-hidden="true">
            {settings.soundEnabled ? "♪" : "×"}
          </span>
          {t(settings.soundEnabled ? "SOUND ON" : "SOUND OFF")}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          disabled={!settings.soundEnabled}
          aria-label={t("Volume")}
          onChange={(event) => onSettings({ volume: Number(event.target.value) })}
        />
      </div>
    </div>
  );
}

type WheelWinnerProps = {
  pack: Pack;
  winner: PackItem;
  archived: boolean;
  playerOpen: boolean;
  onTogglePlayer: () => void;
  onPlayAgain: () => void;
};

export function WheelWinner({
  pack,
  winner,
  archived,
  playerOpen,
  onTogglePlayer,
  onPlayAgain,
}: WheelWinnerProps) {
  const { t } = useI18n();
  return (
    <section className="wheel-winner-banner">
      <div className="wheel-winner-thumb">
        <RemoteImage src={winner.thumbnailUrl} alt="" />
        <span aria-hidden="true">★</span>
      </div>
      <div>
        <small>{t("THE WHEEL CHOSE")}</small>
        <h3>{winner.title}</h3>
        <p>{winner.channel}</p>
      </div>
      <div className="wheel-winner-actions">
        <button className="button primary" onClick={onTogglePlayer}>
          {t(playerOpen ? "Close player" : "Play winner")}
        </button>
        {!archived && (
          <button className="button ghost" onClick={onPlayAgain}>
            {t("Spin this pack again")}
          </button>
        )}
      </div>
      {playerOpen && (
        <div className="wheel-winner-player">
          <MediaPlayer item={winner} sourceType={pack.sourceType} />
        </div>
      )}
    </section>
  );
}
