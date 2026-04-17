import { describe, it, expect } from 'vitest';
import {
  PIECE_DEFS,
  pieceCells,
  pieceSize,
  rotateShape,
} from './pieces';

describe('pieces', () => {
  it('has exactly 33 piece defs (19 families including rotations)', () => {
    // All unique rotational variants of the 19-family set listed in PRD.
    // 1 mono + 2 domino + 6 tri + 13 tetro + 11 pento = 33
    expect(PIECE_DEFS.length).toBe(33);
  });

  it('every piece has between 1 and 5 cells', () => {
    for (const def of PIECE_DEFS) {
      const n = pieceSize(def.shape);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(5);
      expect(n).toBe(def.size);
    }
  });

  it('pieceCells returns correct offsets for L4_a', () => {
    const shape = PIECE_DEFS.find((d) => d.id === 'l4_a')!.shape;
    const cells = pieceCells(shape);
    expect(cells).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ]);
  });

  it('rotateShape rotates 90° clockwise', () => {
    const shape = [
      [1, 1, 1],
      [0, 1, 0],
    ] as const;
    const rotated = rotateShape(shape);
    expect(rotated).toEqual([
      [0, 1],
      [1, 1],
      [0, 1],
    ]);
  });

  it('four rotations of L3_a return original shape', () => {
    const start = PIECE_DEFS.find((d) => d.id === 'l3_a')!.shape;
    let cur: ReturnType<typeof rotateShape> = start;
    for (let i = 0; i < 4; i++) cur = rotateShape(cur);
    expect(cur).toEqual(start);
  });
});
