import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE,
  canPlace,
  canAnyPieceFit,
  clearLines,
  createEmptyBoard,
  getClearedLines,
  placePiece,
  boardIsEmpty,
  boardDensity,
} from './grid';
import { PIECE_DEFS } from './pieces';

const iFour = PIECE_DEFS.find((d) => d.id === 'i4_h')!.shape;
const iFive = PIECE_DEFS.find((d) => d.id === 'i5_h')!.shape;

describe('grid', () => {
  it('creates 8x8 empty board', () => {
    const b = createEmptyBoard();
    expect(b.length).toBe(BOARD_SIZE);
    expect(b[0].length).toBe(BOARD_SIZE);
    expect(boardIsEmpty(b)).toBe(true);
  });

  it('rejects out-of-bounds placement', () => {
    const b = createEmptyBoard();
    expect(canPlace(b, iFour, 0, 5)).toBe(false); // would reach col 8
    expect(canPlace(b, iFour, 0, 4)).toBe(true);
  });

  it('rejects overlapping placement', () => {
    let b = createEmptyBoard();
    b = placePiece(b, { shape: iFour, color: 'tomato' }, 0, 0);
    expect(canPlace(b, iFour, 0, 0)).toBe(false);
    expect(canPlace(b, iFour, 0, 4)).toBe(true);
  });

  it('getClearedLines finds full rows and columns', () => {
    let b = createEmptyBoard();
    // Fill row 3 with two i4s
    b = placePiece(b, { shape: iFour, color: 'tomato' }, 3, 0);
    b = placePiece(b, { shape: iFour, color: 'sky' }, 3, 4);
    const res = getClearedLines(b);
    expect(res.rows).toEqual([3]);
    expect(res.cols).toEqual([]);
    expect(res.totalLines).toBe(1);
  });

  it('clearLines empties identified lines', () => {
    let b = createEmptyBoard();
    b = placePiece(b, { shape: iFour, color: 'tomato' }, 3, 0);
    b = placePiece(b, { shape: iFour, color: 'sky' }, 3, 4);
    b = clearLines(b, [3], []);
    expect(boardIsEmpty(b)).toBe(true);
  });

  it('detects simultaneous row+col clear (cross)', () => {
    let b: any = createEmptyBoard().map((row) => row.slice());
    for (let i = 1; i < 8; i++) b[i][0] = 'tomato';
    for (let i = 1; i < 8; i++) b[0][i] = 'sky';
    // Place a mono at (0,0) — completes both row 0 AND col 0.
    b = placePiece(b, { shape: [[1]], color: 'mustard' }, 0, 0);
    const res = getClearedLines(b);
    expect(res.rows).toContain(0);
    expect(res.cols).toContain(0);
    expect(res.totalLines).toBe(2);
  });

  it('canAnyPieceFit returns false on tight board', () => {
    const b: (string | null)[][] = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => 'tomato' as string | null),
    );
    b[0][0] = null;
    const board = b as any;
    expect(canAnyPieceFit(board, [{ shape: iFour }, { shape: iFive }])).toBe(false);
    expect(canAnyPieceFit(board, [{ shape: [[1]] }])).toBe(true);
  });

  it('boardDensity computes fraction filled', () => {
    let b = createEmptyBoard();
    b = placePiece(b, { shape: iFour, color: 'tomato' }, 0, 0);
    expect(boardDensity(b)).toBeCloseTo(4 / 64);
  });
});
