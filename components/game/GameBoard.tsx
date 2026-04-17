'use client';

import { motion } from 'framer-motion';
import type { BoardState, PieceShape, PieceColor } from '@/lib/types';
import { pieceCells } from '@/lib/engine/pieces';
import ScorePopup from './ScorePopup';

type Props = {
  board: BoardState;
  preclearRow?: number | null;
  preclearRows?: ReadonlyArray<number>;
  preclearCols?: ReadonlyArray<number>;
  ghostShape?: PieceShape | null;
  ghostAnchor?: { row: number; col: number } | null;
  ghostColor?: PieceColor | null;
  ghostLegal?: boolean;
  /** Parent is responsible for clearing this after the popup's 900ms lifetime. */
  scorePopup?: { id: number | string; amount: number; mult: string; combo: number } | null;
  chromeLive?: string;
  density?: number;
  onCellDown?: (row: number, col: number, e: React.PointerEvent) => void;
  onCellEnter?: (row: number, col: number, e: React.PointerEvent) => void;
  onCellUp?: (row: number, col: number, e: React.PointerEvent) => void;
  onBoardLeave?: () => void;
  /** Rows actively playing the clear-pop animation. */
  clearingRows?: ReadonlyArray<number>;
  /** Cols actively playing the clear-pop animation. */
  clearingCols?: ReadonlyArray<number>;
  /**
   * Pre-clear board snapshot, used to render the popping tiles with their
   * original colors while the post-clear `board` below has already emptied.
   */
  clearingBoard?: BoardState | null;
  /** Fired after the last popping tile finishes its exit. */
  onClearComplete?: () => void;
};

// Pop timing breakdown (see PRD / spec):
//   0–120ms   wobble  — scale 1.0 → 1.08, rotate ±4°
//   120–300ms pop     — scale 1.08 → 1.28, brightness 1 → 1.5
//   300–520ms burst   — scale 1.28 → 0, opacity 1 → 0, y 0 → -12px
const POP_DURATION = 0.52;
const POP_TIMES = [0, 120 / 520, 300 / 520, 1] as const;
const STAGGER_MS = 28;
const FADEIN_DURATION = 0.16;

/**
 * Each tile within a cleared line staggers by `STAGGER_MS` based on its
 * position in the line (left→right for row clears, top→bottom for col clears).
 * Intersection cells take the smaller of the two delays so a quad-clear
 * centerpiece doesn't lag behind both its arms.
 */
function popDelaySec(
  r: number,
  c: number,
  rows: ReadonlyArray<number>,
  cols: ReadonlyArray<number>,
): number {
  const inRow = rows.includes(r);
  const inCol = cols.includes(c);
  const rowDelay = inRow ? c * STAGGER_MS : Infinity;
  const colDelay = inCol ? r * STAGGER_MS : Infinity;
  return Math.min(rowDelay, colDelay) / 1000;
}

