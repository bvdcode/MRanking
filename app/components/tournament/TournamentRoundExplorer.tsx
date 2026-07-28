"use client";

import { useState } from "react";
import type { Pack, PackItem, Session } from "../../../lib/types";
import { useI18n } from "../../i18n/I18nContext";
import { RemoteImage } from "../shared/RemoteImage";

export function TournamentRoundExplorer({
  pack,
  session,
}: {
  pack: Pack;
  session: Session;
}) {
  const { t } = useI18n();
  const itemById = new Map(pack.items.map((item) => [item.id, item]));
  const roundNumbers = Array.from(
    new Set(session.matches.map((match) => match.round)),
  ).sort((left, right) => left - right);
  const [roundIndex, setRoundIndex] = useState(roundNumbers.length - 1);
  const [page, setPage] = useState(0);
  const selectedRound = roundNumbers[Math.max(0, roundIndex)] ?? 1;
  const roundMatches = session.matches
    .filter((match) => match.round === selectedRound)
    .sort((left, right) => left.order - right.order);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(roundMatches.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleMatches = roundMatches.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );
  const firstVisible = roundMatches.length ? safePage * pageSize + 1 : 0;
  const lastVisible = Math.min((safePage + 1) * pageSize, roundMatches.length);

  return (
    <section className="tournament-bracket-section bracket-explorer-section">
      <div className="bracket-heading">
        <div>
          <span className="modal-kicker">{t("Tournament bracket")}</span>
          <h3>{t("Explore the tournament round by round.")}</h3>
          <p>
            {t("Large tournaments stay readable without shrinking every battle.")}
          </p>
        </div>
        <div className="bracket-summary">
          <span>
            <b>{session.matches.length}</b>
            {t("BATTLES")}
          </span>
          <span>
            <b>{roundNumbers.length}</b>
            {t("ROUNDS")}
          </span>
        </div>
      </div>
      <div className="round-explorer">
        <nav className="round-road" aria-label={t("Choose a round")}>
          {roundNumbers.map((round, index) => (
            <RoundButton
              active={index === roundIndex}
              count={session.matches.filter((match) => match.round === round).length}
              key={round}
              label={t("ROUND {count}", { count: round })}
              onClick={() => {
                setRoundIndex(index);
                setPage(0);
              }}
            />
          ))}
          <RoundButton
            active={false}
            countLabel={t("Champion")}
            final
            label={t("FINAL")}
            onClick={() => {
              setRoundIndex(roundNumbers.length - 1);
              setPage(0);
            }}
          />
        </nav>
        <div className="round-explorer-toolbar">
          <div>
            <span>{t("ROUND {count}", { count: selectedRound })}</span>
            <b>{firstVisible}–{lastVisible} / {roundMatches.length}</b>
          </div>
          {pageCount > 1 && (
            <PageControls
              page={safePage}
              pageCount={pageCount}
              onPage={setPage}
            />
          )}
        </div>
        <div className="round-match-grid">
          {visibleMatches.map((match) => (
            <article
              className={`bracket-match bracket-explorer-match ${match.carryMatch ? "carry" : ""}`}
              key={match.id}
            >
              <div className="bracket-match-meta">
                <span>{t("BATTLE")} {String(match.order).padStart(2, "0")}</span>
                {match.carryMatch && <b>{t("PLAYOFF")}</b>}
              </div>
              <ExplorerTrack item={itemById.get(match.winnerId)} winner />
              <div className="bracket-versus">VS</div>
              <ExplorerTrack item={itemById.get(match.loserId)} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoundButton({
  active,
  count,
  countLabel,
  final = false,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  countLabel?: string;
  final?: boolean;
  label: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      className={`${active ? "active" : ""} ${final ? "round-road-final" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <small>{countLabel ?? `${count} ${t("BATTLES")}`}</small>
    </button>
  );
}

function PageControls({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="round-page-controls">
      <button
        aria-label={t("Previous page")}
        disabled={page === 0}
        onClick={() => onPage(Math.max(0, page - 1))}
      >
        ←
      </button>
      <span>{page + 1} / {pageCount}</span>
      <button
        aria-label={t("Next page")}
        disabled={page === pageCount - 1}
        onClick={() => onPage(Math.min(pageCount - 1, page + 1))}
      >
        →
      </button>
    </div>
  );
}

function ExplorerTrack({
  item,
  winner = false,
}: {
  item: PackItem | undefined;
  winner?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={`bracket-track ${winner ? "winner" : "loser"}`}>
      {item ? (
        <RemoteImage src={item.thumbnailUrl} alt="" />
      ) : (
        <span className="missing-track">?</span>
      )}
      <div>
        <strong>{item?.title ?? t("Deleted track")}</strong>
        <small>{item?.channel}</small>
      </div>
      {winner && <b>{t("WIN")}</b>}
    </div>
  );
}
