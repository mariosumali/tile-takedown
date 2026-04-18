import type {
  BoardState,
  ObstacleMap,
  PieceColor,
  PowerUpId,
} from '../types';
import { cloneBoard } from './grid';

/* ------------------------------------------------------------------------ */
/* Powerup metadata                                                          */
/* ------------------------------------------------------------------------ */

export type PowerUpKind = 'target' | 'instant' | 'modifier';

export type PowerUpDef = {
  id: PowerUpId;
  name: string;
  blurb: string;
  kind: PowerUpKind;
  /** Power-meter cost (0 = earned, not bought — reserved for future). */
  cost: number;
  /** Drop weight from clears. Higher == more common. */
  weight: number;
  /** Icon glyph. Kept as text; CSS styles the pip. */
  glyph: string;
};

export const POWERUPS: Record<PowerUpId, PowerUpDef> = {
  bomb: {
    id: 'bomb',
    name: 'Bomb',
    blurb: 'Clears a 3×3 radius around the target cell.',
    kind: 'target',
    cost: 0,
    weight: 5,
    glyph: '✦',
  },
  row_nuke: {
    id: 'row_nuke',
    name: 'Row nuke',
    blurb: 'Wipes the entire target row.',
    kind: 'target',
    cost: 0,
    weight: 4,
    glyph: '↔',
  },
  col_nuke: {
    id: 'col_nuke',
    name: 'Column nuke',
    blurb: 'Wipes the entire target column.',
    kind: 'target',
    cost: 0,
    weight: 4,
    glyph: '↕',
  },
  color_clear: {
    id: 'color_clear',
    name: 'Color clear',
    blurb: 'Removes every tile sharing the target color.',
    kind: 'target',
    cost: 0,
    weight: 3,
    glyph: '◉',
  },
  shuffle: {
    id: 'shuffle',
    name: 'Shuffle tray',
    blurb: 'Redraws your current tray. Does not cost a life.',
    kind: 'instant',
    cost: 0,
    weight: 6,
    glyph: '↻',
  },
  rotate_any: {
    id: 'rotate_any',
    name: 'Free rotation',
    blurb: 'Rotate the next placement — even on touch.',
    kind: 'modifier',
    cost: 0,
    weight: 4,
    glyph: '⟳',
  },
};

export const POWERUP_ORDER: ReadonlyArray<PowerUpId> = [
  'bomb',
  'row_nuke',
  'col_nuke',
  'color_clear',
  'shuffle',
  'rotate_any',
];

/* ------------------------------------------------------------------------ */
/* Random drops                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Pick a random powerup to award after a clear, biased by per-powerup weight.
 * `linesCleared` scales the chance of anything dropping at all.
 */
