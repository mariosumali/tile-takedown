#!/usr/bin/env node
// Mossy Cobblestone - chunky stone blocks with vines and moss creeping through
// the seams. Piece color tints the cobbles, while shared greens keep the world
// feeling overgrown.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'jungle';

const COLORS = {
  tomato:  '#a45e45',
  mustard: '#b69a4a',
  olive:   '#5d7d4c',
  sky:     '#5f8b88',
  plum:    '#7a5d74',
  cream:   '#b9ae88',
};

const MOSS_DARK = { r: 36, g: 78, b: 38, a: 255 };
const MOSS_MID = { r: 76, g: 128, b: 58, a: 255 };
const MOSS_LIGHT = { r: 130, g: 170, b: 84, a: 255 };
const INK = { r: 20, g: 31, b: 22, a: 255 };

function block(c, x, y, w, h, fill, hi, shade) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const t = ((xx - x) + (yy - y)) / (w + h);
      c.setPixel(xx, yy, mix(lighten(fill, 0.08), darken(fill, 0.16), t));
    }
  }
  for (let xx = x; xx < x + w; xx++) {
    c.setPixel(xx, y, hi);
    c.setPixel(xx, y + h - 1, shade);
  }
  for (let yy = y; yy < y + h; yy++) {
    c.setPixel(x, yy, hi);
    c.setPixel(x + w - 1, yy, shade);
  }
}

function drawVine(c, rand, x0, y0, len, dir) {
  let x = x0;
  let y = y0;
  for (let i = 0; i < len; i++) {
    c.setPixel(x, y, MOSS_DARK);
    if (i % 3 === 0) c.setPixel(x, y - 1, MOSS_MID);
    if (i % 6 === 0) {
      const side = rand() < 0.5 ? -1 : 1;
      c.setPixel(x + side, y, MOSS_LIGHT);
      c.setPixel(x + side * 2, y + (rand() < 0.5 ? -1 : 1), MOSS_MID);
    }
    x += dir;
    y += rand() < 0.38 ? 1 : 0;
    if (rand() < 0.18) x -= dir;
  }
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xc0bb);
  const piece = hexToRgb(hex);
  const stone = mix(piece, { r: 118, g: 118, b: 95 }, 0.54);
  const grout = darken(mix(stone, MOSS_DARK, 0.16), 0.45);
  c.clear(grout);

  const rows = [
    [[1, 1, 18, 14], [20, 1, 21, 14], [42, 1, 21, 14]],
    [[1, 16, 11, 15], [13, 16, 20, 15], [34, 16, 29, 15]],
    [[1, 32, 23, 14], [25, 32, 17, 14], [43, 32, 20, 14]],
    [[1, 47, 16, 16], [18, 47, 24, 16], [43, 47, 20, 16]],
  ];
  for (const row of rows) {
    for (const [x, y, w, h] of row) {
      const jitter = mix(stone, { r: 70 + rand() * 35, g: 80 + rand() * 25, b: 70 + rand() * 20, a: 255 }, 0.24);
      block(c, x, y, w, h, jitter, lighten(jitter, 0.28), darken(jitter, 0.38));
    }
  }

  speckle(c, rand, 20, 0.46);

  for (let i = 0; i < 70; i++) {
    const seamX = [0, 12, 19, 24, 33, 42, 63][Math.floor(rand() * 7)];
    const seamY = [0, 15, 31, 46, 63][Math.floor(rand() * 5)];
    const x = Math.max(1, Math.min(62, seamX + Math.floor((rand() - 0.5) * 5)));
    const y = Math.max(1, Math.min(62, seamY + Math.floor((rand() - 0.5) * 5)));
    c.setPixel(x, y, rand() < 0.35 ? MOSS_LIGHT : rand() < 0.72 ? MOSS_MID : MOSS_DARK);
  }

  drawVine(c, rand, 3, 9, 34, 1);
  drawVine(c, rand, 58, 6, 40, -1);
  drawVine(c, rand, 8, 37, 28, 1);

  bevel(c, lighten(stone, 0.22), INK, 1);
  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
