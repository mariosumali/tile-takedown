#!/usr/bin/env node
// Magma Block - pixelated dark crust with orange lava pockets, taking visual
// cues from Minecraft magma blocks while staying in the app's flat tile style.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'volcano';

const COLORS = {
  tomato:  '#ff5a22',
  mustard: '#ffb12c',
  olive:   '#b85f24',
  sky:     '#e87835',
  plum:    '#d44735',
  cream:   '#7b3e22',
};

const CRUST = { r: 70, g: 33, b: 24, a: 255 };
const CRUST_DARK = { r: 40, g: 18, b: 14, a: 255 };
const ASH = { r: 96, g: 48, b: 34, a: 255 };
const RIM = { r: 8, g: 4, b: 5, a: 255 };

function rectNoise(c, rand, x, y, w, h, base, variance) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const d = Math.round((rand() * 2 - 1) * variance);
      c.setPixel(xx, yy, {
        r: Math.max(0, Math.min(255, base.r + d)),
        g: Math.max(0, Math.min(255, base.g + d * 0.7)),
        b: Math.max(0, Math.min(255, base.b + d * 0.45)),
        a: 255,
      });
    }
  }
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0x6a9a);
  const piece = hexToRgb(hex);
  const glow = lighten(saturate(piece, 0.5), 0.26);
  const hot = lighten(saturate(piece, 0.65), 0.58);
  const dim = darken(saturate(piece, 0.25), 0.18);

  c.clear(CRUST_DARK);

  // Blocky crust pixels, intentionally chunky like low-res voxel art.
  for (let y = 0; y < TILE_SIZE; y += 8) {
    for (let x = 0; x < TILE_SIZE; x += 8) {
      const choice = rand();
      const base = choice < 0.45 ? CRUST_DARK : choice < 0.8 ? CRUST : ASH;
      rectNoise(c, rand, x, y, 8, 8, base, 9);
    }
  }

  const lava = [
    [8, 8, 16, 8], [24, 0, 8, 16], [40, 8, 16, 8],
    [0, 24, 16, 8], [24, 24, 16, 8], [48, 24, 16, 8],
    [8, 40, 8, 16], [32, 40, 16, 8], [48, 48, 8, 16],
  ];
  for (const [x, y, w, h] of lava) {
    rectNoise(c, rand, x, y, w, h, glow, 16);
    for (let yy = y + 1; yy < y + h - 1; yy++) {
      for (let xx = x + 1; xx < x + w - 1; xx++) {
        if (rand() < 0.2) c.setPixel(xx, yy, hot);
        else if (rand() < 0.22) c.setPixel(xx, yy, dim);
      }
    }
    c.rect(x, y, w, 1, hot);
    c.rect(x, y + h - 1, w, 1, darken(dim, 0.35));
  }

  // Pixel cracks and embers.
  for (let i = 0; i < 32; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * TILE_SIZE);
    const p = c.getPixel(x, y);
    if (p.r < 120) c.setPixel(x, y, rand() < 0.45 ? RIM : darken(CRUST_DARK, 0.2));
  }

  speckle(c, rand, 10, 0.24);
  bevel(c, ASH, RIM, 1);
  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
