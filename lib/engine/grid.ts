import type { BoardState, Piece, PieceColor, PieceShape } from '../types';
import { pieceCells } from './pieces';

/**
 * Default edge length for Classic/Sandbox boards. Levels mode overrides via
 * explicit `BoardDims`; the engine itself derives rows/cols from the passed-in
 * board array rather than assuming 8×8, so non-square + masked boards work
 * transparently.
 */
export const BOARD_SIZE = 8;

/**
 * Optional playable-cell mask. `mask[r][c] === false` marks a "void" cell that
 * cannot be placed on and is excluded from row/column clear checks. If `mask`
 * is omitted every cell within the board dims is playable.
 */
export type BoardMask = ReadonlyArray<ReadonlyArray<boolean>>;

function boardRows(board: BoardState): number {
  return board.length;
}

function boardCols(board: BoardState): number {
  return board[0]?.length ?? 0;
}

function isPlayable(mask: BoardMask | undefined, r: number, c: number): boolean {
  if (!mask) return true;
  return mask[r]?.[c] !== false;
}

export function createEmptyBoard(
  rows: number = BOARD_SIZE,
  cols: number = rows,
): BoardState {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );
}

export function cloneBoard(board: BoardState): (PieceColor | null)[][] {
  return board.map((row) => row.slice());
}

/** Can this piece be placed at (row, col)? Respects optional playable mask. */
export function canPlace(
  board: BoardState,
  shape: PieceShape,
  row: number,
  col: number,
  mask?: BoardMask,
): boolean {
  const rows = boardRows(board);
  const cols = boardCols(board);
  for (const [dr, dc] of pieceCells(shape)) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
    if (!isPlayable(mask, r, c)) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

/**
 * Place the piece, returning a new board. Does NOT clear lines.
 * Cells that would land outside the grid or on a void are silently skipped —
 * callers are expected to have validated placement with `canPlace` first.
 */
export function placePiece(
  board: BoardState,
  piece: Piece,
  row: number,
  col: number,
  mask?: BoardMask,
): BoardState {
  const rows = boardRows(board);
  const cols = boardCols(board);
  const next = cloneBoard(board);
  for (const [dr, dc] of pieceCells(piece.shape)) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
    if (!isPlayable(mask, r, c)) continue;
    next[r][c] = piece.color;
  }
  return next;
}

export type ClearResult = {
  rows: number[];
  cols: number[];
  totalLines: number;
};

/**
 * Identify which rows and columns are fully filled. A row/col with zero
 * playable cells (fully masked) is never "cleared" — otherwise border rows of
 * heavy-masked levels would fire spurious clears every turn.
 */
export function getClearedLines(
  board: BoardState,
  mask?: BoardMask,
): ClearResult {
  const rows = boardRows(board);
  const cols = boardCols(board);
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let r = 0; r < rows; r++) {
    let playable = 0;
    let full = true;
    for (let c = 0; c < cols; c++) {
      if (!isPlayable(mask, r, c)) continue;
      playable++;
      if (board[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full && playable > 0) clearedRows.push(r);
  }

  for (let c = 0; c < cols; c++) {
    let playable = 0;
    let full = true;
    for (let r = 0; r < rows; r++) {
      if (!isPlayable(mask, r, c)) continue;
      playable++;
      if (board[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full && playable > 0) clearedCols.push(c);
  }

  return {
    rows: clearedRows,
    cols: clearedCols,
    totalLines: clearedRows.length + clearedCols.length,
  };
}

/** Clear the given rows and cols, returning a new board. Voids stay null. */
export function clearLines(
  board: BoardState,
  rows: ReadonlyArray<number>,
  cols: ReadonlyArray<number>,
): BoardState {
  const rowCount = boardRows(board);
  const colCount = boardCols(board);
  const next = cloneBoard(board);
  for (const r of rows) {
    for (let c = 0; c < colCount; c++) next[r][c] = null;
  }
  for (const c of cols) {
    for (let r = 0; r < rowCount; r++) next[r][c] = null;
  }
  return next;
}

export function boardIsEmpty(board: BoardState, mask?: BoardMask): boolean {
  const rows = boardRows(board);
  const cols = boardCols(board);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isPlayable(mask, r, c)) continue;
      if (board[r][c] !== null) return false;
    }
  }
  return true;
}

export function boardDensity(board: BoardState, mask?: BoardMask): number {
  const rows = boardRows(board);
  const cols = boardCols(board);
  let filled = 0;
  let playable = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isPlayable(mask, r, c)) continue;
      playable++;
      if (board[r][c] !== null) filled++;
    }
  }
  return playable === 0 ? 0 : filled / playable;
}

/** Returns first (row, col) anchor where the shape fits, or null. */
export function findAnyFit(
  board: BoardState,
  shape: PieceShape,
  mask?: BoardMask,
): [number, number] | null {
  const rows = boardRows(board);
  const cols = boardCols(board);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (canPlace(board, shape, r, c, mask)) return [r, c];
    }
  }
  return null;
}

export function canShapeFit(
  board: BoardState,
  shape: PieceShape,
  mask?: BoardMask,
): boolean {
  return findAnyFit(board, shape, mask) !== null;
}

export function canAnyPieceFit(
  board: BoardState,
  pieces: ReadonlyArray<{ shape: PieceShape } | null | undefined>,
  mask?: BoardMask,
): boolean {
  for (const p of pieces) {
    if (p && canShapeFit(board, p.shape, mask)) return true;
  }
  return false;
}

/** Count playable cells under the mask (all cells if no mask). */
export function playableCells(
  rows: number,
  cols: number,
  mask?: BoardMask,
): number {
  if (!mask) return rows * cols;
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isPlayable(mask, r, c)) n++;
    }
  }
  return n;
}
