"use client";

import { useI18n } from "../../i18n/I18nContext";

export function HomeView({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return (
    <section className="new-home">
      <div className="home-copy">
        <div className="eyebrow">
          <span>●</span>
          {t("TOURNAMENT ENGINE")}
        </div>
        <h1>
          {t("Rate it.")}
          <br />
          {t("Run it.")}
          <br />
          <em>{t("Crown it.")}</em>
        </h1>
        <button className="button primary jumbo" onClick={onStart}>
          {t("Start a tournament")}
          <span>↗</span>
        </button>
      </div>
      <RankingStudio />
      <div className="home-flow">
        <span>01 {t("UPLOAD")}</span>
        <i>→</i>
        <span>02 {t("SPLIT")}</span>
        <i>→</i>
        <span>03 {t("COMPARE")}</span>
        <i>→</i>
        <span>04 {t("CROWN")}</span>
      </div>
    </section>
  );
}

function RankingStudio() {
  const { t } = useI18n();
  const modes = [
    { icon: "VS", label: "Versus" },
    { icon: "T", label: "Tier List" },
    { icon: "★", label: "Score Everything" },
    { icon: "?", label: "Blind Ranking" },
  ];
  return (
    <div
      className="ranking-studio"
      aria-label={t("One pack, many ranking modes")}
    >
      <span className="studio-caption">{t("ONE PACK / MANY WAYS")}</span>
      <div className="studio-input">
        <div className="studio-media-stack" aria-hidden="true">
          <i className="studio-media-card studio-media-one" />
          <i className="studio-media-card studio-media-two" />
          <i className="studio-media-card studio-media-three" />
        </div>
        <div className="studio-pack-core">
          <small>{t("MY PACK")}</small>
          <span>64</span>
          <b>{t("ITEMS")}</b>
        </div>
      </div>
      <div className="studio-switch" aria-hidden="true">
        <i />
        <span>+</span>
        <i />
      </div>
      <div className="studio-modes">
        {modes.map((mode, index) => (
          <div
            className={`studio-mode-card studio-mode-${index + 1}`}
            key={mode.label}
          >
            <i>{mode.icon}</i>
            <span>0{index + 1}</span>
            <b>{t(mode.label)}</b>
          </div>
        ))}
      </div>
      <div className="studio-status">
        <span>{t("UPLOAD ONCE")}</span>
        <b>{t("PLAY IT YOUR WAY")}</b>
        <i>{t("READY")}</i>
      </div>
    </div>
  );
}
