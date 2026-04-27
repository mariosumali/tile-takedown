import { describe, it, expect } from 'vitest';
import { buildBag, drawTray, makeRng, pieceDefsForSet } from './bag';
import { pieceSize, shapeCompactness } from './pieces';

function shapeKey(shape: ReadonlyArray<ReadonlyArray<0 | 1>>): string {
  return shape.map((r) => r.join('')).join('|');
}

const CLASSIC_EASY_IDS = new Set([
  'o2',
  'o3',
  'rect2x3',
  'rect3x2',
  'l4_a',
  'l4_b',
  'l4_c',
  'l4_d',
  'j4_a',
  'j4_b',
  'j4_c',
  'j4_d',
  'l5_a',
  'l5_b',
  'l5_c',
  'l5_d',
]);

describe('bag', () => {
  it('builds a 60-piece bag', () => {
    const rng = makeRng(42);
    const bag = buildBag('classic', 0.2, rng);
    expect(bag).toHaveLength(60);
    for (const p of bag) expect(p.color).toBeDefined();
  });

  it('tetro_only produces only 4-cell pieces', () => {
    const rng = makeRng(7);
    const bag = buildBag('tetro_only', 0.1, rng);
    for (const p of bag) {
      let n = 0;
      for (const row of p.shape) for (const v of row) if (v) n++;
      expect(n).toBe(4);
    }
  });

  it('tetro_only includes every rotationally distinct tetromino', () => {
    expect(pieceDefsForSet('tetro_only').map((d) => d.id)).toEqual([
      'i4_h', 'i4_v', 'o2',
      'l4_a', 'l4_b', 'l4_c', 'l4_d',
      'j4_a', 'j4_b', 'j4_c', 'j4_d',
      's4', 's4_v',
      'z4', 'z4_v',
      't4_a', 't4_b', 't4_c', 't4_d',
    ]);
  });

  it('classic uses the curated tetro, block, bar, and bend roster', () => {
    expect(pieceDefsForSet('classic').map((d) => d.id)).toEqual([
      'i4_h', 'i4_v', 'o2',
      'l4_a', 'l4_b', 'l4_c', 'l4_d',
      'j4_a', 'j4_b', 'j4_c', 'j4_d',
      's4', 's4_v',
      'z4', 'z4_v',
      't4_a', 't4_b', 't4_c', 't4_d',
      'o3',
      'rect2x3', 'rect3x2',
      'i5_h', 'i5_v',
      'l5_a', 'l5_b', 'l5_c', 'l5_d',
    ]);
  });

  it('classic opening bags are almost all easy shapes', () => {
    const easyKeys = new Set(
      pieceDefsForSet('classic')
        .filter((d) => CLASSIC_EASY_IDS.has(d.id))
        .map((d) => shapeKey(d.shape)),
    );
    const rng = makeRng(20260427);
    const sample = Array.from({ length: 80 }, () => buildBag('classic', 0, rng)).flat();
    const easyPieces = sample.filter((p) => easyKeys.has(shapeKey(p.shape))).length;

    expect(easyPieces / sample.length).toBeGreaterThan(0.9);
  });

  it('classic keeps easy shapes dominant through mid-density boards', () => {
    const easyKeys = new Set(
      pieceDefsForSet('classic')
        .filter((d) => CLASSIC_EASY_IDS.has(d.id))
        .map((d) => shapeKey(d.shape)),
    );
    const rng = makeRng(20260428);
    const sample = Array.from({ length: 80 }, () => buildBag('classic', 0.4, rng)).flat();
    const easyPieces = sample.filter((p) => easyKeys.has(shapeKey(p.shape))).length;

    expect(easyPieces / sample.length).toBeGreaterThan(0.75);
  });

  it('classic still favors the big easy blocks and rectangles after opening', () => {
    const easyBlockIds = new Set(['o3', 'rect2x3', 'rect3x2']);
    const easyBlockKeys = new Set(
      pieceDefsForSet('classic')
        .filter((d) => easyBlockIds.has(d.id))
        .map((d) => shapeKey(d.shape)),
    );
    const rng = makeRng(20260427);
    const sample = Array.from({ length: 80 }, () => buildBag('classic', 0.2, rng)).flat();
    const easyBlocks = sample.filter((p) => easyBlockKeys.has(shapeKey(p.shape))).length;

    expect(easyBlocks / sample.length).toBeGreaterThan(0.12);
  });

  it('crazy preserves the old all-pieces classic roster', () => {
    const ids = pieceDefsForSet('crazy').map((d) => d.id);
    expect(ids).toHaveLength(68);
    expect(ids).toContain('mono');
    expect(ids).toContain('plus5');
    expect(ids.filter((id) => id.startsWith('h6_'))).toHaveLength(35);
    expect(ids).not.toContain('o3');
  });

  it('small_only produces only 1-3 cell pieces', () => {
    const rng = makeRng(7);
    const bag = buildBag('small_only', 0.1, rng);
    for (const p of bag) {
      let n = 0;
      for (const row of p.shape) for (const v of row) if (v) n++;
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it('hexominoes are rare in crazy draws — under 6% of a large sample', () => {
    // Guards the "smart tray" contract that big sprawling hexominoes
    // don't dominate the tray. A large bag (120 pieces) on
    // a relaxed board should have very few size-6 draws.
    const rng = makeRng(123);
    const a = buildBag('crazy', 0.0, rng);
    const b = buildBag('crazy', 0.0, rng);
    const sample = a.concat(b);
    const hex = sample.filter((p) => pieceSize(p.shape) === 6).length;
    expect(hex / sample.length).toBeLessThan(0.06);
  });

  it('within hexominoes, tidy shapes outnumber sprawling ones on average', () => {
    // When a hexomino does surface, the compactness multiplier should skew
    // draws toward tidier shapes (fill ratio closer to 1). Over a large
    // sample the mean compactness of drawn hexes should sit clearly above
    // the uniform average across all 35 hexomino defs.
    const rng = makeRng(9001);
    const drawn: number[] = [];
    for (let i = 0; i < 40; i++) {
      const b = buildBag('crazy', 0.3, rng);
      for (const p of b) {
        if (pieceSize(p.shape) === 6) drawn.push(shapeCompactness(p.shape));
      }
    }
    if (drawn.length === 0) return;
    const drawnMean = drawn.reduce((a, b) => a + b, 0) / drawn.length;
    expect(drawnMean).toBeGreaterThan(0.65);
  });

  it('drawTray refills when bag is low', () => {
    const rng = makeRng(1);
    const bag = buildBag('classic', 0.1, rng);
    let remaining = bag;
    let draws = 0;
    while (draws < 30) {
      const r = drawTray(remaining, 'classic', 0.1, rng);
      expect(r.tray).toHaveLength(3);
      remaining = r.bag;
      draws++;
    }
  });
});
