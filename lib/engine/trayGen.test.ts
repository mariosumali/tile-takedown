import { describe, it, expect } from 'vitest';
import type { BoardState, Piece } from '../types';
import { createEmptyBoard } from './grid';
import { getDef } from './pieces';
import {
  boardPressure,
  generateSolvableBatch,
  pickSolvableSlotRefill,
  promoteOrRegenerateBatch,
  tripletIsSolvable,
} from './trayGen';

function pieceFromId(id: string, color: Piece['color'] = 'tomato'): Piece {
  const def = getDef(id);
  if (!def) throw new Error(`unknown piece: ${id}`);
  return { shape: def.shape, color };
}

function filledBoard(rows: number, cols: number): BoardState {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'tomato' as const),
  );
}

describe('tripletIsSolvable', () => {
  it('accepts any triple on an empty 8x8 board', () => {
    const board = createEmptyBoard(8, 8);
    const pieces = [
      pieceFromId('i5_h'),
      pieceFromId('l4_a'),
      pieceFromId('plus5'),
    ];
    expect(tripletIsSolvable(board, pieces)).toBe(true);
  });

  it('rejects triples that cannot fit on a fully filled board', () => {
    const board = filledBoard(8, 8);
    const pieces = [
      pieceFromId('mono'),
      pieceFromId('domino_h'),
      pieceFromId('i3_h'),
    ];
    expect(tripletIsSolvable(board, pieces)).toBe(false);
  });

  it('sees clears — a placement that clears a row unblocks later pieces', () => {
    // 8x8 board; row 0 has 7 filled cells, col 7 empty. A mono at (0,7)
    // clears row 0, freeing space for a larger piece that wouldn't fit
    // otherwise.
    const board = createEmptyBoard(8, 8).map((r) => r.slice()) as (
      | Piece['color']
      | null
    )[][];
    for (let c = 0; c < 7; c++) board[0][c] = 'olive';
    // Lock rows 1..7 so the i5_h only fits on row 0 after clearing.
    for (let r = 1; r < 8; r++) {
      for (let c = 0; c < 8; c++) board[r][c] = 'olive';
    }
    const pieces = [
      pieceFromId('mono'),
      pieceFromId('i5_h'),
      pieceFromId('i3_h'),
    ];
    expect(tripletIsSolvable(board, pieces)).toBe(true);

    // Without the mono, the i5_h has nowhere legal — unsolvable.
    const piecesNoMono = [
      pieceFromId('domino_v'),
      pieceFromId('i5_h'),
      pieceFromId('i3_h'),
    ];
    expect(tripletIsSolvable(board, piecesNoMono)).toBe(false);
  });
});

describe('boardPressure', () => {
  it('is 0 on an empty board', () => {
    expect(boardPressure(createEmptyBoard(8, 8))).toBe(0);
  });

  it('rises toward 1 as density grows', () => {
    const empty = createEmptyBoard(8, 8);
    const half: BoardState = empty.map((row, r) =>
      row.map((cell, c) => (r < 4 ? 'olive' : cell)),
    );
    expect(boardPressure(half)).toBeGreaterThan(0.3);
  });
});

describe('generateSolvableBatch', () => {
  it('always returns three pieces on an empty board', () => {
    const board = createEmptyBoard(8, 8);
    const out = generateSolvableBatch({
      board,
      bag: [],
      source: { kind: 'classic', pieceSet: 'classic' },
      rng: mulberryRng(42),
    });
    expect(out.tray).toHaveLength(3);
    expect(tripletIsSolvable(board, out.tray)).toBe(true);
  });

  it('honours a custom pool', () => {
    const board = createEmptyBoard(8, 8);
    const pool = ['i3_h', 'i3_v', 'mono', 'domino_h'];
    const out = generateSolvableBatch({
      board,
      bag: [],
      source: { kind: 'pool', pool },
      rng: mulberryRng(7),
    });
    expect(out.tray).toHaveLength(3);
  });
});

describe('promoteOrRegenerateBatch', () => {
  it('passes through a preview that is still solvable on the current board', () => {
    const board = createEmptyBoard(8, 8);
    const preview = [
      pieceFromId('mono'),
      pieceFromId('domino_h'),
      pieceFromId('i3_h'),
    ];
    const out = promoteOrRegenerateBatch({
      board,
      preview,
      bag: [],
      source: { kind: 'classic', pieceSet: 'classic' },
      rng: mulberryRng(1),
    });
    expect(out.tray).toEqual(preview.map((p) => ({ shape: p.shape, color: p.color })));
    expect(out.attempts).toBe(0);
  });

  it('swaps in a solvable batch when the preview no longer fits', () => {
    // Lock everything except one cell at (0,7). Only a mono can fit there.
    const board: BoardState = createEmptyBoard(8, 8).map((row, r) =>
      row.map((_, c) => (r === 0 && c === 7 ? null : ('olive' as const))),
    );
    // Stale preview of three large pieces — none of them can land anywhere.
    const preview = [
      pieceFromId('i5_h'),
      pieceFromId('i5_h'),
      pieceFromId('plus5'),
    ];
    expect(tripletIsSolvable(board, preview)).toBe(false);

    const out = promoteOrRegenerateBatch({
      board,
      preview,
      bag: [],
      source: { kind: 'pool', pool: ['mono', 'domino_h', 'i3_h'] },
      rng: mulberryRng(3),
    });
    // Replacement batch must be solvable on the current board.
    expect(tripletIsSolvable(board, out.tray)).toBe(true);
  });
});

describe('pickSolvableSlotRefill', () => {
  it('returns the preview unchanged when it still composes', () => {
    const board = createEmptyBoard(8, 8);
    const held = [null, pieceFromId('domino_h'), pieceFromId('i3_h')];
    const preview = pieceFromId('mono');
    const out = pickSolvableSlotRefill({
      board,
      heldTray: held,
      slotIndex: 0,
      preview,
      bag: [],
      source: { kind: 'classic', pieceSet: 'classic' },
      rng: mulberryRng(9),
    });
    expect(out.replaced).toBe(false);
    expect(out.piece.shape).toEqual(preview.shape);
  });

  it('swaps in a piece from the bag when the preview fails with the held pieces', () => {
    // Only (0,7) is open. Held pieces are already too big to fit — the one
    // we drop in has to be the mono that clears row 0.
    const board: BoardState = createEmptyBoard(8, 8).map((row, r) =>
      row.map((_, c) => (r === 0 && c === 7 ? null : ('olive' as const))),
    );
    const held: (Piece | null)[] = [null, pieceFromId('i3_h'), pieceFromId('i3_h')];
    const preview = pieceFromId('i5_h'); // won't fit anywhere
    const out = pickSolvableSlotRefill({
      board,
      heldTray: held,
      slotIndex: 0,
      preview,
      bag: [pieceFromId('mono')],
      source: { kind: 'pool', pool: ['mono'] },
      rng: mulberryRng(11),
    });
    expect(out.replaced).toBe(true);
    // The chosen piece, together with the held pieces, must be solvable.
    const finalTray = held.slice();
    finalTray[0] = out.piece;
    expect(tripletIsSolvable(board, finalTray.filter(Boolean) as Piece[])).toBe(
      true,
    );
  });
});

/** Deterministic RNG for test reproducibility. */
function mulberryRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
