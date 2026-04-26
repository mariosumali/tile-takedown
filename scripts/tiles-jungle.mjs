#!/usr/bin/env node
// Jungle Temple — weathered stone blocks with moss creep and carved glyphs.
// Each tile: warm piece-color base, speckled stone, mossy corners and vines,
// a subtle central carving. Moss always green regardless of piece color so the
// tileset feels like a single material set dressed in different piece dyes.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'jungle';

const COLORS = {
  tomato:  '#c75a3b',
  mustard: '#e0a73a',
  olive:   '#4e7a3a',
  sky:     '#4d8fa5',
  plum:    '#7d3a6c',
  cream:   '#d9c994',
};

const MOSS_DARK  = { r: 54, g: 92, b: 50, a: 255 };
const MOSS_MID   = { r: 86, g: 132, b: 70, a: 255 };
const MOSS_LIGHT = { r: 132, g: 178, b: 96, a: 255 };
const STONE_INK  = { r: 28, g: 22, b: 14, a: 255 };

function drawMossClump(c, rand, cx, cy, radius) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const d = Math.hypot(x, y);
      if (d > radius) continue;
      const edge = d / radius;
      const r = rand();
      if (r < 1 - edge * 0.9) {
        const col = r < 0.2 ? MOSS_LIGHT : r < 0.65 ? MOSS_MID : MOSS_DARK;
        c.setPixel(cx + x, cy + y, col);
      }
    }
  }
}

function drawVine(c, rand, x0, y0, x1, y1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t + Math.sin(t * 5) * 2);
    const y = Math.round(y0 + (y1 - y0) * t + Math.cos(t * 4) * 1.5);
    c.setPixel(x, y, MOSS_DARK);
    if (rand() < 0.35) c.setPixel(x, y - 1, MOSS_MID);
    if (rand() < 0.2) {
      c.setPixel(x - 1, y, MOSS_MID);
      c.setPixel(x + 1, y, MOSS_MID);
    }
  }
}

function drawGlyph(c, cx, cy, ink) {
  // Stylized stacked-stones / spiral mark, carved.
  c.line(cx - 6, cy - 6, cx + 6, cy - 6, ink);
  c.line(cx - 8, cy, cx + 8, cy, ink);
  c.line(cx - 6, cy + 6, cx + 6, cy + 6, ink);
  c.setPixel(cx - 2, cy - 3, ink);
  c.setPixel(cx + 2, cy - 3, ink);
  c.setPixel(cx, cy - 3, ink);
  c.setPixel(cx - 2, cy + 3, ink);
  c.setPixel(cx + 2, cy + 3, ink);
  c.setPixel(cx, cy + 3, ink);
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xa11a);
  const base = hexToRgb(hex);

  // Solid base, warmed toward an earthy stone.
  const ground = mix(base, { r: 120, g: 96, b: 60 }, 0.25);
  c.clear({ ...ground, a: 255 });

  // Horizontal strata bands for a layered-stone feel.
  for (let y = 0; y < TILE_SIZE; y++) {
    const bandIx = Math.floor(y / 8);
    const strength = ((bandIx % 2) === 0 ? -1 : 1) * 0.05;
    for (let x = 0; x < TILE_SIZE; x++) {
      const p = c.getPixel(x, y);
      c.setPixel(x, y, {
        r: Math.max(0, Math.min(255, Math.round(p.r * (1 + strength)))),
        g: Math.max(0, Math.min(255, Math.round(p.g * (1 + strength)))),
        b: Math.max(0, Math.min(255, Math.round(p.b * (1 + strength)))),
        a: 255,
      }, 1);
    }
  }

  speckle(c, rand, 22, 0.55);

  // Random pits (tiny darker holes).
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * TILE_SIZE);
    c.setPixel(x, y, darken(ground, 0.45));
    if (rand() < 0.4) c.setPixel(x + 1, y, darken(ground, 0.25));
  }

  // Carved glyph (slightly darker, not full-ink).
  drawGlyph(c, 32, 32, darken(ground, 0.55));

  // Moss clumps in corners + a couple of trailing vines.
  drawMossClump(c, rand, 4, 4, 7);
  drawMossClump(c, rand, TILE_SIZE - 5, TILE_SIZE - 5, 8);
  drawMossClump(c, rand, TILE_SIZE - 6, 3, 5);
  drawVine(c, rand, 4, 4, 20, 22);
  drawVine(c, rand, TILE_SIZE - 5, TILE_SIZE - 5, TILE_SIZE - 22, TILE_SIZE - 20);

  bevel(c, lighten(ground, 0.3), STONE_INK, 1);

  // A few bright moss highlights for dimensional pop.
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * TILE_SIZE);
    const p = c.getPixel(x, y);
    if (p.r < 140 && p.g > 90 && p.b < 120) c.setPixel(x, y, MOSS_LIGHT);
  }

  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const canvas = generate(name, hex);
    const file = saveTile(THEME, name, canvas);
    console.log(` wrote ${file}`);
  }
}

main();
