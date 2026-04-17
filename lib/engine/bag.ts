import type { Piece, PieceColor, PieceSet } from '../types';
import { PIECE_COLORS, PIECE_DEFS, type PieceDef } from './pieces';

const BAG_SIZE = 60;

/** Weighted choice from defs according to size and density bias. */
function weightFor(def: PieceDef, density: number): number {
  // Favor small pieces early; as density climbs past 40%, weight big pieces up.
  const bias = Math.max(0, density - 0.4); // 0..0.6
  switch (def.size) {
    case 1:
      return 2.0 - bias * 1.5;
    case 2:
      return 3.0 - bias * 1.0;
    case 3:
      return 3.5 - bias * 0.5;
    case 4:
      return 2.5 + bias * 0.8;
    case 5:
      return 1.5 + bias * 1.5;
    default:
      return 1;
  }
}

function filterDefs(variant: PieceSet): ReadonlyArray<PieceDef> {
  switch (variant) {
    case 'tetro_only':
      return PIECE_DEFS.filter((d) => d.size === 4);
    case 'pentomino_chaos':
      return PIECE_DEFS.filter((d) => d.size >= 4);
    case 'small_only':
      return PIECE_DEFS.filter((d) => d.size <= 3);
    case 'classic':
    default:
      return PIECE_DEFS;
  }
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

/** Build a bag of 60 pieces (without replacement) for the current density. */
export function buildBag(
  variant: PieceSet,
  density: number,
  rng: () => number = Math.random,
): Piece[] {
  const defs = filterDefs(variant);
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
