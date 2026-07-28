"use client";

import { useEffect, useRef, useState } from "react";
import type { Pack, PackItem, Session } from "../../../lib/types";
import { useI18n } from "../../i18n/I18nContext";
import { RemoteImage } from "../shared/RemoteImage";
import { TournamentRoundExplorer } from "./TournamentRoundExplorer";

type BracketGraphNode = {
  match: Session["matches"][number];
  parents: [BracketGraphNode | null, BracketGraphNode | null];
  stage: number;
  y: number;
};

export function TournamentBracket({
  pack,
  session,
}: {
  pack: Pack;
  session: Session;
}) {
  if (session.matches.length > 31) {
    return <TournamentRoundExplorer pack={pack} session={session} />;
  }
  return <ConnectedTournamentBracket pack={pack} session={session} />;
}

function ConnectedTournamentBracket({
  pack,
  session,
}: {
  pack: Pack;
  session: Session;
}) {
  const { t } = useI18n();
  const itemById = new Map(pack.items.map((item) => [item.id, item]));
  const orderedMatches = [...session.matches].sort(
    (left, right) => left.order - right.order,
  );
  const producerByWinner = new Map<string, BracketGraphNode>();
  const nodes: BracketGraphNode[] = [];
  for (const match of orderedMatches) {
    const winnerParent = producerByWinner.get(match.winnerId) ?? null;
    const loserParent = producerByWinner.get(match.loserId) ?? null;
    const node: BracketGraphNode = {
      match,
      parents: [winnerParent, loserParent],
      stage: Math.max(winnerParent?.stage ?? -1, loserParent?.stage ?? -1) + 1,
      y: 0,
    };
    nodes.push(node);
    producerByWinner.set(match.winnerId, node);
  }

  const root = session.championId
    ? (producerByWinner.get(session.championId) ?? nodes.at(-1) ?? null)
    : (nodes.at(-1) ?? null);
  const leafGap = 124;
  const boardTop = 118;
  let leafSlot = 0;
  const positioned = new Set<BracketGraphNode>();
  const positionNode = (node: BracketGraphNode): number => {
    if (positioned.has(node)) {
      return node.y;
    }
    const inputY = node.parents.map((parent) =>
      parent ? positionNode(parent) : boardTop + (leafSlot++ + 0.5) * leafGap,
    );
    node.y = (inputY[0] + inputY[1]) / 2;
    positioned.add(node);
    return node.y;
  };
  if (root) {
    positionNode(root);
  }
  for (const node of nodes) {
    if (!positioned.has(node)) {
      positionNode(node);
    }
  }

  const cardWidth = 276;
  const cardHeight = 194;
  const columnStep = 326;
  const boardLeft = 42;
  const maxStage = Math.max(0, ...nodes.map((node) => node.stage));
  const championX = boardLeft + (maxStage + 1) * columnStep;
  const boardWidth = championX + cardWidth + 42;
  const boardHeight = Math.max(720, boardTop + leafSlot * leafGap + 70);
  const fitRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const element = fitRef.current;
    if (!element) {
      return;
    }
    const updateScale = () => {
      const fittedScale = (element.clientWidth - 28) / boardWidth;
      setFitScale(
        element.clientWidth <= 720
          ? Math.min(0.72, Math.max(0.58, fittedScale))
          : Math.min(1, Math.max(0.2, fittedScale)),
      );
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, [boardWidth]);

  const champion = session.championId ? itemById.get(session.championId) : null;
  const arrowMarkerId = `bracket-arrow-${session.id.replace(/[^a-z0-9-]/gi, "")}`;
  const edges = nodes.flatMap((node) =>
    node.parents.flatMap((parent, inputIndex) => {
      if (!parent) {
        return [];
      }
      const startX = boardLeft + parent.stage * columnStep + cardWidth;
      const startY = parent.y;
      const endX = boardLeft + node.stage * columnStep;
      const endY = node.y + (inputIndex === 0 ? -38 : 43);
      const middleX = startX + (endX - startX) / 2;
      return [
        {
          id: `${parent.match.id}-${node.match.id}-${inputIndex}`,
          path: `M ${startX} ${startY} H ${middleX} V ${endY} H ${endX}`,
        },
      ];
    }),
  );
  if (root) {
    const startX = boardLeft + root.stage * columnStep + cardWidth;
    const middleX = startX + (championX - startX) / 2;
    edges.push({
      id: `${root.match.id}-champion`,
      path: `M ${startX} ${root.y} H ${middleX} V ${root.y} H ${championX}`,
    });
  }

  return (
    <section className="tournament-bracket-section">
      <div className="bracket-heading">
        <div>
          <span className="modal-kicker">{t("Tournament bracket")}</span>
          <h3>{t("Every battle leads to one champion.")}</h3>
          <p>
            {t("Follow every winner through an unbroken path to the final.")}
          </p>
        </div>
        <div className="bracket-summary">
          <span>
            <b>{session.matches.length}</b>
            {t("BATTLES")}
          </span>
          <span>
            <b>{maxStage + 1}</b>
            {t("ROUNDS")}
          </span>
        </div>
      </div>
      <div
        className="bracket-fit"
        ref={fitRef}
        aria-label={t("Full tournament bracket")}
      >
        <svg
          className="bracket-canvas"
          height={boardHeight * fitScale}
          viewBox={`0 0 ${boardWidth} ${boardHeight}`}
          width={boardWidth * fitScale}
        >
          <defs>
            <marker
              id={arrowMarkerId}
              markerWidth="9"
              markerHeight="9"
              refX="8"
              refY="4.5"
              orient="auto"
            >
              <path className="bracket-arrow-head" d="M 0 0 L 9 4.5 L 0 9 z" />
            </marker>
          </defs>
          <g className="bracket-lines" aria-hidden="true">
            {edges.map((edge) => (
              <path
                d={edge.path}
                key={edge.id}
                markerEnd={`url(#${arrowMarkerId})`}
              />
            ))}
          </g>
          {Array.from({ length: maxStage + 1 }, (_, stage) => {
            const matchCount = nodes.filter(
              (node) => node.stage === stage,
            ).length;
            return (
              <foreignObject
                height="66"
                key={stage}
                width={cardWidth}
                x={boardLeft + stage * columnStep}
                y="20"
              >
                <div className="bracket-stage-label">
                  <span>{t("ROUND {count}", { count: stage + 1 })}</span>
                  <small>
                    {matchCount} {t("BATTLES")}
                  </small>
                </div>
              </foreignObject>
            );
          })}
          <foreignObject height="66" width={cardWidth} x={championX} y="20">
            <div className="bracket-stage-label champion-label">
              <span>{t("FINAL")}</span>
              <small>{t("THE ONE")}</small>
            </div>
          </foreignObject>
          {nodes.map((node) => (
            <foreignObject
              height={cardHeight}
              key={node.match.id}
              width={cardWidth}
              x={boardLeft + node.stage * columnStep}
              y={node.y - cardHeight / 2}
            >
              <article
                className={`bracket-match ${node.match.carryMatch ? "carry" : ""}`}
              >
                <div className="bracket-match-meta">
                  <span>
                    {t("BATTLE")} {String(node.match.order).padStart(2, "0")}
                  </span>
                  {node.match.carryMatch && <b>{t("PLAYOFF")}</b>}
                </div>
                <BracketTrack item={itemById.get(node.match.winnerId)} winner />
                <div className="bracket-versus">VS</div>
                <BracketTrack item={itemById.get(node.match.loserId)} />
              </article>
            </foreignObject>
          ))}
          {root && (
            <foreignObject
              height="264"
              width={cardWidth}
              x={championX}
              y={root.y - 132}
            >
              <article className="bracket-champion-card">
                <span>♛</span>
                {champion && <RemoteImage src={champion.thumbnailUrl} alt="" />}
                <div>
                  <small>{t("Champion")}</small>
                  <strong>{champion?.title ?? t("Champion")}</strong>
                  <p>{champion?.channel}</p>
                </div>
              </article>
            </foreignObject>
          )}
        </svg>
      </div>
    </section>
  );
}

function BracketTrack({
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
