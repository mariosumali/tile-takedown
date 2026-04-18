'use client';

import { create } from 'zustand';
import type {
  BoardState,
  ClearCounts,
  LevelDef,
  LevelProgress,
  LevelRecord,
  LevelStars,
  Piece,
  PieceShape,
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
  buildBagFromPool,
  drawTrayFromPool,
  drawOneFromPool,
} from '@/lib/engine/bag';
import { pieceSize, rotateShape } from '@/lib/engine/pieces';
import { K } from '@/lib/storage/keys';
import { readJSON, writeJSON, remove } from '@/lib/storage/safe';
import { playClearSfx } from '@/lib/audio/sfx';
import { levelById } from '@/lib/levels/catalog';
import { useStatsStore } from './useStatsStore';

/* ------------------------------------------------------------------------ */
/* Types                                                                     */
/* ------------------------------------------------------------------------ */

type ScorePopup = { id: number; amount: number; mult: string };

type Snap = {
  board: BoardState;
  tray: (TrayPiece | null)[];
  nextTray: TrayPiece[];
  score: number;
  combo: number;
  comboPeak: number;
  placements: number;
  clears: ClearCounts;
  bag: ReadonlyArray<Piece>;
  perfectClears: number;
};

type ActiveLevelSave = {
  levelId: string;
  board: BoardState;
  tray: (TrayPiece | null)[];
  nextTray: TrayPiece[];
  score: number;
  combo: number;
  comboPeak: number;
  placements: number;
  clears: ClearCounts;
  perfectClears: number;
  bag: ReadonlyArray<Piece>;
  reshuffleUsed: boolean;
  startedAt: string;
  lastAt: string;
};

type State = {
  hydrated: boolean;
  progress: LevelProgress;
  levelId: string | null;
  level: LevelDef | null;

  board: BoardState;
  tray: (TrayPiece | null)[];
  nextTray: TrayPiece[];
  bag: ReadonlyArray<Piece>;

  score: number;
  combo: number;
  comboPeak: number;
  placements: number;
  clears: ClearCounts;
  perfectClears: number;
  reshuffleUsed: boolean;

  selectedTrayIndex: number | null;
  ghost: { row: number; col: number; legal: boolean } | null;
  undoStack: Snap[];
  scorePopup: ScorePopup | null;
  turn: number;

  clearingRows: number[];
  clearingCols: number[];
  clearingBoard: BoardState | null;

  /** null while mid-run, 0..3 once finished. */
  finishedStars: LevelStars | null;
  /** Set once the level hits targetScore the first time this run. */
  passed: boolean;

  hydrate: () => void;
  startLevel: (levelId: string) => void;
  abandonLevel: () => void;
  /** End the run now — resolves stars from current score and shows the card. */
  finishLevel: () => void;
  reshuffle: () => boolean;

  selectTray: (i: number | null) => void;
  setGhost: (pos: { row: number; col: number } | null, shape?: PieceShape) => void;
  rotateSelected: () => void;
  tryPlace: (trayIndex: number, row: number, col: number) => boolean;
  undo: () => boolean;
  commitClear: () => void;

  dismissScorePopup: () => void;

  /** Lookups + progress mutation. */
  recordResult: (levelId: string, score: number, stars: LevelStars) => void;
  isUnlocked: (levelId: string) => boolean;
  starsFor: (levelId: string) => LevelStars;
  bestScoreFor: (levelId: string) => number;
};

const UNDO_LIMIT = 3;

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function withId(p: Piece): TrayPiece {
  return { ...p, id: makeId() };
}

