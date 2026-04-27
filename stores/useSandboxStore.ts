'use client';

import { create } from 'zustand';
import type { BoardState, PieceColor, PieceShape, Snapshot } from '@/lib/types';
import {
  canPlace,
  clearLines,
  createEmptyBoard,
  getClearedLines,
  placePiece,
} from '@/lib/engine/grid';
import { K } from '@/lib/storage/keys';
import { readJSON, writeJSON } from '@/lib/storage/safe';

type SandboxPersist = {
  board: BoardState;
  snapshots: Snapshot[];
};

type State = {
  hydrated: boolean;
  board: BoardState;
  selectedShape: PieceShape | null;
  selectedColor: PieceColor;
  paintMode: boolean;
  snapshots: Snapshot[];

  hydrate: () => void;
  selectShape: (shape: PieceShape | null) => void;
  rotateSelected: () => void;
  selectColor: (c: PieceColor) => void;
  togglePaintMode: () => void;

  tryPlace: (row: number, col: number) => boolean;
  paintCell: (row: number, col: number) => void;
  eraseCell: (row: number, col: number) => void;
  loadBoard: (board: BoardState) => void;
  clearAll: () => void;
  clearLinesNow: () => number;

  saveSnapshot: (name?: string) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
};

function persist(board: BoardState, snapshots: Snapshot[]): void {
  const data: SandboxPersist = { board, snapshots };
  writeJSON(K.sandbox, data);
}

function rotateShape(shape: PieceShape): PieceShape {
  const h = shape.length;
  const w = shape[0]?.length ?? 0;
  const out: (0 | 1)[][] = Array.from({ length: w }, () => Array(h).fill(0));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      out[c][h - 1 - r] = shape[r][c];
    }
  }
  return out;
}

function id(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const useSandboxStore = create<State>((set, get) => ({
  hydrated: false,
  board: createEmptyBoard(),
  selectedShape: null,
  selectedColor: 'tomato',
  paintMode: false,
  snapshots: [],

  hydrate: () => {
    const data = readJSON<SandboxPersist | null>(K.sandbox, null);
    if (data) {
      set({
        board: data.board ?? createEmptyBoard(),
        snapshots: data.snapshots ?? [],
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },

  selectShape: (shape) => set({ selectedShape: shape, paintMode: false }),
  rotateSelected: () => {
    const s = get().selectedShape;
    if (!s) return;
    set({ selectedShape: rotateShape(s) });
  },
  selectColor: (c) => set({ selectedColor: c }),
  togglePaintMode: () =>
    set((s) => ({ paintMode: !s.paintMode, selectedShape: null })),

  tryPlace: (row, col) => {
    const { board, selectedShape, selectedColor, snapshots } = get();
    if (!selectedShape) return false;
    if (!canPlace(board, selectedShape, row, col)) return false;
    const nextBoard = placePiece(
      board,
      { shape: selectedShape, color: selectedColor },
      row,
      col,
    );
    set({ board: nextBoard });
    persist(nextBoard, snapshots);
    return true;
  },

  paintCell: (row, col) => {
    const { board, selectedColor, snapshots } = get();
    const next = board.map((r) => r.slice());
    next[row][col] = selectedColor;
    set({ board: next });
    persist(next, snapshots);
  },

  eraseCell: (row, col) => {
    const { board, snapshots } = get();
    const next = board.map((r) => r.slice());
    next[row][col] = null;
    set({ board: next });
    persist(next, snapshots);
  },

  loadBoard: (board) => {
    set({ board });
    persist(board, get().snapshots);
  },

  clearAll: () => {
    const empty = createEmptyBoard();
    set({ board: empty });
    persist(empty, get().snapshots);
  },

  clearLinesNow: () => {
    const { board, snapshots } = get();
    const { rows, cols, totalLines } = getClearedLines(board);
    if (!totalLines) return 0;
    const next = clearLines(board, rows, cols);
    set({ board: next });
    persist(next, snapshots);
    return totalLines;
  },

  saveSnapshot: (name) => {
    const { board, snapshots } = get();
    const snap: Snapshot & { name?: string } = {
      id: id(),
      createdAt: new Date().toISOString(),
      board,
      ...(name ? { name } : {}),
    };
    const next = [snap, ...snapshots].slice(0, 24);
    set({ snapshots: next });
    persist(board, next);
  },

  loadSnapshot: (snapId) => {
    const { snapshots } = get();
    const s = snapshots.find((x) => x.id === snapId);
    if (!s) return;
    set({ board: s.board });
    persist(s.board, snapshots);
  },

  deleteSnapshot: (snapId) => {
    const { board, snapshots } = get();
    const next = snapshots.filter((x) => x.id !== snapId);
    set({ snapshots: next });
    persist(board, next);
  },
}));
