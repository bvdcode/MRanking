"use client";

import type { Pack } from "../../../lib/types";
import { isYouTubeSource, sourceName } from "../../domain/pack";
import { useI18n } from "../../i18n/I18nContext";
import { PackCover, PackTypeBadge } from "./PackCard";

export function PackLibraryView({
  packs,
  onAdd,
  onPlay,
  onEdit,
  onDelete,
  onExport,
}: {
  packs: Pack[];
  onAdd: () => void;
  onPlay: (pack: Pack) => void;
  onEdit: (pack: Pack) => void;
  onDelete: (pack: Pack) => void;
  onExport: (pack: Pack) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="page-wrap library-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>
            {t("YOUR LIBRARY")}
          </div>
          <h2>{t("Your packs")}</h2>
        </div>
      </div>
      <div className="pack-grid">
        <button className="pack-tile add-pack-tile" onClick={onAdd}>
          <span className="add-pack-plus" aria-hidden="true">+</span>
          <strong>{t("Add a pack")}</strong>
          <small>{t("Upload or import a new pack.")}</small>
          <b aria-hidden="true">↗</b>
        </button>
        {packs.map((pack) => (
          <article className="pack-tile" key={pack.id}>
            <button className="pack-art" onClick={() => onPlay(pack)}>
              <PackCover pack={pack} />
              <PackTypeBadge />
              <div className="pack-play-overlay">
                <span>{t("Choose a mode")}</span>
                <b>↗</b>
              </div>
            </button>
            <div className="pack-tile-body">
              <div className="pack-meta">
                <span>
                  {t(sourceName(pack.sourceType))} · {t(pack.visibility === "public" ? "Public" : "Private")}
                </span>
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
              <div className="pack-actions">
                <button onClick={() => onEdit(pack)}>{t("Edit")}</button>
                <button onClick={() => onExport(pack)}>{t("Export")}</button>
                <button className="danger" onClick={() => onDelete(pack)}>
                  {t("Delete")}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