export default function GameBoard({
  board,
  preclearRow = null,
  preclearRows = [],
  preclearCols = [],
  ghostShape = null,
  ghostAnchor = null,
  ghostColor = 'olive',
  ghostLegal = true,
  scorePopup = null,
  chromeLive = '',
  density,
  onCellDown,
  onCellEnter,
  onCellUp,
  onBoardLeave,
  clearingRows = [],
  clearingCols = [],
  clearingBoard = null,
  onClearComplete,
}: Props) {
  const ghostSet = new Set<string>();
  if (ghostShape && ghostAnchor) {
    for (const [dr, dc] of pieceCells(ghostShape)) {
      const r = ghostAnchor.row + dr;
      const c = ghostAnchor.col + dc;
      if (r >= 0 && c >= 0 && r < 8 && c < 8) ghostSet.add(`${r}-${c}`);
    }
  }

  const isClearing = clearingRows.length + clearingCols.length > 0;

  // Flat list of clearing cells, needed to render the overlay and to know
  // which grid cell owns the "last" animation-complete callback.
  const clearingCells: Array<{ r: number; c: number; color: PieceColor; delay: number }> = [];
  let maxDelay = 0;
  if (isClearing && clearingBoard) {
    for (const r of clearingRows) {
      for (let c = 0; c < 8; c++) {
        const color = clearingBoard[r]?.[c];
        if (!color) continue;
        const delay = popDelaySec(r, c, clearingRows, clearingCols);
        clearingCells.push({ r, c, color, delay });
        if (delay > maxDelay) maxDelay = delay;
      }
    }
    for (const c of clearingCols) {
      for (let r = 0; r < 8; r++) {
        if (clearingRows.includes(r)) continue; // already collected above
        const color = clearingBoard[r]?.[c];
        if (!color) continue;
        const delay = popDelaySec(r, c, clearingRows, clearingCols);
        clearingCells.push({ r, c, color, delay });
        if (delay > maxDelay) maxDelay = delay;
      }
    }
  }

  // Midpoint of the first cleared line — drives the score popup anchor.
  // For multi-clears we take the first row (or first col) as a pragmatic
  // focus point; the popup is a one-shot accent, not a heat-map.
  let popupPos = { xPct: 50, yPct: 50 };
  if (scorePopup) {
    if (clearingRows.length > 0) {
      popupPos = { xPct: 50, yPct: ((clearingRows[0] + 0.5) / 8) * 100 };
    } else if (clearingCols.length > 0) {
      popupPos = { xPct: ((clearingCols[0] + 0.5) / 8) * 100, yPct: 50 };
    }
  }

  return (
    <>
      <div className="board-chrome">
        {chromeLive ? <span className="live-chip">{chromeLive}</span> : <span />}
        {typeof density === 'number' && (
          <span className="density-chip">
            density <strong>{density}%</strong>
          </span>
        )}
      </div>

      <div className="board" onPointerLeave={onBoardLeave}>
        <div className="board-grid">
          {board.flatMap((row, r) =>
            row.map((v, c) => {
              const key = `${r}-${c}`;
              const classes = ['cell'];
              if (v) classes.push('filled', `fill-${v}`);
              const inClearingRow = clearingRows.includes(r);
              const inClearingCol = clearingCols.includes(c);
              const isClearingCell = inClearingRow || inClearingCol;
              // Preclear pulse is suppressed once the pop animation takes over
              // to avoid the two transforms fighting.
              const isPreclear =
                !isClearingCell &&
                ((preclearRow !== null && r === preclearRow && v) ||
                  (preclearRows.includes(r) && v) ||
                  (preclearCols.includes(c) && v));
              if (isPreclear) classes.push('preclear');
              if (!v && ghostSet.has(key)) {
                classes.push('filled', 'ghost');
                if (ghostLegal) classes.push(`fill-${ghostColor || 'olive'}`);
                else classes.push('illegal');
              }

              // After the pop completes, the now-empty cell fades back in so
              // the grid doesn't pop back abruptly.
              const justVacated = !v && isClearingCell;
              const delay = justVacated
                ? popDelaySec(r, c, clearingRows, clearingCols) + POP_DURATION
                : 0;

              return (
                <motion.div
                  key={key}
                  className={classes.join(' ')}
                  data-row={r}
                  data-col={c}
                  initial={false}
                  animate={justVacated ? { opacity: [0, 0, 1] } : { opacity: 1 }}
                  transition={
                    justVacated
                      ? {
                          duration: FADEIN_DURATION + 0.001,
                          delay,
                          times: [0, 0.001, 1],
                        }
                      : { duration: 0 }
                  }
                  onPointerDown={
                    onCellDown ? (e) => onCellDown(r, c, e) : undefined
                  }
                  onPointerEnter={
                    onCellEnter ? (e) => onCellEnter(r, c, e) : undefined
                  }
                  onPointerUp={
                    onCellUp ? (e) => onCellUp(r, c, e) : undefined
                  }
                />
              );
            }),
          )}
        </div>

        {isClearing && clearingCells.length > 0 && (
          <div className="board-grid clearing-overlay" aria-hidden="true">
            {clearingCells.map(({ r, c, color, delay }, i) => {
              const sign = (r + c) % 2 === 0 ? 1 : -1;
              // Fire the commit callback only once — on the cell whose delay
              // is the largest in the batch. Using `delay === maxDelay`
              // instead of array-last guards against row/col ordering quirks.
              const isLast = delay === maxDelay && onClearComplete;
              return (
                <motion.div
                  key={`clear-${r}-${c}-${i}`}
                  className={`cell filled fill-${color}`}
                  style={{
                    gridRow: r + 1,
                    gridColumn: c + 1,
                    pointerEvents: 'none',
                    transformOrigin: 'center',
                  }}
                  initial={{
                    scale: 1,
                    rotate: 0,
                    opacity: 1,
                    y: 0,
                    filter: 'brightness(1)',
                  }}
                  animate={{
                    scale: [1.0, 1.08, 1.28, 0],
                    rotate: [0, sign * 4, 0, 0],
                    filter: [
                      'brightness(1)',
                      'brightness(1)',
                      'brightness(1.5)',
                      'brightness(1.5)',
                    ],
                    y: [0, 0, 0, -12],
                    opacity: [1, 1, 1, 0],
                  }}
                  transition={{
                    duration: POP_DURATION,
                    delay,
                    times: [...POP_TIMES],
                    ease: 'easeOut',
                  }}
                  onAnimationComplete={
                    isLast ? () => onClearComplete?.() : undefined
                  }
                />
              );
            })}
          </div>
        )}

        {scorePopup && (
          <ScorePopup
            popupKey={scorePopup.id}
            amount={scorePopup.amount}
            mult={scorePopup.mult}
            combo={scorePopup.combo}
            xPct={popupPos.xPct}
            yPct={popupPos.yPct}
          />
        )}
      </div>
    </>
  );
}
