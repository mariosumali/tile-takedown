export const PLACEMENT_POINT_PER_CELL = 2;
export const SINGLE_CLEAR = 50;
export const DOUBLE_CLEAR = 150;
export const TRIPLE_CLEAR = 400;
export const QUAD_CLEAR = 1000;
export const PERFECT_CLEAR_BONUS = 500;
export const COMBO_STEP = 0.3;
export const COMBO_CAP = 4.0;
/**
 * Legacy: kept for API compatibility with callers that still read
 * `comboGrace` from `scoreTurn`. Combo now decays by 1 per non-clear turn
 * instead of using a hard grace budget, so this value is effectively unused.
 */
export const COMBO_GRACE_TURNS = 0;

/** Combo tier names, used by HUD and VFX overlays to drive visual intensity. */
export type ComboTier = 'none' | 'spark' | 'hot' | 'fire' | 'inferno';

export const COMBO_TIERS = {
  spark: 2,
  hot: 4,
  fire: 6,
  inferno: 8,
} as const;

/** Map a combo count to a named tier. */
export function comboTier(combo: number): ComboTier {
  if (combo >= COMBO_TIERS.inferno) return 'inferno';
  if (combo >= COMBO_TIERS.fire) return 'fire';
  if (combo >= COMBO_TIERS.hot) return 'hot';
  if (combo >= COMBO_TIERS.spark) return 'spark';
  return 'none';
}

export function placementPoints(cellsPlaced: number): number {
  return cellsPlaced * PLACEMENT_POINT_PER_CELL;
}

export function lineClearBase(lines: number): number {
  if (lines <= 0) return 0;
  if (lines === 1) return SINGLE_CLEAR;
  if (lines === 2) return DOUBLE_CLEAR;
  if (lines === 3) return TRIPLE_CLEAR;
  return QUAD_CLEAR;
}

/** Combo multiplier given number of consecutive clearing turns (including this one). */
export function comboMultiplier(consecutive: number): number {
  if (consecutive <= 0) return 1;
  const m = 1 + COMBO_STEP * consecutive;
  return Math.min(m, COMBO_CAP);
}

export type TurnScore = {
  placement: number;
  clear: number;
  bonus: number;
  multiplier: number;
  total: number;
};

export function scoreTurn(args: {
  cellsPlaced: number;
  linesCleared: number;
  prevCombo: number;
  /** @deprecated Kept for API compatibility; combo now decays by 1 per
   *  non-clear turn instead of spending a grace budget. */
  prevComboGrace?: number;
  perfectClear: boolean;
}): { turn: TurnScore; combo: number; comboGrace: number } {
  const placement = placementPoints(args.cellsPlaced);
  const cleared = args.linesCleared > 0;

  let combo: number;
  if (cleared) {
    combo = args.prevCombo + 1;
  } else {
    combo = Math.max(0, args.prevCombo - 1);
  }
  const comboGrace = 0;

  const multiplier = cleared ? comboMultiplier(combo) : 1;
  const base = lineClearBase(args.linesCleared);
  const bonus = args.perfectClear ? PERFECT_CLEAR_BONUS : 0;
  const clearScore = Math.round((base + bonus) * multiplier);
  const total = placement + clearScore;
  return {
    turn: {
      placement,
      clear: Math.round(base * multiplier),
      bonus: Math.round(bonus * multiplier),
      multiplier,
      total,
    },
    combo,
    comboGrace,
  };
}
