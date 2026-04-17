import { describe, it, expect } from 'vitest';
import {
  comboMultiplier,
  lineClearBase,
  placementPoints,
  scoreTurn,
  PERFECT_CLEAR_BONUS,
} from './scoring';

describe('scoring', () => {
  it('1 point per cell placed', () => {
    expect(placementPoints(4)).toBe(4);
  });

  it('line clear base values match PRD', () => {
    expect(lineClearBase(1)).toBe(18);
    expect(lineClearBase(2)).toBe(42);
    expect(lineClearBase(3)).toBe(72);
    expect(lineClearBase(4)).toBe(112);
  });

  it('combo multiplier caps at 3.0', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1.25);
    expect(comboMultiplier(4)).toBe(2.0);
    expect(comboMultiplier(20)).toBe(3.0);
  });

  it('turn with no clear keeps combo at 0', () => {
    const { turn, combo } = scoreTurn({
      cellsPlaced: 3,
      linesCleared: 0,
      prevCombo: 2,
      perfectClear: false,
    });
    expect(combo).toBe(0);
    expect(turn.total).toBe(3);
  });

  it('single clear + first combo step = 18 × 1.25 + placement', () => {
    const { turn, combo } = scoreTurn({
      cellsPlaced: 4,
      linesCleared: 1,
      prevCombo: 0,
      perfectClear: false,
    });
    expect(combo).toBe(1);
    expect(turn.multiplier).toBe(1.25);
    expect(turn.total).toBe(4 + Math.round(18 * 1.25));
  });

  it('perfect clear adds the bonus', () => {
    const { turn } = scoreTurn({
      cellsPlaced: 5,
      linesCleared: 2,
      prevCombo: 0,
      perfectClear: true,
    });
    // base 42 × 1.25 + perfect 200 × 1.25 + placement 5
    expect(turn.total).toBe(5 + Math.round(42 * 1.25) + Math.round(PERFECT_CLEAR_BONUS * 1.25));
  });
});
