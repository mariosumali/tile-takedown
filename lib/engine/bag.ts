import type { Piece, PieceColor, PieceSet } from '../types';
import {
  LEGACY_CLASSIC_PIECE_IDS,
  PIECE_COLORS,
  PIECE_DEFS,
  shapeCompactness,
  type PieceDef,
} from './pieces';

const BAG_SIZE = 60;

/**
 * Weighted choice from defs according to size, density bias, and how
 * "awkward" the shape is.
 *
 * The size tier sets the base rate, then a compactness multiplier knocks
 * sprawling shapes further down — this is how the smart tray keeps
 * hexominoes like irregular "S with a tail" variants rare while still
 * letting the tidy ones (I6, O-blocks, rectangles) surface sometimes.
 */
function weightFor(def: PieceDef, density: number): number {
  // Favor small pieces early; as density climbs past 40%, weight big pieces up.
  const bias = Math.max(0, density - 0.4); // 0..0.6
  let base: number;
  switch (def.size) {
    case 1:
      base = 2.0 - bias * 1.5;
      break;
    case 2:
      base = 3.0 - bias * 1.0;
      break;
    case 3:
      base = 3.5 - bias * 0.5;
      break;
    case 4:
      base = 2.5 + bias * 0.8;
      break;
    case 5:
      base = 1.5 + bias * 1.5;
      break;
    case 6:
      // Hexominoes are the deepest "chaos" tier. Base rate is intentionally
      // well under pentominoes, and the compactness penalty below culls the
      // most sprawling variants so only the tidier hexes show up regularly.
      base = 0.2 + bias * 0.7;
      break;
    default:
      base = 1;
  }

  // Hexomino-only compactness penalty — pentominoes and smaller are common
  // shapes the player is expected to handle, but sprawling 6-cell variants
  // (the "crazy" pieces) should be the rarest thing in the bag.
  if (def.size === 6) {
    const c = shapeCompactness(def.shape);
    base *= Math.pow(c, 2.2);
  }

  return base;
}

const TETROMINO_PIECE_IDS: ReadonlyArray<string> = [
  'i4_h', 'i4_v', 'o2',
  'l4_a', 'l4_b', 'l4_c', 'l4_d',
  'j4_a', 'j4_b', 'j4_c', 'j4_d',
  's4', 's4_v',
  'z4', 'z4_v',
  't4_a', 't4_b', 't4_c', 't4_d',
];

const CLASSIC_PIECE_IDS: ReadonlyArray<string> = [
  ...TETROMINO_PIECE_IDS,
  'o3',
  'rect2x3', 'rect3x2',
  'i5_h', 'i5_v',
  'l5_a', 'l5_b', 'l5_c', 'l5_d',
];

// Classic should feel generous: favor clean blocks, rectangles, and angle
// pieces over zig-zags and long bars. These are absolute mature-game weights
// because the generic size curve treats 6-cell pieces as rare "chaos" shapes,
// which makes friendly 2x3 rectangles show up far less than intended.
const CLASSIC_EASY_WEIGHTS: Readonly<Record<string, number>> = {
  o2: 3.5,
  o3: 4.5,
  rect2x3: 4.25,
  rect3x2: 4.25,

  l4_a: 3.25,
  l4_b: 3.25,
  l4_c: 3.25,
  l4_d: 3.25,
  j4_a: 3.25,
  j4_b: 3.25,
  j4_c: 3.25,
  j4_d: 3.25,

  l5_a: 2.75,
  l5_b: 2.75,
  l5_c: 2.75,
  l5_d: 2.75,
};

const CLASSIC_OPENING_NON_EASY_WEIGHT = 0.12;
const CLASSIC_OPENING_BIAS_END_DENSITY = 0.6;

function classicWeightFor(def: PieceDef, density: number): number {
  const matureWeight = CLASSIC_EASY_WEIGHTS[def.id] ?? weightFor(def, density);
  const openingBias = Math.max(
    0,
    Math.min(1, 1 - density / CLASSIC_OPENING_BIAS_END_DENSITY),
  );
  if (openingBias === 0) return matureWeight;

  const openingWeight =
    CLASSIC_EASY_WEIGHTS[def.id] === undefined
      ? CLASSIC_OPENING_NON_EASY_WEIGHT
      : matureWeight * 3;

  return matureWeight * (1 - openingBias) + openingWeight * openingBias;
}

function defsFromIds(ids: ReadonlyArray<string>): ReadonlyArray<PieceDef> {
  const out: PieceDef[] = [];
  for (const id of ids) {
    const def = PIECE_DEFS.find((d) => d.id === id);
    if (def) out.push(def);
  }
  return out;
}

