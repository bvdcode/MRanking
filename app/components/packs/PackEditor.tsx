"use client";

import { isYouTubeSource, pickRandomVideoIds } from "../../domain/pack";
import { useI18n } from "../../i18n/I18nContext";
import type { EditablePack } from "../../types";
import { RemoteImage } from "../shared/RemoteImage";
import { COVER_EMOJIS } from "./constants";

export function PackEditor({
  value,
  onChange,
  onBack,
  onSave,
  saving,
  error,
}: {
  value: EditablePack;
  onChange: (value: EditablePack) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
}) {
  const { t } = useI18n();
  const selectedIds = new Set(value.selectedVideoIds);
  const selectedCount = value.items.reduce(
    (count, item) => count + Number(selectedIds.has(item.videoId)),
    0,
  );
  const valid = selectedCount >= 16 && value.name.trim().length > 0;
  const issueTotal = value.issues.reduce(
    (count, issue) => count + issue.count,
    0,
  );

  function selectRandom(count: number | "all") {
    if (count === "all") {
      onChange({
        ...value,
        selectedVideoIds: value.items.map((item) => item.videoId),
      });
      return;
    }
    onChange({
      ...value,
      selectedVideoIds: pickRandomVideoIds(value.items, count),
    });
  }

  function toggleItem(videoId: string, checked: boolean) {
    onChange({
      ...value,
      selectedVideoIds: checked
        ? [...new Set([...value.selectedVideoIds, videoId])]
        : value.selectedVideoIds.filter((id) => id !== videoId),
    });
  }

  return (
    <section className="page-wrap editor-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="page-heading editor-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>02 / {t("REVIEW")}
          </div>
          <h2>{t("Edit imported pack")}</h2>
        </div>
      </div>
      <div className="editor-setup">
        <div className="editor-cover-block">
          <span className="aside-label">{t("Cover")}</span>
          <div
            className={`pack-cover-preview ${value.coverType === "emoji" ? "emoji-cover" : ""}`}
          >
            {value.coverType === "thumbnail" ? (
              <RemoteImage src={value.coverValue} alt="" />
            ) : (
              <span>{value.coverValue}</span>
            )}
            <b>{value.name || "UNTITLED"}</b>
            <small>
              {selectedCount} {t(isYouTubeSource(value.sourceType) ? "videos" : "tracks")}
            </small>
          </div>
          <button
            className={`cover-choice ${value.coverType === "thumbnail" ? "selected" : ""}`}
            onClick={() =>
              onChange({
                ...value,
                coverType: "thumbnail",
                coverValue: value.items[0]?.thumbnailUrl ?? value.coverValue,
              })
            }
          >
            {t("Playlist thumbnail")}
          </button>
          <div className="emoji-cover-grid">
            {COVER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className={
                  value.coverType === "emoji" && value.coverValue === emoji
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  onChange({ ...value, coverType: "emoji", coverValue: emoji })
                }
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <label className="large-field editor-name-field">
          <span>{t("Pack name")}</span>
          <input
            value={value.name}
            maxLength={120}
            onChange={(event) =>
              onChange({ ...value, name: event.target.value })
            }
          />
        </label>
        <div className="editor-save-block">
          <span>{t("Selected")}</span>
          <b>{selectedCount}</b>
          <small>
            {t(isYouTubeSource(value.sourceType) ? "videos" : "tracks")}
          </small>
          {!valid && (
            <div className="minimum-note">
              {t("A pack needs at least 16 items")} · {selectedCount}/16
            </div>
          )}
          {error && <div className="form-error">{t(error)}</div>}
          <button
            className="button primary save-pack"
            disabled={!valid || saving}
            onClick={onSave}
          >
            <strong>{saving ? "…" : t("Save pack")}</strong>
            <span>↗</span>
          </button>
        </div>
      </div>
      <div className="editor-layout">
        <div className="editor-main">
          <div className="track-list-heading">
            <span>{t("Playlist tracks")}</span>
            <b>{value.items.length}</b>
          </div>
          <div className="video-review-list">
            {value.items.map((item, index) => {
              const checked = selectedIds.has(item.videoId);
              return (
              <article key={item.videoId} className={checked ? "selected" : "unchecked"}>
                <label className="review-checkbox">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      toggleItem(item.videoId, event.target.checked)
                    }
                    aria-label={`${checked ? "Unselect" : "Select"} ${item.title}`}
                  />
                  <span aria-hidden="true" />
                </label>
                <span className="review-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <RemoteImage src={item.thumbnailUrl} alt="" />
                <div>
                  <b>{item.title}</b>
                  <small>
                    {item.channel}
                    {item.duration ? ` · ${item.duration}` : ""}
                  </small>
                </div>
                <a href={item.youtubeUrl} target="_blank" rel="noreferrer">
                  ↗
                </a>
              </article>
            )})}
          </div>
        </div>
        <aside className="selection-sidebar">
          <section className="selection-panel">
            <span className="aside-label">{t("Random selection")}</span>
            <h3>{selectedCount}</h3>
            <p>{t("Choose how many tracks stay in the pack.")}</p>
            <div className="selection-size-grid">
              {[16, 32, 64, 128, 256, 512].map((size) => (
                <button
                  key={size}
                  className={selectedCount === size ? "selected" : ""}
                  disabled={size > value.items.length}
                  onClick={() => selectRandom(size)}
                >
                  {size}
                </button>
              ))}
              <button
                className={selectedCount === value.items.length ? "selected" : ""}
                onClick={() => selectRandom("all")}
              >
                {t("All")}
              </button>
            </div>
          </section>
          {issueTotal > 0 && (
            <section className="import-issues">
              <header>
                <span>{t("Excluded")}</span>
                <b>{issueTotal}</b>
              </header>
              <div>
                {value.issues.map((issue, index) => (
                  <article key={`${issue.reason}-${issue.title}-${index}`}>
                    <span className={`issue-mark ${issue.reason}`}>×</span>
                    <p>
                      <strong>
                        {t(issue.title)}
                        {issue.count > 1 ? ` ×${issue.count}` : ""}
                      </strong>
                      <small>{issue.channel}</small>
                    </p>
                    <em>
                      {t(issue.reason === "duplicate" ? "Duplicate" : "Skipped")}
                    </em>
                  </article>
                ))}
              </div>
              {value.duplicates > 0 && (
                <p className="duplicate-note">
                  {t("Duplicates are unchecked automatically; one copy stays selected.")}
                </p>
              )}
            </section>
          )}
          {value.skipped > 0 && value.issues.length === 0 && (
            <section className="import-issues compact">
              <header>
                <span>{t("Skipped")}</span>
                <b>{value.skipped}</b>
              </header>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
