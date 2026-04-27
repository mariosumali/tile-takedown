/**
 * Solvable-batch tray generator.
 *
 * The game's new contract: pieces in the tray now refill as a batch of three,
 * not one slot at a time. To keep difficulty in the "player's fault if they
 * lose" zone, each batch we hand to the player must be placeable in *some*
 * legal order on the current board (respecting rotations if the setting is
 * on, and accounting for line clears between placements).
 *
 * On top of that, we occasionally weave in "assist" batches — guaranteed
 * small pieces that help a cornered player find an out. Those are rare by
 * design; the main defence against unfair RNG is the solvability check.
 */

import type { BoardMask, BoardState, Piece, PieceSet } from '../types';
import {
  buildBag,
  buildBagFromPool,
} from './bag';
import {
  boardIsEmpty,
  canPlace,
  clearLines,
  getClearedLines,
  placePiece,
} from './grid';
import {
  getDef,
  PIECE_COLORS,
  PIECE_DEFS,
  uniqueRotations,
  type PieceDef,
} from './pieces';

type Rng = () => number;

/** Pieces you might need in a pinch — the "rescue" pool. */
const RESCUE_IDS = [
  'mono',
  'domino_h',
  'domino_v',
  'i3_h',
  'i3_v',
  'l3_a',
  'l3_b',
  'l3_c',
  'l3_d',
];

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_NODE_BUDGET = 20_000;
const CLASSIC_STARTER_IDS = ['o3', 'rect2x3', 'rect3x2'] as const;

export type SolverOptions = {
  mask?: BoardMask;
  /** If false, only the piece's given shape is tried — no rotations. */
  rotationAllowed?: boolean;
  /** Abort after this many search nodes, treat as "no solution found". */
  nodeBudget?: number;
};

/**
 * Return true if *some* order of the given pieces can be placed on the board
 * without deadlocking, accounting for line clears between placements. This is
 * the core fairness guarantee for batch tray generation.
 */
export function tripletIsSolvable(
  board: BoardState,
  pieces: ReadonlyArray<Pick<Piece, 'shape' | 'color'>>,
  opts: SolverOptions = {},
): boolean {
  const { mask, rotationAllowed = true, nodeBudget = DEFAULT_NODE_BUDGET } = opts;

  const shapeVariants: ReadonlyArray<Piece['shape']>[] = pieces.map((p) =>
    rotationAllowed ? uniqueRotations(p.shape) : [p.shape],
  );
  const colors = pieces.map((p) => p.color);

  let nodes = 0;

  function recur(
    currentBoard: BoardState,
    remaining: ReadonlyArray<number>,
  ): boolean {
    if (remaining.length === 0) return true;

    for (let ri = 0; ri < remaining.length; ri++) {
      const idx = remaining[ri];
      const variants = shapeVariants[idx];
      for (const shape of variants) {
        const rows = currentBoard.length;
        const cols = currentBoard[0]?.length ?? 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (++nodes > nodeBudget) return false;
            if (!canPlace(currentBoard, shape, r, c, mask)) continue;
            const placed = placePiece(
              currentBoard,
              { shape, color: colors[idx] },
              r,
              c,
              mask,
            );
            const cleared = getClearedLines(placed, mask);
            const after =
              cleared.totalLines > 0
                ? clearLines(placed, cleared.rows, cleared.cols)
                : placed;
            const nextRemaining = remaining.filter((_, i) => i !== ri);
            if (recur(after, nextRemaining)) return true;
          }
        }
      }
    }
    return false;
  }

  return recur(
    board,
    pieces.map((_, i) => i),
  );
}

/* ------------------------------------------------------------------------ */
/* Pressure metric — how close is the board to deadlock?                     */
/* ------------------------------------------------------------------------ */

/**
 * 0..1ish pressure score. Higher = more constrained. Combines density with
 * "near-full" rows/cols so a mostly-empty board with 1 nearly-full row still
 * reads as moderately tight.
 */