export function pieceDefsForSet(variant: PieceSet): ReadonlyArray<PieceDef> {
  switch (variant) {
    case 'tetro_only':
      return defsFromIds(TETROMINO_PIECE_IDS);
    case 'crazy':
      return defsFromIds(LEGACY_CLASSIC_PIECE_IDS);
    case 'small_only':
      return PIECE_DEFS.filter((d) => d.size <= 3);
    case 'classic':
    default:
      return defsFromIds(CLASSIC_PIECE_IDS);
  }
}

/** Resolve piece ids into defs; unknown ids are skipped. */
function defsFromPoolIds(ids: ReadonlyArray<string>): ReadonlyArray<PieceDef> {
  const out: PieceDef[] = [];
  for (const id of ids) {
    const def = PIECE_DEFS.find((d) => d.id === id);
    if (def) out.push(def);
  }
  return out;
}

export function makeRng(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pickColor(rng: () => number): PieceColor {
  return PIECE_COLORS[Math.floor(rng() * PIECE_COLORS.length)];
}

function bagFromDefs(
  defs: ReadonlyArray<PieceDef>,
  density: number,
  rng: () => number,
  getWeight: (def: PieceDef, density: number) => number = weightFor,
): Piece[] {
  if (defs.length === 0) return [];
  const weights = defs.map((d) => Math.max(0.05, getWeight(d, density)));
  const total = weights.reduce((a, b) => a + b, 0);
  const bag: Piece[] = [];
  for (let i = 0; i < BAG_SIZE; i++) {
    let r = rng() * total;
    let picked = defs[0];
    for (let j = 0; j < defs.length; j++) {
      r -= weights[j];
      if (r <= 0) {
        picked = defs[j];
        break;
      }
    }
    bag.push({ shape: picked.shape, color: pickColor(rng) });
  }
  return shuffle(bag, rng);
}

/** Build a bag of 60 pieces (without replacement) for the current density. */
export function buildBag(
  variant: PieceSet,
  density: number,
  rng: () => number = Math.random,
): Piece[] {
  return bagFromDefs(
    pieceDefsForSet(variant),
    density,
    rng,
    variant === 'classic' ? classicWeightFor : weightFor,
  );
}

/** Build a bag from an explicit piece-id pool (used by Levels mode). */
export function buildBagFromPool(
  ids: ReadonlyArray<string>,
  density: number,
  rng: () => number = Math.random,
): Piece[] {
  const defs = defsFromPoolIds(ids);
  if (defs.length === 0) return buildBag('classic', density, rng);
  return bagFromDefs(defs, density, rng);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draw 3 pieces, topping up the bag if low. Returns [tray, newBag]. */
export function drawTray(
  bag: ReadonlyArray<Piece>,
  variant: PieceSet,
  density: number,
  rng: () => number = Math.random,
): { tray: Piece[]; bag: Piece[] } {
  let working: Piece[] = bag.slice();
  if (working.length < 3) {
    working = working.concat(buildBag(variant, density, rng));
  }
  const tray = working.slice(0, 3);
  const rest = working.slice(3);
  return { tray, bag: rest };
}

/** Draw 3 pieces from a custom pool (Levels mode). */
export function drawTrayFromPool(
  bag: ReadonlyArray<Piece>,
  pool: ReadonlyArray<string>,
  density: number,
  rng: () => number = Math.random,
): { tray: Piece[]; bag: Piece[] } {
  let working: Piece[] = bag.slice();
  if (working.length < 3) {
    working = working.concat(buildBagFromPool(pool, density, rng));
  }
  const tray = working.slice(0, 3);
  const rest = working.slice(3);
  return { tray, bag: rest };
}

/** Draw a single piece, topping up the bag if empty. */
export function drawOne(
  bag: ReadonlyArray<Piece>,
  variant: PieceSet,
  density: number,
  rng: () => number = Math.random,
): { piece: Piece; bag: Piece[] } {
  let working: Piece[] = bag.slice();
  if (working.length < 1) {
    working = working.concat(buildBag(variant, density, rng));
  }
  return { piece: working[0], bag: working.slice(1) };
}

/** Draw a single piece from a custom pool. */
export function drawOneFromPool(
  bag: ReadonlyArray<Piece>,
  pool: ReadonlyArray<string>,
  density: number,
  rng: () => number = Math.random,
): { piece: Piece; bag: Piece[] } {
  let working: Piece[] = bag.slice();
  if (working.length < 1) {
    working = working.concat(buildBagFromPool(pool, density, rng));
  }
  return { piece: working[0], bag: working.slice(1) };
}
