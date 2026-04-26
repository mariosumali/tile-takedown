#!/usr/bin/env node
// Desert Glyph — sandstone block with a carved glyph in the center. Base is
// weathered sand shifted toward the piece color; the glyph rotates between six
// variants so each color variant carries its own carved icon.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken,
  speckle, bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'desert';

const COLORS = {
  tomato:  '#c85236',
  mustard: '#e6aa3c',
  olive:   '#8a8a4a',
  sky:     '#3ea0a0',
  plum:    '#a65a52',
  cream:   '#e8d4a8',
};

const SAND_BASE = { r: 212, g: 174, b: 124, a: 255 };
const CARVED    = { r: 64, g: 40, b: 22, a: 255 };

// Glyph drawers — each a simple stylized icon that reads at 64×64.
const GLYPHS = {
  sun(c, cx, cy, ink) {
    c.ringCircle(cx, cy, 6, ink);
    c.ringCircle(cx, cy, 7, ink);
    c.setPixel(cx, cy, ink);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x0 = Math.round(cx + Math.cos(a) * 10);
      const y0 = Math.round(cy + Math.sin(a) * 10);
      const x1 = Math.round(cx + Math.cos(a) * 14);
      const y1 = Math.round(cy + Math.sin(a) * 14);
      c.line(x0, y0, x1, y1, ink);
    }
  },
  ankh(c, cx, cy, ink) {
    c.ringCircle(cx, cy - 6, 5, ink);
    c.ringCircle(cx, cy - 6, 6, ink);
    c.line(cx, cy - 1, cx, cy + 14, ink);
    c.line(cx - 1, cy - 1, cx - 1, cy + 14, ink);
    c.line(cx - 8, cy + 2, cx + 8, cy + 2, ink);
    c.line(cx - 8, cy + 3, cx + 8, cy + 3, ink);
  },
  eye(c, cx, cy, ink) {
    // Almond shape.
    for (let x = -14; x <= 14; x++) {
      const h = Math.round(Math.sqrt(Math.max(0, 1 - (x / 14) ** 2)) * 7);
      c.setPixel(cx + x, cy - h, ink);
      c.setPixel(cx + x, cy + h, ink);
    }
    c.ringCircle(cx, cy, 4, ink);
    c.circle(cx, cy, 2, ink);
    // Under-eye hook.
    c.line(cx - 4, cy + 8, cx - 10, cy + 12, ink);
    c.line(cx - 10, cy + 12, cx - 12, cy + 8, ink);
  },
  scarab(c, cx, cy, ink) {
    // Body.
    for (let y = -6; y <= 10; y++) {
      const w = Math.round(8 * Math.sqrt(Math.max(0, 1 - ((y - 2) / 9) ** 2)));
      for (let x = -w; x <= w; x++) {
        if (Math.abs(x) === w || y === -6 || y === 10) c.setPixel(cx + x, cy + y, ink);
      }
    }
    c.line(cx, cy - 6, cx, cy + 10, ink);
    c.line(cx - 8, cy - 4, cx - 12, cy - 8, ink);
    c.line(cx + 8, cy - 4, cx + 12, cy - 8, ink);
    c.line(cx - 8, cy + 2, cx - 14, cy + 4, ink);
    c.line(cx + 8, cy + 2, cx + 14, cy + 4, ink);
    c.line(cx - 7, cy + 8, cx - 11, cy + 14, ink);
    c.line(cx + 7, cy + 8, cx + 11, cy + 14, ink);
  },
  zigzag(c, cx, cy, ink) {
    // Aztec/zig-zag water pattern, two rows.
    for (let row = 0; row < 3; row++) {
      const y = cy - 10 + row * 10;
      for (let i = 0; i < 5; i++) {
        const x0 = cx - 14 + i * 7;
        c.line(x0, y + 4, x0 + 3, y - 3, ink);
        c.line(x0 + 3, y - 3, x0 + 7, y + 4, ink);
      }
    }
  },
  moon(c, cx, cy, ink) {
    // Crescent: outer circle minus inner, offset.
    for (let y = -11; y <= 11; y++) {
      for (let x = -11; x <= 11; x++) {
        const d1 = Math.hypot(x, y);
        const d2 = Math.hypot(x - 5, y - 1);
        if (d1 < 11 && d1 > 9 && d2 > 9) c.setPixel(cx + x, cy + y, ink);
      }
    }
    // Three stars.
    for (const [sx, sy] of [[-16, -8], [16, 10], [14, -12]]) {
      c.setPixel(cx + sx, cy + sy, ink);
      c.setPixel(cx + sx + 1, cy + sy, ink);
      c.setPixel(cx + sx - 1, cy + sy, ink);
      c.setPixel(cx + sx, cy + sy + 1, ink);
      c.setPixel(cx + sx, cy + sy - 1, ink);
    }
  },
};

const GLYPH_ORDER = ['sun', 'ankh', 'eye', 'scarab', 'zigzag', 'moon'];

function generate(colorName, hex, idx) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0xd25e);
  const piece = hexToRgb(hex);
  const sand = mix(SAND_BASE, piece, 0.35);

  // Base sand gradient (slightly darker at the bottom).
  for (let y = 0; y < TILE_SIZE; y++) {
    const t = y / TILE_SIZE;
    const col = mix(lighten(sand, 0.1), darken(sand, 0.15), t);
    for (let x = 0; x < TILE_SIZE; x++) c.setPixel(x, y, col);
  }

  // Heavy grain noise.
  speckle(c, rand, 22, 0.7);

  // Eroded dark scratches running horizontally.
  for (let k = 0; k < 4; k++) {
    const y = Math.floor(rand() * TILE_SIZE);
    for (let x = 0; x < TILE_SIZE; x++) {
      if (rand() < 0.5) {
        const p = c.getPixel(x, y);
        c.setPixel(x, y, mix(p, CARVED, 0.12));
      }
    }
  }

  // Edge vignette — darken borders.
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const dx = Math.min(x, TILE_SIZE - 1 - x);
      const dy = Math.min(y, TILE_SIZE - 1 - y);
      const d = Math.min(dx, dy);
      if (d < 6) {
        const t = (6 - d) / 6 * 0.35;
        const p = c.getPixel(x, y);
        c.setPixel(x, y, mix(p, CARVED, t));
      }
    }
  }

  // Corner chips.
  for (let i = 0; i < 3; i++) {
    const cx = rand() < 0.5 ? 2 : TILE_SIZE - 3;
    const cy = rand() < 0.5 ? 2 : TILE_SIZE - 3;
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        if (rand() < 0.45) c.setPixel(cx + x, cy + y, darken(sand, 0.4));
      }
    }
  }

  // Carved glyph — each piece color gets a different glyph.
  const glyphKey = GLYPH_ORDER[idx % GLYPH_ORDER.length];
  const ink = darken(sand, 0.55);
  GLYPHS[glyphKey](c, 32, 32, ink);

  // Shadow line below glyph carvings for extra depth (1px offset, lighter).
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const here = c.getPixel(x, y);
      if (here.r < 120 && here.g < 80) {
        const below = c.getPixel(x, y + 1);
        if (below.r > 150) c.setPixel(x, y + 1, lighten(sand, 0.3));
      }
    }
  }

  bevel(c, lighten(sand, 0.25), darken(sand, 0.55), 1);

  return c;
}

function main() {
  let idx = 0;
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex, idx++));
    console.log(` wrote ${file}`);
  }
}

main();
