export const PLACEMENT_POINT_PER_CELL = 2;
export const SINGLE_CLEAR = 50;
export const DOUBLE_CLEAR = 150;
export const TRIPLE_CLEAR = 400;
export const QUAD_CLEAR = 1000;
export const PERFECT_CLEAR_BONUS = 500;
export const COMBO_STEP = 0.3;
export const COMBO_CAP = 4.0;
/**
 * Grace turns: how many non-clearing placements a live combo survives before
 * it breaks. `1` means one "free" missed turn — miss two in a row and the
 * combo resets. Raise this if the combo feels too harsh, never below 0.
 */
export const COMBO_GRACE_TURNS = 1;

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
  /** Grace turns remaining on the incoming combo. Defaults to 0 for callers
   *  that don't track it (legacy tests). */
  prevComboGrace?: number;
  perfectClear: boolean;
}): { turn: TurnScore; combo: number; comboGrace: number } {
  const placement = placementPoints(args.cellsPlaced);
  const cleared = args.linesCleared > 0;
  const prevGrace = args.prevComboGrace ?? 0;

  let combo: number;
  let comboGrace: number;
  if (cleared) {
    combo = args.prevCombo + 1;
    comboGrace = COMBO_GRACE_TURNS;
  } else if (args.prevCombo > 0 && prevGrace > 0) {
    combo = args.prevCombo;
    comboGrace = prevGrace - 1;
  } else {
    combo = 0;
    comboGrace = 0;
  }

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
