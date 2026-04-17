import { describe, it, expect } from 'vitest';
import { buildBag, drawTray, makeRng } from './bag';

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
