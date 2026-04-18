'use client';

import { create } from 'zustand';
import type {
  BoardState,
  ClearCounts,
  GimmicksRunState,
  ObstacleMap,
  Piece,
  PieceColor,
  PieceShape,
  PowerUpId,
  PowerUpInventory,
  TrayPiece,
} from '@/lib/types';
import {
  boardDensity,
  boardIsEmpty,
  clearLines,
  createEmptyBoard,
  getClearedLines,
  placePiece,
} from '@/lib/engine/grid';
import { scoreTurn } from '@/lib/engine/scoring';
import { buildBag, drawTray, drawOne } from '@/lib/engine/bag';
import { pieceSize, rotateShape } from '@/lib/engine/pieces';
import { K } from '@/lib/storage/keys';
import { readJSON, writeJSON, remove } from '@/lib/storage/safe';
import { playClearSfx } from '@/lib/audio/sfx';
import {
  POWERUPS,
  POWERUP_ORDER,
  addToInventory,
  removeFromInventory,
  rollPowerupDrop,
  useBomb,
  useColNuke,
  useColorClear,
  useRowNuke,
} from '@/lib/engine/powerups';
import {
  advanceObstacles,
  canAnyPieceFitWithObstacles,
  canPlaceWithObstacles,
  shouldSpawnThisTurn,
  spawnPlanFor,
  sprinkleObstacles,
} from '@/lib/engine/obstacles';
import { useStatsStore } from './useStatsStore';
import { useSettingsStore } from './useSettingsStore';

/* ------------------------------------------------------------------------ */
/* Types                                                                     */
/* ------------------------------------------------------------------------ */

type ScorePopup = { id: number; amount: number; mult: string };

type PowerToast = {
  id: number;
  title: string;
  subtitle?: string;
};

/** Pending powerup awaiting a target cell. */
type PendingPower = { id: PowerUpId };

type Snap = Pick<
  GimmicksRunState,
  | 'board'
  | 'tray'
  | 'nextTray'
  | 'score'
  | 'combo'
  | 'comboPeak'
  | 'placements'
  | 'clears'
  | 'bag'
  | 'undosUsed'
  | 'perfectClears'
  | 'powerups'
  | 'powerMeter'
  | 'lives'
  | 'obstacles'
  | 'usedPowerups'
>;

type State = {
  hydrated: boolean;
  run: GimmicksRunState | null;
  selectedTrayIndex: number | null;
  ghost: { row: number; col: number; legal: boolean } | null;
  undoStack: Snap[];
  scorePopup: ScorePopup | null;
  powerToast: PowerToast | null;
  /** Powerup waiting for user to pick a target. null = none active. */
  pendingPower: PendingPower | null;
  /** Free-rotate modifier: if true next rotation is free even on touch. */
  freeRotateArmed: boolean;

  turn: number;
  clearingRows: number[];
  clearingCols: number[];
  clearingBoard: BoardState | null;

  hydrate: () => void;
  startRun: () => void;
  endRun: () => void;

  selectTray: (i: number | null) => void;
  setGhost: (pos: { row: number; col: number } | null, shape?: PieceShape) => void;
  rotateSelected: () => void;

  tryPlace: (trayIndex: number, row: number, col: number) => boolean;
  undo: () => boolean;
  commitClear: () => void;

  /** Activate a powerup. Target-kind ones go into pending state; instant fire now. */
  activatePower: (id: PowerUpId) => boolean;
  cancelPower: () => void;
  /** Apply the pending target powerup at (row, col). */
  applyPowerAt: (row: number, col: number) => boolean;

  dismissScorePopup: () => void;
  dismissPowerToast: () => void;
};

const UNDO_LIMIT = 3;
const POWER_METER_MAX = 100;
const STARTING_LIVES = 3;

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function withId(p: Piece): TrayPiece {
  return { ...p, id: makeId() };
}

function freshBoard(): BoardState {
  return createEmptyBoard();
}

function persistRun(run: GimmicksRunState | null): void {
  if (!run || run.gameOver) {
    remove(K.gimmicksRun);
    return;
  }
  writeJSON(K.gimmicksRun, run);
}

function powerMeterGain(linesCleared: number, perfect: boolean): number {
  if (linesCleared <= 0) return 0;
  const base = linesCleared === 1 ? 18 : linesCleared === 2 ? 40 : linesCleared === 3 ? 60 : 80;
  return base + (perfect ? 40 : 0);
}

/* ------------------------------------------------------------------------ */
/* Store                                                                     */
/* ------------------------------------------------------------------------ */

