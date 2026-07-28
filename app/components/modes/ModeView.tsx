"use client";

import type { Pack } from "../../../lib/types";
import { useI18n } from "../../i18n/I18nContext";
import { PackCover } from "../packs/PackCard";
import { FlowBack } from "../shared/FlowBack";

const MODES = [
  {
    id: "king",
    title: "King of the Hill",
    icon: "♛",
    copy: "Pick one of two until only one remains.",
    live: true,
  },
  {
    id: "wheel",
    title: "Wheel",
    icon: "◉",
    copy: "Spin weighted chances and let the wheel decide.",
    live: true,
  },
  {
    id: "tier",
    title: "Tier List",
    icon: "▤",
    copy: "Build tiers and drag every contender into place.",
    live: false,
  },
  {
    id: "blind",
    title: "Blind Ranking",
    icon: "?",
    copy: "Rank without seeing what comes next.",
    live: false,
  },
  {
    id: "score",
    title: "Score Everything",
    icon: "★",
    copy: "Give every item an independent score.",
    live: false,
  },
  {
    id: "drop",
    title: "Keep or Drop",
    icon: "±",
    copy: "Make one brutal yes-or-no decision at a time.",
    live: false,
  },
  {
    id: "bracket",
    title: "Single Elimination",
    icon: "⌘",
    copy: "Classic fixed tournament bracket.",
    live: false,
  },
];

export function ModeView({
  selectedPack,
  onBack,
  onKing,
  onOpenWheel,
}: {
  selectedPack: Pack | null;
  onBack: () => void;
  onKing: () => void;
  onOpenWheel: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="page-wrap mode-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>03 / {t("FORMAT")}
          </div>
          <h2>{t("Choose a mode")}</h2>
        </div>
      </div>
      {selectedPack && (
        <div className="selected-pack-strip">
          <PackCover pack={selectedPack} />
          <div>
            <span>{t("SELECTED PACK")}</span>
            <b>{selectedPack.name}</b>
            <small>{selectedPack.itemCount} {t("ITEMS")}</small>
          </div>
        </div>
      )}
      <div className="mode-grid">
        {MODES.map((mode, index) => (
          <button
            key={mode.id}
            className={`mode-tile ${mode.live ? "live" : "locked"}`}
            disabled={!mode.live}
            onClick={
              mode.id === "king"
                ? onKing
                : mode.id === "wheel"
                  ? onOpenWheel
                  : undefined
            }
          >
            <span className="mode-number">0{index + 1}</span>
            <i>{mode.icon}</i>
            <div>
              <h3>{t(mode.title)}</h3>
              <p>{t(mode.copy)}</p>
            </div>
            <b>{t(mode.live ? "PLAY NOW" : "COMING SOON")}</b>
          </button>
        ))}
      </div>
    </section>
  );
}
