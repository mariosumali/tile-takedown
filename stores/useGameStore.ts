'use client';

import { create } from 'zustand';
import type {
  BoardState,
  ClearCounts,
  Piece,
  PieceColor,
  PieceSet,
  PieceShape,
  RunState,
  RunSummary,
  TrayPiece,
} from '@/lib/types';
import {
  boardDensity,
  boardIsEmpty,
  canAnyPieceFit,
  canPlace,
  clearLines,
  createEmptyBoard,
  getClearedLines,
  placePiece,
} from '@/lib/engine/grid';
import { scoreTurn } from '@/lib/engine/scoring';
import {
  buildBag,
  drawTray,
  drawOne,
  makeRng,
} from '@/lib/engine/bag';
import { pieceSize, rotateShape } from '@/lib/engine/pieces';
import { K } from '@/lib/storage/keys';
import { readJSON, writeJSON, remove } from '@/lib/storage/safe';
import { checkAchievements, minimalistCheck, countPentoes } from '@/lib/achievements/checker';
import { playClearSfx } from '@/lib/audio/sfx';
import { useStatsStore } from './useStatsStore';
import { useSettingsStore } from './useSettingsStore';

type ScorePopup = { id: number; amount: number; mult: string };

type Snap = Pick<
  RunState,
  'board' | 'tray' | 'nextTray' | 'score' | 'combo' | 'comboPeak' | 'placements' | 'clears' | 'bag' | 'undosUsed' | 'perfectClears'
> & { placedSizes: number[] };

type State = {
  hydrated: boolean;
  run: RunState | null;
  placedSizes: number[];
  placedShapes: Set<string>; // for FULL_DECK achievement
  selectedTrayIndex: number | null;
  ghost: { row: number; col: number; legal: boolean } | null;
  undoStack: Snap[];
  scorePopup: ScorePopup | null;
  lastClear: { rows: number[]; cols: number[]; at: number } | null;
  toast: { id: string; name: string; desc: string; icon?: string } | null;
  /** monotonic turn index, incremented after each placement resolves */
  turn: number;
  /** Rows currently running their clear-pop animation. */
  clearingRows: number[];
  /** Cols currently running their clear-pop animation. */
  clearingCols: number[];
  /**
   * Pre-clear board snapshot used only for visuals while the pop animation is
   * active. GameBoard reads this for cleared cells so tiles retain their color
   * through the pop sequence. Reset by `commitClear()`.
   */
  clearingBoard: BoardState | null;

  hydrate: () => void;
  startRun: (opts?: { resume?: boolean }) => void;
  endRun: () => void;

  selectTray: (i: number | null) => void;
  setGhost: (pos: { row: number; col: number } | null, shape?: PieceShape) => void;
  rotateSelected: () => void;

  tryPlace: (trayIndex: number, row: number, col: number) => boolean;
  undo: () => boolean;

  /** Called by GameBoard once the last tile in the batch finishes its pop. */
  commitClear: () => void;

  dismissToast: () => void;
  dismissScorePopup: () => void;
};

const UNDO_LIMIT = 3;

function shapeKey(shape: PieceShape): string {
  return shape.map((r) => r.join('')).join('|');
}

