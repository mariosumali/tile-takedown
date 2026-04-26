#!/usr/bin/env node
// Haunted Manor — damp fog stone with a wax-candle glow and cobweb corner.
// Each tile is overwhelmingly dark; the piece color burns through as a lantern
// flame so six color variants stay identifiable without breaking the mood.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'haunted';

const COLORS = {
  tomato:  '#c23a3a',
  mustard: '#e8a838',
  olive:   '#5a7560',
  sky:     '#5c6b82',
  plum:    '#6a3a6c',
  cream:   '#c2bcae',
};

const STONE_TOP = { r: 46, g: 42, b: 56, a: 255 };
const STONE_BOT = { r: 14, g: 10, b: 20, a: 255 };
const STONE_EDGE = { r: 6, g: 4, b: 10, a: 255 };
const BONE      = { r: 196, g: 186, b: 162, a: 255 };

function drawCobweb(c, ox, oy, reach, ink) {
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI / 2) * (i / 4);
    const x1 = Math.round(ox + Math.cos(a) * reach);
    const y1 = Math.round(oy + Math.sin(a) * reach);
    c.line(ox, oy, x1, y1, ink);
  }
  // Concentric arcs.
  for (let r = 6; r <= reach - 2; r += 4) {
    for (let a = 0; a < Math.PI / 2; a += 0.12) {
      const x = Math.round(ox + Math.cos(a) * r);
      const y = Math.round(oy + Math.sin(a) * r);
      c.setPixel(x, y, ink);
    }
  }
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0x7aa7);
  const piece = hexToRgb(hex);
  const flame    = lighten(saturate(piece, 0.2), 0.3);
  const flameHot = lighten(saturate(piece, 0.35), 0.55);

  // Moody stone gradient, top brighter than bottom.
  for (let y = 0; y < TILE_SIZE; y++) {
    const t = y / TILE_SIZE;
    const col = mix(STONE_TOP, STONE_BOT, t);
    for (let x = 0; x < TILE_SIZE; x++) c.setPixel(x, y, col);
  }

  // Stone speckle (subtle).
  speckle(c, rand, 10, 0.4);

  // Random chunky pits.
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * TILE_SIZE);
    c.setPixel(x, y, STONE_EDGE);
    if (rand() < 0.3) c.setPixel(x + 1, y, darken(STONE_BOT, 0.2));
  }

  // Vertical drip streaks.
  for (let k = 0; k < 2; k++) {
    const x0 = Math.floor(rand() * TILE_SIZE);
    const len = 20 + Math.floor(rand() * 20);
    for (let i = 0; i < len; i++) {
      const x = x0 + (rand() < 0.15 ? (rand() < 0.5 ? -1 : 1) : 0);
      const y = Math.floor(rand() * 10) + i;
      if (y >= TILE_SIZE) break;
      const p = c.getPixel(x, y);
      c.setPixel(x, y, mix(p, STONE_EDGE, 0.5));
    }
  }

  // Lantern glow — piece-colored halo radiating from just below center.
  const gx = 32, gy = 38;
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const d = Math.hypot(x - gx, y - gy);
      if (d < 24) {
        const intensity = Math.pow(1 - d / 24, 2.1);
        const p = c.getPixel(x, y);
        c.setPixel(x, y, mix(p, flame, intensity * 0.5));
      }
    }
  }

  // Candle flame shape — a vertical teardrop pointing up.
  for (let y = -12; y <= 4; y++) {
    const normY = (y + 12) / 16;
    const w = Math.round((Math.sin(normY * Math.PI) ** 1.6) * 5.5);
    for (let x = -w; x <= w; x++) {
      const t = Math.max(0, 1 - Math.hypot(x / (w + 0.01), y / 10));
      const col = mix(flame, flameHot, t);
      c.setPixel(gx + x, gy + y, col);
    }
  }
  c.setPixel(gx, gy - 10, lighten(flameHot, 0.5));

  // Wick (dark vertical line below flame).
  for (let y = 5; y <= 10; y++) c.setPixel(gx, gy + y, STONE_EDGE);

  // Cobweb in top-right corner, bone-white low alpha.
  drawCobweb(c, TILE_SIZE - 2, 1, 20, { ...BONE, a: 140 });

  // Fog band at bottom.
  for (let y = TILE_SIZE - 6; y < TILE_SIZE; y++) {
    const t = (y - (TILE_SIZE - 6)) / 6;
    for (let x = 0; x < TILE_SIZE; x++) {
      const p = c.getPixel(x, y);
      c.setPixel(x, y, mix(p, { r: 140, g: 140, b: 160 }, 0.18 * t));
    }
  }

  // Dust motes.
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * TILE_SIZE);
    if (rand() < 0.4) c.setPixel(x, y, { r: 200, g: 190, b: 168, a: 120 });
  }

  bevel(c, darken(STONE_TOP, 0.1), STONE_EDGE, 1);

  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