export function boardPressure(board: BoardState, mask?: BoardMask): number {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  let filled = 0;
  let playable = 0;
  let nearFullLines = 0;

  for (let r = 0; r < rows; r++) {
    let rowPlay = 0;
    let rowFilled = 0;
    for (let c = 0; c < cols; c++) {
      const inPlay = mask ? mask[r]?.[c] !== false : true;
      if (!inPlay) continue;
      rowPlay++;
      playable++;
      if (board[r][c] !== null) {
        rowFilled++;
        filled++;
      }
    }
    if (rowPlay > 0 && rowPlay - rowFilled <= 1) nearFullLines++;
  }
  for (let c = 0; c < cols; c++) {
    let colPlay = 0;
    let colFilled = 0;
    for (let r = 0; r < rows; r++) {
      const inPlay = mask ? mask[r]?.[c] !== false : true;
      if (!inPlay) continue;
      colPlay++;
      if (board[r][c] !== null) colFilled++;
    }
    if (colPlay > 0 && colPlay - colFilled <= 1) nearFullLines++;
  }

  const density = playable === 0 ? 0 : filled / playable;
  return Math.min(1.2, density + 0.08 * nearFullLines);
}

/* ------------------------------------------------------------------------ */
/* Assist detection                                                          */
/* ------------------------------------------------------------------------ */

function shouldAssist(pressure: number, rng: Rng): boolean {
  // High pressure → assist kicks in often. Even on a relaxed board, the
  // occasional bonus rescue keeps things generous without feeling trivial.
  if (pressure >= 0.78) return rng() < 0.7;
  if (pressure >= 0.6) return rng() < 0.3;
  if (pressure >= 0.45) return rng() < 0.12;
  return rng() < 0.04;
}

function rescueDefsFor(
  board: BoardState,
  mask: BoardMask | undefined,
  rotationAllowed: boolean,
): PieceDef[] {
  const out: PieceDef[] = [];
  for (const id of RESCUE_IDS) {
    const def = PIECE_DEFS.find((d) => d.id === id);
    if (!def) continue;
    const variants = rotationAllowed ? uniqueRotations(def.shape) : [def.shape];
    let fits = false;
    outer: for (const shape of variants) {
      const rows = board.length;
      const cols = board[0]?.length ?? 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (canPlace(board, shape, r, c, mask)) {
            fits = true;
            break outer;
          }
        }
      }
    }
    if (fits) out.push(def);
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Batch draw                                                                */
/* ------------------------------------------------------------------------ */

export type BatchSource =
  | { kind: 'classic'; pieceSet: PieceSet }
  | { kind: 'pool'; pool: ReadonlyArray<string> };

function pickColor(rng: Rng): Piece['color'] {
  return PIECE_COLORS[Math.floor(rng() * PIECE_COLORS.length)];
}

function classicStarterTray(rng: Rng): Piece[] {
  const ids = CLASSIC_STARTER_IDS.slice();
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  return ids
    .map((id) => getDef(id))
    .filter((def): def is PieceDef => def !== undefined)
    .map((def) => ({ shape: def.shape, color: pickColor(rng) }));
}

function refillBag(
  bag: ReadonlyArray<Piece>,
  source: BatchSource,
  density: number,
  rng: Rng,
): Piece[] {
  if (bag.length >= 3) return bag.slice();
  const top =
    source.kind === 'classic'
      ? buildBag(source.pieceSet, density, rng)
      : buildBagFromPool(source.pool, density, rng);
  return bag.concat(top);
}

export type GeneratedBatch = {
  tray: Piece[];
  bag: Piece[];
  /** True if an assist substitution was applied this batch. */
  assisted: boolean;
  /** Attempts spent finding a solvable draw; useful for telemetry. */
  attempts: number;
};

/**
 * Promote a pre-drawn preview batch against the *current* board state.
 *
 * `generateSolvableBatch` only guarantees a batch is solvable against the
 * board that existed at draw time. But the game keeps a preview tray one
 * step ahead of play — by the time that preview is promoted into the active
 * tray, three placements (and maybe clears) have already happened, and the
 * solvability guarantee can have lapsed. This helper closes that gap:
 *
 *   - if the preview is still solvable on `board`, it's handed back verbatim;
 *   - otherwise, it's thrown out and a fresh solvable batch is drawn from the
 *     current bag, preserving bag continuity.
 *
 * This is the last line of defence that keeps tray exhaustion from dropping
 * the player into an unwinnable state through no fault of their own.
 */
