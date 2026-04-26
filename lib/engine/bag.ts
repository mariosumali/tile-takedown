import type { Piece, PieceColor, PieceSet } from '../types';
import { PIECE_COLORS, PIECE_DEFS, shapeCompactness, type PieceDef } from './pieces';

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

function filterDefs(variant: PieceSet): ReadonlyArray<PieceDef> {
  switch (variant) {
    case 'tetro_only':
      return PIECE_DEFS.filter((d) => d.size === 4);
    case 'pentomino_chaos':
      // Historically `size >= 4`; hexominoes would otherwise flood this
      // variant. Keep it 4+5 so the "chaos" stays within the original spirit.
      return PIECE_DEFS.filter((d) => d.size === 4 || d.size === 5);
    case 'small_only':
      return PIECE_DEFS.filter((d) => d.size <= 3);
    case 'classic':
    default:
      return PIECE_DEFS;
  }
}

/** Resolve piece ids into defs; unknown ids are skipped. */
function defsFromIds(ids: ReadonlyArray<string>): ReadonlyArray<PieceDef> {
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
): Piece[] {
  if (defs.length === 0) return [];
  const weights = defs.map((d) => Math.max(0.05, weightFor(d, density)));
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
  return bagFromDefs(filterDefs(variant), density, rng);
}

/** Build a bag from an explicit piece-id pool (used by Levels mode). */
export function buildBagFromPool(
  ids: ReadonlyArray<string>,
  density: number,
  rng: () => number = Math.random,
): Piece[] {
  const defs = defsFromIds(ids);
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
