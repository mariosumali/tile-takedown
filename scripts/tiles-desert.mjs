#!/usr/bin/env node
// Sandstone Brick - sunbaked brick wall blocks with coarse grain and chipped
// mortar. Piece color tints the sandstone without turning it into ceramic.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'desert';

const COLORS = {
  tomato:  '#c76a46',
  mustard: '#d8aa56',
  olive:   '#9a8d58',
  sky:     '#6ca1a0',
  plum:    '#a66c62',
  cream:   '#e3c995',
};

const SAND = { r: 216, g: 174, b: 116, a: 255 };
const GROUT = { r: 72, g: 45, b: 27, a: 255 };

function brick(c, x, y, w, h, fill, hi, shade) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const t = ((xx - x) + (yy - y)) / (w + h);
      c.setPixel(xx, yy, mix(lighten(fill, 0.08), darken(fill, 0.14), t));
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

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xb21c);
  const piece = hexToRgb(hex);
  const sand = mix(SAND, piece, 0.3);
  const pale = lighten(sand, 0.08);

  c.clear(darken(GROUT, 0.1));
  speckle(c, rand, 18, 0.65);

  const rowH = 12;
  for (let row = 0; row < 6; row++) {
    const y = row * rowH + 1;
    const offset = row % 2 === 0 ? 0 : -12;
    for (let x = offset + 1; x < TILE_SIZE; x += 24) {
      const w = x < 0 ? 24 + x : Math.min(23, TILE_SIZE - x - 1);
      const bx = Math.max(1, x);
      const fill = mix(sand, pale, rand() * 0.24);
      brick(c, bx, y, w, rowH - 2, fill, lighten(fill, 0.22), darken(fill, 0.3));
    }
  }

  // Chipped mortar, pockmarks, and sun-bleached scratches.
  for (let i = 0; i < 42; i++) {
    const x = 2 + Math.floor(rand() * 60);
    const y = 2 + Math.floor(rand() * 60);
    c.setPixel(x, y, rand() < 0.48 ? GROUT : lighten(sand, 0.25));
    if (rand() < 0.28) c.setPixel(x + 1, y, GROUT);
  }
  for (let i = 0; i < 5; i++) {
    const y = 6 + Math.floor(rand() * 52);
    c.line(4 + Math.floor(rand() * 12), y, 22 + Math.floor(rand() * 34), y + Math.floor((rand() - 0.5) * 3), darken(sand, 0.22));
  }

  bevel(c, lighten(sand, 0.18), darken(GROUT, 0.12), 1);
  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
