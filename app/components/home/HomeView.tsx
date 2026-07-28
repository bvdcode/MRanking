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
      <TournamentVisual />
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

function TournamentVisual() {
  const { t } = useI18n();
  const labels = [
    "NIGHT DRIVE",
    "B-SIDE",
    "FAVOURITE",
    "DEEP CUT",
    "WILDCARD",
    "ANTHEM",
    "CLASSIC",
    "NEW ONE",
  ];
  return (
    <div
      className="tournament-visual"
      aria-label={t("Animated tournament bracket")}
    >
      <span className="visual-caption">{t("LIVE BRACKET / 64 ENTRIES")}</span>
      <div className="source-disc">
        <span>64</span>
        <small>{t("ITEMS")}</small>
      </div>
      <div className="visual-round round-a">
        {labels.map((label, index) => (
          <div className={`visual-delay-${index}`} key={label}>
            <i className={`neutral-thumb neutral-${index % 4}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="visual-connectors one" />
      <div className="visual-round round-b">
        {["NIGHT DRIVE", "FAVOURITE", "ANTHEM", "CLASSIC"].map(
          (label, index) => (
            <div key={label}>
              <i className={`neutral-thumb neutral-${index}`} />
              <span>{label}</span>
            </div>
          ),
        )}
      </div>
      <div className="visual-connectors two" />
      <div className="visual-final">
        <span>♛</span>
        <b>{t("THE ONE")}</b>
      </div>
    </div>
  );
}
