#!/usr/bin/env node
// Volcano Forge — charred basalt with glowing lava cracks bleeding through.
// Each tile has: dark obsidian base, jagged magma seams tinted toward the piece
// color, ember particles, and a sharp top highlight so it still feels like glass.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  speckle, bevel, crack, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'volcano';

const COLORS = {
  tomato:  '#ff4a28',
  mustard: '#ffb640',
  olive:   '#9a5b2e',
  sky:     '#c76a3c',
  plum:    '#c23a52',
  cream:   '#6a4030',
};

const BASALT = { r: 28, g: 18, b: 16, a: 255 };
const BASALT_HIGH = { r: 72, g: 50, b: 44, a: 255 };
const BASALT_EDGE = { r: 10, g: 6, b: 4, a: 255 };

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xf1e5);
  const piece = hexToRgb(hex);

  // Saturated glow tints derived from the piece color.
  const lavaCore = lighten(saturate(piece, 0.4), 0.4);
  const lavaHot  = lighten(saturate(piece, 0.55), 0.7);
  const lavaDim  = darken(saturate(piece, 0.2), 0.25);

  // Base: dark basalt gradient.
  for (let y = 0; y < TILE_SIZE; y++) {
    const t = y / TILE_SIZE;
    const col = mix(BASALT_HIGH, BASALT, t);
    for (let x = 0; x < TILE_SIZE; x++) c.setPixel(x, y, col);
  }

  // Large blotches of slightly lighter rock for variation.
  for (let i = 0; i < 5; i++) {
    const cx = Math.floor(rand() * TILE_SIZE);
    const cy = Math.floor(rand() * TILE_SIZE);
    const r = 6 + Math.floor(rand() * 8);
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y);
        if (d > r) continue;
        const f = 1 - d / r;
        if (rand() > f * 0.85) continue;
        const p = c.getPixel(cx + x, cy + y);
        c.setPixel(cx + x, cy + y, {
          r: Math.min(255, p.r + 14),
          g: Math.min(255, p.g + 8),
          b: Math.min(255, p.b + 6),
          a: 255,
        });
      }
    }
  }

  // Heavy stone speckle.
  speckle(c, rand, 22, 0.6);

  // Glowing lava cracks. A primary seam then several branches.
  const seams = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < seams; i++) {
    const sx = Math.floor(rand() * TILE_SIZE);
    const sy = Math.floor(rand() * TILE_SIZE);
    crack(c, rand, sx, sy, 40 + Math.floor(rand() * 24), lavaCore, lavaDim);
  }

  // Brighter inner cracks (thinner, brighter core).
  for (let i = 0; i < 2; i++) {
    const sx = Math.floor(rand() * TILE_SIZE);
    const sy = Math.floor(rand() * TILE_SIZE);
    crack(c, rand, sx, sy, 22 + Math.floor(rand() * 12), lavaHot, null);
  }

  // Ember particles floating near cracks.
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * TILE_SIZE);
    const neighbor = [
      c.getPixel(x - 1, y), c.getPixel(x + 1, y),
      c.getPixel(x, y - 1), c.getPixel(x, y + 1),
    ];
    const nearGlow = neighbor.some((p) => p.r > 180 || p.g > 140);
    if (nearGlow && rand() < 0.6) {
      c.setPixel(x, y, lavaHot);
    } else if (rand() < 0.12) {
      c.setPixel(x, y, lavaDim);
    }
  }

  // Charred rim.
  bevel(c, darken(BASALT_HIGH, 0.25), BASALT_EDGE, 1);

  // Sharp top glass highlight (1px line interrupted by cracks).
  for (let x = 2; x < TILE_SIZE - 2; x++) {
    const above = c.getPixel(x, 1);
    if (above.r < 80 && rand() < 0.8) {
      c.setPixel(x, 1, { r: 168, g: 124, b: 110, a: 180 });
    }
  }

  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
