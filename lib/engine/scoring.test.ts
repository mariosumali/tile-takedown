import { describe, it, expect } from 'vitest';
import {
  comboMultiplier,
  comboTier,
  lineClearBase,
  placementPoints,
  scoreTurn,
  COMBO_CAP,
  COMBO_DECAY_PER_MISS,
  COMBO_TIERS,
  COMBO_GRACE_TURNS,
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

  it('no-clear turn spends grace before decaying combo', () => {
    const { turn, combo, comboGrace } = scoreTurn({
      cellsPlaced: 3,
      linesCleared: 0,
      prevCombo: 3,
      prevComboGrace: 1,
      perfectClear: false,
    });
    expect(combo).toBe(3);
    expect(comboGrace).toBe(0);
    expect(turn.total).toBe(placementPoints(3));
    expect(turn.multiplier).toBe(1);
  });

  it('combo decays to zero over consecutive non-clear turns after grace', () => {
    let prev = 3;
    let prevGrace = 1;
    const decayed: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { combo, comboGrace } = scoreTurn({
        cellsPlaced: 2,
        linesCleared: 0,
        prevCombo: prev,
        prevComboGrace: prevGrace,
        perfectClear: false,
      });
      decayed.push(combo);
      prev = combo;
      prevGrace = comboGrace;
    }
    expect(decayed).toEqual([3, 1, 0, 0, 0]);
  });

  it('decay cannot drive combo below zero', () => {
    const { combo } = scoreTurn({
      cellsPlaced: 3,
      linesCleared: 0,
      prevCombo: 0,
      perfectClear: false,
    });
    expect(combo).toBe(0);
  });

  it('clearing after a decay step keeps the combo climbing', () => {
    const miss = scoreTurn({
      cellsPlaced: 2,
      linesCleared: 0,
      prevCombo: 3,
      prevComboGrace: 0,
      perfectClear: false,
    });
    const hit = scoreTurn({
      cellsPlaced: 4,
      linesCleared: 1,
      prevCombo: miss.combo,
      perfectClear: false,
    });
    expect(miss.combo).toBe(1);
    expect(hit.combo).toBe(2);
    expect(hit.turn.multiplier).toBe(comboMultiplier(2));
  });

  it('single clear + first combo step applies the first-step multiplier', () => {
    const { turn, combo, comboGrace } = scoreTurn({
      cellsPlaced: 4,
      linesCleared: 1,
      prevCombo: 0,
      perfectClear: false,
    });
    const mult = comboMultiplier(1);
    expect(combo).toBe(1);
    expect(comboGrace).toBe(COMBO_GRACE_TURNS);
    expect(turn.multiplier).toBe(mult);
    expect(turn.total).toBe(placementPoints(4) + Math.round(SINGLE_CLEAR * mult));
  });

  it('preserves old callers that omit combo grace', () => {
    const { combo, comboGrace } = scoreTurn({
      cellsPlaced: 2,
      linesCleared: 0,
      prevCombo: 2,
      perfectClear: false,
    });
    expect(combo).toBe(Math.max(0, 2 - COMBO_DECAY_PER_MISS));
    expect(comboGrace).toBe(0);
  });

  it('perfect clear adds the bonus at the current multiplier', () => {
    const { turn } = scoreTurn({
      cellsPlaced: 5,
      linesCleared: 2,
      prevCombo: 0,
      perfectClear: true,
    });
    const mult = comboMultiplier(1);
    expect(turn.total).toBe(
      placementPoints(5) +
        Math.round(DOUBLE_CLEAR * mult) +
        Math.round(PERFECT_CLEAR_BONUS * mult),
    );
  });

  it('comboTier maps combo counts to visual tiers', () => {
    expect(comboTier(0)).toBe('none');
    expect(comboTier(1)).toBe('none');
    expect(comboTier(COMBO_TIERS.spark)).toBe('spark');
    expect(comboTier(3)).toBe('spark');
    expect(comboTier(COMBO_TIERS.hot)).toBe('hot');
    expect(comboTier(5)).toBe('hot');
    expect(comboTier(COMBO_TIERS.fire)).toBe('fire');
    expect(comboTier(7)).toBe('fire');
    expect(comboTier(COMBO_TIERS.inferno)).toBe('inferno');
    expect(comboTier(20)).toBe('inferno');
  });
});
