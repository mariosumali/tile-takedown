'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './TopBar';
import HudCard from './HudCard';
import GameBoard from './GameBoard';
import Tray from './Tray';
import MiniStats from './MiniStats';
import PieceShape from '../PieceShape';
import PowerupTray from './PowerupTray';
import LivesPips from './LivesPips';
import { useGimmicksStore } from '@/stores/useGimmicksStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import {
  boardDensity,
  getClearedLines,
  placePiece,
} from '@/lib/engine/grid';
import { canPlaceWithObstacles } from '@/lib/engine/obstacles';
import type { PieceShape as ShapeT, PieceColor } from '@/lib/types';
import { playSfx, setSessionMuted, vibrate } from '@/lib/audio/sfx';

export default function GimmicksGame() {
  const hydrated = useGimmicksStore((s) => s.hydrated);
  const run = useGimmicksStore((s) => s.run);
  const ghost = useGimmicksStore((s) => s.ghost);
  const selectedTrayIndex = useGimmicksStore((s) => s.selectedTrayIndex);
  const scorePopup = useGimmicksStore((s) => s.scorePopup);
  const powerToast = useGimmicksStore((s) => s.powerToast);
  const pendingPower = useGimmicksStore((s) => s.pendingPower);
  const clearingRows = useGimmicksStore((s) => s.clearingRows);
  const clearingCols = useGimmicksStore((s) => s.clearingCols);
  const clearingBoard = useGimmicksStore((s) => s.clearingBoard);

  const hydrate = useGimmicksStore((s) => s.hydrate);
  const startRun = useGimmicksStore((s) => s.startRun);
  const selectTray = useGimmicksStore((s) => s.selectTray);
  const setGhost = useGimmicksStore((s) => s.setGhost);
  const tryPlace = useGimmicksStore((s) => s.tryPlace);
  const undo = useGimmicksStore((s) => s.undo);
  const rotateSelected = useGimmicksStore((s) => s.rotateSelected);
  const commitClear = useGimmicksStore((s) => s.commitClear);
  const activatePower = useGimmicksStore((s) => s.activatePower);
  const cancelPower = useGimmicksStore((s) => s.cancelPower);
  const applyPowerAt = useGimmicksStore((s) => s.applyPowerAt);

  const settingsHydrate = useSettingsStore((s) => s.hydrate);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const rotationEnabled = useSettingsStore((s) => s.rotation);
  const tapToSelect = useSettingsStore((s) => s.tapToSelect);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const hapticsOn = useSettingsStore((s) => s.haptics);

  const [muted, setMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const ghostRafRef = useRef<number | null>(null);
  const [hoveredAnchor, setHoveredAnchor] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [pickupOffset, setPickupOffset] = useState<{ r: number; c: number }>({
    r: 0,
    c: 0,
  });
  const [pointerKind, setPointerKind] = useState<'mouse' | 'touch' | 'pen'>(
    'mouse',
  );
  const [cellDim, setCellDim] = useState<{ cell: number; gap: number }>({
    cell: 60,
    gap: 5,
  });
  const [wobbleKey, setWobbleKey] = useState(0);

  useEffect(() => {
    settingsHydrate();
    hydrate();
  }, [hydrate, settingsHydrate]);

  useEffect(() => {
    if (hydrated && settingsHydrated && !run) {
      startRun();
    }
  }, [hydrated, settingsHydrated, run, startRun]);

  useEffect(() => {
    setSessionMuted(muted);
  }, [muted]);

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
      const firstCell = document.querySelector<HTMLElement>(
        '.board-grid [data-row][data-col]',
      );
      if (firstCell) {
        const rect = firstCell.getBoundingClientRect();
        setCellDim({ cell: rect.width, gap: parsePx(gapRaw, 5) });
        return;
      }
      setCellDim({ cell: parsePx(cellRaw, 60), gap: parsePx(gapRaw, 5) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const t = window.setTimeout(update, 50);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.clearTimeout(t);
    };
  }, [hydrated, run]);

  const activePiece =
    selectedTrayIndex !== null && run ? run.tray[selectedTrayIndex] : null;

  useEffect(() => {
    if (!activePiece || !hoveredAnchor) {
      setGhost(null);
      return;
    }
    setGhost(
      { row: hoveredAnchor.row, col: hoveredAnchor.col },
      activePiece.shape,
    );
  }, [activePiece, hoveredAnchor, setGhost]);

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

  useEffect(() => {
    if (!isDragging) return;
    scheduleGhostUpdate();
  }, [isDragging, scheduleGhostUpdate]);

  useEffect(() => {
    if (selectedTrayIndex === null) return;
    const findCellAt = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y);
      return target?.closest('[data-row][data-col]') as HTMLElement | null;
    };
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
          setWobbleKey((k) => k + 1);
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

  const handleTrayDown = useCallback(
    (i: number, e: React.PointerEvent<HTMLDivElement>) => {
      if (!run) return;
      if (pendingPower) return;
      const piece = run.tray[i];
      if (!piece) return;
      const target = e.target as HTMLElement | null;
      const pieceCell = target?.closest(
        '[data-piece-r][data-piece-c]',
      ) as HTMLElement | null;
      let offset = { r: 0, c: 0 };
      if (pieceCell) {
        const r = Number(pieceCell.dataset.pieceR);
        const c = Number(pieceCell.dataset.pieceC);
        if (pieceCell.dataset.pieceFilled === '1') offset = { r, c };
        else offset = nearestFilledCell(piece.shape, r, c);
      }
      setPickupOffset(offset);
      setPointerKind(
        (e.pointerType as 'mouse' | 'touch' | 'pen') || 'mouse',
      );
      dragPosRef.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
      scheduleGhostUpdate();
      selectTray(i);
      playSfx('pickup', !muted, sfxVolume);
    },
    [run, selectTray, muted, sfxVolume, scheduleGhostUpdate, pendingPower],
  );

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
      if (ok) playSfx('drop-legal', !muted, sfxVolume);
      else {
        playSfx('drop-invalid', !muted, sfxVolume);
        setWobbleKey((k) => k + 1);
      }
      setHoveredAnchor(null);
      setIsDragging(false);
      setPickupOffset({ r: 0, c: 0 });
      if (!tapToSelect) selectTray(null);
    },
    [
      selectedTrayIndex,
      run,
      tryPlace,
      muted,
      tapToSelect,
      selectTray,
      pickupOffset,
      sfxVolume,
    ],
  );

  const onCellDown = useCallback(
    (row: number, col: number) => {
      if (pendingPower) {
        const ok = applyPowerAt(row, col);
        if (ok) {
          playSfx('drop-legal', !muted, sfxVolume);
          vibrate(20, hapticsOn);
        }
        return;
      }
      if (!tapToSelect) return;
      if (selectedTrayIndex === null || !run) return;
      const anchorRow = row - pickupOffset.r;
      const anchorCol = col - pickupOffset.c;
      const ok = tryPlace(selectedTrayIndex, anchorRow, anchorCol);
      if (ok) playSfx('drop-legal', !muted, sfxVolume);
      else {
        playSfx('drop-invalid', !muted, sfxVolume);
        setWobbleKey((k) => k + 1);
      }
      setHoveredAnchor(null);
      setIsDragging(false);
      setPickupOffset({ r: 0, c: 0 });
      selectTray(null);
    },
    [
      tapToSelect,
      selectedTrayIndex,
      run,
      tryPlace,
      muted,
      selectTray,
      pickupOffset,
      sfxVolume,
      pendingPower,
      applyPowerAt,
      hapticsOn,
    ],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!run) return;
      if (e.key === 'Escape') {
        if (pendingPower) cancelPower();
        else selectTray(null);
        return;
      }
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
      if (e.key === 'm' || e.key === 'M') {
        setMuted((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    run,
    selectedTrayIndex,
    selectTray,
    undo,
    rotateSelected,
    rotationEnabled,
    pendingPower,
    cancelPower,
  ]);

  const preclear = useMemo(() => {
    if (!run || !activePiece || !ghost) {
      return { rows: [] as number[], cols: [] as number[] };
    }
    if (
      !canPlaceWithObstacles(
        run.board,
        activePiece.shape,
        ghost.row,
        ghost.col,
        run.obstacles,
      )
    ) {
      return { rows: [] as number[], cols: [] as number[] };
    }
    const placed = placePiece(run.board, activePiece, ghost.row, ghost.col);
    return getClearedLines(placed);
  }, [run, activePiece, ghost]);

  if (!run) return null;

  const density = Math.round(boardDensity(run.board) * 100);
  const chromeLive = pendingPower
    ? `pick a target · ${pendingPower.id.replace('_', ' ')}`
    : preclear.rows.length + preclear.cols.length > 0
      ? `${preclear.rows.length + preclear.cols.length} line${
          preclear.rows.length + preclear.cols.length > 1 ? 's' : ''
        } ready`
      : '';

  const comboMultStr = (1 + 0.25 * run.combo).toFixed(2);
  const comboDisplay =
    run.combo > 0 ? `×${Math.min(3, Number(comboMultStr)).toFixed(2)}` : '×1.00';
  const comboOn = Math.min(4, run.combo);

  const totalClears =
    run.clears.single + run.clears.double + run.clears.triple + run.clears.quad;

  const miniStatsRows = [
    { k: 'Placed', v: run.placements },
    { k: 'Clears', v: totalClears },
    { k: 'Perfect', v: run.perfectClears },
    { k: 'Used', v: run.usedPowerups.length },
  ];

  const trayHint = pendingPower
    ? 'tap a cell on the board to activate your powerup'
    : tapToSelect
      ? 'tap a piece, then tap the board'
      : rotationEnabled
        ? 'drag onto the board · R to rotate'
        : 'drag a piece onto the board';

  return (
    <>
      <TopBar
        mode="Gimmicks"
        runId={`#${run.id.slice(0, 4).toUpperCase()}`}
        startedAt={run.startedAt}
        running={!run.gameOver}
        muted={muted}
        onToggleMute={() => setMuted((v) => !v)}
      />

      {powerToast && (
        <div
          key={powerToast.id}
          className="achievement-toast"
          role="status"
          aria-live="polite"
          style={{ pointerEvents: 'none' }}
        >
          <div className="eyebrow">powerup</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              lineHeight: 1.05,
            }}
          >
            {powerToast.title}
          </div>
          {powerToast.subtitle && (
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                marginTop: 4,
                opacity: 0.8,
              }}
            >
              {powerToast.subtitle}
            </div>
          )}
        </div>
      )}

      <div className="stage">
        <div className="left-stack">
          <HudCard
            variant="score"
            label="score"
            value={run.score.toLocaleString()}
            sub={
              run.placements > 0
                ? `${run.placements} placements`
                : 'place your first piece'
            }
          />
          <LivesPips lives={run.lives} powerMeter={run.powerMeter} />
          <HudCard
            variant="combo"
            label="combo"
            value={comboDisplay}
            comboOn={comboOn}
            comboTotal={4}
          />
        </div>

        <div className="board-wrap">
          <GameBoard
            board={run.board}
            obstacles={run.obstacles}
            ghostShape={!isDragging ? activePiece?.shape ?? null : null}
            ghostAnchor={
              !isDragging && ghost
                ? { row: ghost.row, col: ghost.col }
                : null
            }
            ghostColor={
              !isDragging
                ? ((activePiece?.color as PieceColor | null) ?? null)
                : null
            }
            ghostLegal={!isDragging ? (ghost?.legal ?? true) : true}
            preclearRows={!isDragging ? preclear.rows : []}
            preclearCols={!isDragging ? preclear.cols : []}
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
              activeIndex={isDragging ? selectedTrayIndex : null}
              selectedIndex={!isDragging ? selectedTrayIndex : null}
              onPointerDown={handleTrayDown}
              hint={trayHint}
            />
          </div>
        </div>

        <div className="right-stack">
          <PowerupTray
            inventory={run.powerups}
            pendingId={pendingPower?.id ?? null}
            onActivate={(id) => activatePower(id)}
            onCancel={() => cancelPower()}
          />
          {run.nextTray.length > 0 && (
            <div className="next-tray-card">
              <div className="eyebrow">next tray</div>
              <div className="next-tray-row">
                {run.nextTray.slice(0, 3).map((p, i) => (
                  <div key={i} className="next-tray-slot">
                    <PieceShape shape={p.shape} color={p.color} size="mini" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <MiniStats rows={miniStatsRows} />
        </div>
      </div>

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
          <PieceShape
            shape={activePiece.shape}
            color={activePiece.color}
            size="board"
          />
        </div>
      )}

      {run.gameOver && (
        <div
          className="gameover-overlay"
          role="dialog"
          aria-label="Run complete"
        >
          <div className="gameover-card">
            <div className="eyebrow">run complete</div>
            <h2 className="go-title">Out of lives.</h2>
            <div className="go-score">
              <span className="label">final</span>
              <span className="num">{run.score.toLocaleString()}</span>
            </div>
            <div className="go-stats">
              <div className="go-stat">
                <div className="eyebrow">placements</div>
                <div className="num">{run.placements}</div>
              </div>
              <div className="go-stat">
                <div className="eyebrow">clears</div>
                <div className="num">{totalClears}</div>
              </div>
              <div className="go-stat">
                <div className="eyebrow">powerups used</div>
                <div className="num">{run.usedPowerups.length}</div>
              </div>
              <div className="go-stat">
                <div className="eyebrow">peak combo</div>
                <div className="num">×{(1 + 0.25 * run.comboPeak).toFixed(2)}</div>
              </div>
            </div>
            <div className="go-cta">
              <button className="btn btn-primary" onClick={() => startRun()}>
                Play again
                <span className="btn-arrow" aria-hidden="true" />
              </button>
              <Link href="/" className="btn btn-secondary">
                Home
              </Link>
            </div>
          </div>
        </div>
      )}
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
