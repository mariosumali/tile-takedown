import type { LevelDef, LevelTier, BoardMask, PieceSet } from '../types';
import { MASK, POOL, avgPoolSize, poolFromIds } from './helpers';
import { baseTarget, parMoves, starThresholds } from './balance';

type LevelInput = {
  name: string;
  rows: number;
  cols: number;
  mask?: BoardMask;
  pieceSet: PieceSet | 'custom';
  customPool?: ReadonlyArray<string>;
  /** Optional multiplier on the tier's base target. Defaults to 1. */
  targetMul?: number;
  intro?: string;
};

/** Build a LevelDef from the template + balance helpers. */
function build(
  id: string,
  index: number,
  tier: LevelTier,
  withinTier: number,
  input: LevelInput,
): LevelDef {
  const { rows, cols, mask, pieceSet, customPool, name, intro } = input;
  const target = Math.round(
    baseTarget(tier, withinTier) * (input.targetMul ?? 1) / 10,
  ) * 10;

  const pool = customPool ?? POOL.full;
  const avg = avgPoolSize(poolFromIds(pool));
  const playable = mask
    ? mask.reduce(
        (acc, row) => acc + row.reduce((a, c) => a + (c ? 1 : 0), 0),
        0,
      )
    : rows * cols;

  return {
    id,
    index,
    tier,
    name,
    dims: { rows, cols, mask },
    pieceSet,
    customPool: pieceSet === 'custom' ? [...(customPool ?? [])] : undefined,
    targetScore: target,
    starThresholds: starThresholds(target),
    parMoves: parMoves(playable, avg),
    intro,
  };
}

/* ------------------------------------------------------------------------ */
/* Tier 1 · Onboarding (L001–L020)                                           */
/* ------------------------------------------------------------------------ */

const TIER1_NAMES = [
  'First light', 'Warm up', 'Little things', 'Soft pass', 'Easy does it',
  'Tidy up', 'The basics', 'Gentle climb', 'Breath work', 'Mise en place',
  'Simple plan', 'Corner turn', 'Side step', 'Mini clear', 'Single file',
  'Pair off', 'Triple tap', 'Clear skies', 'Tiny feast', 'Bright start',
];

const tier1: LevelInput[] = TIER1_NAMES.map((name, i) => {
  // 1–5  : 6×6, tiny pool
  // 6–10 : 6×6, small pool
  // 11–15: 7×7, small pool
  // 16–20: 7×7, tetro pool
  const group = Math.floor(i / 5); // 0..3
  const size = group < 2 ? 6 : 7;
  const pool =
    group === 0 ? POOL.tiny :
    group === 1 ? POOL.small :
    group === 2 ? POOL.small :
    POOL.tetro;
  return {
    name,
    rows: size,
    cols: size,
    pieceSet: 'custom',
    customPool: pool,
    intro: i === 0 ? 'Drag a piece to the grid. Fill a row or column to clear it.' : undefined,
  };
});

/* ------------------------------------------------------------------------ */
/* Tier 2 · Shapes (L021–L040)                                               */
/* ------------------------------------------------------------------------ */

const TIER2_NAMES = [
  'Diamond cut', 'Plus one', 'Corner case', 'Ring leader', 'Hourglass',
  'H-mark', 'T-formation', 'L-shape', 'Keyhole', 'Odd angles',
  'Cut corners', 'Cross paths', 'Narrow lanes', 'Squeeze play', 'Double plus',
  'Four-sided', 'Ring twice', 'Hour two', 'Plus again', 'Diamond encore',
];

const TIER2_MASKS: BoardMask[] = [
  MASK.diamond8, MASK.plus8, MASK.cornerSnip8, MASK.ring8, MASK.hourglass8,
  MASK.h8, MASK.t8, MASK.l8, MASK.keyhole8, MASK.cornerSnip8,
  MASK.cornerSnip8, MASK.plus8, MASK.t8, MASK.hourglass8, MASK.plus8,
  MASK.cornerSnip8, MASK.ring8, MASK.hourglass8, MASK.plus8, MASK.diamond8,
];

const tier2: LevelInput[] = TIER2_NAMES.map((name, i) => ({
  name,
  rows: 8,
  cols: 8,
  mask: TIER2_MASKS[i],
  pieceSet: 'custom',
  // First half tetros-only, second half tetros + T-pent for variety.
  customPool: i < 10 ? POOL.tetro : POOL.tetroPlusT,
  intro: i === 0 ? 'Voids are permanent — work around them, not on them.' : undefined,
}));

/* ------------------------------------------------------------------------ */
/* Tier 3 · Stretch (L041–L060)                                              */
/* ------------------------------------------------------------------------ */

const TIER3_NAMES = [
  'Stretch out', 'Tall tale', 'Wide angle', 'Long shot', 'Broad stroke',
  'Uphill', 'Downstream', 'Ladder', 'Horizon', 'Runway',
  'Catwalk', 'Balcony', 'Avenue', 'Promenade', 'Boulevard',
  'Gallery', 'Atrium', 'Corridor', 'Stretch finish', 'Hallway',
];

const TIER3_SHAPES: Array<{ rows: number; cols: number }> = [
  { rows: 6, cols: 10 },
  { rows: 10, cols: 6 },
  { rows: 9, cols: 7 },
  { rows: 7, cols: 9 },
];

const tier3: LevelInput[] = TIER3_NAMES.map((name, i) => {
  const shape = TIER3_SHAPES[i % TIER3_SHAPES.length];
  return {
    name,
    rows: shape.rows,
    cols: shape.cols,
    pieceSet: 'custom',
    customPool: i < 10 ? POOL.tetroPlusPento : POOL.pentoHeavy,
    intro: i === 0 ? 'Longer lines mean bigger payouts — plan the clear.' : undefined,
  };
});

