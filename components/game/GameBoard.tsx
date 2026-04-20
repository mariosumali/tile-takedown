'use client';

import { motion } from 'framer-motion';
import type {
  BoardState,
  Obstacle,
  PieceShape,
  PieceColor,
  PowerUpId,
} from '@/lib/types';
import { pieceCells } from '@/lib/engine/pieces';
import { POWERUPS } from '@/lib/engine/powerups';
import ScorePopup from './ScorePopup';

type ObstacleMap = Readonly<Record<string, Obstacle>>;
type PowerupCellMap = Readonly<Record<string, PowerUpId>>;

type Props = {
  board: BoardState;
  /**
   * Optional playable-cell mask for non-rectangular boards (Levels mode).
   * `mask[r][c] === false` renders as a `.cell.void`, ignores pointer events,
   * and skips preclear / ghost / clear animations.
   */
  mask?: ReadonlyArray<ReadonlyArray<boolean>>;
  /**
   * Optional obstacle overlay (Gimmicks mode). Keys are "r:c" strings.
   */
  obstacles?: ObstacleMap;
  /**
   * Power-ups embedded into existing filled board cells (Gimmicks mode).
   * Keys are "r:c" strings. When the underlying cell is cleared (by line or
   * by another power-up), the embedded power-up triggers or is banked.
   */
  powerupCells?: PowerupCellMap;
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

function isPlayable(
  mask: Props['mask'] | undefined,
  r: number,
  c: number,
): boolean {
  if (!mask) return true;
  return mask[r]?.[c] !== false;
}

export default function GameBoard({
  board,
  mask,
  obstacles,
  powerupCells,
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
  const rowCount = board.length;
  const colCount = board[0]?.length ?? 0;

  const ghostSet = new Set<string>();
  if (ghostShape && ghostAnchor) {
    for (const [dr, dc] of pieceCells(ghostShape)) {
      const r = ghostAnchor.row + dr;
      const c = ghostAnchor.col + dc;
      if (
        r >= 0 &&
        c >= 0 &&
        r < rowCount &&
        c < colCount &&
        isPlayable(mask, r, c)
      ) {
        ghostSet.add(`${r}-${c}`);
      }
    }
  }

  const isClearing = clearingRows.length + clearingCols.length > 0;

  const clearingCells: Array<{ r: number; c: number; color: PieceColor; delay: number }> = [];
  let maxDelay = 0;
  if (isClearing && clearingBoard) {
    for (const r of clearingRows) {
      for (let c = 0; c < colCount; c++) {
        if (!isPlayable(mask, r, c)) continue;
        const color = clearingBoard[r]?.[c];
        if (!color) continue;
        const delay = popDelaySec(r, c, clearingRows, clearingCols);
        clearingCells.push({ r, c, color, delay });
        if (delay > maxDelay) maxDelay = delay;
      }
    }
    for (const c of clearingCols) {
      for (let r = 0; r < rowCount; r++) {
        if (clearingRows.includes(r)) continue;
        if (!isPlayable(mask, r, c)) continue;
        const color = clearingBoard[r]?.[c];
        if (!color) continue;
        const delay = popDelaySec(r, c, clearingRows, clearingCols);
        clearingCells.push({ r, c, color, delay });
        if (delay > maxDelay) maxDelay = delay;
      }
    }
  }

  let popupPos = { xPct: 50, yPct: 50 };
  if (scorePopup) {
    if (clearingRows.length > 0) {
      popupPos = { xPct: 50, yPct: ((clearingRows[0] + 0.5) / rowCount) * 100 };
    } else if (clearingCols.length > 0) {
      popupPos = { xPct: ((clearingCols[0] + 0.5) / colCount) * 100, yPct: 50 };
    }
  }

  const gridStyle = {
    ['--board-rows' as string]: String(rowCount),
    ['--board-cols' as string]: String(colCount),
  } as React.CSSProperties;

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
        <div className="board-grid" style={gridStyle}>
          {board.flatMap((row, r) =>
            row.map((v, c) => {
              const key = `${r}-${c}`;
              const playable = isPlayable(mask, r, c);
              const obstacle = obstacles?.[`${r}:${c}`];
              const classes = ['cell'];

              if (!playable) classes.push('void');
              if (v && playable) classes.push('filled', `fill-${v}`);

              if (obstacle && playable) {
                if (obstacle.kind === 'locked') classes.push('filled', 'locked');
                else if (obstacle.kind === 'frozen') classes.push('filled', 'frozen');
                else if (obstacle.kind === 'bomb') {
                  classes.push('filled', 'bomb');
                  if (obstacle.turnsLeft <= 2) classes.push('bomb-hot');
                }
              }

              const inClearingRow = clearingRows.includes(r);
              const inClearingCol = clearingCols.includes(c);
              const isClearingCell = (inClearingRow || inClearingCol) && playable;

              const isPreclear =
                playable &&
                !isClearingCell &&
                ((preclearRow !== null && r === preclearRow && v) ||
                  (preclearRows.includes(r) && v) ||
                  (preclearCols.includes(c) && v));
              if (isPreclear) classes.push('preclear');

              if (!v && playable && !obstacle && ghostSet.has(key)) {
                classes.push('filled', 'ghost');
                if (ghostLegal) classes.push(`fill-${ghostColor || 'olive'}`);
                else classes.push('illegal');
              }

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
                    playable && onCellDown ? (e) => onCellDown(r, c, e) : undefined
                  }
                  onPointerEnter={
                    playable && onCellEnter ? (e) => onCellEnter(r, c, e) : undefined
                  }
                  onPointerUp={
                    playable && onCellUp ? (e) => onCellUp(r, c, e) : undefined
                  }
                >
                  {obstacle?.kind === 'bomb' && playable && (
                    <span>{obstacle.turnsLeft}</span>
                  )}
                  {!obstacle &&
                    playable &&
                    v &&
                    powerupCells?.[`${r}:${c}`] && (
                      <span
                        className="embedded-powerup"
                        aria-label={`${POWERUPS[powerupCells[`${r}:${c}`]].name} hidden here`}
                        title={`${POWERUPS[powerupCells[`${r}:${c}`]].name} — clear this tile to trigger`}
                      >
                        {POWERUPS[powerupCells[`${r}:${c}`]].glyph}
                      </span>
                    )}
                </motion.div>
              );
            }),
          )}
        </div>

        {isClearing && clearingCells.length > 0 && (
          <div className="board-grid clearing-overlay" style={gridStyle} aria-hidden="true">
            {clearingCells.map(({ r, c, color, delay }, i) => {
              const sign = (r + c) % 2 === 0 ? 1 : -1;
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
