import type { BoardMask } from '../types';
import { PIECE_DEFS, type PieceDef } from '../engine/pieces';

/**
 * Parse an ASCII mask where `#` = playable and any other char = void.
 * All rows must be the same length, which becomes the column count.
 */
export function maskFromAscii(lines: ReadonlyArray<string>): BoardMask {
  if (lines.length === 0) return [];
  const cols = lines[0].length;
  return lines.map((line, r) => {
    if (line.length !== cols) {
      throw new Error(`maskFromAscii: row ${r} has length ${line.length}, expected ${cols}`);
    }
    const row: boolean[] = new Array(cols);
    for (let c = 0; c < cols; c++) row[c] = line[c] === '#';
    return row;
  });
}

/** Build a full-true mask of the given dims (useful when only sometimes masking). */
export function fullMask(rows: number, cols: number): BoardMask {
  return Array.from({ length: rows }, () => Array(cols).fill(true));
}

/** Resolve an id list into PieceDefs, throwing on unknown ids. */
export function poolFromIds(ids: ReadonlyArray<string>): ReadonlyArray<PieceDef> {
  const out: PieceDef[] = [];
  for (const id of ids) {
    const def = PIECE_DEFS.find((d) => d.id === id);
    if (!def) throw new Error(`poolFromIds: unknown piece id "${id}"`);
    out.push(def);
  }
  return out;
}

/** Average piece size for a pool — used to estimate par moves. */
export function avgPoolSize(defs: ReadonlyArray<PieceDef>): number {
  if (defs.length === 0) return 1;
  return defs.reduce((a, d) => a + d.size, 0) / defs.length;
}

/* ------------------------------------------------------------------------ */
/* Pre-authored piece pools                                                  */
/* ------------------------------------------------------------------------ */

export const POOL = {
  /** Monos, dominos, and trominos — gentle onboarding. */
  tiny: ['mono', 'domino_h', 'domino_v', 'i3_h', 'i3_v', 'l3_a', 'l3_b', 'l3_c', 'l3_d'],
  /** Small + basic tetrominos. */
  small: [
    'mono', 'domino_h', 'domino_v',
    'i3_h', 'i3_v',
    'l3_a', 'l3_b', 'l3_c', 'l3_d',
    'i4_h', 'i4_v', 'o2',
  ],
  /** All tetrominos. */
  tetro: [
    'i4_h', 'i4_v', 'o2',
    'l4_a', 'l4_b', 'l4_c', 'l4_d',
    's4', 'z4',
    't4_a', 't4_b', 't4_c', 't4_d',
  ],
  /** Tetrominos + one pentomino family (T/plus). */
  tetroPlusT: [
    'i4_h', 'i4_v', 'o2',
    'l4_a', 'l4_b', 'l4_c', 'l4_d',
    's4', 'z4',
    't4_a', 't4_b', 't4_c', 't4_d',
    'plus5',
  ],
  /** Tetros + 3 pentos. */
  tetroPlusPento: [
    'i4_h', 'i4_v', 'o2',
    'l4_a', 'l4_b', 'l4_c', 'l4_d',
    's4', 'z4',
    't4_a', 't4_b', 't4_c', 't4_d',
    'i5_h', 'i5_v', 'plus5', 'p5_a', 'p5_b',
  ],
  /** Pentomino-weighted mix. */
  pentoHeavy: [
    'o2', 'l4_a', 't4_a', 's4',
    'i5_h', 'i5_v', 'l5_a', 'l5_b', 'l5_c', 'l5_d',
    'p5_a', 'p5_b', 'p5_c', 'p5_d', 'plus5',
  ],
  /** All catalog shapes. */
  full: PIECE_DEFS.map((d) => d.id),
  /** Pentominos only — the gauntlet capstone. */
  pentoOnly: [
    'i5_h', 'i5_v',
    'l5_a', 'l5_b', 'l5_c', 'l5_d',
    'p5_a', 'p5_b', 'p5_c', 'p5_d',
    'plus5',
  ],
} as const satisfies Record<string, ReadonlyArray<string>>;

/* ------------------------------------------------------------------------ */
/* Reusable ASCII masks                                                      */
/* ------------------------------------------------------------------------ */