/* ------------------------------------------------------------------------ */
/* Tier 4 · Awkward (L061–L080)                                              */
/* ------------------------------------------------------------------------ */

const TIER4_NAMES = [
  'Awkward', 'Sideways', 'Bent line', 'Unkind geometry', 'Crooked',
  'Sharp edge', 'Rough edge', 'Leaning tower', 'Odd shape', 'Wrong angle',
  'Disagreeable', 'Hostile', 'Stubborn', 'Cranky', 'Moody',
  'Stinger', 'Thorny', 'Bramble', 'Prickly', 'Ornery',
];

const TIER4_ENTRIES: Array<{ rows: number; cols: number; mask: BoardMask }> = [
  { rows: 10, cols: 8, mask: MASK.cornerSnip10x8 },
  { rows: 10, cols: 8, mask: MASK.notched10x8 },
  { rows: 8, cols: 10, mask: MASK.angled8x10 },
  { rows: 8, cols: 10, mask: MASK.notched8x10 },
  { rows: 10, cols: 8, mask: MASK.hWide10x8 },
  { rows: 10, cols: 8, mask: MASK.c10x8 },
];

const tier4: LevelInput[] = TIER4_NAMES.map((name, i) => {
  const ent = TIER4_ENTRIES[i % TIER4_ENTRIES.length];
  return {
    name,
    rows: ent.rows,
    cols: ent.cols,
    mask: ent.mask,
    pieceSet: 'custom',
    // First half uses tetro + pentos (3 pentos); second half goes pento-heavy.
    customPool: POOL.tetroPlusPento,
    intro: i === 0 ? 'Combos win these. Chain two clears back-to-back when you can.' : undefined,
  };
});

/* ------------------------------------------------------------------------ */
/* Tier 5 · Gauntlet (L081–L100)                                             */
/* ------------------------------------------------------------------------ */

const TIER5_NAMES = [
  'Gauntlet I', 'Gauntlet II', 'Spiral', 'Double ring', 'Keyhole XL',
  'Stripes', 'Maze', 'Labyrinth', 'Crucible', 'Foundry',
  'Furnace', 'Abyss', 'Peak', 'Summit', 'Crown',
  'Throne', 'Apex', 'Culmination', 'Finale', 'Encore',
];

const TIER5_ENTRIES: Array<{ mask?: BoardMask; pool: ReadonlyArray<string>; targetMul?: number }> = [
  { pool: POOL.full },
  { mask: MASK.ring10, pool: POOL.full },
  { pool: POOL.tetroPlusPento },
  { mask: MASK.doubleRing10, pool: POOL.full },
  { pool: POOL.tetroPlusPento, targetMul: 1.05 },
  { mask: MASK.ring10, pool: POOL.tetroPlusPento, targetMul: 1.05 },
  { mask: MASK.keyhole10, pool: POOL.full, targetMul: 1.00 },
  { mask: MASK.doubleRing10, pool: POOL.tetroPlusPento, targetMul: 1.05 },
  { pool: POOL.pentoHeavy, targetMul: 1.05 },
  { mask: MASK.ring10, pool: POOL.pentoHeavy, targetMul: 1.05 },
  { pool: POOL.tetroPlusPento, targetMul: 1.10 },
  { mask: MASK.doubleRing10, pool: POOL.tetroPlusPento, targetMul: 1.10 },
  { pool: POOL.pentoHeavy, targetMul: 1.10 },
  { mask: MASK.ring10, pool: POOL.pentoHeavy, targetMul: 1.10 },
  { mask: MASK.keyhole10, pool: POOL.tetroPlusPento, targetMul: 1.10 },
  { mask: MASK.ring10, pool: POOL.tetroPlusPento, targetMul: 1.15 },
  { pool: POOL.pentoHeavy, targetMul: 1.15 },
  { mask: MASK.ring10, pool: POOL.pentoHeavy, targetMul: 1.15 },
  { pool: POOL.pentoHeavy, targetMul: 1.20 },
  // L100 — full 10×10, pentomino-heavy capstone.
  { pool: POOL.pentoHeavy, targetMul: 0.95 },
];

const tier5: LevelInput[] = TIER5_NAMES.map((name, i) => {
  const ent = TIER5_ENTRIES[i];
  return {
    name,
    rows: 10,
    cols: 10,
    mask: ent.mask,
    pieceSet: 'custom',
    customPool: ent.pool,
    targetMul: ent.targetMul,
    intro: i === 0 ? 'All 19 pieces in play now. Plan your perfect clears.' :
           i === 19 ? 'No mask. No small pieces. Just you, ten by ten, and pentominos.' :
           undefined,
  };
});

/* ------------------------------------------------------------------------ */
/* Assemble                                                                  */
/* ------------------------------------------------------------------------ */

function assemble(
  tier: LevelTier,
  startIndex: number,
  inputs: LevelInput[],
): LevelDef[] {
  return inputs.map((input, within) => {
    const index = startIndex + within;
    const id = `L${String(index).padStart(3, '0')}`;
    return build(id, index, tier, within, input);
  });
}

export const LEVELS: ReadonlyArray<LevelDef> = [
  ...assemble(1, 1, tier1),
  ...assemble(2, 21, tier2),
  ...assemble(3, 41, tier3),
  ...assemble(4, 61, tier4),
  ...assemble(5, 81, tier5),
];

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsByTier(tier: LevelTier): ReadonlyArray<LevelDef> {
  return LEVELS.filter((l) => l.tier === tier);
}

export const TOTAL_LEVELS = LEVELS.length;
