'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './TopBar';
import HudCard from './HudCard';
import GameBoard from './GameBoard';
import Tray from './Tray';
import NextTrayCard from './NextTrayCard';
import UndoCard from './UndoCard';
import MiniStats from './MiniStats';
import AchievementToast from './AchievementToast';
import GameOverCard from './GameOverCard';
import PieceShape from '../PieceShape';
import { useGameStore } from '@/stores/useGameStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useStatsStore } from '@/stores/useStatsStore';
import { boardDensity, canShapeFit } from '@/lib/engine/grid';
import { rotateShape } from '@/lib/engine/pieces';
import { getClearedLines } from '@/lib/engine/grid';
import { placePiece } from '@/lib/engine/grid';
import type { PieceShape as ShapeT, PieceColor } from '@/lib/types';
import { comboMultiplier } from '@/lib/engine/scoring';
import { playSfx, vibrate } from '@/lib/audio/sfx';

export default function ClassicGame() {
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

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
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
  const [clearingVis, setClearingVis] = useState<{ rows: number[]; cols: number[] } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 680px)');
    const update = () =>
      setCellDim(mq.matches ? { cell: 36, gap: 3 } : { cell: 60, gap: 5 });
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
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

  // Drag: pointer tracking on window. We use elementFromPoint on every move so
  // the ghost follows the cursor precisely instead of relying on per-cell
  // pointerenter (which can miss during fast motion).
  useEffect(() => {
    if (selectedTrayIndex === null) return;
    const findCellAt = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y);
      return target?.closest('[data-row][data-col]') as HTMLElement | null;
    };
    const onMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
      const cell = findCellAt(e.clientX, e.clientY);
      if (cell) {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        setHoveredAnchor({
          row: row - pickupOffset.r,
          col: col - pickupOffset.c,
        });
      } else {
        setHoveredAnchor(null);
      }
    };
    const onUp = (e: PointerEvent) => {
      const cell = findCellAt(e.clientX, e.clientY);
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
      setDragPos(null);
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
    };
  }, [selectedTrayIndex, tryPlace, selectTray, run, muted, tapToSelect, pickupOffset, sfxVolume]);

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
      setDragPos({ x: e.clientX, y: e.clientY });
      selectTray(i);
      playSfx('pickup', !muted, sfxVolume);
    },
    [selectTray, run, muted, sfxVolume],
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
      setDragPos(null);
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
      setDragPos(null);
      setPickupOffset({ r: 0, c: 0 });
      selectTray(null);
    },
    [tapToSelect, selectedTrayIndex, run, tryPlace, muted, selectTray, pickupOffset, sfxVolume],
  );

  // Clearing animation + audio: when lastClear changes
  useEffect(() => {
    if (!lastClear) {
      setClearingVis(null);
      return;
    }
    setClearingVis({ rows: lastClear.rows, cols: lastClear.cols });
    const total = lastClear.rows.length + lastClear.cols.length;
    const ev =
      total >= 4 ? 'clear-4' : total === 3 ? 'clear-3' : total === 2 ? 'clear-2' : 'clear-1';
    playSfx(ev as any, !muted, sfxVolume);
    vibrate(total >= 4 ? [24, 40, 24] : total === 3 ? [22, 30] : 18, hapticsOn);
    setAnnouncement(`Cleared ${total} line${total > 1 ? 's' : ''}`);
    const t = setTimeout(() => setClearingVis(null), 380);
    return () => clearTimeout(t);
  }, [lastClear, muted, sfxVolume, hapticsOn]);

  useEffect(() => {
    if (run?.gameOver) {
      playSfx('game-over', !muted, sfxVolume);
      vibrate([30, 60, 30], hapticsOn);
      setAnnouncement(`Game over. Final score ${run.score.toLocaleString()}.`);
    }
  }, [run?.gameOver, run?.score, muted, sfxVolume, hapticsOn]);

  useEffect(() => {
    if (toast) {
      playSfx('achievement', !muted, sfxVolume);
      vibrate([12, 20, 12], hapticsOn);
    }
  }, [toast, muted, sfxVolume, hapticsOn]);

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

  // Preclear detection: compute which rows/cols would clear if ghost placed
  const preclear = useMemo(() => {
    if (!run || !activePiece || !ghost || !ghost.legal) {
      return { rows: [] as number[], cols: [] as number[] };
    }
    const placed = placePiece(run.board, activePiece, ghost.row, ghost.col);
    const cleared = getClearedLines(placed);
    return cleared;
  }, [run, activePiece, ghost]);

  if (!run) {
    return null;
  }

  const density = Math.round(boardDensity(run.board) * 100);
  const chromeLive =
    preclear.rows.length + preclear.cols.length > 0
      ? `${preclear.rows.length + preclear.cols.length} line${
          preclear.rows.length + preclear.cols.length > 1 ? 's' : ''
        } ready`
      : '';

  const miniStatsRows = [
    { k: 'Placed', v: run.placements },
    {
      k: 'Clears',
      v: run.clears.single + run.clears.double + run.clears.triple + run.clears.quad,
    },
    { k: 'Quads', v: run.clears.quad },
    { k: 'Perfect', v: run.perfectClears },
  ];

  const comboMultStr = (1 + 0.25 * run.combo).toFixed(2);
  const comboDisplay = run.combo > 0 ? `×${Math.min(3, Number(comboMultStr)).toFixed(2)}` : '×1.00';
  const comboOn = Math.min(4, run.combo);

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

      {toast && <AchievementToast key={toast.id} name={toast.name} desc={toast.desc} icon={toast.icon} />}

      <div className="stage">
        <div className="left-stack">
          <HudCard
            variant="score"
            label="score"
            value={run.score.toLocaleString()}
            sub={run.placements > 0 ? `${run.placements} placements` : 'place your first piece'}
          />
          <HudCard
            variant="high"
            label="high score"
            value={highScore.toLocaleString()}
            sub={
              run.score > highScore
                ? `+${(run.score - highScore).toLocaleString()}`
                : highScore > 0
                  ? `delta ${(run.score - highScore).toLocaleString()}`
                  : 'first run'
            }
          />
          <HudCard
            variant="combo"
            label="combo"
            value={comboDisplay}
            comboOn={comboOn}
            comboTotal={4}
          />
        </div>

        <div className="board-wrap" ref={trayWrapRef}>
          <GameBoard
            board={run.board}
            ghostShape={activePiece?.shape ?? null}
            ghostAnchor={ghost ? { row: ghost.row, col: ghost.col } : null}
            ghostColor={activePiece?.color as PieceColor | null}
            ghostLegal={ghost?.legal ?? true}
            scorePopup={
              scorePopup && scorePopup.amount > 0
                ? { amount: scorePopup.amount, mult: scorePopup.mult }
                : null
            }
            preclearRows={preclear.rows}
            preclearCols={preclear.cols}
            clearingRows={clearingVis?.rows}
            clearingCols={clearingVis?.cols}
            chromeLive={chromeLive}
            density={density}
            onCellDown={onCellDown}
            onCellEnter={onCellEnter}
            onCellUp={onCellUp}
            onBoardLeave={() => setHoveredAnchor(null)}
          />
          <div key={wobbleKey} className={wobbleKey ? 'tray-wobble' : ''}>
            <Tray
              pieces={run.tray}
              activeIndex={selectedTrayIndex}
              onPointerDown={handleTrayDown}
              hint={
                tapToSelect
                  ? 'tap a piece, then tap the board'
                  : rotationEnabled
                    ? 'drag onto the board · R to rotate'
                    : 'drag a piece onto the board'
              }
            />
          </div>
        </div>

        <div className="right-stack">
          {showNextTray && run.nextTray.length > 0 && (
            <NextTrayCard pieces={run.nextTray.map((p) => p.shape)} />
          )}
          <UndoCard used={run.undosUsed} total={3} />
          <MiniStats rows={miniStatsRows} />
        </div>
      </div>

      {/* Floating drag ghost that follows the cursor. Rendered at the same
          size as the real board cells and positioned so the cell the user
          grabbed stays under the pointer. On touch, lifted a cell+gap up so
          the finger doesn't cover the piece. */}
      {dragPos && activePiece && (() => {
        const step = cellDim.cell + cellDim.gap;
        const pickupCenterX = pickupOffset.c * step + cellDim.cell / 2;
        const pickupCenterY = pickupOffset.r * step + cellDim.cell / 2;
        const touchLift = pointerKind === 'touch' ? step : 0;
        return (
          <div
            className="drag-ghost"
            style={{
              position: 'fixed',
              top: dragPos.y - pickupCenterY - touchLift,
              left: dragPos.x - pickupCenterX,
              pointerEvents: 'none',
              zIndex: 50,
            }}
          >
            <PieceShape shape={activePiece.shape} color={activePiece.color} size="board" />
          </div>
        );
      })()}

      {run.gameOver && (
        <GameOverCard
          run={run}
          highScore={Math.max(highScore, run.score)}
          onPlayAgain={() => startRun()}
          durationMs={runDurationMs}
        />
      )}

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}

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

function HelpOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="help-overlay" role="dialog" aria-label="Controls" onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">controls</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 38, marginTop: 8 }}>
          How it works
        </h3>
        <ul className="help-list">
          <li><kbd className="kbd">1</kbd><kbd className="kbd">2</kbd><kbd className="kbd">3</kbd> select a tray slot</li>
          <li><kbd className="kbd">↑↓←→</kbd> move the ghost placement</li>
          <li><kbd className="kbd">↵</kbd> place at ghost</li>
          <li><kbd className="kbd">R</kbd> rotate (if enabled)</li>
          <li><kbd className="kbd">Z</kbd> undo</li>
          <li><kbd className="kbd">M</kbd> mute</li>
          <li><kbd className="kbd">Esc</kbd> close / cancel</li>
        </ul>
        <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 24 }}>
          Got it
        </button>
      </div>
    </div>
  );
}
