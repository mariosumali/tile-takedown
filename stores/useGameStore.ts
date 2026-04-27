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
  generateSolvableBatch,
  pickSolvableSlotRefill,
  promoteOrRegenerateBatch,
} from '@/lib/engine/trayGen';
import { pieceSize, rotateShape } from '@/lib/engine/pieces';
import { K } from '@/lib/storage/keys';
import { readJSON, writeJSON, remove } from '@/lib/storage/safe';
import { checkAchievements, minimalistCheck, countPentoes } from '@/lib/achievements/checker';
import { playClearSfx, playComboSfx } from '@/lib/audio/sfx';
import { useStatsStore } from './useStatsStore';
import { effectiveRotationEnabled } from '@/lib/useTouchLike';
import { useSettingsStore } from './useSettingsStore';

type ScorePopup = { id: number; amount: number; mult: string };
type ComboGraceEvent = { id: number; kind: 'saved' | 'held' };
type ClutchState = {
  id: number;
  at: number;
};
type PersistedRunState = Omit<RunState, 'comboGrace'> &
  Partial<Pick<RunState, 'comboGrace'>>;

type State = {
  hydrated: boolean;
  run: RunState | null;
  placedSizes: number[];
  placedShapes: Set<string>; // for FULL_DECK achievement
  selectedTrayIndex: number | null;
  ghost: { row: number; col: number; legal: boolean } | null;
  scorePopup: ScorePopup | null;
  lastClear: { rows: number[]; cols: number[]; at: number } | null;
  toast: { id: string; name: string; desc: string; icon?: string } | null;
  comboGraceEvent: ComboGraceEvent | null;
  clutch: ClutchState | null;
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

  /** Called by GameBoard once the last tile in the batch finishes its pop. */
  commitClear: () => void;

  dismissToast: () => void;
  dismissScorePopup: () => void;
  dismissComboGraceEvent: () => void;
};

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

