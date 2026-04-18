import type { LevelTier } from '../types';

/**
 * Balance numbers are centralized here so Levels-mode tuning never becomes an
 * archaeology expedition. Anchored to the Classic scoring formula in
 * `lib/engine/scoring.ts`:
 *
 *   placement:  1 / cell
 *   clear:      18 · 42 · 72 · 112 (single / double / triple / quad)
 *   combo:      1 + 0.25 · streak (cap 3.0)
 *   perfect:    +200 bonus
 *
 * Assumed "competent" turn yield when projecting tier targets:
 *   - one single-line clear every ~4 placements  (≈ 4 cells · 4 turns + 18 = 34 pts / 4 turns)
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
    baseTarget: 120,
    growth: 1.04,
    stepBump: 6,
    label: 'Onboarding',
    blurb: 'Small boards, friendly pieces. Learn the grooves.',
  },
  2: {
    baseTarget: 320,
    growth: 1.04,
    stepBump: 10,
    label: 'Shapes',
    blurb: 'The grid learns new tricks. Masks, voids, shaped boards.',
  },
  3: {
    baseTarget: 450,
    growth: 1.03,
    stepBump: 10,
    label: 'Stretch',
    blurb: 'Tall boards, wide boards. Breathe, plan, place.',
  },
  4: {
    baseTarget: 560,
    growth: 1.028,
    stepBump: 8,
    label: 'Awkward',
    blurb: 'Odd silhouettes, pentomino pressure. Things get nasty.',
  },
  5: {
    baseTarget: 700,
    growth: 1.02,
    stepBump: 10,
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
