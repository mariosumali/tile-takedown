import type { LevelTier } from '../types';

/**
 * Balance numbers are centralized here so Levels-mode tuning never becomes an
 * archaeology expedition. Anchored to the Classic scoring formula in
 * `lib/engine/scoring.ts`:
 *
 *   placement:  2 / cell
 *   clear:      50 · 150 · 400 · 1000 (single / double / triple / quad) — each step is a larger bump than 1:1, Tetris-style
 *   combo:      1 + 0.3 · consecutive clearing turns (cap 4.0), one grace turn (no clear) before streak breaks
 *   perfect:    +500 bonus
 *
 * Assumed "competent" turn yield when projecting tier targets:
 *   - one single-line clear every ~4 placements  (≈ 4 cells · 2 · 4 turns + 50 = 82 pts / 4 turns ≈ 20 pts/turn)
 *   - occasional double / triple per tier as difficulty climbs.
 */

export type TierSpec = {
  /** Opening-level base target. */
  baseTarget: number;
  /** Multiplicative growth factor per level index within the tier. */
  growth: number;
  /** Additive bump per level — keeps late-tier targets from exploding via growth alone. */
  stepBump: number;
  /** Short copy displayed above the tier's cards. */
  label: string;
  /** One-line blurb for the level-select header. */
  blurb: string;
};

export const TIER_SPECS: Record<LevelTier, TierSpec> = {
  1: {
    baseTarget: 300,
    growth: 1.04,
    stepBump: 15,
    label: 'Onboarding',
    blurb: 'Small boards, friendly pieces. Learn the grooves.',
  },
  2: {
    baseTarget: 800,
    growth: 1.04,
    stepBump: 25,
    label: 'Shapes',
    blurb: 'The grid learns new tricks. Masks, voids, shaped boards.',
  },
  3: {
    baseTarget: 1125,
    growth: 1.03,
    stepBump: 25,
    label: 'Stretch',
    blurb: 'Tall boards, wide boards. Breathe, plan, place.',
  },
  4: {
    baseTarget: 1400,
    growth: 1.028,
    stepBump: 20,
    label: 'Awkward',
    blurb: 'Odd silhouettes, pentomino pressure. Things get nasty.',
  },
  5: {
    baseTarget: 1750,
    growth: 1.02,
    stepBump: 25,
    label: 'Gauntlet',
    blurb: 'Everything, everywhere. The final twenty.',
  },
};

/** Compute a level's 1-star target (== pass target) from its tier position. */
export function baseTarget(tier: LevelTier, withinTier: number): number {
  const spec = TIER_SPECS[tier];
  const geom = spec.baseTarget * Math.pow(spec.growth, withinTier);
  const linear = spec.stepBump * withinTier;
  return Math.round((geom + linear) / 10) * 10;
}

/** [1★, 2★, 3★]. 3★ is deliberately out of reach without combos/perfects. */
export function starThresholds(target: number): readonly [number, number, number] {
  const two = Math.round((target * 1.3) / 10) * 10;
  const three = Math.round((target * 1.7) / 10) * 10;
  return [target, two, three];
}

/** Expected moves to complete, assuming one tray no-fit-reshuffle budget. */
export function parMoves(playableCellCount: number, avgSize: number): number {
  return Math.max(6, Math.ceil((playableCellCount / Math.max(1, avgSize)) * 1.4));
}
