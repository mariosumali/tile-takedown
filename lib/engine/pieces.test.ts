import { describe, it, expect } from 'vitest';
import {
  PIECE_DEFS,
  pieceCells,
  pieceSize,
  rotateShape,
  uniqueRotations,
} from './pieces';

describe('pieces', () => {
  it('has 68 piece defs (33 up through pentominoes + 35 free hexominoes)', () => {
    // 1 mono + 2 domino + 6 tri + 13 tetro + 11 pento = 33
    // + 35 free hexominoes (enumerated once at module load) = 68
    expect(PIECE_DEFS.length).toBe(68);
  });

  it('has exactly 35 hexominoes, each with 6 cells', () => {
    const hexes = PIECE_DEFS.filter((d) => d.size === 6);
    expect(hexes.length).toBe(35);
    for (const d of hexes) {
      expect(pieceSize(d.shape)).toBe(6);
      expect(d.id.startsWith('h6_')).toBe(true);
    }
  });

  it('hexomino ids are unique', () => {
    const ids = new Set(PIECE_DEFS.map((d) => d.id));
    expect(ids.size).toBe(PIECE_DEFS.length);
  });

  it('every piece has between 1 and 6 cells', () => {
    for (const def of PIECE_DEFS) {
      const n = pieceSize(def.shape);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      expect(n).toBe(def.size);
    }
  });

  it('uniqueRotations returns 1..4 distinct orientations', () => {
    expect(uniqueRotations([[1]]).length).toBe(1);
    expect(uniqueRotations([[1, 1], [1, 1]]).length).toBe(1);
    expect(uniqueRotations([[1, 1, 1, 1]]).length).toBe(2);
    const l = [[1, 0], [1, 0], [1, 1]] as const;
    expect(uniqueRotations(l).length).toBe(4);
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