export function promoteOrRegenerateBatch(args: {
  board: BoardState;
  preview: ReadonlyArray<Pick<Piece, 'shape' | 'color'>>;
  bag: ReadonlyArray<Piece>;
  source: BatchSource;
  mask?: BoardMask;
  rotationAllowed?: boolean;
  rng?: Rng;
  maxAttempts?: number;
  density?: number;
}): GeneratedBatch {
  const {
    board,
    preview,
    bag,
    source,
    mask,
    rotationAllowed = true,
    rng,
    maxAttempts,
    density,
  } = args;

  if (
    preview.length === 3 &&
    tripletIsSolvable(board, preview, { mask, rotationAllowed })
  ) {
    return {
      tray: preview.map((p) => ({ shape: p.shape, color: p.color })),
      bag: bag.slice(),
      assisted: false,
      attempts: 0,
    };
  }

  return generateSolvableBatch({
    board,
    bag,
    source,
    mask,
    rotationAllowed,
    rng,
    maxAttempts,
    density,
  });
}

/* ------------------------------------------------------------------------ */
/* Single-slot refill                                                        */
/* ------------------------------------------------------------------------ */

/** True if the filled (non-null) entries of `tray` are solvable together. */
function filledTrayIsSolvable(
  board: BoardState,
  tray: ReadonlyArray<Pick<Piece, 'shape' | 'color'> | null>,
  opts: SolverOptions = {},
): boolean {
  const pieces = tray.filter(
    (p): p is Pick<Piece, 'shape' | 'color'> => p !== null,
  );
  if (pieces.length === 0) return true;
  return tripletIsSolvable(board, pieces, opts);
}

export type SlotRefillResult = {
  piece: Piece;
  bag: Piece[];
  /** True if we had to swap out the intended preview piece. */
  replaced: boolean;
};

/**
 * Instant-refill companion to `promoteOrRegenerateBatch`.
 *
 * When the tray drips a single slot from the preview (`instantTrayRefill`
 * mode), the piece we pull may have been chosen against a long-stale board
 * and no longer compose with the pieces the player is still holding. This
 * helper checks that the resulting tray is solvable on the current board;
 * if not, it draws a replacement piece from the bag and, if necessary,
 * regenerates a fresh batch so the chosen replacement is one the player
 * can actually use.
 *
 * The held pieces in `heldTray` are never swapped — only the incoming
 * `preview` piece can change. That keeps instant mode from jarringly
 * mutating pieces the player has been planning around.
 */
export function pickSolvableSlotRefill(args: {
  board: BoardState;
  /** The tray AFTER the placed slot has been vacated (nulls allowed). */
  heldTray: ReadonlyArray<Pick<Piece, 'shape' | 'color'> | null>;
  /** Which slot is about to be filled. */
  slotIndex: number;
  /** The preview piece we would have dropped into the slot. */
  preview: Pick<Piece, 'shape' | 'color'>;
  bag: ReadonlyArray<Piece>;
  source: BatchSource;
  mask?: BoardMask;
  rotationAllowed?: boolean;
  rng?: Rng;
  density?: number;
  /** Cap on candidate pieces considered for a single-slot swap. */
  candidateBudget?: number;
}): SlotRefillResult {
  const {
    board,
    heldTray,
    slotIndex,
    preview,
    source,
    mask,
    rotationAllowed = true,
    rng = Math.random,
    density,
    candidateBudget = 24,
  } = args;

  const probeTray: (Pick<Piece, 'shape' | 'color'> | null)[] = heldTray.slice();
  probeTray[slotIndex] = preview;

  if (filledTrayIsSolvable(board, probeTray, { mask, rotationAllowed })) {
    return {
      piece: { shape: preview.shape, color: preview.color },
      bag: args.bag.slice(),
      replaced: false,
    };
  }

  // Preview doesn't compose with the held pieces. Scan the bag for a
  // replacement that does — this keeps bag continuity and the player's
  // existing pieces unchanged.
  let workingBag: Piece[] = args.bag.slice();
  const dens = density ?? boardPressure(board, mask);

  for (let i = 0; i < candidateBudget; i++) {
    if (workingBag.length === 0) {
      const refilled =
        source.kind === 'classic'
          ? buildBag(source.pieceSet, dens, rng)
          : buildBagFromPool(source.pool, dens, rng);
      if (refilled.length === 0) break;
      workingBag = refilled;
    }
    const candidate = workingBag[0];
    workingBag = workingBag.slice(1);

    probeTray[slotIndex] = candidate;
    if (filledTrayIsSolvable(board, probeTray, { mask, rotationAllowed })) {
      return {
        piece: { shape: candidate.shape, color: candidate.color },
        bag: workingBag,
        replaced: true,
      };
    }
  }

  // Last resort: draw a fresh solvable triple and take its first piece. This
  // only matters if the two held pieces are jointly unsolvable with *any*
  // third piece on this board, which should be rare given
  // `promoteOrRegenerateBatch` runs upstream. Any leftover candidates from
  // the fresh batch go back to the bag so bag churn stays minimal.
  const fresh = generateSolvableBatch({
    board,
    bag: workingBag,
    source,
    mask,
    rotationAllowed,
    rng,
    density: dens,
  });
  const [head, ...rest] = fresh.tray;
  return {
    piece: { shape: head.shape, color: head.color },
    bag: rest.concat(fresh.bag),
    replaced: true,
  };
}

