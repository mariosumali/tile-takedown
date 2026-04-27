#!/usr/bin/env node
// Crypt Brick - dark brick walls with bone fragments and tiny skull marks.
// Piece color tints the old brick, while the accents stay chalky bone.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'haunted';

const COLORS = {
  tomato:  '#7a3c3e',
  mustard: '#8a6b3c',
  olive:   '#4f5e50',
  sky:     '#4d5a6e',
  plum:    '#56385f',
  cream:   '#8c8374',
};

const BRICK_TOP = { r: 50, g: 46, b: 56, a: 255 };
const BRICK_BOT = { r: 14, g: 12, b: 18, a: 255 };
const INK = { r: 5, g: 5, b: 10, a: 255 };
const BONE = { r: 204, g: 194, b: 166, a: 255 };

function brick(c, x, y, w, h, fill, hi, shade) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      c.setPixel(xx, yy, mix(fill, shade, ((xx - x) + (yy - y)) / (w + h) * 0.35));
    }
  }
  c.rect(x, y, w, 1, hi);
  c.rect(x, y + h - 1, w, 1, shade);
}

function skull(c, cx, cy, bone, shadow) {
  c.circle(cx, cy, 5, bone);
  c.rect(cx - 4, cy + 3, 8, 5, bone);
  c.setPixel(cx - 2, cy, shadow);
  c.setPixel(cx + 2, cy, shadow);
  c.setPixel(cx, cy + 3, shadow);
  c.line(cx - 3, cy + 7, cx + 3, cy + 7, shadow);
}

function bone(c, x, y, len, horizontal) {
  if (horizontal) {
    c.line(x, y, x + len, y, BONE);
    c.circle(x, y, 2, BONE);
    c.circle(x + len, y, 2, BONE);
  } else {
    c.line(x, y, x, y + len, BONE);
    c.circle(x, y, 2, BONE);
    c.circle(x, y + len, 2, BONE);
  }
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xb0be);
  const piece = hexToRgb(hex);
  const base = mix(BRICK_TOP, saturate(piece, 0.08), 0.42);

  c.clear(INK);

  for (let row = 0; row < 6; row++) {
    const y = row * 11 + 1;
    const offset = row % 2 === 0 ? 0 : -10;
    for (let x = offset + 1; x < TILE_SIZE; x += 20) {
      const bx = Math.max(1, x);
      const w = x < 0 ? 20 + x : Math.min(19, TILE_SIZE - x - 1);
      const fill = mix(base, BRICK_BOT, rand() * 0.34);
      brick(c, bx, y, w, 9, fill, lighten(fill, 0.12), darken(fill, 0.34));
    }
  }

  speckle(c, rand, 9, 0.32);
  skull(c, 32, 31, { ...BONE, a: 210 }, INK);
  bone(c, 9, 16, 14, true);
  bone(c, 51, 42, 13, false);

  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rand() * TILE_SIZE);
    const y = Math.floor(rand() * TILE_SIZE);
    c.setPixel(x, y, rand() < 0.42 ? { ...BONE, a: 170 } : darken(BRICK_BOT, 0.2));
  }

  bevel(c, darken(base, 0.04), INK, 1);
  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