function computeStars(
  score: number,
  thresholds: readonly [number, number, number],
): LevelStars {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

function persistProgress(progress: LevelProgress): void {
  writeJSON(K.levelsProgress, progress);
}

function persistActive(save: ActiveLevelSave | null): void {
  if (!save) {
    remove(K.activeLevel);
    return;
  }
  writeJSON(K.activeLevel, save);
}

/* ------------------------------------------------------------------------ */
/* Store                                                                     */
/* ------------------------------------------------------------------------ */

export const useLevelsStore = create<State>((set, get) => {
  function poolOf(level: LevelDef): ReadonlyArray<string> {
    return level.customPool ?? [];
  }

  function snapshot(): Snap {
    const s = get();
    return {
      board: s.board,
      tray: s.tray,
      nextTray: s.nextTray,
      score: s.score,
      combo: s.combo,
      comboPeak: s.comboPeak,
      placements: s.placements,
      clears: { ...s.clears },
      bag: s.bag,
      perfectClears: s.perfectClears,
    };
  }

  function saveActive(): void {
    const s = get();
    if (!s.level || !s.levelId) return;
    if (s.finishedStars !== null) {
      persistActive(null);
      return;
    }
    const save: ActiveLevelSave = {
      levelId: s.levelId,
      board: s.board,
      tray: s.tray,
      nextTray: s.nextTray,
      score: s.score,
      combo: s.combo,
      comboPeak: s.comboPeak,
      placements: s.placements,
      clears: s.clears,
      perfectClears: s.perfectClears,
      bag: s.bag,
      reshuffleUsed: s.reshuffleUsed,
      startedAt: new Date().toISOString(),
      lastAt: new Date().toISOString(),
    };
    persistActive(save);
  }

  return {
    hydrated: false,
    progress: {},
    levelId: null,
    level: null,

    board: [],
    tray: [],
    nextTray: [],
    bag: [],

    score: 0,
    combo: 0,
    comboPeak: 0,
    placements: 0,
    clears: { single: 0, double: 0, triple: 0, quad: 0 },
    perfectClears: 0,
    reshuffleUsed: false,

    selectedTrayIndex: null,
    ghost: null,
    undoStack: [],
    scorePopup: null,
    turn: 0,

    clearingRows: [],
    clearingCols: [],
    clearingBoard: null,

    finishedStars: null,
    passed: false,

    hydrate: () => {
      const progress = readJSON<LevelProgress>(K.levelsProgress, {});
      set({ progress, hydrated: true });
    },

    startLevel: (levelId) => {
      const level = levelById(levelId);
      if (!level) return;
      const pool = poolOf(level);
      const rng = Math.random;
      const bag0 = buildBagFromPool(pool, 0, rng);
      const first = drawTrayFromPool(bag0, pool, 0, rng);
      const next = drawTrayFromPool(first.bag, pool, 0, rng);
      set({
        levelId,
        level,
        board: createEmptyBoard(level.dims.rows, level.dims.cols),
        tray: first.tray.map(withId),
        nextTray: next.tray.map(withId),
        bag: next.bag,
        score: 0,
        combo: 0,
        comboPeak: 0,
        placements: 0,
        clears: { single: 0, double: 0, triple: 0, quad: 0 },
        perfectClears: 0,
        reshuffleUsed: false,
        selectedTrayIndex: null,
        ghost: null,
        undoStack: [],
        scorePopup: null,
        turn: 0,
        clearingRows: [],
        clearingCols: [],
        clearingBoard: null,
        finishedStars: null,
        passed: false,
      });
      saveActive();
    },

    abandonLevel: () => {
      persistActive(null);
      set({
        levelId: null,
        level: null,
        board: [],
        tray: [],
        nextTray: [],
        bag: [],
        score: 0,
        combo: 0,
        comboPeak: 0,
        placements: 0,
        clears: { single: 0, double: 0, triple: 0, quad: 0 },
        perfectClears: 0,
        reshuffleUsed: false,
        selectedTrayIndex: null,
        ghost: null,
        undoStack: [],
        finishedStars: null,
        passed: false,
      });
    },

    finishLevel: () => {
      const s = get();
      if (!s.level || s.finishedStars !== null) return;
      const stars = computeStars(s.score, s.level.starThresholds);
      s.recordResult(s.level.id, s.score, stars);
      set({ finishedStars: stars });
      persistActive(null);
    },

    reshuffle: () => {
      const s = get();
      if (!s.level || s.finishedStars !== null) return false;
      if (s.reshuffleUsed) return false;
      if (canAnyPieceFit(s.board, s.tray, s.level.dims.mask)) return false;
      const pool = poolOf(s.level);
      const rng = Math.random;
      const drew = drawTrayFromPool(s.bag, pool, boardDensity(s.board, s.level.dims.mask), rng);
      set({
        tray: drew.tray.map(withId),
        bag: drew.bag,
        reshuffleUsed: true,
        selectedTrayIndex: null,
        ghost: null,
      });
      saveActive();
      return true;
    },

    selectTray: (i) => set({ selectedTrayIndex: i, ghost: null }),

    setGhost: (pos, shape) => {
      if (!pos || !shape) {
        set({ ghost: null });
        return;
      }
      const s = get();
      if (!s.level) return;
      const legal = canPlace(s.board, shape, pos.row, pos.col, s.level.dims.mask);
      set({ ghost: { row: pos.row, col: pos.col, legal } });
    },

    rotateSelected: () => {
      const { tray, selectedTrayIndex } = get();
      if (selectedTrayIndex === null) return;
      const piece = tray[selectedTrayIndex];
      if (!piece) return;
      const nextShape = rotateShape(piece.shape);
      const newTray = tray.slice();
      newTray[selectedTrayIndex] = { ...piece, shape: nextShape };
      set({ tray: newTray });
    },

    tryPlace: (trayIndex, row, col) => {
      const s = get();
      const level = s.level;
      if (!level || s.finishedStars !== null) return false;
      const piece = s.tray[trayIndex];
      if (!piece) return false;
      const mask = level.dims.mask;
      if (!canPlace(s.board, piece.shape, row, col, mask)) return false;

      const snap = snapshot();

      const placed = placePiece(s.board, piece, row, col, mask);
      const cleared = getClearedLines(placed, mask);
      const afterClear = clearLines(placed, cleared.rows, cleared.cols);
      const perfect = cleared.totalLines > 0 && boardIsEmpty(afterClear, mask);

      const cellsCount = pieceSize(piece.shape);
      const { turn: turnScore, combo } = scoreTurn({
        cellsPlaced: cellsCount,
        linesCleared: cleared.totalLines,
        prevCombo: s.combo,
        perfectClear: perfect,
      });

      const clears: ClearCounts = { ...s.clears };
      if (cleared.totalLines === 1) clears.single++;
      else if (cleared.totalLines === 2) clears.double++;
      else if (cleared.totalLines === 3) clears.triple++;
      else if (cleared.totalLines >= 4) clears.quad++;

      const pool = poolOf(level);
      const density = boardDensity(afterClear, mask);

      const tray = s.tray.slice();
      const incoming = s.nextTray[0] ?? null;
      tray[trayIndex] = incoming;

      let nextTray = s.nextTray.slice(1);
      let bag = s.bag;
      const drawn = drawOneFromPool(bag, pool, density);
      nextTray = nextTray.concat(withId(drawn.piece));
      bag = drawn.bag;

      const comboPeak = Math.max(s.comboPeak, combo);
      const perfectClears = s.perfectClears + (perfect ? 1 : 0);
      const score = s.score + turnScore.total;

      const clearingRows = cleared.totalLines > 0 ? cleared.rows.slice() : [];
      const clearingCols = cleared.totalLines > 0 ? cleared.cols.slice() : [];
      const clearingBoard: BoardState | null =
        cleared.totalLines > 0 ? placed : null;

      const popup: ScorePopup = {
        id: Date.now(),
        amount: turnScore.total - turnScore.placement,
        mult: turnScore.multiplier.toFixed(2),
      };

      const undoStack = s.undoStack.concat(snap);
      while (undoStack.length > UNDO_LIMIT + 20) undoStack.shift();

      const nowPassed = s.passed || score >= level.targetScore;
      const reached3Star = score >= level.starThresholds[2];

      set({
        board: afterClear,
        tray,
        nextTray,
        bag,
        score,
        combo,
        comboPeak,
        placements: s.placements + 1,
        clears,
        perfectClears,
        selectedTrayIndex: null,
        ghost: null,
        undoStack,
        scorePopup: cleared.totalLines > 0 ? popup : null,
        turn: s.turn + 1,
        clearingRows,
        clearingCols,
        clearingBoard,
        passed: nowPassed,
      });

      if (cleared.totalLines > 0) {
        playClearSfx(cleared.totalLines, turnScore.multiplier);
      }

      saveActive();

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

      // End-of-level conditions.
      // 1) Maxed out at 3★ — nothing more to play for, resolve immediately.
      if (reached3Star) {
        setTimeout(() => {
          const cur = get();
          if (cur.finishedStars !== null) return;
          cur.recordResult(level.id, cur.score, 3);
          set({ finishedStars: 3 });
          persistActive(null);
        }, cleared.totalLines > 0 ? 900 : 250);
      } else if (!canAnyPieceFit(afterClear, tray, mask)) {
        // 2) Tray deadlock after placement.
        const canReshuffle = !s.reshuffleUsed;
        if (canReshuffle) {
          setTimeout(() => get().reshuffle(), 500);
        } else {
          setTimeout(() => {
            const cur = get();
            if (cur.finishedStars !== null) return;
            const stars = computeStars(cur.score, level.starThresholds);
            cur.recordResult(level.id, cur.score, stars);
            set({ finishedStars: stars });
            persistActive(null);
          }, 600);
        }
      }

      if (cleared.totalLines > 0) {
        setTimeout(() => {
          if (get().scorePopup?.id === popup.id) set({ scorePopup: null });
        }, 2200);
      }

      return true;
    },

    undo: () => {
      const s = get();
      if (!s.level || s.finishedStars !== null) return false;
      const snap = s.undoStack[s.undoStack.length - 1];
      if (!snap) return false;
      set({
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
        undoStack: s.undoStack.slice(0, -1),
        selectedTrayIndex: null,
        ghost: null,
        scorePopup: null,
        clearingRows: [],
        clearingCols: [],
        clearingBoard: null,
      });
      saveActive();
      return true;
    },

    commitClear: () =>
      set({ clearingRows: [], clearingCols: [], clearingBoard: null }),

    dismissScorePopup: () => set({ scorePopup: null }),

    recordResult: (levelId, score, stars) => {
      const progress = { ...get().progress };
      const prev: LevelRecord = progress[levelId] ?? { stars: 0, bestScore: 0 };
      const nextRecord: LevelRecord = {
        stars: Math.max(prev.stars, stars) as LevelStars,
        bestScore: Math.max(prev.bestScore, score),
      };
      progress[levelId] = nextRecord;
      set({ progress });
      persistProgress(progress);

      // Wire Levels-mode achievements.
      const stats = useStatsStore.getState();
      if (stars >= 1) stats.unlock('FIRST_STAR');
      if (stars >= 3) stats.unlock('PERFECTIONIST');
    },

    isUnlocked: (levelId) => {
      const level = levelById(levelId);
      if (!level) return false;
      if (level.index === 1) return true;
      const prevIndex = level.index - 1;
      const prevId = `L${String(prevIndex).padStart(3, '0')}`;
      const prev = get().progress[prevId];
      return !!prev && prev.stars >= 1;
    },

    starsFor: (levelId) => (get().progress[levelId]?.stars ?? 0) as LevelStars,

    bestScoreFor: (levelId) => get().progress[levelId]?.bestScore ?? 0,
  };
});
