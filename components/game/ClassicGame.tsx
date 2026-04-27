'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './TopBar';
import HudCard from './HudCard';
import GameBoard from './GameBoard';
import Tray from './Tray';
import NextTrayCard from './NextTrayCard';
import NextTrayUndoComboCard from './NextTrayUndoComboCard';
import UndoCard from './UndoCard';
import MiniStats from './MiniStats';
import AchievementToast from './AchievementToast';
import GameOverCard from './GameOverCard';
import ClearEffects from './ClearEffects';
import ComboFx from './ComboFx';
import GameHelpOverlay from './GameHelpOverlay';
import { useGameChromeVisibility } from './GameChromeControls';
import PieceShape from '../PieceShape';
import { useGameStore } from '@/stores/useGameStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useStatsStore } from '@/stores/useStatsStore';
import {
  boardDensity,
  canPlace,
  canShapeFit,
  getClearedLines,
  placePiece,
} from '@/lib/engine/grid';
import { comboMultiplier } from '@/lib/engine/scoring';
import type { PieceShape as ShapeT, PieceColor } from '@/lib/types';
import { playSfx, vibrate, setSessionMuted } from '@/lib/audio/sfx';
import { useApplyWorldTheme } from '@/lib/hooks/useApplyWorldTheme';
import { isTouchLikeEnvironment, useTouchLike } from '@/lib/useTouchLike';

type HighScoreToast = {
  runId: string;
  score: number;
};

