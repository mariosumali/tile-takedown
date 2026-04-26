import { describe, it, expect } from 'vitest';
import { buildBag, drawTray, makeRng } from './bag';
import { pieceSize, shapeCompactness } from './pieces';

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

  it('small_only produces only 1-3 cell pieces', () => {
    const rng = makeRng(7);
    const bag = buildBag('small_only', 0.1, rng);
    for (const p of bag) {
      let n = 0;
      for (const row of p.shape) for (const v of row) if (v) n++;
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it('hexominoes are rare in classic draws — under 6% of a large sample', () => {
    // Guards the "smart tray" contract that big sprawling hexominoes
    // ("crazy pieces") don't dominate the tray. A large bag (120 pieces) on
    // a relaxed board should have very few size-6 draws.
    const rng = makeRng(123);
    const a = buildBag('classic', 0.0, rng);
    const b = buildBag('classic', 0.0, rng);
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
      const b = buildBag('classic', 0.3, rng);
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
