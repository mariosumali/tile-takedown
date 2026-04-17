export const PLACEMENT_POINT_PER_CELL = 1;
export const SINGLE_CLEAR = 18;
export const DOUBLE_CLEAR = 42;
export const TRIPLE_CLEAR = 72;
export const QUAD_CLEAR = 112;
export const PERFECT_CLEAR_BONUS = 200;
export const COMBO_STEP = 0.25;
export const COMBO_CAP = 3.0;

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
  perfectClear: boolean;
}): { turn: TurnScore; combo: number } {
  const placement = placementPoints(args.cellsPlaced);
  const cleared = args.linesCleared > 0;
  const combo = cleared ? args.prevCombo + 1 : 0;
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
  };
}
