"use client";

import type { PackItem, WheelRun } from "../../../lib/types";
import type { WheelEntry, WheelSort } from "../../domain/wheel";
import { useI18n } from "../../i18n/I18nContext";
import { RemoteImage } from "../shared/RemoteImage";

const QUICK_COUNTS = [2, 4, 8, 16, 32, 64, 128, 256, 512];

type WheelEntryPanelProps = {
  run: WheelRun;
  visibleEntries: WheelEntry[];
  itemById: ReadonlyMap<string, PackItem>;
  activeCount: number;
  availableCount: number;
  archived: boolean;
  spinning: boolean;
  query: string;
  sort: WheelSort;
  chanceDrafts: Record<string, string>;
  hoveredId: string | null;
  landedId: string | null;
  onQuery: (query: string) => void;
  onSort: (sort: WheelSort) => void;
  onHover: (itemId: string | null) => void;
  onToggle: (itemId: string, enabled: boolean) => void;
  onQuickSelect: (count: number | "all") => void;
  onChanceDraft: (itemId: string, value: string) => void;
  onChanceDiscard: (itemId: string) => void;
  onChanceCommit: (itemId: string, fallback: number) => void;
};

export function WheelEntryPanel({
  run,
  visibleEntries,
  itemById,
  activeCount,
  availableCount,
  archived,
  spinning,
  query,
  sort,
  chanceDrafts,
  hoveredId,
  landedId,
  onQuery,
  onSort,
  onHover,
  onToggle,
  onQuickSelect,
  onChanceDraft,
  onChanceDiscard,
  onChanceCommit,
}: WheelEntryPanelProps) {
  const { t } = useI18n();
  return (
    <section className="wheel-list-panel">
      <header className="wheel-list-tools">
        <label>
          <span>{t("Search")}</span>
          <input
            type="search"
            value={query}
            placeholder={t("Track or artist")}
            onChange={(event) => onQuery(event.target.value)}
          />
        </label>
        <label>
          <span>{t("Sort")}</span>
          <select
            value={sort}
            onChange={(event) => onSort(event.target.value as WheelSort)}
          >
            <option value="original">{t("Original order")}</option>
            <option value="title">{t("Title")}</option>
            <option value="chance">{t("Chance")}</option>
          </select>
        </label>
      </header>

      {!archived && run.state.status === "active" && (
        <div className="wheel-quick-select">
          <span>{t("Random selection")}</span>
          <div>
            {QUICK_COUNTS.filter((count) => count <= availableCount).map(
              (count) => (
                <button
                  key={count}
                  disabled={spinning}
                  className={activeCount === count ? "selected" : ""}
                  onClick={() => onQuickSelect(count)}
                >
                  {count}
                </button>
              ),
            )}
            <button
              disabled={spinning}
              className={activeCount === availableCount ? "selected" : ""}
              onClick={() => onQuickSelect("all")}
            >
              {t("All")}
            </button>
          </div>
        </div>
      )}

      <div className="wheel-track-list" aria-label={t("Wheel entries")}>
        {visibleEntries.map((entry, index) => {
          const item = itemById.get(entry.itemId);
          if (!item) {
            return null;
          }
          const inactive =
            !entry.enabled ||
            entry.eliminated ||
            (run.state.status === "complete" &&
              entry.itemId !== run.state.winnerItemId);
          const highlighted =
            hoveredId === entry.itemId || landedId === entry.itemId;
          const checked = entry.enabled && !entry.eliminated;
          return (
            <article
              key={entry.itemId}
              className={`${inactive ? "inactive" : ""} ${entry.eliminated ? "eliminated" : ""} ${highlighted ? "highlighted" : ""}`}
              onMouseEnter={() => onHover(entry.itemId)}
              onMouseLeave={() => onHover(null)}
            >
              <label className="wheel-entry-check">
                <input
                  type="checkbox"
                  checked={checked}
                  aria-label={item.title}
                  disabled={
                    archived ||
                    spinning ||
                    entry.eliminated ||
                    run.state.status === "complete"
                  }
                  onChange={(event) =>
                    onToggle(entry.itemId, event.target.checked)
                  }
                />
                <span aria-hidden="true" />
              </label>
              <span
                className="wheel-entry-color"
                aria-hidden="true"
              >
                <svg viewBox="0 0 8 46" preserveAspectRatio="none">
                  <rect width="8" height="46" rx="4" fill={entry.color} />
                </svg>
              </span>
              <span className="wheel-entry-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <RemoteImage src={item.thumbnailUrl} alt="" />
              <div className="wheel-entry-copy">
                <b>{item.title}</b>
                <small>
                  {item.channel}
                  {item.duration ? ` · ${item.duration}` : ""}
                </small>
              </div>
              <label className="wheel-chance-input">
                <input
                  type="number"
                  min={0.01}
                  max={99.99}
                  step={0.01}
                  value={
                    chanceDrafts[entry.itemId] ??
                    (checked ? entry.chance.toFixed(2) : "0.00")
                  }
                  disabled={
                    archived || spinning || inactive || activeCount < 2
                  }
                  onFocus={() =>
                    onChanceDraft(entry.itemId, entry.chance.toFixed(2))
                  }
                  onChange={(event) =>
                    onChanceDraft(entry.itemId, event.target.value)
                  }
                  onBlur={() => onChanceCommit(entry.itemId, entry.chance)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      onChanceDiscard(entry.itemId);
                      event.currentTarget.blur();
                    }
                  }}
                />
                <span>%</span>
              </label>
              {entry.eliminated && <em>{t("OUT")}</em>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