export const MASK = {
  /** 8×8, classic diamond. */
  diamond8: maskFromAscii([
    '...##...',
    '..####..',
    '.######.',
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
  ]),
  /** 8×8, plus/cross with 2-cell arms. */
  plus8: maskFromAscii([
    '...##...',
    '...##...',
    '...##...',
    '########',
    '########',
    '...##...',
    '...##...',
    '...##...',
  ]),
  /** 8×8, all four corners snipped (1-cell). */
  cornerSnip8: maskFromAscii([
    '.######.',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
    '.######.',
  ]),
  /** 8×8, ring with a 2×2 empty core. */
  ring8: maskFromAscii([
    '########',
    '########',
    '########',
    '###..###',
    '###..###',
    '########',
    '########',
    '########',
  ]),
  /** 8×8, hourglass. */
  hourglass8: maskFromAscii([
    '########',
    '.######.',
    '..####..',
    '...##...',
    '...##...',
    '..####..',
    '.######.',
    '########',
  ]),
  /** 8×8, H. */
  h8: maskFromAscii([
    '##....##',
    '##....##',
    '##....##',
    '########',
    '########',
    '##....##',
    '##....##',
    '##....##',
  ]),
  /** 8×8, T. */
  t8: maskFromAscii([
    '########',
    '########',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
  ]),
  /** 8×8, L. */
  l8: maskFromAscii([
    '##......',
    '##......',
    '##......',
    '##......',
    '##......',
    '##......',
    '########',
    '########',
  ]),
  /** 8×8, keyhole. */
  keyhole8: maskFromAscii([
    '...##...',
    '..####..',
    '..####..',
    '..####..',
    '########',
    '########',
    '########',
    '########',
  ]),
  /** 10×8, H-wide. */
  hWide10x8: maskFromAscii([
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '########',
    '########',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
  ]),
  /** 10×8, C. */
  c10x8: maskFromAscii([
    '########',
    '########',
    '##......',
    '##......',
    '##......',
    '##......',
    '##......',
    '##......',
    '########',
    '########',
  ]),
  /** 8×10, diagonals snipped. */
  angled8x10: maskFromAscii([
    '..########',
    '.#########',
    '##########',
    '##########',
    '##########',
    '##########',
    '#########.',
    '########..',
  ]),
  /** 8×10, a single row notched out mid-board. */
  notched8x10: maskFromAscii([
    '##########',
    '##########',
    '##########',
    '###....###',
    '###....###',
    '##########',
    '##########',
    '##########',
  ]),
  /** 10×8, corners snipped (2-cell). */
  cornerSnip10x8: maskFromAscii([
    '..####..',
    '.######.',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
    '.######.',
    '..####..',
  ]),
  /** 10×8, single middle row notched. */
  notched10x8: maskFromAscii([
    '########',
    '########',
    '########',
    '########',
    '##....##',
    '##....##',
    '########',
    '########',
    '########',
    '########',
  ]),
  /** 10×10, ring. */
  ring10: maskFromAscii([
    '##########',
    '##########',
    '##........',
    '##........',
    '##........',
    '........##',
    '........##',
    '........##',
    '##########',
    '##########',
  ]),
  /** 10×10, double ring (hollow border + inner hollow). */
  doubleRing10: maskFromAscii([
    '##########',
    '#........#',
    '#.######.#',
    '#.#....#.#',
    '#.#....#.#',
    '#.#....#.#',
    '#.#....#.#',
    '#.######.#',
    '#........#',
    '##########',
  ]),
  /** 10×10, keyhole. */
  keyhole10: maskFromAscii([
    '....##....',
    '...####...',
    '...####...',
    '..######..',
    '.########.',
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
  ]),
  /** 10×10, spiral arms. */
  spiral10: maskFromAscii([
    '##########',
    '#........#',
    '#.######.#',
    '#.#....#.#',
    '#.#.##.#.#',
    '#.#.##.#.#',
    '#.#....#.#',
    '#.######.#',
    '#........#',
    '##########',
  ]),
  /** 10×10, diagonal stripe blocked. */
  stripe10: maskFromAscii([
    '##########',
    '##########',
    '##.#######',
    '###.######',
    '####.#####',
    '#####.####',
    '######.###',
    '#######.##',
    '##########',
    '##########',
  ]),
  /** 9×7, a trimmed rectangle. */
  rect9x7: maskFromAscii([
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
  ]),
} as const;