function normalizeRun(run: PersistedRunState & { undosUsed?: number }): RunState {
  const rest = { ...run };
  delete rest.undosUsed;
  return {
    ...rest,
    comboGrace: rest.comboGrace ?? 0,
  };
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

  function buildInitialRun(pieceSet: PieceSet): RunState {
    const rotationAllowed = effectiveRotationEnabled(
      useSettingsStore.getState().rotation,
    );
    const board = freshBoard();
    const source = { kind: 'classic' as const, pieceSet };
    const first = generateSolvableBatch({
      board,
      bag: [],
      source,
      rotationAllowed,
    });
    const second = generateSolvableBatch({
      board,
      bag: first.bag,
      source,
      rotationAllowed,
    });
    return {
      id: makeId(),
      board,
      tray: first.tray.map(withId),
      nextTray: second.tray.map(withId),
      score: 0,
      combo: 0,
      comboGrace: 0,
      comboPeak: 0,
      placements: 0,
      clears: { single: 0, double: 0, triple: 0, quad: 0 },
      perfectClears: 0,
      startedAt: new Date().toISOString(),
      lastAt: new Date().toISOString(),
      gameOver: false,
      bag: second.bag,
    };
  }

  return {
    hydrated: false,
    run: null,
    placedSizes: [],
    placedShapes: new Set<string>(),
    selectedTrayIndex: null,
    ghost: null,
    scorePopup: null,
    lastClear: null,
    toast: null,
    comboGraceEvent: null,
    clutch: null,
    turn: 0,
    clearingRows: [],
    clearingCols: [],
    clearingBoard: null,

    hydrate: () => {
      const existing = readJSON<PersistedRunState | null>(K.activeRun, null);
      if (existing && !existing.gameOver) {
        set({ run: normalizeRun(existing), hydrated: true });
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
        scorePopup: null,
        lastClear: null,
        comboGraceEvent: null,
        clutch: null,
        turn: 0,
        clearingRows: [],
        clearingCols: [],
        clearingBoard: null,
      });
      persistRun(run);
    },

    endRun: () => {
      const run = get().run;
      if (!run || run.gameOver) return;
      const ended = { ...run, gameOver: true, lastAt: new Date().toISOString() };
      set({ run: ended, clutch: null, comboGraceEvent: null });
      // Aggregate stats
      const stats = useStatsStore.getState();
      const summary: RunSummary = {
        id: run.id,
        mode: 'classic',
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
      if (!effectiveRotationEnabled(useSettingsStore.getState().rotation)) return;
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

      const placed = placePiece(run.board, piece, row, col);
      const cleared = getClearedLines(placed);
      const afterClear = clearLines(placed, cleared.rows, cleared.cols);
      const perfect = cleared.totalLines > 0 && boardIsEmpty(afterClear);

      const cellsCount = pieceSize(piece.shape);
      const { turn: turnScore, combo, comboGrace } = scoreTurn({
        cellsPlaced: cellsCount,
        linesCleared: cleared.totalLines,
        prevCombo: run.combo,
        prevComboGrace: run.comboGrace,
        perfectClear: perfect,
      });

      const clears: ClearCounts = { ...run.clears };
      if (cleared.totalLines === 1) clears.single++;
      else if (cleared.totalLines === 2) clears.double++;
      else if (cleared.totalLines === 3) clears.triple++;
      else if (cleared.totalLines >= 4) clears.quad++;

      const pieceSetVariant = useSettingsStore.getState().pieceSet;
      const rotationAllowed = effectiveRotationEnabled(
        useSettingsStore.getState().rotation,
      );
      const instantRefill = useSettingsStore.getState().instantTrayRefill;
      const density = boardDensity(afterClear);

      // Tray refresh: either drip-feed each slot from `nextTray` the moment
      // it's vacated (instant mode), or hold until all three are empty and
      // swap in the whole batch together (default).
      let tray: (TrayPiece | null)[] = run.tray.slice();
      tray[trayIndex] = null;
      let nextTray: TrayPiece[] = run.nextTray;
      let bag: ReadonlyArray<Piece> = run.bag;

      const drawBatch = () =>
        generateSolvableBatch({
          board: afterClear,
          bag: bag.slice(),
          source: { kind: 'classic', pieceSet: pieceSetVariant },
          rotationAllowed,
          density,
        });

      if (instantRefill) {
        if (nextTray.length === 0) {
          const drawn = drawBatch();
          nextTray = drawn.tray.map(withId);
          bag = drawn.bag;
        }
        // The preview was drawn against a stale board; verify it still
        // composes with the two held pieces and swap it for one that does
        // if not. Losing should always be the player's mistake.
        const refill = pickSolvableSlotRefill({
          board: afterClear,
          heldTray: tray,
          slotIndex: trayIndex,
          preview: nextTray[0],
          bag: bag.slice(),
          source: { kind: 'classic', pieceSet: pieceSetVariant },
          rotationAllowed,
          density,
        });
        tray[trayIndex] = withId(refill.piece);
        nextTray = nextTray.slice(1);
        bag = refill.bag;
        if (nextTray.length === 0) {
          const drawn = drawBatch();
          nextTray = drawn.tray.map(withId);
          bag = drawn.bag;
        }
      } else {
        const trayExhausted = tray.every((t) => t === null);
        if (trayExhausted) {
          // Promote the preview against the *actual* current board. If the
          // preview drawn three placements ago is no longer solvable, throw
          // it out and mint a fresh solvable batch. That's the fairness
          // contract: deadlock should only come from player choices.
          const promoted = promoteOrRegenerateBatch({
            board: afterClear,
            preview: nextTray,
            bag: bag.slice(),
            source: { kind: 'classic', pieceSet: pieceSetVariant },
            rotationAllowed,
            density,
          });
          tray = promoted.tray.map(withId);
          bag = promoted.bag;
          const drawn = drawBatch();
          nextTray = drawn.tray.map(withId);
          bag = drawn.bag;
        }
      }

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
        comboGrace,
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

      // Score popup
      const popup: ScorePopup = {
        id: Date.now(),
        amount: turnScore.total - turnScore.placement,
        mult: turnScore.multiplier.toFixed(2),
      };
      const lastClear = cleared.totalLines
        ? { rows: cleared.rows, cols: cleared.cols, at: Date.now() }
        : null;
      const comboGraceEvent: ComboGraceEvent | null =
        cleared.totalLines > 0 && comboGrace > 0
          ? { id: Date.now(), kind: 'saved' }
          : cleared.totalLines === 0 && run.combo > 0 && run.comboGrace > 0 && combo === run.combo
            ? { id: Date.now(), kind: 'held' }
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
        scorePopup: cleared.totalLines > 0 ? popup : null,
        lastClear,
        comboGraceEvent,
        clutch: null,
        turn: state.turn + 1,
        clearingRows,
        clearingCols,
        clearingBoard,
      });

      if (cleared.totalLines > 0) {
        playClearSfx(cleared.totalLines, turnScore.multiplier, { perfect });
        if (combo >= 2 && combo > run.combo) {
          playComboSfx(combo);
        }
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

      // Game over? The tray now refreshes in batches, so only lose when
      // *remaining* (non-null) pieces all have no legal placement — and we
      // respect rotations if the setting is on, matching what the player can
      // actually do with the tray.
      const hasRemaining = nextRun.tray.some((t) => t !== null);
      if (
        hasRemaining &&
        !canAnyPieceFit(nextRun.board, nextRun.tray, undefined, rotationAllowed)
      ) {
        const clutch: ClutchState = {
          id: Date.now(),
          at: Date.now(),
        };
        set({ clutch });
        setTimeout(() => {
          const current = get();
          const currentRun = current.run;
          if (!currentRun || currentRun.id !== nextRun.id || currentRun.gameOver) return;
          if (current.clutch?.id !== clutch.id) return;
          const stillHasRemaining = currentRun.tray.some((t) => t !== null);
          const stillLocked =
            stillHasRemaining &&
            !canAnyPieceFit(
              currentRun.board,
              currentRun.tray,
              undefined,
              rotationAllowed,
            );
          if (stillLocked) get().endRun();
        }, 1200);
      }

      // Clear score popup after a tick
      if (cleared.totalLines > 0) {
        setTimeout(() => {
          if (get().scorePopup?.id === popup.id) set({ scorePopup: null });
        }, 2200);
      }
      if (comboGraceEvent) {
        setTimeout(() => {
          if (get().comboGraceEvent?.id === comboGraceEvent.id) {
            set({ comboGraceEvent: null });
          }
        }, 1800);
      }

      return true;
    },

    commitClear: () =>
      set({ clearingRows: [], clearingCols: [], clearingBoard: null }),

    dismissToast: () => set({ toast: null }),
    dismissScorePopup: () => set({ scorePopup: null }),
    dismissComboGraceEvent: () => set({ comboGraceEvent: null }),
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
