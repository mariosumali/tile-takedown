#!/usr/bin/env node
// Ice Block - translucent, chunky ice with trapped bubbles, cracks, and hard
// square edges. Piece color gives each block a cold tint.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'arctic';

const COLORS = {
  tomato:  '#a7dfd0',
  mustard: '#d8d3f0',
  olive:   '#99d3cb',
  sky:     '#9bd6f0',
  plum:    '#b9b0e8',
  cream:   '#e9f4f7',
};

const ICE = { r: 238, g: 248, b: 255, a: 255 };
const EDGE = { r: 32, g: 58, b: 92, a: 255 };
const FROST = { r: 255, g: 255, b: 255, a: 185 };

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0x1ce0);
  const piece = hexToRgb(hex);
  const top = mix(ICE, piece, 0.22);
  const bot = mix(ICE, darken(piece, 0.12), 0.5);
  const mid = mix(top, bot, 0.5);

  for (let y = 0; y < TILE_SIZE; y++) {
    const band = Math.floor(y / 8) % 2;
    const col = mix(top, bot, y / TILE_SIZE + band * 0.04);
    for (let x = 0; x < TILE_SIZE; x++) {
      const edge = Math.min(x, y, TILE_SIZE - 1 - x, TILE_SIZE - 1 - y);
      c.setPixel(x, y, edge < 7 ? mix(col, mid, 0.24) : col);
    }
  }

  // Big square ice facets and internal cracks.
  for (const [x, y, w, h] of [[7, 8, 22, 16], [31, 9, 25, 19], [8, 29, 19, 25], [29, 31, 26, 22]]) {
    c.rect(x, y, w, 1, FROST);
    c.rect(x, y, 1, h, FROST);
    c.rect(x, y + h - 1, w, 1, mix(bot, EDGE, 0.18));
    c.rect(x + w - 1, y, 1, h, mix(bot, EDGE, 0.2));
  }
  c.line(11, 17, 25, 28, FROST);
  c.line(25, 28, 19, 42, FROST);
  c.line(39, 13, 31, 27, { ...FROST, a: 150 });
  c.line(42, 37, 53, 48, { ...FROST, a: 155 });

  for (let i = 0; i < 18; i++) {
    const x = 6 + Math.floor(rand() * 52);
    const y = 6 + Math.floor(rand() * 52);
    c.ringCircle(x, y, rand() < 0.72 ? 1 : 2, { r: 255, g: 255, b: 255, a: 140 });
  }

  speckle(c, rand, 4, 0.1);
  bevel(c, lighten(top, 0.28), EDGE, 1);
  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
