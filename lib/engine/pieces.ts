import type { Piece, PieceColor, PieceShape } from '../types';

export type PieceDef = {
  id: string;
  shape: PieceShape;
  size: number;
};

const S = (rows: (0 | 1)[][]): PieceShape => rows;

export const PIECE_DEFS: ReadonlyArray<PieceDef> = [
  { id: 'mono', shape: S([[1]]), size: 1 },

  { id: 'domino_h', shape: S([[1, 1]]), size: 2 },
  { id: 'domino_v', shape: S([[1], [1]]), size: 2 },

  { id: 'i3_h', shape: S([[1, 1, 1]]), size: 3 },
  { id: 'i3_v', shape: S([[1], [1], [1]]), size: 3 },
  { id: 'l3_a', shape: S([[1, 0], [1, 1]]), size: 3 },
  { id: 'l3_b', shape: S([[1, 1], [1, 0]]), size: 3 },
  { id: 'l3_c', shape: S([[1, 1], [0, 1]]), size: 3 },
  { id: 'l3_d', shape: S([[0, 1], [1, 1]]), size: 3 },

  { id: 'i4_h', shape: S([[1, 1, 1, 1]]), size: 4 },
  { id: 'i4_v', shape: S([[1], [1], [1], [1]]), size: 4 },
  { id: 'o2', shape: S([[1, 1], [1, 1]]), size: 4 },
  { id: 'l4_a', shape: S([[1, 0], [1, 0], [1, 1]]), size: 4 },
  { id: 'l4_b', shape: S([[1, 1, 1], [1, 0, 0]]), size: 4 },
  { id: 'l4_c', shape: S([[1, 1], [0, 1], [0, 1]]), size: 4 },
  { id: 'l4_d', shape: S([[0, 0, 1], [1, 1, 1]]), size: 4 },
  { id: 's4', shape: S([[0, 1, 1], [1, 1, 0]]), size: 4 },
  { id: 'z4', shape: S([[1, 1, 0], [0, 1, 1]]), size: 4 },
  { id: 't4_a', shape: S([[1, 1, 1], [0, 1, 0]]), size: 4 },
  { id: 't4_b', shape: S([[1, 0], [1, 1], [1, 0]]), size: 4 },
  { id: 't4_c', shape: S([[0, 1, 0], [1, 1, 1]]), size: 4 },
  { id: 't4_d', shape: S([[0, 1], [1, 1], [0, 1]]), size: 4 },

  { id: 'i5_h', shape: S([[1, 1, 1, 1, 1]]), size: 5 },
  { id: 'i5_v', shape: S([[1], [1], [1], [1], [1]]), size: 5 },
  { id: 'l5_a', shape: S([[1, 0], [1, 0], [1, 0], [1, 1]]), size: 5 },
  { id: 'l5_b', shape: S([[1, 1, 1, 1], [1, 0, 0, 0]]), size: 5 },
  { id: 'l5_c', shape: S([[1, 1], [0, 1], [0, 1], [0, 1]]), size: 5 },
  { id: 'l5_d', shape: S([[0, 0, 0, 1], [1, 1, 1, 1]]), size: 5 },
  { id: 'p5_a', shape: S([[1, 1], [1, 1], [1, 0]]), size: 5 },
  { id: 'p5_b', shape: S([[1, 1, 1], [0, 1, 1]]), size: 5 },
  { id: 'p5_c', shape: S([[0, 1], [1, 1], [1, 1]]), size: 5 },
  { id: 'p5_d', shape: S([[1, 1, 0], [1, 1, 1]]), size: 5 },
  { id: 'plus5', shape: S([[0, 1, 0], [1, 1, 1], [0, 1, 0]]), size: 5 },
];

export const PIECE_COLORS: ReadonlyArray<PieceColor> = [
  'tomato',
  'mustard',
  'olive',
  'sky',
  'plum',
  // 'cream' is intentionally omitted from the rotation — its fill sits
  // too close to the paper-tone board background to read clearly, even
  // with the ink border. It's still a valid `PieceColor` so any saved
  // runs that already contain cream tiles continue to render fine.
];

/** All cells (row, col offsets) occupied by the piece. */
export function pieceCells(shape: PieceShape): ReadonlyArray<[number, number]> {
  const out: [number, number][] = [];
  for (let r = 0; r < shape.length; r++) {
    const row = shape[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c]) out.push([r, c]);
    }
  }
  return out;
}

export function pieceSize(shape: PieceShape): number {
  return pieceCells(shape).length;
}

/** Rotate a shape 90° clockwise. */
export function rotateShape(shape: PieceShape): PieceShape {
  const h = shape.length;
  const w = shape[0]?.length ?? 0;
  const out: (0 | 1)[][] = Array.from({ length: w }, () => Array(h).fill(0));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      out[c][h - 1 - r] = shape[r][c];
    }
  }
  return out;
}

export function makePiece(def: PieceDef, color: PieceColor): Piece {
  return { shape: def.shape, color };
}

/** Lookup by id. */
export function getDef(id: string): PieceDef | undefined {
  return PIECE_DEFS.find((d) => d.id === id);
}
