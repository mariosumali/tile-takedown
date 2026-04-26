import { describe, it, expect } from 'vitest';
import {
  comboMultiplier,
  lineClearBase,
  placementPoints,
  scoreTurn,
  COMBO_GRACE_TURNS,
  COMBO_CAP,
  PERFECT_CLEAR_BONUS,
  PLACEMENT_POINT_PER_CELL,
  SINGLE_CLEAR,
  DOUBLE_CLEAR,
  TRIPLE_CLEAR,
  QUAD_CLEAR,
} from './scoring';

describe('scoring', () => {
  it('awards placement points per cell', () => {
    expect(placementPoints(4)).toBe(4 * PLACEMENT_POINT_PER_CELL);
  });

  it('line clear base values reward multi-line clears heavily', () => {
    expect(lineClearBase(1)).toBe(SINGLE_CLEAR);
    expect(lineClearBase(2)).toBe(DOUBLE_CLEAR);
    expect(lineClearBase(3)).toBe(TRIPLE_CLEAR);
    expect(lineClearBase(4)).toBe(QUAD_CLEAR);
    expect(DOUBLE_CLEAR).toBeGreaterThan(SINGLE_CLEAR * 2);
    expect(TRIPLE_CLEAR).toBeGreaterThan(SINGLE_CLEAR * 4);
    expect(QUAD_CLEAR).toBeGreaterThan(SINGLE_CLEAR * 10);
  });

  it('combo multiplier caps at COMBO_CAP', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1.3);
    expect(comboMultiplier(4)).toBe(2.2);
    expect(comboMultiplier(100)).toBe(COMBO_CAP);
  });

  it('turn with no clear spends a grace turn and preserves combo', () => {
    const { turn, combo, comboGrace } = scoreTurn({
      cellsPlaced: 3,
      linesCleared: 0,
      prevCombo: 2,
      prevComboGrace: COMBO_GRACE_TURNS,
      perfectClear: false,
    });
    expect(combo).toBe(2);
    expect(comboGrace).toBe(COMBO_GRACE_TURNS - 1);
    expect(turn.total).toBe(placementPoints(3));
    expect(turn.multiplier).toBe(1);
  });

  it('two consecutive non-clear turns break the combo', () => {
    const first = scoreTurn({
      cellsPlaced: 3,
      linesCleared: 0,
      prevCombo: 2,
      prevComboGrace: COMBO_GRACE_TURNS,
      perfectClear: false,
    });
    const second = scoreTurn({
      cellsPlaced: 3,
      linesCleared: 0,
      prevCombo: first.combo,
      prevComboGrace: first.comboGrace,
      perfectClear: false,
    });
    expect(second.combo).toBe(0);
    expect(second.comboGrace).toBe(0);
  });

  it('clearing after a grace miss keeps the combo climbing', () => {
    const miss = scoreTurn({
      cellsPlaced: 2,
      linesCleared: 0,
      prevCombo: 3,
      prevComboGrace: COMBO_GRACE_TURNS,
      perfectClear: false,
    });
    const hit = scoreTurn({
      cellsPlaced: 4,
      linesCleared: 1,
      prevCombo: miss.combo,
      prevComboGrace: miss.comboGrace,
      perfectClear: false,
    });
    expect(hit.combo).toBe(4);
    expect(hit.turn.multiplier).toBe(comboMultiplier(4));
  });

  it('clearing refreshes the grace allowance', () => {
    const hit = scoreTurn({
      cellsPlaced: 4,
      linesCleared: 1,
      prevCombo: 0,
      prevComboGrace: 0,
      perfectClear: false,
    });
    expect(hit.comboGrace).toBe(COMBO_GRACE_TURNS);
  });

  it('single clear + first combo step applies the first-step multiplier', () => {
    const { turn, combo } = scoreTurn({
      cellsPlaced: 4,
      linesCleared: 1,
      prevCombo: 0,
      prevComboGrace: 0,
      perfectClear: false,
    });
    const mult = comboMultiplier(1);
    expect(combo).toBe(1);
    expect(turn.multiplier).toBe(mult);
    expect(turn.total).toBe(placementPoints(4) + Math.round(SINGLE_CLEAR * mult));
  });

  it('perfect clear adds the bonus at the current multiplier', () => {
    const { turn } = scoreTurn({
      cellsPlaced: 5,
      linesCleared: 2,
      prevCombo: 0,
      prevComboGrace: 0,
      perfectClear: true,
    });
    const mult = comboMultiplier(1);
    expect(turn.total).toBe(
      placementPoints(5) +
        Math.round(DOUBLE_CLEAR * mult) +
        Math.round(PERFECT_CLEAR_BONUS * mult),
    );
  });
});
