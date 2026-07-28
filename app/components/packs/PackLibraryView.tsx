"use client";

import type { Pack } from "../../../lib/types";
import { isYouTubeSource, sourceName } from "../../domain/pack";
import { useI18n } from "../../i18n/I18nContext";
import { PackCover } from "./PackCard";

export function PackLibraryView({
  packs,
  onEdit,
  onDelete,
  onExport,
}: {
  packs: Pack[];
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
          <p>{t("Only you can see the packs uploaded to this account.")}</p>
        </div>
      </div>
      {packs.length === 0 ? (
        <div className="empty-library">
          <span>＋</span>
          <h3>{t("No packs yet")}</h3>
          <p>{t("Your imported playlists will appear here.")}</p>
        </div>
      ) : (
        <div className="pack-grid">
          {packs.map((pack) => (
            <article className="pack-tile" key={pack.id}>
              <div className="pack-art">
                <PackCover pack={pack} />
              </div>
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
      )}
    </section>
  );
}
