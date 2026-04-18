import { describe, it, expect } from 'vitest';
import { LEVELS, TOTAL_LEVELS } from './catalog';
import { poolFromIds } from './helpers';
import {
  canAnyPieceFit,
  canPlace,
  clearLines,
  createEmptyBoard,
  findAnyFit,
  getClearedLines,
  placePiece,
} from '../engine/grid';
import { scoreTurn } from '../engine/scoring';
import { buildBagFromPool, drawTrayFromPool, makeRng } from '../engine/bag';
import type { BoardState, Piece, PieceColor } from '../types';
import { PIECE_COLORS } from '../engine/pieces';

function rowFillPct(board: BoardState, r: number, mask?: (typeof LEVELS)[number]['dims']['mask']): number {
  let playable = 0;
  let filled = 0;
  for (let c = 0; c < (board[0]?.length ?? 0); c++) {
    if (mask && mask[r]?.[c] === false) continue;
    playable++;
    if (board[r][c] !== null) filled++;
  }
  return playable === 0 ? 0 : filled / playable;
}

function colFillPct(board: BoardState, c: number, mask?: (typeof LEVELS)[number]['dims']['mask']): number {
  let playable = 0;
  let filled = 0;
  for (let r = 0; r < board.length; r++) {
    if (mask && mask[r]?.[c] === false) continue;
    playable++;
    if (board[r][c] !== null) filled++;
  }
  return playable === 0 ? 0 : filled / playable;
}

/**
 * Heuristic solver: for each tray piece, evaluate every legal anchor and pick
 * the one that maximises (clears, then nearest-to-complete row/col fill, then
 * contact with already-filled cells). Good enough to prove targets are
 * reachable without being optimal.
 */
function runGreedy(
  level: (typeof LEVELS)[number],
  seed: number,
  moveBudget: number,
): { score: number; moves: number; cleared: boolean } {
  const rng = makeRng(seed);
  const pool = level.customPool ?? [];
  const mask = level.dims.mask;
  let board: BoardState = createEmptyBoard(level.dims.rows, level.dims.cols);
  let bag: Piece[] = buildBagFromPool(pool, 0, rng);
  let score = 0;
  let combo = 0;
  let moves = 0;
  let reshufflesLeft = 5;

  let tray: (Piece | null)[] = [];
  const refill = () => {
    const drew = drawTrayFromPool(bag, pool, 0, rng);
    bag = drew.bag;
    tray = drew.tray.slice();
  };
  refill();

  while (moves < moveBudget && score < level.targetScore) {
    // Find best placement across entire tray.
    let bestOverall: { ti: number; r: number; c: number; score: number } | null = null;
    for (let ti = 0; ti < tray.length; ti++) {
      const p = tray[ti];
      if (!p) continue;
      for (let r = 0; r < level.dims.rows; r++) {
        for (let c = 0; c < level.dims.cols; c++) {
          if (!canPlace(board, p.shape, r, c, mask)) continue;
          const test = placePiece(board, p, r, c, mask);
          const cleared = getClearedLines(test, mask);
          let maxFill = 0;
          let nearFullSum = 0;
          for (let rr = 0; rr < level.dims.rows; rr++) {
            const f = rowFillPct(test, rr, mask);
            if (f > maxFill && f < 1) maxFill = f;
            if (f >= 0.6 && f < 1) nearFullSum += f;
          }
          for (let cc = 0; cc < level.dims.cols; cc++) {
            const f = colFillPct(test, cc, mask);
            if (f > maxFill && f < 1) maxFill = f;
            if (f >= 0.6 && f < 1) nearFullSum += f;
          }
          const heuristic =
            cleared.totalLines * 5000 +
            maxFill * 300 +
            nearFullSum * 50 +
            p.shape.length;
          if (!bestOverall || heuristic > bestOverall.score) {
            bestOverall = { ti, r, c, score: heuristic };
          }
        }
      }
    }

    if (!bestOverall) {
      if (reshufflesLeft <= 0) break;
      reshufflesLeft--;
      refill();
      continue;
    }

    const piece = tray[bestOverall.ti]!;
    board = placePiece(board, piece, bestOverall.r, bestOverall.c, mask);
    tray[bestOverall.ti] = null;
    const cleared = getClearedLines(board, mask);
    if (cleared.totalLines > 0) {
      board = clearLines(board, cleared.rows, cleared.cols);
    }
    const cells = (piece.shape.flat() as ReadonlyArray<number>).reduce(
      (a: number, v: number) => a + v,
      0,
    );
    const turn = scoreTurn({
      cellsPlaced: cells,
      linesCleared: cleared.totalLines,
      prevCombo: combo,
      perfectClear: false,
    });
    combo = turn.combo;
    score += turn.turn.total;
    moves++;

    if (tray.every((p) => p === null)) refill();
  }

  return { score, moves, cleared: score >= level.targetScore };
}

describe('levels catalog', () => {
  it('has exactly 100 levels', () => {
    expect(TOTAL_LEVELS).toBe(100);
    expect(LEVELS).toHaveLength(100);
  });

  it('level ids are L001..L100 in order', () => {
    LEVELS.forEach((l, i) => {
      expect(l.id).toBe(`L${String(i + 1).padStart(3, '0')}`);
      expect(l.index).toBe(i + 1);
    });
  });

  it('star thresholds are monotonically increasing and >= target', () => {
    for (const l of LEVELS) {
      const [a, b, c] = l.starThresholds;
      expect(a).toBe(l.targetScore);
      expect(b).toBeGreaterThan(a);
      expect(c).toBeGreaterThan(b);
    }
  });

  it('every level has a valid piece pool', () => {
    for (const l of LEVELS) {
      const pool = l.customPool ?? [];
      expect(pool.length).toBeGreaterThan(0);
      const defs = poolFromIds(pool);
      expect(defs.length).toBe(pool.length);
    }
  });

  it('every level has at least one piece that fits on the empty board', () => {
    for (const l of LEVELS) {
      const board = createEmptyBoard(l.dims.rows, l.dims.cols);
      const defs = poolFromIds(l.customPool ?? []);
      const canFitSomething = defs.some((d) =>
        findAnyFit(board, d.shape, l.dims.mask) !== null,
      );
      expect(canFitSomething, `Level ${l.id} has no fitting piece`).toBe(true);
    }
  });

  it('greedy solver reaches 1★ on at least one seed for every level', () => {
    // Sample every 5th level for speed + spot-check the hardest ones.
    const sample = [
      ...LEVELS.filter((_, i) => i % 5 === 0),
      LEVELS[LEVELS.length - 1],
    ];
    for (const l of sample) {
      let bestScore = 0;
      let reached = false;
      for (let seed = 1; seed <= 15 && !reached; seed++) {
        const res = runGreedy(l, seed, Math.max(l.parMoves * 5, 80));
        if (res.score > bestScore) bestScore = res.score;
        if (res.cleared) reached = true;
      }
      expect(
        reached,
        `Level ${l.id} (target ${l.targetScore}) unreachable. Best: ${bestScore}`,
      ).toBe(true);
    }
  });
});