export default function ClassicGame() {
  useApplyWorldTheme();
  const hydrated = useGameStore((s) => s.hydrated);
  const run = useGameStore((s) => s.run);
  const ghost = useGameStore((s) => s.ghost);
  const selectedTrayIndex = useGameStore((s) => s.selectedTrayIndex);
  const scorePopup = useGameStore((s) => s.scorePopup);
  const toast = useGameStore((s) => s.toast);
  const hydrate = useGameStore((s) => s.hydrate);
  const startRun = useGameStore((s) => s.startRun);
  const selectTray = useGameStore((s) => s.selectTray);
  const setGhost = useGameStore((s) => s.setGhost);
  const tryPlace = useGameStore((s) => s.tryPlace);
  const undo = useGameStore((s) => s.undo);
  const rotateSelected = useGameStore((s) => s.rotateSelected);
  const placedSizes = useGameStore((s) => s.placedSizes);
  const lastClear = useGameStore((s) => s.lastClear);
  const clearingRows = useGameStore((s) => s.clearingRows);
  const clearingCols = useGameStore((s) => s.clearingCols);
  const clearingBoard = useGameStore((s) => s.clearingBoard);
  const commitClear = useGameStore((s) => s.commitClear);

  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const settingsHydrate = useSettingsStore((s) => s.hydrate);
  const rotationEnabled = useSettingsStore((s) => s.rotation);
  const showNextTray = useSettingsStore((s) => s.nextTrayPreview);
  const tapToSelect = useSettingsStore((s) => s.tapToSelect);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const hapticsOn = useSettingsStore((s) => s.haptics);

  const statsHydrated = useStatsStore((s) => s.hydrated);
  const statsHydrate = useStatsStore((s) => s.hydrate);
  const highScore = useStatsStore((s) => s.stats.highScore);

  // Drag position lives in a ref + rAF-driven DOM write instead of React
  // state. Pointer events fire 120–240Hz on many devices and re-rendering
  // this component on every event kills drag performance. `isDragging`
  // gates the ghost's mount; its position is written directly to the
  // element's `transform` via `ghostElRef` below.
  const [isDragging, setIsDragging] = useState(false);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const ghostRafRef = useRef<number | null>(null);
  const [hoveredAnchor, setHoveredAnchor] = useState<{ row: number; col: number } | null>(null);
  // Which cell of the *piece shape* the user grabbed. Used to keep that cell
  // under the pointer so placement lines up with where the cursor actually is.
  const [pickupOffset, setPickupOffset] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  // Pointer type drives a small vertical lift on touch so the finger doesn't
  // cover the piece you're placing.
  const [pointerKind, setPointerKind] = useState<'mouse' | 'touch' | 'pen'>('mouse');
  // Actual board-cell dimensions, tracked responsively for ghost positioning math.
  const [cellDim, setCellDim] = useState<{ cell: number; gap: number }>({ cell: 60, gap: 5 });
  const [muted, setMuted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [highScoreToast, setHighScoreToast] =
    useState<HighScoreToast | null>(null);
  const [runHighScoreBaseline, setRunHighScoreBaseline] = useState(0);
  const highScoreBaselineRunRef = useRef<string | null>(null);
  const highScoreBaselineValueRef = useRef(0);
  const highScoreToastRunRef = useRef<string | null>(null);
  /** Narrow stage: combined next-up + undo card in the sidebar. */
  const [narrowViewport, setNarrowViewport] = useState(false);
  const {
    showTrayChrome,
    showRunStats,
  } = useGameChromeVisibility();
  const isTouchLike = useTouchLike();

  // Read actual board-cell dimensions from the live CSS custom properties so the
  // ghost math stays accurate across all breakpoints (mobile uses vw-based cells).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parsePx = (val: string, fallback: number): number => {
      const n = parseFloat(val);
      return Number.isFinite(n) ? n : fallback;
    };
    const update = () => {
      const styles = getComputedStyle(document.documentElement);
      const cellRaw = styles.getPropertyValue('--board-cell').trim();
      const gapRaw = styles.getPropertyValue('--board-gap').trim();
      // `getComputedStyle` on a custom property normally returns the raw value
      // (e.g. "min(11.2vw, 52px)") rather than the resolved pixel value. Prefer
      // measuring an actual board cell when one is mounted.
      const firstCell = document.querySelector<HTMLElement>(
        '.board-grid [data-row][data-col]',
      );
      if (firstCell) {
        const rect = firstCell.getBoundingClientRect();
        const gapPx = parsePx(gapRaw, 5);
        setCellDim({ cell: rect.width, gap: gapPx });
        return;
      }
      setCellDim({ cell: parsePx(cellRaw, 60), gap: parsePx(gapRaw, 5) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    // Re-measure once fonts / board mount settle.
    const t = window.setTimeout(update, 50);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.clearTimeout(t);
    };
  }, [hydrated, run]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 760px)');
    const sync = () => setNarrowViewport(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    settingsHydrate();
    statsHydrate();
    hydrate();
  }, [hydrate, settingsHydrate, statsHydrate]);

  useEffect(() => {
    if (hydrated && settingsHydrated && !run) {
      startRun();
    }
  }, [hydrated, settingsHydrated, run, startRun]);

  const runId = run?.id ?? null;

  useEffect(() => {
    if (!runId || !statsHydrated) return;
    if (highScoreBaselineRunRef.current === runId) return;

    highScoreBaselineRunRef.current = runId;
    highScoreBaselineValueRef.current = highScore;
    highScoreToastRunRef.current = null;
    setRunHighScoreBaseline(highScore);
    setHighScoreToast(null);
  }, [runId, statsHydrated, highScore]);

  useEffect(() => {
    if (!run || !statsHydrated || run.gameOver) return;
    if (highScoreBaselineRunRef.current !== run.id) return;
    if (run.score <= 0 || run.score <= highScoreBaselineValueRef.current) return;
    if (highScoreToastRunRef.current === run.id) return;

    highScoreToastRunRef.current = run.id;
    setHighScoreToast({ runId: run.id, score: run.score });
    playSfx('achievement', !muted, sfxVolume);
    vibrate([12, 20, 12], hapticsOn);
    setAnnouncement(`New high score ${run.score.toLocaleString()}.`);
  }, [run, statsHydrated, muted, sfxVolume, hapticsOn]);

  useEffect(() => {
    if (!highScoreToast) return;

    const t = window.setTimeout(() => {
      setHighScoreToast((current) =>
        current?.runId === highScoreToast.runId ? null : current,
      );
    }, 3200);

    return () => window.clearTimeout(t);
  }, [highScoreToast]);

  const activePiece =
    selectedTrayIndex !== null && run ? run.tray[selectedTrayIndex] : null;

  // Calculate the anchor: piece is picked up on the cell you click within the piece,
  // but for simplicity we use the top-left of the piece at the hovered cell minus
  // the piece's top-left offset. Given shapes always have (0,0) at first filled
  // cell OR an empty first cell, we approximate anchor = hoveredCell for now.
  // We'll refine below.
  useEffect(() => {
    if (!activePiece || !hoveredAnchor) {
      setGhost(null);
      return;
    }
    setGhost({ row: hoveredAnchor.row, col: hoveredAnchor.col }, activePiece.shape);
  }, [activePiece, hoveredAnchor, setGhost]);

  // Writes the ghost's `transform` straight to the DOM. Called from
  // pointermove (coalesced via rAF so we paint at most once per frame) and
  // once on drag start so the piece appears where the user grabbed it.
  const writeGhostTransform = useCallback(() => {
    ghostRafRef.current = null;
    const el = ghostElRef.current;
    if (!el) return;
    const { x, y } = dragPosRef.current;
    const step = cellDim.cell + cellDim.gap;
    const pickupCenterX = pickupOffset.c * step + cellDim.cell / 2;
    const pickupCenterY = pickupOffset.r * step + cellDim.cell / 2;
    const touchLift = pointerKind === 'touch' ? step : 0;
    el.style.transform = `translate3d(${x - pickupCenterX}px, ${y - pickupCenterY - touchLift}px, 0)`;
  }, [cellDim, pickupOffset, pointerKind]);

  const scheduleGhostUpdate = useCallback(() => {
    if (ghostRafRef.current !== null) return;
    ghostRafRef.current = requestAnimationFrame(writeGhostTransform);
  }, [writeGhostTransform]);

  // Re-sync the ghost whenever the inputs to `writeGhostTransform` change
  // mid-drag (e.g. rotate-selected alters pickupOffset, or the viewport is
  // resized and cellDim changes). This costs one rAF per change, not per
  // pointer event.
  useEffect(() => {
    if (!isDragging) return;
    scheduleGhostUpdate();
  }, [isDragging, scheduleGhostUpdate]);

  // Drag: pointer tracking on window. We use elementFromPoint on every move so
  // the ghost follows the cursor precisely instead of relying on per-cell
  // pointerenter (which can miss during fast motion).
  useEffect(() => {
    if (selectedTrayIndex === null) return;
    const findCellAt = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y);
      return target?.closest('[data-row][data-col]') as HTMLElement | null;
    };
    // Hit-test the board at the same visual position where the ghost is
    // painted. On touch, the ghost is lifted up by one cell+gap so the finger
    // doesn't cover it — we must offset the hit test by the same amount or
    // placement will land one row below where the user sees the piece.
    const hitTestY = (clientY: number) => {
      const step = cellDim.cell + cellDim.gap;
      const touchLift = pointerKind === 'touch' ? step : 0;
      return clientY - touchLift;
    };
    const onMove = (e: PointerEvent) => {
      dragPosRef.current = { x: e.clientX, y: e.clientY };
      scheduleGhostUpdate();
      const cell = findCellAt(e.clientX, hitTestY(e.clientY));
      if (cell) {
        const row = Number(cell.dataset.row) - pickupOffset.r;
        const col = Number(cell.dataset.col) - pickupOffset.c;
        setHoveredAnchor((prev) =>
          prev && prev.row === row && prev.col === col ? prev : { row, col },
        );
      } else {
        setHoveredAnchor((prev) => (prev === null ? prev : null));
      }
    };
    const onUp = (e: PointerEvent) => {
      const cell = findCellAt(e.clientX, hitTestY(e.clientY));
      if (cell && run && selectedTrayIndex !== null) {
        const row = Number(cell.dataset.row) - pickupOffset.r;
        const col = Number(cell.dataset.col) - pickupOffset.c;
        const ok = tryPlace(selectedTrayIndex, row, col);
        if (ok) {
          playSfx('drop-legal', !muted, sfxVolume);
        } else {
          playSfx('drop-invalid', !muted, sfxVolume);
          triggerWobble();
        }
      }
      setIsDragging(false);
      setHoveredAnchor(null);
      setPickupOffset({ r: 0, c: 0 });
      if (!tapToSelect) selectTray(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (ghostRafRef.current !== null) {
        cancelAnimationFrame(ghostRafRef.current);
        ghostRafRef.current = null;
      }
    };
  }, [
    selectedTrayIndex,
    tryPlace,
    selectTray,
    run,
    muted,
    tapToSelect,
    pickupOffset,
    sfxVolume,
    scheduleGhostUpdate,
    cellDim,
    pointerKind,
  ]);

  const trayWrapRef = useRef<HTMLDivElement>(null);
  const [wobbleKey, setWobbleKey] = useState(0);
  function triggerWobble() {
    setWobbleKey((k) => k + 1);
  }

  const handleTrayDown = useCallback(
    (i: number, e: React.PointerEvent<HTMLDivElement>) => {
      if (!run) return;
      const piece = run.tray[i];
      if (!piece) return;

      // Figure out which cell of the piece the user grabbed. If they grabbed
      // an empty cell inside the shape's bounding box, snap to the nearest
      // filled cell so the ghost lines up sensibly.
      const target = e.target as HTMLElement | null;
      const pieceCell = target?.closest(
        '[data-piece-r][data-piece-c]',
      ) as HTMLElement | null;
      let offset = { r: 0, c: 0 };
      if (pieceCell) {
        const r = Number(pieceCell.dataset.pieceR);
        const c = Number(pieceCell.dataset.pieceC);
        if (pieceCell.dataset.pieceFilled === '1') {
          offset = { r, c };
        } else {
          offset = nearestFilledCell(piece.shape, r, c);
        }
      }
      setPickupOffset(offset);
      setPointerKind(
        (e.pointerType as 'mouse' | 'touch' | 'pen') || 'mouse',
      );
      dragPosRef.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
      // Paint the ghost at the pickup point on the next frame so it doesn't
      // flash at (0,0) before the first pointermove arrives.
      scheduleGhostUpdate();
      selectTray(i);
      playSfx('pickup', !muted, sfxVolume);
    },
    [selectTray, run, muted, sfxVolume, scheduleGhostUpdate],
  );

  // Cell interactions during drag. The global pointer-move handler is the
  // primary tracker; these stay as a belt-and-braces fallback for environments
  // where pointermove is throttled (mobile browsers, for example).
  const onCellEnter = useCallback(
    (row: number, col: number) => {
      if (selectedTrayIndex === null) return;
      setHoveredAnchor({
        row: row - pickupOffset.r,
        col: col - pickupOffset.c,
      });
    },
    [selectedTrayIndex, pickupOffset],
  );

  const onCellUp = useCallback(
    (row: number, col: number) => {
      if (selectedTrayIndex === null || !run) return;
      const anchorRow = row - pickupOffset.r;
      const anchorCol = col - pickupOffset.c;
      const ok = tryPlace(selectedTrayIndex, anchorRow, anchorCol);
      if (ok) {
        playSfx('drop-legal', !muted, sfxVolume);
      } else {
        playSfx('drop-invalid', !muted, sfxVolume);
        triggerWobble();
      }
      setHoveredAnchor(null);
      setIsDragging(false);
      setPickupOffset({ r: 0, c: 0 });
      if (!tapToSelect) selectTray(null);
    },
    [selectedTrayIndex, run, tryPlace, muted, tapToSelect, selectTray, pickupOffset, sfxVolume],
  );

  // Tap-to-select fallback: if tapToSelect is on, cellDown on a cell places
  const onCellDown = useCallback(
    (row: number, col: number) => {
      if (!tapToSelect) return;
      if (selectedTrayIndex === null || !run) return;
      const anchorRow = row - pickupOffset.r;
      const anchorCol = col - pickupOffset.c;
      const ok = tryPlace(selectedTrayIndex, anchorRow, anchorCol);
      if (ok) playSfx('drop-legal', !muted, sfxVolume);
      else {
        playSfx('drop-invalid', !muted, sfxVolume);
        triggerWobble();
      }
      setHoveredAnchor(null);
      setIsDragging(false);
      setPickupOffset({ r: 0, c: 0 });
      selectTray(null);
    },
    [tapToSelect, selectedTrayIndex, run, tryPlace, muted, selectTray, pickupOffset, sfxVolume],
  );

  useEffect(() => {
    setSessionMuted(muted);
  }, [muted]);

  // Haptics + SR announcement on clears. The audible signature and the
  // visual pop are driven by the store + GameBoard respectively.
  useEffect(() => {
    if (!lastClear) return;
    const total = lastClear.rows.length + lastClear.cols.length;
    vibrate(total >= 4 ? [24, 40, 24] : total === 3 ? [22, 30] : 18, hapticsOn);
    setAnnouncement(`Cleared ${total} line${total > 1 ? 's' : ''}`);
  }, [lastClear, hapticsOn]);

  useEffect(() => {
    if (run?.gameOver) {
      playSfx('game-over', !muted, sfxVolume);
      vibrate([30, 60, 30], hapticsOn);
      setAnnouncement(`Game over. Final score ${run.score.toLocaleString()}.`);
    }
  }, [run?.gameOver, run?.score, muted, sfxVolume, hapticsOn]);

  useEffect(() => {
    if (toast && !highScoreToast) {
      playSfx('achievement', !muted, sfxVolume);
      vibrate([12, 20, 12], hapticsOn);
    }
  }, [toast, highScoreToast, muted, sfxVolume, hapticsOn]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!run) return;
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const i = Number(e.key) - 1;
        if (run.tray[i]) selectTray(selectedTrayIndex === i ? null : i);
        return;
      }
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.key === 'r' || e.key === 'R') && rotationEnabled) {
        if (isTouchLikeEnvironment()) return;
        e.preventDefault();
        rotateSelected();
        return;
      }
      if (e.key === 'Escape') {
        selectTray(null);
        setHelpOpen(false);
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        setMuted((v) => !v);
        return;
      }
      if (e.key === '?') {
        setHelpOpen((v) => !v);
        return;
      }
      // Keyboard placement: Enter on focused cell would require focus management.
      // Simple arrow-key mode: move anchor, Enter to place.
      if (selectedTrayIndex !== null && run.tray[selectedTrayIndex]) {
        if (e.key === 'Enter' && hoveredAnchor) {
          e.preventDefault();
          tryPlace(selectedTrayIndex, hoveredAnchor.row, hoveredAnchor.col);
          return;
        }
        const cur = hoveredAnchor ?? { row: 0, col: 0 };
        let nr = cur.row;
        let nc = cur.col;
        if (e.key === 'ArrowUp') nr = Math.max(0, nr - 1);
        else if (e.key === 'ArrowDown') nr = Math.min(7, nr + 1);
        else if (e.key === 'ArrowLeft') nc = Math.max(0, nc - 1);
        else if (e.key === 'ArrowRight') nc = Math.min(7, nc + 1);
        else return;
        e.preventDefault();
        setHoveredAnchor({ row: nr, col: nc });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, selectedTrayIndex, hoveredAnchor, selectTray, undo, rotateSelected, tryPlace, rotationEnabled]);

  // Preclear detection: compute which rows/cols would clear if ghost placed.
  // `ghost.legal` is computed in the store against whatever shape was passed
  // to `setGhost` last; if the selected piece changes shape this render
  // (rotate, or tray refill), the ghost flag can briefly lag the active
  // piece. Re-check bounds here with the CURRENT shape before calling
  // placePiece — otherwise an overhanging piece writes past the board and
  // crashes the page.
  const preclear = useMemo(() => {
    if (!run || !activePiece || !ghost) {
      return { rows: [] as number[], cols: [] as number[] };
    }
    if (!canPlace(run.board, activePiece.shape, ghost.row, ghost.col)) {
      return { rows: [] as number[], cols: [] as number[] };
    }
    const placed = placePiece(run.board, activePiece, ghost.row, ghost.col);
    const cleared = getClearedLines(placed);
    return cleared;
  }, [run, activePiece, ghost]);

  const trayHint = useMemo(() => {
    if (tapToSelect) {
      return 'tap a piece, then tap the board';
    }
    if (!rotationEnabled) return 'drag a piece onto the board';
    return 'drag onto the board · R to rotate';
  }, [tapToSelect, rotationEnabled]);

  if (!run) {
    return null;
  }

  const density = Math.round(boardDensity(run.board) * 100);

  const miniStatsRows = [
    { k: 'Placed', v: run.placements },
    {
      k: 'Clears',
      v: run.clears.single + run.clears.double + run.clears.triple + run.clears.quad,
    },
    { k: 'Quads', v: run.clears.quad },
    { k: 'Perfect', v: run.perfectClears },
  ];

  const comboDisplay = `×${comboMultiplier(run.combo).toFixed(2)}`;

  const runDurationMs =
    new Date(run.lastAt).getTime() - new Date(run.startedAt).getTime();

  return (
    <>
      <TopBar
        mode="Classic"
        runId={`#${run.id.slice(0, 4).toUpperCase()}`}
        startedAt={run.startedAt}
        running={!run.gameOver}
        muted={muted}
        onToggleMute={() => setMuted((v) => !v)}
        onHelp={() => setHelpOpen((v) => !v)}
      />

      {highScoreToast ? (
        <AchievementToast
          key={`high-score-${highScoreToast.runId}`}
          eyebrow="record"
          name="New high score"
          desc={`${highScoreToast.score.toLocaleString()} and climbing`}
          icon="★"
        />
      ) : (
        toast && (
          <AchievementToast
            key={toast.id}
            name={toast.name}
            desc={toast.desc}
            icon={toast.icon}
          />
        )
      )}

      <div className="stage">
        <div className="left-stack classic-left-stack">
          <HudCard
            variant="score"
            label="score"
            value={run.score.toLocaleString()}
            sub={run.placements > 0 ? `${run.placements} placements` : 'place your first piece'}
          />
          <HudCard
            variant="combo"
            label="combo"
            value={comboDisplay}
            combo={run.combo}
          />
        </div>

        <div className="board-wrap" ref={trayWrapRef}>
          <GameBoard
            board={run.board}
            // On-board ghost + preclear preview only show when a piece is
            // selected via keyboard or tap-to-select — NOT during an active
            // pointer drag, where the floating drag-ghost already follows
            // the cursor and a second ghost on the board would double up.
            ghostShape={!isDragging ? activePiece?.shape ?? null : null}
            ghostAnchor={
              !isDragging && ghost ? { row: ghost.row, col: ghost.col } : null
            }
            ghostColor={
              (activePiece?.color as PieceColor | null) ?? null
            }
            ghostLegal={!isDragging ? ghost?.legal ?? true : true}
            preclearRows={preclear.rows}
            preclearCols={preclear.cols}
            scorePopup={
              scorePopup && scorePopup.amount > 0
                ? {
                    id: scorePopup.id,
                    amount: scorePopup.amount,
                    mult: scorePopup.mult,
                    combo: run.combo,
                  }
                : null
            }
            clearingRows={clearingRows}
            clearingCols={clearingCols}
            clearingBoard={clearingBoard}
            onClearComplete={commitClear}
            chromeLive=""
            density={density}
            onCellDown={onCellDown}
            onCellEnter={onCellEnter}
            onCellUp={onCellUp}
            onBoardLeave={() => setHoveredAnchor(null)}
          />
          <div key={wobbleKey} className={wobbleKey ? 'tray-wobble' : ''}>
            <Tray
              pieces={run.tray}
              // `activeIndex` drives the "Dragging" chip + mustard fill and
              // should only light up while the user is actually mid-drag.
              // `selectedIndex` handles the keyboard / tap-to-select highlight.
              activeIndex={isDragging ? selectedTrayIndex : null}
              selectedIndex={!isDragging ? selectedTrayIndex : null}
              onPointerDown={handleTrayDown}
              hint={trayHint}
              chromeVisible={showTrayChrome}
            />
          </div>
        </div>

        <div className="right-stack">
          {narrowViewport ? (
            <>
              <NextTrayUndoComboCard
                nextShapes={run.nextTray.map((p) => p.shape)}
                showNext={showNextTray}
                undosUsed={run.undosUsed}
                undoTotal={3}
              />
              <MiniStats rows={miniStatsRows} />
            </>
          ) : (
            <>
              {showNextTray && run.nextTray.length > 0 && (
                <NextTrayCard pieces={run.nextTray.map((p) => p.shape)} />
              )}
              <UndoCard used={run.undosUsed} total={3} />
              {showRunStats && <MiniStats rows={miniStatsRows} />}
            </>
          )}
        </div>
      </div>

      {/* Floating drag ghost that follows the cursor. Rendered at the same
          size as the real board cells. Its position is written directly to
          the element's `transform` in `writeGhostTransform` — NOT via React
          state — so pointer events at 120–240Hz don't trigger full
          component re-renders. The cell the user grabbed stays under the
          pointer; on touch, the piece is lifted one cell+gap up so the
          finger doesn't cover it. */}
      {isDragging && activePiece && (
        <div
          ref={ghostElRef}
          className="drag-ghost"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          <PieceShape shape={activePiece.shape} color={activePiece.color} size="board" />
        </div>
      )}

      <ClearEffects
        board={run.board}
        clearingBoard={clearingBoard}
        clearingRows={clearingRows}
        clearingCols={clearingCols}
        combo={run.combo}
        boardWrapRef={trayWrapRef}
      />
      <ComboFx combo={run.combo} clearingBoard={clearingBoard} />

      {run.gameOver && (
        <GameOverCard
          run={run}
          highScore={runHighScoreBaseline}
          onPlayAgain={() => startRun()}
          durationMs={runDurationMs}
        />
      )}

      {helpOpen && (
        <GameHelpOverlay
          mode="classic"
          isTouchLike={isTouchLike}
          onClose={() => setHelpOpen(false)}
        />
      )}

      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </>
  );
}

function nearestFilledCell(
  shape: ShapeT,
  r: number,
  c: number,
): { r: number; c: number } {
  let best: { r: number; c: number } | null = null;
  let bestD = Infinity;
  for (let rr = 0; rr < shape.length; rr++) {
    const row = shape[rr];
    for (let cc = 0; cc < row.length; cc++) {
      if (!row[cc]) continue;
      const d = Math.abs(rr - r) + Math.abs(cc - c);
      if (d < bestD) {
        bestD = d;
        best = { r: rr, c: cc };
      }
    }
  }
  return best ?? { r: 0, c: 0 };
}

