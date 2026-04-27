#!/usr/bin/env node
// Synth Circuit - glowing PCB tiles with angular traces, diode nodes, and a
// hard dark rim. Piece color powers the circuit traces.

import {
  PixelCanvas, TILE_SIZE, rng, hashStr, hexToRgb, mix, lighten, darken, saturate,
  bevel, saveTile,
} from './lib/tilegen.mjs';

const THEME = 'neon';

const COLORS = {
  tomato:  '#ff35bd',
  mustard: '#f8ff45',
  olive:   '#40ff87',
  sky:     '#33e8ff',
  plum:    '#c25cff',
  cream:   '#95eaff',
};

const BOARD = { r: 5, g: 10, b: 27, a: 255 };

function trace(c, points, col, glow) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    c.line(x0, y0, x1, y1, glow);
    c.line(x0 + 1, y0, x1 + 1, y1, glow);
    c.line(x0, y0, x1, y1, col);
  }
}

function node(c, x, y, col, hot) {
  c.circle(x, y, 4, darken(col, 0.45));
  c.circle(x, y, 2, col);
  c.setPixel(x, y, hot);
  c.setPixel(x + 1, y, hot);
}

function generate(colorName, hex) {
  const c = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  const rand = rng(hashStr(`${THEME}:${colorName}`) ^ 0x2eac);
  const piece = hexToRgb(hex);
  const traceCol = saturate(piece, 0.35);
  const hot = lighten(saturate(piece, 0.5), 0.52);
  const dim = darken(piece, 0.72);

  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const grid = (x % 8 === 0 || y % 8 === 0) ? 0.09 : 0;
      c.setPixel(x, y, mix(BOARD, dim, grid));
    }
  }

  const routes = [
    [[4, 12], [18, 12], [18, 28], [32, 28], [32, 48], [58, 48]],
    [[8, 56], [8, 40], [24, 40], [24, 20], [48, 20], [48, 6]],
    [[58, 11], [42, 11], [42, 34], [56, 34]],
  ];
  for (const route of routes) trace(c, route, traceCol, { ...darken(traceCol, 0.2), a: 130 });

  for (const [x, y] of [[18, 12], [32, 28], [32, 48], [24, 40], [48, 20], [42, 34]]) {
    node(c, x, y, traceCol, hot);
  }

  // Diode stripes and small random glitch pixels.
  for (const [x, y] of [[12, 28], [50, 48], [38, 11]]) {
    c.rect(x - 4, y - 3, 8, 6, darken(traceCol, 0.42));
    c.line(x - 2, y - 2, x - 2, y + 2, hot);
    c.line(x + 2, y - 2, x + 2, y + 2, hot);
  }
  for (let i = 0; i < 14; i++) {
    const x = 4 + Math.floor(rand() * 56);
    const y = 4 + Math.floor(rand() * 56);
    c.setPixel(x, y, rand() < 0.35 ? hot : darken(traceCol, 0.35));
  }

  bevel(c, hot, darken(BOARD, 0.7), 2);
  return c;
}

function main() {
  for (const [name, hex] of Object.entries(COLORS)) {
    const file = saveTile(THEME, name, generate(name, hex));
    console.log(` wrote ${file}`);
  }
}

main();
