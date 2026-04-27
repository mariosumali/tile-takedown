import type { Piece, PieceColor, PieceShape } from '../types';

export type PieceDef = {
  id: string;
  shape: PieceShape;
  size: number;
};

const S = (rows: (0 | 1)[][]): PieceShape => rows;

// Legacy fixed defs were the old Classic roster before Classic became a
// curated set and the old all-pieces mix moved to Crazy.
const LEGACY_FIXED_DEFS: ReadonlyArray<PieceDef> = [
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

// Extra named shapes used by the curated Classic and Tetro-only sets.
const CURATED_FIXED_DEFS: ReadonlyArray<PieceDef> = [
  { id: 'j4_a', shape: S([[0, 1], [0, 1], [1, 1]]), size: 4 },
  { id: 'j4_b', shape: S([[1, 0, 0], [1, 1, 1]]), size: 4 },
  { id: 'j4_c', shape: S([[1, 1], [1, 0], [1, 0]]), size: 4 },
  { id: 'j4_d', shape: S([[1, 1, 1], [0, 0, 1]]), size: 4 },
  { id: 's4_v', shape: S([[1, 0], [1, 1], [0, 1]]), size: 4 },
  { id: 'z4_v', shape: S([[0, 1], [1, 1], [1, 0]]), size: 4 },
  { id: 'o3', shape: S([[1, 1, 1], [1, 1, 1], [1, 1, 1]]), size: 9 },
  { id: 'rect2x3', shape: S([[1, 1, 1], [1, 1, 1]]), size: 6 },
  { id: 'rect3x2', shape: S([[1, 1], [1, 1], [1, 1]]), size: 6 },
];

/* ------------------------------------------------------------------------ */
/* Free-polyomino enumeration (used once at module load for hexominoes)      */
/* ------------------------------------------------------------------------ */

type Cell = readonly [number, number];

function normalizeCells(cells: ReadonlyArray<Cell>): Cell[] {
  let minR = Infinity;
  let minC = Infinity;
  for (const [r, c] of cells) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  const shifted: Cell[] = cells.map(([r, c]) => [r - minR, c - minC] as const);
  shifted.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  return shifted;
}

function cellsKey(cells: ReadonlyArray<Cell>): string {
  const n = normalizeCells(cells);
  let out = '';
  for (const [r, c] of n) out += `${r},${c};`;
  return out;
}

function rotate90Cells(cells: ReadonlyArray<Cell>): Cell[] {
  return normalizeCells(cells.map(([r, c]) => [c, -r] as const));
}

function reflectCells(cells: ReadonlyArray<Cell>): Cell[] {
  return normalizeCells(cells.map(([r, c]) => [r, -c] as const));
}

/**
 * Canonical key under the 8-element symmetry group (4 rotations × reflection).
 * Two polyominoes are the same free polyomino iff they share this key.
 */
function freeCanonicalKey(cells: ReadonlyArray<Cell>): string {
  let best = cellsKey(cells);
  let cur: ReadonlyArray<Cell> = cells;
  for (let i = 0; i < 3; i++) {
    cur = rotate90Cells(cur);
    const k = cellsKey(cur);
    if (k < best) best = k;
  }
  cur = reflectCells(cells);
  for (let i = 0; i < 4; i++) {
    const k = cellsKey(cur);
    if (k < best) best = k;
    if (i < 3) cur = rotate90Cells(cur);
  }
  return best;
}

function cellsToShape(cells: ReadonlyArray<Cell>): PieceShape {
  const n = normalizeCells(cells);
  let maxR = 0;
  let maxC = 0;
  for (const [r, c] of n) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  const rows: (0 | 1)[][] = Array.from({ length: maxR + 1 }, () =>
    Array(maxC + 1).fill(0),
  );
  for (const [r, c] of n) rows[r][c] = 1;
  return rows;
}

/**
 * Enumerate all free polyominoes of the given size by growing from a single
 * cell, canonicalizing under rotation + reflection, and deduplicating.
 *
 * For size ≤ 6 this runs in a handful of milliseconds at module load.
 */
function enumerateFreePolyominoes(size: number): PieceShape[] {
  if (size < 1) return [];
  let current = new Map<string, Cell[]>();
  const seed: Cell[] = [[0, 0]];
  current.set(freeCanonicalKey(seed), normalizeCells(seed));

  for (let s = 1; s < size; s++) {
    const next = new Map<string, Cell[]>();
    for (const poly of current.values()) {
      const have = new Set<string>();
      for (const [r, c] of poly) have.add(`${r},${c}`);
      for (const [r, c] of poly) {
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ] as const) {
          const nr = r + dr;
          const nc = c + dc;
          if (have.has(`${nr},${nc}`)) continue;
          const candidate: Cell[] = [...poly, [nr, nc] as const];
          const ck = freeCanonicalKey(candidate);
          if (!next.has(ck)) next.set(ck, normalizeCells(candidate));
        }
      }
    }
    current = next;
  }

  const shapes = Array.from(current.values()).map(cellsToShape);
  // Deterministic order: by canonical-key string, ascending. Stable across runs.
  shapes.sort((a, b) => {
    const ak = shapeKeyString(a);
    const bk = shapeKeyString(b);
    return ak < bk ? -1 : ak > bk ? 1 : 0;
  });
  return shapes;
}

function shapeKeyString(shape: PieceShape): string {
  return shape.map((r) => r.join('')).join('|');
}

/** Canonical free hexominoes — 35 of them. Enumerated once. */
const HEXOMINO_DEFS: ReadonlyArray<PieceDef> = enumerateFreePolyominoes(6).map(
  (shape, i) => ({
    id: `h6_${String(i + 1).padStart(2, '0')}`,
    shape,
    size: 6,
  }),
);

export const PIECE_DEFS: ReadonlyArray<PieceDef> = [
  ...LEGACY_FIXED_DEFS,
  ...CURATED_FIXED_DEFS,
  ...HEXOMINO_DEFS,
];

export const LEGACY_CLASSIC_PIECE_IDS: ReadonlyArray<string> = [
  ...LEGACY_FIXED_DEFS.map((d) => d.id),
  ...HEXOMINO_DEFS.map((d) => d.id),
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

/**
 * Bounding-box fill ratio: `cells / (rows * cols)`. A perfectly packed shape
 * (I-bars, O-blocks, plain rectangles) returns 1.0; sprawling, irregular
 * shapes with lots of empty bounding-box area return values closer to 0.5.
 *
 * Used by the bag weighting to bias piece draws toward tidier shapes — the
 * "smart tray" system prefers pieces that are easier to reason about and
 * place, especially at larger sizes where awkwardness compounds.
 */
export function shapeCompactness(shape: PieceShape): number {
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;
  const area = rows * cols;
  if (area === 0) return 1;
  let cells = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape[r][c]) cells++;
    }
  }
  return cells / area;
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

/**
 * Return the set of rotationally-distinct orientations for a shape (at most
 * four). Useful for planners that want to try every way a piece could sit.
 */
export function uniqueRotations(shape: PieceShape): PieceShape[] {
  const seen = new Set<string>();
  const out: PieceShape[] = [];
  let cur: PieceShape = shape;
  for (let i = 0; i < 4; i++) {
    const key = shapeKeyString(cur);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cur);
    }
    cur = rotateShape(cur);
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
