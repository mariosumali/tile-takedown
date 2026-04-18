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
  playableCells,
} from './grid';
import { PIECE_DEFS } from './pieces';

const iFour = PIECE_DEFS.find((d) => d.id === 'i4_h')!.shape;
const iFive = PIECE_DEFS.find((d) => d.id === 'i5_h')!.shape;
const mono = PIECE_DEFS.find((d) => d.id === 'mono')!.shape;

describe('grid', () => {
  it('creates 8x8 empty board by default', () => {
    const b = createEmptyBoard();
    expect(b.length).toBe(BOARD_SIZE);
    expect(b[0].length).toBe(BOARD_SIZE);
    expect(boardIsEmpty(b)).toBe(true);
  });

  it('creates non-square boards from explicit dims', () => {
    const b = createEmptyBoard(6, 10);
    expect(b.length).toBe(6);
    expect(b[0].length).toBe(10);
  });

  it('rejects out-of-bounds placement', () => {
    const b = createEmptyBoard();
    expect(canPlace(b, iFour, 0, 5)).toBe(false);
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

  describe('mask support', () => {
    const b5x5 = createEmptyBoard(5, 5);
    // Plus-shaped mask: corners are void.
    const plusMask = [
      [false, false, true, false, false],
      [false, true, true, true, false],
      [true, true, true, true, true],
      [false, true, true, true, false],
      [false, false, true, false, false],
    ];

    it('canPlace rejects void cells', () => {
      expect(canPlace(b5x5, mono, 0, 0, plusMask)).toBe(false);
      expect(canPlace(b5x5, mono, 0, 2, plusMask)).toBe(true);
    });

    it('placePiece ignores void cells when defensively called', () => {
      const b2 = placePiece(
        b5x5,
        { shape: [[1, 1]], color: 'tomato' },
        0,
        0,
        plusMask,
      );
      expect(b2[0][0]).toBeNull();
      expect(b2[0][1]).toBeNull();
    });

    it('getClearedLines treats row with all playable cells filled as cleared', () => {
      let b = b5x5.map((row) => row.slice()) as any;
      b[2] = ['tomato', 'sky', 'mustard', 'olive', 'plum'];
      const res = getClearedLines(b, plusMask);
      expect(res.rows).toContain(2);
    });

    it('getClearedLines clears row 0 (single playable cell at col 2) when that one cell is filled', () => {
      let b = b5x5.map((row) => row.slice()) as any;
      b[0][2] = 'tomato';
      const res = getClearedLines(b, plusMask);
      expect(res.rows).toContain(0);
    });

    it('boardDensity uses playable-cell count as denominator', () => {
      let b = b5x5.map((row) => row.slice()) as any;
      b[2][2] = 'tomato';
      // plus mask has 13 playable cells
      expect(boardDensity(b, plusMask)).toBeCloseTo(1 / 13);
    });

    it('playableCells counts correctly', () => {
      expect(playableCells(5, 5)).toBe(25);
      expect(playableCells(5, 5, plusMask)).toBe(13);
    });
  });
});
