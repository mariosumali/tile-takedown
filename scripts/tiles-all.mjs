#!/usr/bin/env node
// Run every per-theme tile generator in sequence. Each generator writes PNGs
// to public/tiles/<theme>/<color>.png. This is the script wired into the
// `tiles` npm command.

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const THEMES = [
  'jungle', 'volcano', 'abyssal', 'sakura',
  'arctic', 'desert', 'haunted',
  'neon', 'arcade',
];

const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;

for (const theme of THEMES) {
  console.log(`\n[${theme}]`);
  const result = spawnSync(process.execPath, [resolve(here, `tiles-${theme}.mjs`)], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(` ${theme} failed (exit ${result.status})`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} theme(s) failed`);
  process.exit(1);
}
console.log('\nall themes rendered');