function freshBoard(): BoardState {
  return createEmptyBoard();
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function withId(p: Piece): TrayPiece {
  return { ...p, id: makeId() };
}

function persistRun(run: RunState | null): void {
  if (!run || run.gameOver) {
    remove(K.activeRun);
    return;
  }
  writeJSON(K.activeRun, run);
}

export const useGameStore = create<State>((set, get) => {
  function fireAchievements(ids: string[]): void {
    if (!ids.length) return;
    const statsStore = useStatsStore.getState();
    for (const id of ids) {
      const unlocked = statsStore.unlock(id);
      if (unlocked) {
        import('@/lib/achievements/definitions').then((m) => {
          const def = m.ACHIEVEMENTS_BY_ID[id];
          if (def) set({ toast: { id, name: def.name, desc: def.desc, icon: def.icon } });
        });
      }
    }
  }

  function snapshotRun(): Snap {
    const run = get().run!;
    return {
      board: run.board,
      tray: run.tray,
      nextTray: run.nextTray,
      score: run.score,
      combo: run.combo,
      comboPeak: run.comboPeak,
      placements: run.placements,
      clears: { ...run.clears },
      bag: run.bag,
      undosUsed: run.undosUsed,
      perfectClears: run.perfectClears,
      placedSizes: get().placedSizes.slice(),
    };
  }

  function buildInitialRun(pieceSet: PieceSet): RunState {
    const rng = Math.random;
    const bag0 = buildBag(pieceSet, 0, rng);
    const first = drawTray(bag0, pieceSet, 0, rng);
    const next = drawTray(first.bag, pieceSet, 0, rng);
    return {
      id: makeId(),
      board: freshBoard(),
      tray: first.tray.map(withId),
      nextTray: next.tray.map(withId),
      score: 0,
      combo: 0,
      comboPeak: 0,
      placements: 0,
      clears: { single: 0, double: 0, triple: 0, quad: 0 },
      perfectClears: 0,
      undosUsed: 0,
      startedAt: new Date().toISOString(),
      lastAt: new Date().toISOString(),
      gameOver: false,
      bag: next.bag,
    };
  }

  return {
    hydrated: false,
    run: null,
    placedSizes: [],
    placedShapes: new Set<string>(),
    selectedTrayIndex: null,
    ghost: null,
    undoStack: [],
    scorePopup: null,
    lastClear: null,
    toast: null,
    turn: 0,
    clearingRows: [],
    clearingCols: [],
    clearingBoard: null,

    hydrate: () => {
      const existing = readJSON<RunState | null>(K.activeRun, null);
      if (existing && !existing.gameOver) {
        set({ run: existing, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    },

    startRun: (opts) => {
      if (opts?.resume && get().run && !get().run?.gameOver) return;
      const pieceSet = useSettingsStore.getState().pieceSet;
      const run = buildInitialRun(pieceSet);
      set({
        run,
        placedSizes: [],
        placedShapes: new Set(),
        selectedTrayIndex: null,
        ghost: null,
        undoStack: [],
        scorePopup: null,
        lastClear: null,
        turn: 0,
        clearingRows: [],
        clearingCols: [],
        clearingBoard: null,
      });
      persistRun(run);
    },

    endRun: () => {
      const run = get().run;
      if (!run) return;
      const ended = { ...run, gameOver: true, lastAt: new Date().toISOString() };
      set({ run: ended });
      // Aggregate stats
      const stats = useStatsStore.getState();
      const summary: RunSummary = {
        id: run.id,
        startedAt: run.startedAt,
        endedAt: ended.lastAt,
        score: run.score,
        placements: run.placements,
        clears: run.clears,
        comboPeak: run.comboPeak,
      };
      const duration = new Date(ended.lastAt).getTime() - new Date(run.startedAt).getTime();
      stats.recordRun(summary, duration);
      stats.markPlayedToday();
      // Check end-of-run achievements
      const streak = stats.streak;
      const sizes = get().placedSizes;
      const ids = checkAchievements({
        run: ended,
        stats: stats.stats,
        streak,
        event: { type: 'run_end' },
      });
      if (minimalistCheck(sizes)) ids.push('MINIMALIST');
      if (countPentoes(sizes) >= 20) ids.push('MAXIMALIST');
      if (get().placedShapes.size >= 19) ids.push('FULL_DECK');
      fireAchievements(Array.from(new Set(ids)));
      persistRun(null);
    },

    selectTray: (i) => set({ selectedTrayIndex: i, ghost: null }),

    setGhost: (pos, shape) => {
      if (!pos || !shape) {
        set({ ghost: null });
        return;
      }
      const run = get().run;
      if (!run) return;
      const legal = canPlace(run.board, shape, pos.row, pos.col);
      set({ ghost: { row: pos.row, col: pos.col, legal } });
    },

    rotateSelected: () => {
      const { run, selectedTrayIndex } = get();
      if (!run || selectedTrayIndex === null) return;
      const rotate = useSettingsStore.getState().rotation;
      if (!rotate) return;
      const piece = run.tray[selectedTrayIndex];
      if (!piece) return;
      const nextShape = rotateShape(piece.shape);
      const newTray = run.tray.slice();
      newTray[selectedTrayIndex] = { ...piece, shape: nextShape };
      const nextRun = { ...run, tray: newTray };
      set({ run: nextRun });
    },

    tryPlace: (trayIndex, row, col) => {
      const state = get();
      const run = state.run;
      if (!run || run.gameOver) return false;
      const piece = run.tray[trayIndex];
      if (!piece) return false;
      if (!canPlace(run.board, piece.shape, row, col)) return false;

      const snap = snapshotRun();

      const placed = placePiece(run.board, piece, row, col);
      const cleared = getClearedLines(placed);
      const afterClear = clearLines(placed, cleared.rows, cleared.cols);
      const perfect = cleared.totalLines > 0 && boardIsEmpty(afterClear);

      const cellsCount = pieceSize(piece.shape);
      const { turn: turnScore, combo } = scoreTurn({
        cellsPlaced: cellsCount,
        linesCleared: cleared.totalLines,
        prevCombo: run.combo,
        perfectClear: perfect,
      });

      const clears: ClearCounts = { ...run.clears };
      if (cleared.totalLines === 1) clears.single++;
      else if (cleared.totalLines === 2) clears.double++;
      else if (cleared.totalLines === 3) clears.triple++;
      else if (cleared.totalLines >= 4) clears.quad++;

      const pieceSetVariant = useSettingsStore.getState().pieceSet;
      const density = boardDensity(afterClear);

      // Refill the vacated slot from the head of nextTray, then top up nextTray
      // with a freshly drawn piece. Tray always stays at 3 pieces.
      const tray = run.tray.slice();
      const incoming = run.nextTray[0] ?? null;
      tray[trayIndex] = incoming;

      let nextTray = run.nextTray.slice(1);
      let bag = run.bag;
      const drawn = drawOne(bag, pieceSetVariant, density);
      nextTray = nextTray.concat(withId(drawn.piece));
      bag = drawn.bag;

      const comboPeak = Math.max(run.comboPeak, combo);
      const perfectClears = run.perfectClears + (perfect ? 1 : 0);
      const score = run.score + turnScore.total;

      const nextRun: RunState = {
        ...run,
        board: afterClear,
        tray,
        nextTray,
        score,
        combo,
        comboPeak,
        placements: run.placements + 1,
        clears,
        perfectClears,
        bag,
        lastAt: new Date().toISOString(),
      };

      const placedSizes = state.placedSizes.concat(cellsCount);
      const placedShapes = new Set(state.placedShapes);
      placedShapes.add(shapeKey(piece.shape));

      // Cap undo stack to UNDO_LIMIT
      const undoStack = state.undoStack.concat(snap);
      while (undoStack.length > UNDO_LIMIT + 20) undoStack.shift();

      // Score popup
      const popup: ScorePopup = {
        id: Date.now(),
        amount: turnScore.total - turnScore.placement,
        mult: turnScore.multiplier.toFixed(2),
      };
      const lastClear = cleared.totalLines
        ? { rows: cleared.rows, cols: cleared.cols, at: Date.now() }
        : null;

      const clearingRows = cleared.totalLines > 0 ? cleared.rows.slice() : [];
      const clearingCols = cleared.totalLines > 0 ? cleared.cols.slice() : [];
      const clearingBoard: BoardState | null =
        cleared.totalLines > 0 ? placed : null;

      set({
        run: nextRun,
        placedSizes,
        placedShapes,
        selectedTrayIndex: null,
        ghost: null,
        undoStack,
        scorePopup: cleared.totalLines > 0 ? popup : null,
        lastClear,
        turn: state.turn + 1,
        clearingRows,
        clearingCols,
        clearingBoard,
      });

      if (cleared.totalLines > 0) {
        playClearSfx(cleared.totalLines, turnScore.multiplier);
      }

      // Persist
      persistRun(nextRun);

      // Stats
      const stats = useStatsStore.getState();
      stats.addPlacement();
      if (cleared.totalLines > 0) {
        stats.addClear(
          {
            single: cleared.totalLines === 1 ? 1 : 0,
            double: cleared.totalLines === 2 ? 1 : 0,
            triple: cleared.totalLines === 3 ? 1 : 0,
            quad: cleared.totalLines >= 4 ? 1 : 0,
          },
          combo,
          perfect,
        );
      }

      // Achievements
      const evs: string[] = [];
      const placeIds = checkAchievements({
        run: nextRun,
        stats: stats.stats,
        streak: stats.streak,
        event: { type: 'placement', pieceSize: cellsCount },
      });
      evs.push(...placeIds);
      if (cleared.totalLines > 0) {
        const clearIds = checkAchievements({
          run: nextRun,
          stats: stats.stats,
          streak: stats.streak,
          event: { type: 'clear', lines: cleared.totalLines, perfect, combo },
        });
        evs.push(...clearIds);
      }
      fireAchievements(evs);

      // Game over? Tray is always kept full (per-piece refill), so this is
      // simply: no piece in the current tray can fit anywhere on the board.
      if (!canAnyPieceFit(nextRun.board, nextRun.tray)) {
        setTimeout(() => get().endRun(), 600);
      }

      // Clear score popup after a tick
      if (cleared.totalLines > 0) {
        setTimeout(() => {
          if (get().scorePopup?.id === popup.id) set({ scorePopup: null });
        }, 2200);
      }

      return true;
    },

    undo: () => {
      const { run, undoStack } = get();
      if (!run || run.gameOver) return false;
      if (run.undosUsed >= UNDO_LIMIT) return false;
      const snap = undoStack[undoStack.length - 1];
      if (!snap) return false;
      const nextRun: RunState = {
        ...run,
        board: snap.board,
        tray: snap.tray,
        nextTray: snap.nextTray,
        score: snap.score,
        combo: snap.combo,
        comboPeak: snap.comboPeak,
        placements: snap.placements,
        clears: { ...snap.clears },
        bag: snap.bag,
        perfectClears: snap.perfectClears,
        undosUsed: run.undosUsed + 1,
        lastAt: new Date().toISOString(),
      };
      set({
        run: nextRun,
        placedSizes: snap.placedSizes.slice(),
        selectedTrayIndex: null,
        ghost: null,
        undoStack: undoStack.slice(0, -1),
        scorePopup: null,
        lastClear: null,
        clearingRows: [],
        clearingCols: [],
        clearingBoard: null,
      });
      persistRun(nextRun);
      return true;
    },

    commitClear: () =>
      set({ clearingRows: [], clearingCols: [], clearingBoard: null }),

    dismissToast: () => set({ toast: null }),
    dismissScorePopup: () => set({ scorePopup: null }),
  };
});

// Toast auto-dismiss
if (typeof window !== 'undefined') {
  let last: string | undefined;
  useGameStore.subscribe((state) => {
    const id = state.toast?.id;
    if (id && id !== last) {
      last = id;
      setTimeout(() => {
        if (useGameStore.getState().toast?.id === id) {
          useGameStore.setState({ toast: null });
        }
      }, 3200);
    } else if (!id) {
      last = undefined;
    }
  });
}