export const useGimmicksStore = create<State>((set, get) => {
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
      powerups: { ...run.powerups },
      powerMeter: run.powerMeter,
      lives: run.lives,
      obstacles: { ...run.obstacles },
      usedPowerups: run.usedPowerups.slice(),
    };
  }

  function buildInitialRun(): GimmicksRunState {
    const rng = Math.random;
    const pieceSet = useSettingsStore.getState().pieceSet;
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
      powerups: {},
      powerMeter: 0,
      lives: STARTING_LIVES,
      obstacles: {},
      seed: Math.floor(rng() * 1e9),
      usedPowerups: [],
    };
  }

  function firePowerToast(title: string, subtitle?: string): void {
    set({ powerToast: { id: Date.now(), title, subtitle } });
  }

  /** Award power meter; spills over into a free powerup every time it fills. */
  function bankPower(
    run: GimmicksRunState,
    delta: number,
  ): { powerMeter: number; powerups: PowerUpInventory; awarded: PowerUpId | null } {
    let meter = run.powerMeter + delta;
    let awarded: PowerUpId | null = null;
    let inv = run.powerups;
    while (meter >= POWER_METER_MAX) {
      meter -= POWER_METER_MAX;
      const drop =
        rollPowerupDrop(2) ??
        POWERUP_ORDER[Math.floor(Math.random() * POWERUP_ORDER.length)];
      inv = addToInventory(inv, drop);
      awarded = drop;
    }
    return { powerMeter: meter, powerups: inv, awarded };
  }

  return {
    hydrated: false,
    run: null,
    selectedTrayIndex: null,
    ghost: null,
    undoStack: [],
    scorePopup: null,
    powerToast: null,
    pendingPower: null,
    freeRotateArmed: false,

    turn: 0,
    clearingRows: [],
    clearingCols: [],
    clearingBoard: null,

    hydrate: () => {
      const existing = readJSON<GimmicksRunState | null>(K.gimmicksRun, null);
      if (existing && !existing.gameOver) {
        set({ run: existing, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    },

    startRun: () => {
      const run = buildInitialRun();
      set({
        run,
        selectedTrayIndex: null,
        ghost: null,
        undoStack: [],
        scorePopup: null,
        powerToast: null,
        pendingPower: null,
        freeRotateArmed: false,
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
      const ended: GimmicksRunState = {
        ...run,
        gameOver: true,
        lastAt: new Date().toISOString(),
      };
      set({ run: ended });
      const stats = useStatsStore.getState();
      stats.recordRun(
        {
          id: run.id,
          startedAt: run.startedAt,
          endedAt: ended.lastAt,
          score: run.score,
          placements: run.placements,
          clears: run.clears,
          comboPeak: run.comboPeak,
        },
        new Date(ended.lastAt).getTime() - new Date(run.startedAt).getTime(),
      );
      stats.markPlayedToday();
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
      const legal = canPlaceWithObstacles(
        run.board,
        shape,
        pos.row,
        pos.col,
        run.obstacles,
      );
      set({ ghost: { row: pos.row, col: pos.col, legal } });
    },

    rotateSelected: () => {
      const state = get();
      const { run, selectedTrayIndex, freeRotateArmed } = state;
      if (!run || selectedTrayIndex === null) return;
      const rotate = useSettingsStore.getState().rotation;
      if (!rotate && !freeRotateArmed) return;
      const piece = run.tray[selectedTrayIndex];
      if (!piece) return;
      const nextShape = rotateShape(piece.shape);
      const newTray = run.tray.slice();
      newTray[selectedTrayIndex] = { ...piece, shape: nextShape };
      set({
        run: { ...run, tray: newTray },
        freeRotateArmed: false,
      });
    },

    tryPlace: (trayIndex, row, col) => {
      const state = get();
      const run = state.run;
      if (!run || run.gameOver) return false;
      if (state.pendingPower) return false;
      const piece = run.tray[trayIndex];
      if (!piece) return false;
      if (!canPlaceWithObstacles(run.board, piece.shape, row, col, run.obstacles)) {
        return false;
      }

      const snap = snapshotRun();
      const placed = placePiece(run.board, piece, row, col);
      const cleared = getClearedLines(placed);
      const afterClearRaw = clearLines(placed, cleared.rows, cleared.cols);

      // Advance obstacle timers AFTER the placement resolves.
      const advance = advanceObstacles(afterClearRaw, run.obstacles);
      let board: BoardState = advance.board;
      let obstacles = advance.obstacles;

      // Bomb explosions cost a life.
      const livesAfterBomb = advance.bombExploded
        ? Math.max(0, run.lives - 1)
        : run.lives;
      if (advance.bombExploded) {
        firePowerToast('Bomb detonated', '-1 life');
      }

      const perfect = cleared.totalLines > 0 && boardIsEmpty(board);
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

      // Tray refill (same as Classic).
      const pieceSetVariant = useSettingsStore.getState().pieceSet;
      const density = boardDensity(board);
      const tray = run.tray.slice();
      const incoming = run.nextTray[0] ?? null;
      tray[trayIndex] = incoming;
      let nextTray = run.nextTray.slice(1);
      let bag = run.bag;
      const drawn = drawOne(bag, pieceSetVariant, density);
      nextTray = nextTray.concat(withId(drawn.piece));
      bag = drawn.bag;

      // Power meter accrual + random drops from clears.
      let powerMeter = run.powerMeter;
      let powerups: PowerUpInventory = run.powerups;
      const meterGain = powerMeterGain(cleared.totalLines, perfect);
      if (meterGain > 0) {
        const banked = bankPower({ ...run, powerMeter, powerups }, meterGain);
        powerMeter = banked.powerMeter;
        powerups = banked.powerups;
        if (banked.awarded) {
          const def = POWERUPS[banked.awarded];
          firePowerToast(`Earned ${def.name}`, def.blurb);
        }
      }
      if (cleared.totalLines > 0) {
        const bonus = rollPowerupDrop(cleared.totalLines);
        if (bonus) {
          powerups = addToInventory(powerups, bonus);
          const def = POWERUPS[bonus];
          firePowerToast(`Bonus: ${def.name}`, 'dropped from clear');
        }
      }

      // Obstacle spawn phase — after placement, before we commit state.
      const placementsAfter = run.placements + 1;
      if (shouldSpawnThisTurn(placementsAfter)) {
        obstacles = sprinkleObstacles(
          board,
          obstacles,
          spawnPlanFor(placementsAfter),
        );
      }

      const comboPeak = Math.max(run.comboPeak, combo);
      const perfectClears = run.perfectClears + (perfect ? 1 : 0);
      const score = run.score + turnScore.total;

      const nextRun: GimmicksRunState = {
        ...run,
        board,
        tray,
        nextTray,
        score,
        combo,
        comboPeak,
        placements: placementsAfter,
        clears,
        perfectClears,
        bag,
        powerups,
        powerMeter,
        lives: livesAfterBomb,
        obstacles,
        lastAt: new Date().toISOString(),
      };

      const popup: ScorePopup = {
        id: Date.now(),
        amount: turnScore.total - turnScore.placement,
        mult: turnScore.multiplier.toFixed(2),
      };

      const clearingRows = cleared.totalLines > 0 ? cleared.rows.slice() : [];
      const clearingCols = cleared.totalLines > 0 ? cleared.cols.slice() : [];
      const clearingBoard: BoardState | null =
        cleared.totalLines > 0 ? placed : null;

      const undoStack = state.undoStack.concat(snap);
      while (undoStack.length > UNDO_LIMIT + 20) undoStack.shift();

      set({
        run: nextRun,
        selectedTrayIndex: null,
        ghost: null,
        undoStack,
        scorePopup: cleared.totalLines > 0 ? popup : null,
        turn: state.turn + 1,
        clearingRows,
        clearingCols,
        clearingBoard,
      });

      if (cleared.totalLines > 0) {
        playClearSfx(cleared.totalLines, turnScore.multiplier);
      }

      persistRun(nextRun);

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

      if (cleared.totalLines > 0) {
        setTimeout(() => {
          if (get().scorePopup?.id === popup.id) set({ scorePopup: null });
        }, 2200);
      }

      // Deadlock handling — costs a life, auto-shuffles tray.
      if (!canAnyPieceFitWithObstacles(board, tray, obstacles)) {
        setTimeout(() => {
          const s = get();
          const r = s.run;
          if (!r || r.gameOver) return;
          const pieceSet2 = useSettingsStore.getState().pieceSet;
          const rng = Math.random;
          const drew = drawTray(r.bag, pieceSet2, boardDensity(r.board), rng);
          const livesAfter = Math.max(0, r.lives - 1);
          const next: GimmicksRunState = {
            ...r,
            tray: drew.tray.map(withId),
            bag: drew.bag,
            lives: livesAfter,
          };
          set({ run: next });
          firePowerToast('Deadlock', 'tray reshuffled · -1 life');
          persistRun(next);
          if (livesAfter <= 0) {
            setTimeout(() => get().endRun(), 500);
          }
        }, 450);
      }

      // Out of lives? End run.
      if (livesAfterBomb <= 0) {
        setTimeout(() => get().endRun(), 600);
      }

      return true;
    },

    undo: () => {
      const { run, undoStack } = get();
      if (!run || run.gameOver) return false;
      if (run.undosUsed >= UNDO_LIMIT) return false;
      const snap = undoStack[undoStack.length - 1];
      if (!snap) return false;
      const nextRun: GimmicksRunState = {
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
        powerups: { ...snap.powerups },
        powerMeter: snap.powerMeter,
        lives: snap.lives,
        obstacles: { ...snap.obstacles },
        usedPowerups: snap.usedPowerups.slice(),
        undosUsed: run.undosUsed + 1,
        lastAt: new Date().toISOString(),
      };
      set({
        run: nextRun,
        selectedTrayIndex: null,
        ghost: null,
        undoStack: undoStack.slice(0, -1),
        scorePopup: null,
        pendingPower: null,
        clearingRows: [],
        clearingCols: [],
        clearingBoard: null,
      });
      persistRun(nextRun);
      return true;
    },

    commitClear: () =>
      set({ clearingRows: [], clearingCols: [], clearingBoard: null }),

    activatePower: (id) => {
      const state = get();
      const run = state.run;
      if (!run || run.gameOver) return false;
      const count = run.powerups[id] ?? 0;
      if (count <= 0) return false;
      const def = POWERUPS[id];

      if (def.kind === 'instant') {
        // Shuffle is the only "instant" for now.
        if (id === 'shuffle') {
          const pieceSet2 = useSettingsStore.getState().pieceSet;
          const rng = Math.random;
          const drew = drawTray(run.bag, pieceSet2, boardDensity(run.board), rng);
          const next: GimmicksRunState = {
            ...run,
            tray: drew.tray.map(withId),
            bag: drew.bag,
            powerups: removeFromInventory(run.powerups, id),
            usedPowerups: run.usedPowerups.concat(id),
          };
          set({
            run: next,
            selectedTrayIndex: null,
            ghost: null,
          });
          persistRun(next);
          firePowerToast('Tray reshuffled', undefined);
          if (next.usedPowerups.length >= 3) {
            useStatsStore.getState().unlock('TOOLED_UP');
          }
          return true;
        }
        return false;
      }

      if (def.kind === 'modifier') {
        if (id === 'rotate_any') {
          const next: GimmicksRunState = {
            ...run,
            powerups: removeFromInventory(run.powerups, id),
            usedPowerups: run.usedPowerups.concat(id),
          };
          set({ run: next, freeRotateArmed: true });
          persistRun(next);
          firePowerToast('Free rotation armed', 'next rotation is free');
          if (next.usedPowerups.length >= 3) {
            useStatsStore.getState().unlock('TOOLED_UP');
          }
          return true;
        }
        return false;
      }

      // Target kind — wait for a cell to be picked.
      set({
        pendingPower: { id },
        selectedTrayIndex: null,
        ghost: null,
      });
      firePowerToast(`Pick a target: ${def.name}`);
      return true;
    },

    cancelPower: () => set({ pendingPower: null }),

    applyPowerAt: (row, col) => {
      const state = get();
      const run = state.run;
      if (!run || run.gameOver) return false;
      const pending = state.pendingPower;
      if (!pending) return false;
      const id = pending.id;

      // Target must reveal an actionable cell.
      let effect: ReturnType<typeof useBomb> | null = null;
      if (id === 'bomb') {
        effect = useBomb(run.board, run.obstacles, row, col);
      } else if (id === 'row_nuke') {
        effect = useRowNuke(run.board, run.obstacles, row);
      } else if (id === 'col_nuke') {
        effect = useColNuke(run.board, run.obstacles, col);
      } else if (id === 'color_clear') {
        const color = run.board[row]?.[col] as PieceColor | null;
        if (!color) {
          firePowerToast('No color there', 'pick a filled tile');
          return false;
        }
        effect = useColorClear(run.board, run.obstacles, color);
      }
      if (!effect) return false;
      if (effect.cellsCleared.length === 0 && id !== 'color_clear') {
        firePowerToast('No effect', 'choose a different target');
        return false;
      }

      const next: GimmicksRunState = {
        ...run,
        board: effect.board,
        obstacles: effect.obstacles,
        score: run.score + effect.bonus,
        powerups: removeFromInventory(run.powerups, id),
        usedPowerups: run.usedPowerups.concat(id),
        lastAt: new Date().toISOString(),
      };
      set({
        run: next,
        pendingPower: null,
      });
      persistRun(next);
      firePowerToast(POWERUPS[id].name, `+${effect.bonus} bonus`);
      if (next.usedPowerups.length >= 3) {
        useStatsStore.getState().unlock('TOOLED_UP');
      }
      return true;
    },

    dismissScorePopup: () => set({ scorePopup: null }),
    dismissPowerToast: () => set({ powerToast: null }),
  };
});

// Power toast auto-dismiss.
if (typeof window !== 'undefined') {
  let last: number | undefined;
  useGimmicksStore.subscribe((state) => {
    const id = state.powerToast?.id;
    if (id && id !== last) {
      last = id;
      setTimeout(() => {
        if (useGimmicksStore.getState().powerToast?.id === id) {
          useGimmicksStore.setState({ powerToast: null });
        }
      }, 2400);
    } else if (!id) {
      last = undefined;
    }
  });
}
