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
      <ChoicePreview />
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

function ChoicePreview() {
  const { t } = useI18n();
  return (
    <div
      className="choice-preview"
      aria-label={t("Choose the one that stays")}
    >
      <header className="preview-head">
        <span>{t("COMPARE")}</span>
        <b>05 / 32</b>
      </header>
      <div className="preview-duel">
        {["one", "two"].map((variant, index) => (
          <article className={`preview-option preview-option-${variant}`} key={variant}>
            <div className="preview-art" aria-hidden="true">
              <span>0{index + 1}</span>
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="preview-track-lines" aria-hidden="true">
              <b />
              <i />
            </div>
            <div className="preview-pick">
              <span>{t("Choose this")}</span>
              <b>↗</b>
            </div>
          </article>
        ))}
        <div className="preview-vs" aria-hidden="true">VS</div>
      </div>
      <div className="preview-ranking">
        <header>
          <span>{t("Full ranking")}</span>
          <b>{t("READY")}</b>
        </header>
        {[96, 84, 71].map((score, index) => (
          <div className={`preview-rank-row preview-rank-${index + 1}`} key={score}>
            <strong>0{index + 1}</strong>
            <i aria-hidden="true" />
            <span aria-hidden="true">
              <b />
              <small />
            </span>
            <em>{score}</em>
          </div>
        ))}
      </div>
    </div>
  );
}