/**
 * Generate a solvable 3-piece batch from the bag for the given board.
 *
 * Contract:
 *   - always returns three pieces and an updated bag, never throws;
 *   - the returned triple is solvable on the given board if *any* candidate
 *     draw within `maxAttempts` was solvable (fallback returns the last draw
 *     verbatim — the caller can then deadlock and trigger reshuffle / game
 *     over as usual).
 */
export function generateSolvableBatch(args: {
  board: BoardState;
  bag: ReadonlyArray<Piece>;
  source: BatchSource;
  mask?: BoardMask;
  rotationAllowed?: boolean;
  rng?: Rng;
  maxAttempts?: number;
  /** 0..1 density to bias the weight curve, as elsewhere in the bag. */
  density?: number;
}): GeneratedBatch {
  const {
    board,
    source,
    mask,
    rotationAllowed = true,
    rng = Math.random,
    maxAttempts = DEFAULT_ATTEMPTS,
    density,
  } = args;

  const pressure = boardPressure(board, mask);
  const dens = density ?? pressure;

  if (
    source.kind === 'classic' &&
    source.pieceSet === 'classic' &&
    args.bag.length === 0 &&
    pressure === 0 &&
    boardIsEmpty(board, mask)
  ) {
    const tray = classicStarterTray(rng);
    if (
      tray.length === 3 &&
      tripletIsSolvable(board, tray, { mask, rotationAllowed })
    ) {
      return {
        tray,
        bag: refillBag([], source, dens, rng),
        assisted: false,
        attempts: 1,
      };
    }
  }

  const assist = shouldAssist(pressure, rng);

  let workingBag: Piece[] = args.bag.slice();
  let lastTry: Piece[] | null = null;
  let assistedApplied = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    workingBag = refillBag(workingBag, source, dens, rng);
    let tray: Piece[] = workingBag.slice(0, 3);
    let restBag: Piece[] = workingBag.slice(3);

    // First attempt under high pressure, or dice-rolled assist: swap one slot
    // for a piece that definitely fits the current board.
    if (attempt === 1 && assist) {
      const rescueDefs = rescueDefsFor(board, mask, rotationAllowed);
      if (rescueDefs.length > 0) {
        const pick = rescueDefs[Math.floor(rng() * rescueDefs.length)];
        const slot = Math.floor(rng() * 3);
        tray = tray.slice();
        tray[slot] = { shape: pick.shape, color: pickColor(rng) };
        assistedApplied = true;
      }
    }

    lastTry = tray;

    if (
      tripletIsSolvable(board, tray, {
        mask,
        rotationAllowed,
      })
    ) {
      return {
        tray,
        bag: restBag,
        assisted: assistedApplied,
        attempts: attempt,
      };
    }

    // Candidate unsolvable — burn those three from the bag and try again.
    // Burning keeps us from looping forever on the same bag prefix and matches
    // the original "draw without replacement" spirit.
    workingBag = restBag;
  }

  // Fallback: return the last candidate regardless. The game will detect the
  // deadlock through its usual tray-fit check and handle it (reshuffle / game
  // over / life loss in Gimmicks).
  return {
    tray: lastTry ?? [],
    bag: workingBag,
    assisted: assistedApplied,
    attempts: maxAttempts,
  };
}
