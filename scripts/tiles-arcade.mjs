#!/usr/bin/env node
// Retro Arcade — classic chunky 8-bit block. Flat piece-color face with a
// two-step bevel: 3px highlight top-left, 3px shadow bottom-right, plus a hard
// black outer border. Interior carries a small "pip" dither cluster so the
// face doesn't look like a solid rectangle.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, lighten, darken,
  saveTile,
} from './lib/tilegen.mjs';

const THEME = 'arcade';

const COLORS = {
  tomato:  '#ff3a6e',
  mustard: '#ffd728',
  olive:   '#5effa0',
  sky:     '#3ab4ff',
  plum:    '#c83ae0',
  cream:   '#f8f8f8',
};

const BLACK = { r: 0, g: 0, b: 0, a: 255 };

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xa2cd);
  const face = hexToRgb(hex);
  const hi1 = lighten(face, 0.35);
  const hi2 = lighten(face, 0.7);
  const sh1 = darken(face, 0.28);
  const sh2 = darken(face, 0.55);

  // Fill with face color.
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) c.setPixel(x, y, face);
  }

  const border = 2; // outer black.
  const bevel1 = 3; // primary highlight/shadow band.
  const bevel2 = 2; // secondary band.

  // Outer black border.
  for (let i = 0; i < border; i++) {
    for (let x = i; x < TILE_SIZE - i; x++) {
      c.setPixel(x, i, BLACK);
      c.setPixel(x, TILE_SIZE - 1 - i, BLACK);
    }
    for (let y = i; y < TILE_SIZE - i; y++) {
      c.setPixel(i, y, BLACK);
      c.setPixel(TILE_SIZE - 1 - i, y, BLACK);
    }
  }

  // Primary highlight (top + left).
  for (let j = 0; j < bevel1; j++) {
    const y = border + j;
    for (let x = border + j; x < TILE_SIZE - border - j; x++) c.setPixel(x, y, hi1);
    const x = border + j;
    for (let yy = border + j; yy < TILE_SIZE - border - j; yy++) c.setPixel(x, yy, hi1);
  }

  // Primary shadow (bottom + right).
  for (let j = 0; j < bevel1; j++) {
    const y = TILE_SIZE - 1 - border - j;
    for (let x = border + j; x < TILE_SIZE - border - j; x++) c.setPixel(x, y, sh1);
    const x = TILE_SIZE - 1 - border - j;
    for (let yy = border + j; yy < TILE_SIZE - border - j; yy++) c.setPixel(x, yy, sh1);
  }

  // Brighter corner highlight pixels (top-left two rows, 1px only).
  for (let j = 0; j < bevel2; j++) {
    const y = border + j;
    for (let x = border + j; x < border + 12 - j; x++) c.setPixel(x, y, hi2);
    const x = border + j;
    for (let yy = border + j; yy < border + 12 - j; yy++) c.setPixel(x, yy, hi2);
  }

  // Deeper shadow "burned" bottom-right corner (1px).
  for (let i = 0; i < 4; i++) {
    c.setPixel(TILE_SIZE - 3 - i, TILE_SIZE - 3, sh2);
    c.setPixel(TILE_SIZE - 3, TILE_SIZE - 3 - i, sh2);
  }

  // Face dither pattern (classic NES-style 50% checker on a 2-pixel grid) for
  // interior texture, applied lightly.
  for (let y = 10; y < TILE_SIZE - 10; y++) {
    for (let x = 10; x < TILE_SIZE - 10; x++) {
      const checker = ((x >> 1) + (y >> 1)) & 1;
      if (checker === 0) {
        const p = c.getPixel(x, y);
        if (p.r === face.r && p.g === face.g && p.b === face.b) {
          c.setPixel(x, y, { r: hi1.r, g: hi1.g, b: hi1.b, a: 40 });
        }
      }
    }
  }

  // A single "pip" glyph in the face (a tiny 8-bit heart / dot pattern),
  // picked by RNG so each color variant has a subtle different mark.
  const px = 32, py = 32;
  const pattern = [
    [0,1,1,0,0,1,1,0],
    [1,0,0,1,1,0,0,1],
    [1,0,0,0,0,0,0,1],
    [0,1,0,0,0,0,1,0],
    [0,0,1,0,0,1,0,0],
    [0,0,0,1,1,0,0,0],
  ];
  // Random horizontal offset gives variants their own sub-personality.
  const dx = Math.floor((rand() - 0.5) * 4);
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      if (pattern[y][x]) {
        c.setPixel(px + x - 4 + dx, py + y - 3, hi2);
      }
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
