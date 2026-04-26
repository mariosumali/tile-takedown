#!/usr/bin/env node
// Neon Grid — CRT-style glowing tile. Piece color dominates; horizontal
// scanlines darken every other row; a vertical bright bar forms the "tube"
// highlight, and a dark rim keeps the glow legible on the neon backdrop.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  saveTile,
} from './lib/tilegen.mjs';

const THEME = 'neon';

const COLORS = {
  tomato:  '#ff2eb7',
  mustard: '#faff3a',
  olive:   '#38ff7c',
  sky:     '#2ee9ff',
  plum:    '#c052ff',
  cream:   '#80e0ff',
};

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0x2e0f);
  const piece = hexToRgb(hex);
  const core   = saturate(piece, 0.25);
  const hot    = lighten(saturate(piece, 0.35), 0.5);
  const dim    = darken(saturate(piece, 0.15), 0.55);
  const edge   = darken(piece, 0.8);

  // Base fill with piece color.
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) c.setPixel(x, y, core);
  }

  // Radial inner-glow fade: brighter center, darker edges.
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const dx = (x - 31.5) / 31.5;
      const dy = (y - 31.5) / 31.5;
      const d = Math.min(1, Math.hypot(dx, dy));
      const t = d * d; // steeper edge darkening
      const p = c.getPixel(x, y);
      c.setPixel(x, y, mix(p, dim, t * 0.6));
    }
  }

  // Vertical bright tube bar down the middle.
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 28; x <= 35; x++) {
      const falloff = 1 - Math.abs(x - 31.5) / 4;
      const p = c.getPixel(x, y);
      c.setPixel(x, y, mix(p, hot, falloff * 0.7));
    }
  }

  // Horizontal scanlines (every other row darker).
  for (let y = 0; y < TILE_SIZE; y++) {
    if (y % 2 === 0) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const p = c.getPixel(x, y);
        c.setPixel(x, y, mix(p, { r: 0, g: 0, b: 0, a: 255 }, 0.18));
      }
    }
  }

  // CRT vertical sub-pixel stripes (every third column brighter).
  for (let x = 0; x < TILE_SIZE; x++) {
    if (x % 3 === 0) {
      for (let y = 0; y < TILE_SIZE; y++) {
        const p = c.getPixel(x, y);
        c.setPixel(x, y, mix(p, hot, 0.12));
      }
    }
  }

  // Bright rim (1px inside outer edge, hot color).
  for (let x = 2; x < TILE_SIZE - 2; x++) {
    c.setPixel(x, 2, hot);
    c.setPixel(x, TILE_SIZE - 3, hot);
  }
  for (let y = 2; y < TILE_SIZE - 2; y++) {
    c.setPixel(2, y, hot);
    c.setPixel(TILE_SIZE - 3, y, hot);
  }

  // Hard dark outer rim so the tile doesn't bleed into the board backdrop.
  for (let i = 0; i < 2; i++) {
    for (let x = i; x < TILE_SIZE - i; x++) {
      c.setPixel(x, i, edge);
      c.setPixel(x, TILE_SIZE - 1 - i, edge);
    }
    for (let y = i; y < TILE_SIZE - i; y++) {
      c.setPixel(i, y, edge);
      c.setPixel(TILE_SIZE - 1 - i, y, edge);
    }
  }

  // Flicker pixels to sell the CRT.
  for (let i = 0; i < 8; i++) {
    const x = 4 + Math.floor(rand() * (TILE_SIZE - 8));
    const y = 4 + Math.floor(rand() * (TILE_SIZE - 8));
    c.setPixel(x, y, hot);
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