export function rollPowerupDrop(
  linesCleared: number,
  rng: () => number = Math.random,
): PowerUpId | null {
  if (linesCleared <= 0) return null;
  // Drop probability: 1 line = 35%, 2 = 60%, 3 = 85%, 4+ = guaranteed.
  const dropChance = Math.min(1, 0.1 + linesCleared * 0.25);
  if (rng() > dropChance) return null;
  const entries = POWERUP_ORDER.map((id) => [id, POWERUPS[id].weight] as const);
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = rng() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

/* ------------------------------------------------------------------------ */
/* Effects                                                                   */
/* ------------------------------------------------------------------------ */

export type PowerupEffect = {
  board: BoardState;
  obstacles: ObstacleMap;
  cellsCleared: ReadonlyArray<[number, number]>;
  /** Scoring bonus awarded for the powerup, independent of line clears. */
  bonus: number;
};

function obstacleKey(r: number, c: number): string {
  return `${r}:${c}`;
}

/** Clear a cell unless it's locked/frozen. Frozen tiles melt; locked stay. */
function clearCell(
  board: (PieceColor | null)[][],
  obstacles: ObstacleMap,
  r: number,
  c: number,
): { cleared: boolean; obstacles: ObstacleMap } {
  if (r < 0 || c < 0 || r >= board.length || c >= board[0].length) {
    return { cleared: false, obstacles };
  }
  const key = obstacleKey(r, c);
  const ob = obstacles[key];
  if (ob?.kind === 'locked') {
    // Locked tiles survive powerups. Price of admission.
    return { cleared: false, obstacles };
  }
  let next = obstacles;
  if (ob?.kind === 'frozen' || ob?.kind === 'bomb') {
    next = { ...obstacles };
    delete next[key];
  }
  if (board[r][c] !== null) {
    board[r][c] = null;
    return { cleared: true, obstacles: next };
  }
  return { cleared: false, obstacles: next };
}

/** Bomb: clears a 3×3 radius centered on (row, col). */
export function useBomb(
  board: BoardState,
  obstacles: ObstacleMap,
  row: number,
  col: number,
): PowerupEffect {
  const mut = cloneBoard(board);
  let obs = obstacles;
  const cleared: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr;
      const c = col + dc;
      const step = clearCell(mut, obs, r, c);
      obs = step.obstacles;
      if (step.cleared) cleared.push([r, c]);
    }
  }
  return { board: mut, obstacles: obs, cellsCleared: cleared, bonus: 60 };
}

export function useRowNuke(
  board: BoardState,
  obstacles: ObstacleMap,
  row: number,
): PowerupEffect {
  const mut = cloneBoard(board);
  let obs = obstacles;
  const cleared: Array<[number, number]> = [];
  for (let c = 0; c < mut[0].length; c++) {
    const step = clearCell(mut, obs, row, c);
    obs = step.obstacles;
    if (step.cleared) cleared.push([row, c]);
  }
  return { board: mut, obstacles: obs, cellsCleared: cleared, bonus: 90 };
}

export function useColNuke(
  board: BoardState,
  obstacles: ObstacleMap,
  col: number,
): PowerupEffect {
  const mut = cloneBoard(board);
  let obs = obstacles;
  const cleared: Array<[number, number]> = [];
  for (let r = 0; r < mut.length; r++) {
    const step = clearCell(mut, obs, r, col);
    obs = step.obstacles;
    if (step.cleared) cleared.push([r, col]);
  }
  return { board: mut, obstacles: obs, cellsCleared: cleared, bonus: 90 };
}

/** Color clear: remove every tile sharing the target color. */
export function useColorClear(
  board: BoardState,
  obstacles: ObstacleMap,
  color: PieceColor,
): PowerupEffect {
  const mut = cloneBoard(board);
  let obs = obstacles;
  const cleared: Array<[number, number]> = [];
  for (let r = 0; r < mut.length; r++) {
    for (let c = 0; c < mut[0].length; c++) {
      if (mut[r][c] !== color) continue;
      const step = clearCell(mut, obs, r, c);
      obs = step.obstacles;
      if (step.cleared) cleared.push([r, c]);
    }
  }
  const bonus = Math.min(180, cleared.length * 15);
  return { board: mut, obstacles: obs, cellsCleared: cleared, bonus };
}

/* ------------------------------------------------------------------------ */
/* Inventory helpers                                                         */
/* ------------------------------------------------------------------------ */

export function addToInventory(
  inv: Partial<Record<PowerUpId, number>>,
  id: PowerUpId,
  qty = 1,
): Partial<Record<PowerUpId, number>> {
  const n = (inv[id] ?? 0) + qty;
  return { ...inv, [id]: n };
}

export function removeFromInventory(
  inv: Partial<Record<PowerUpId, number>>,
  id: PowerUpId,
): Partial<Record<PowerUpId, number>> {
  const n = inv[id] ?? 0;
  if (n <= 0) return inv;
  const next = { ...inv };
  if (n - 1 <= 0) delete next[id];
  else next[id] = n - 1;
  return next;
}
