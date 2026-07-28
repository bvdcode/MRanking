"use client";

import { useI18n } from "../../i18n/I18nContext";
import { FlowBack } from "../shared/FlowBack";
import { MUSIC_SERVICE_TILES, SOURCE_TILES } from "./constants";
import type { MusicSource } from "./constants";

type MusicSourceChooserProps = {
  category: "music" | null;
  source: MusicSource | null;
  onChooseCategory: () => void;
  onChooseSource: (source: MusicSource) => void;
  onBack: () => void;
};

export function MusicSourceChooser({
  category,
  source,
  onChooseCategory,
  onChooseSource,
  onBack,
}: MusicSourceChooserProps) {
  const { t } = useI18n();

  if (!category) {
    return (
      <div className="source-grid">
        {SOURCE_TILES.map((tile) => (
          <button
            key={tile.id}
            className={`source-tile ${tile.live ? "live" : "locked"}`}
            onClick={tile.live ? onChooseCategory : undefined}
            disabled={!tile.live}
          >
            <span className="source-status">
              {t(tile.live ? "WORKS NOW" : "COMING SOON")}
            </span>
            <i>{tile.icon}</i>
            <h3>{t(tile.title)}</h3>
            <b>{tile.live ? "↗" : "· · ·"}</b>
          </button>
        ))}
      </div>
    );
  }

  if (source) {
    return null;
  }

  return (
    <div className="music-service-stage">
      <FlowBack label="Back" onClick={onBack} />
      <div className="service-heading">
        <span className="modal-kicker">02 / {t("Music Service")}</span>
        <h3>{t("Choose a music service")}</h3>
        <p>{t("Select where your playlist lives.")}</p>
      </div>
      <div className="source-grid music-service-grid">
        {MUSIC_SERVICE_TILES.map((tile) => (
          <button
            key={tile.id}
            className={`source-tile ${tile.live ? "live" : "locked"}`}
            onClick={
              tile.live ? () => onChooseSource(tile.id) : undefined
            }
            disabled={!tile.live}
          >
            <span className="source-status">
              {t(tile.live ? "WORKS NOW" : "COMING SOON")}
            </span>
            <i>{tile.icon}</i>
            <h3>{t(tile.title)}</h3>
            <b>{tile.live ? "↗" : "· · ·"}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
