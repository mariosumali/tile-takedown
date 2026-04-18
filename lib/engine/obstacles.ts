import type {
  BoardMask,
  BoardState,
  Obstacle,
  ObstacleMap,
  PieceShape,
} from '../types';
import { cloneBoard } from './grid';

/* ------------------------------------------------------------------------ */
/* Obstacle keys                                                             */
/* ------------------------------------------------------------------------ */

export function obstacleKey(r: number, c: number): string {
  return `${r}:${c}`;
}

export function parseObstacleKey(key: string): [number, number] {
  const [r, c] = key.split(':').map((n) => Number(n));
  return [r, c];
}

/* ------------------------------------------------------------------------ */
/* Spawning                                                                  */
/* ------------------------------------------------------------------------ */

type SpawnPlan = {
  locked: number;
  frozen: number;
  bomb: number;
};

/**
 * Obstacles ramp up with placements. Pass `placements` from the run state;
 * every tier we sprinkle a few more hazards on empty cells.
 *
 * Tuned for ~1 obstacle every 5 placements early, tightening toward 1/3 by
 * 40+ placements.
 */
export function spawnPlanFor(placements: number): SpawnPlan {
  if (placements < 5) return { locked: 0, frozen: 0, bomb: 0 };
  if (placements < 15) return { locked: 1, frozen: 0, bomb: 0 };
  if (placements < 25) return { locked: 1, frozen: 1, bomb: 0 };
  if (placements < 40) return { locked: 1, frozen: 1, bomb: 1 };
  return { locked: 2, frozen: 1, bomb: 1 };
}

/** Should we even try to spawn this turn? Every 5 placements after warmup. */
export function shouldSpawnThisTurn(placements: number): boolean {
  if (placements < 5) return false;
  return placements % 5 === 0;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Find empty, unmasked, unobstacled cells available for obstacle spawns. */
export function emptyCells(
  board: BoardState,
  obstacles: ObstacleMap,
  mask?: BoardMask,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (mask && mask[r]?.[c] === false) continue;
      if (board[r][c] !== null) continue;
      if (obstacles[obstacleKey(r, c)]) continue;
      out.push([r, c]);
    }
  }
  return out;
}

/**
 * Sprinkle obstacles onto empty cells according to a spawn plan. Returns a
 * new obstacle map — never mutates the input.
 */
export function sprinkleObstacles(
  board: BoardState,
  obstacles: ObstacleMap,
  plan: SpawnPlan,
  mask?: BoardMask,
  rng: () => number = Math.random,
): ObstacleMap {
  const cells = shuffle(emptyCells(board, obstacles, mask), rng);
  const next: ObstacleMap = { ...obstacles };
  let i = 0;
  for (let n = 0; n < plan.locked && i < cells.length; n++, i++) {
    const [r, c] = cells[i];
    next[obstacleKey(r, c)] = { kind: 'locked' };
  }
  for (let n = 0; n < plan.frozen && i < cells.length; n++, i++) {
    const [r, c] = cells[i];
    next[obstacleKey(r, c)] = { kind: 'frozen', meltsAfter: 6 };
  }
  for (let n = 0; n < plan.bomb && i < cells.length; n++, i++) {
    const [r, c] = cells[i];
    next[obstacleKey(r, c)] = { kind: 'bomb', turnsLeft: 5 };
  }
  return next;
}

/* ------------------------------------------------------------------------ */
/* Placement checks                                                          */
/* ------------------------------------------------------------------------ */

/**
 * Extends canPlace with obstacle awareness: locked/frozen/bomb cells block
 * placement just like filled cells do.
 */
export function canPlaceWithObstacles(
  board: BoardState,
  shape: PieceShape,
  row: number,
  col: number,
  obstacles: ObstacleMap,
  mask?: BoardMask,
): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let dr = 0; dr < shape.length; dr++) {
    const shapeRow = shape[dr];
    for (let dc = 0; dc < shapeRow.length; dc++) {
      if (!shapeRow[dc]) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
      if (mask && mask[r]?.[c] === false) return false;
      if (board[r][c] !== null) return false;
      if (obstacles[obstacleKey(r, c)]) return false;
    }
  }
  return true;
}

export function canAnyPieceFitWithObstacles(
  board: BoardState,
  pieces: ReadonlyArray<{ shape: PieceShape } | null | undefined>,
  obstacles: ObstacleMap,
  mask?: BoardMask,
): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (const p of pieces) {
    if (!p) continue;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (canPlaceWithObstacles(board, p.shape, r, c, obstacles, mask)) {
          return true;
        }
      }
    }
  }
  return false;
}

/* ------------------------------------------------------------------------ */
/* Per-turn advancement                                                      */
/* ------------------------------------------------------------------------ */

export type AdvanceResult = {
  board: BoardState;
  obstacles: ObstacleMap;
  /** Cells that were destroyed by exploding bombs. */
  explodedCells: ReadonlyArray<[number, number]>;
  /** Did anything actually explode? Drives SFX + life loss. */
  bombExploded: boolean;
  /** Frozen cells that melted off this turn. */
  meltedCells: ReadonlyArray<[number, number]>;
};

/**
 * Advance obstacle timers by one turn. Bombs that hit 0 detonate (3×3), frozen
 * cells that hit 0 melt (obstacle removed, underlying cell untouched).
 *
 * Note: locked tiles never advance.
 */
export function advanceObstacles(
  board: BoardState,
  obstacles: ObstacleMap,
): AdvanceResult {
  const next: ObstacleMap = {};
  const mut = cloneBoard(board);
  const exploded: Array<[number, number]> = [];
  const melted: Array<[number, number]> = [];
  let bombExploded = false;

  for (const [key, ob] of Object.entries(obstacles)) {
    if (ob.kind === 'locked') {
      next[key] = ob;
      continue;
    }
    if (ob.kind === 'frozen') {
      const meltsAfter = ob.meltsAfter - 1;
      if (meltsAfter <= 0) {
        const [r, c] = parseObstacleKey(key);
        melted.push([r, c]);
        continue;
      }
      next[key] = { kind: 'frozen', meltsAfter };
      continue;
    }
    if (ob.kind === 'bomb') {
      const turnsLeft = ob.turnsLeft - 1;
      if (turnsLeft <= 0) {
        bombExploded = true;
        const [r, c] = parseObstacleKey(key);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= mut.length || cc >= mut[0].length) {
              continue;
            }
            if (mut[rr][cc] !== null) {
              mut[rr][cc] = null;
              exploded.push([rr, cc]);
            }
          }
        }
        continue;
      }
      next[key] = { kind: 'bomb', turnsLeft };
    }
  }

  return {
    board: mut,
    obstacles: next,
    explodedCells: exploded,
    bombExploded,
    meltedCells: melted,
  };
}

/** Quick lookup used by rendering + powerup effects. */
export function obstacleAt(
  obstacles: ObstacleMap,
  r: number,
  c: number,
): Obstacle | undefined {
  return obstacles[obstacleKey(r, c)];
}
