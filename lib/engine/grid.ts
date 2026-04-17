import type { BoardState, Piece, PieceColor, PieceShape } from '../types';
import { pieceCells } from './pieces';

export const BOARD_SIZE = 8;

export function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}

export function cloneBoard(board: BoardState): (PieceColor | null)[][] {
  return board.map((row) => row.slice());
}

/** Can this piece be placed at (row, col) (anchor at top-left of shape)? */
export function canPlace(
  board: BoardState,
  shape: PieceShape,
  row: number,
  col: number,
): boolean {
  for (const [dr, dc] of pieceCells(shape)) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

/**
 * Place the piece, returning a new board. Does NOT clear lines.
 * Cells that would land outside the grid are silently skipped — callers are
 * expected to have validated placement with `canPlace` first. This guard is
 * purely defensive so a stale ghost anchor can never crash the render.
 */
export function placePiece(
  board: BoardState,
  piece: Piece,
  row: number,
  col: number,
): BoardState {
  const next = cloneBoard(board);
  for (const [dr, dc] of pieceCells(piece.shape)) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) continue;
    next[r][c] = piece.color;
  }
  return next;
}

export type ClearResult = {
  rows: number[];
  cols: number[];
  totalLines: number;
};

/** Identify which rows and columns are fully filled. */
export function getClearedLines(board: BoardState): ClearResult {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((v) => v !== null)) rows.push(r);
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }
  return { rows, cols, totalLines: rows.length + cols.length };
}

/** Clear the given rows and cols, returning a new board. */
export function clearLines(
  board: BoardState,
  rows: ReadonlyArray<number>,
  cols: ReadonlyArray<number>,
): BoardState {
  const next = cloneBoard(board);
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) next[r][c] = null;
  }
  for (const c of cols) {
    for (let r = 0; r < BOARD_SIZE; r++) next[r][c] = null;
  }
  return next;
}

export function boardIsEmpty(board: BoardState): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) return false;
    }
  }
  return true;
}

export function boardDensity(board: BoardState): number {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) n++;
    }
  }
  return n / (BOARD_SIZE * BOARD_SIZE);
}

/** Returns first (row, col) anchor where the shape fits, or null. */
export function findAnyFit(
  board: BoardState,
  shape: PieceShape,
): [number, number] | null {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, shape, r, c)) return [r, c];
    }
  }
  return null;
}

export function canShapeFit(board: BoardState, shape: PieceShape): boolean {
  return findAnyFit(board, shape) !== null;
}

export function canAnyPieceFit(
  board: BoardState,
  pieces: ReadonlyArray<{ shape: PieceShape } | null | undefined>,
): boolean {
  for (const p of pieces) {
    if (p && canShapeFit(board, p.shape)) return true;
  }
  return false;
}
