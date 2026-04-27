'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './TopBar';
import HudCard from './HudCard';
import GameBoard from './GameBoard';
import Tray from './Tray';
import MiniStats from './MiniStats';
import LevelCompleteCard from './LevelCompleteCard';
import ClearEffects from './ClearEffects';
import ComboFx from './ComboFx';
import GameHelpOverlay from './GameHelpOverlay';
import { useGameChromeVisibility } from './GameChromeControls';
import PieceShape from '../PieceShape';
import { useLevelsStore } from '@/stores/useLevelsStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import {
  canPlace,
  canAnyPieceFit,
  getClearedLines,
  placePiece,
} from '@/lib/engine/grid';
import { comboMultiplier } from '@/lib/engine/scoring';
import type { LevelBonusId, PieceShape as ShapeT, PieceColor } from '@/lib/types';
import { playSfx, setSessionMuted } from '@/lib/audio/sfx';
import { useApplyWorldTheme } from '@/lib/hooks/useApplyWorldTheme';
import { isTouchLikeEnvironment, useTouchLike } from '@/lib/useTouchLike';

type Props = {
  levelId: string;
};

export default function LevelGame({ levelId }: Props) {
  useApplyWorldTheme();
  const hydrated = useLevelsStore((s) => s.hydrated);
  const level = useLevelsStore((s) => s.level);
  const board = useLevelsStore((s) => s.board);
  const tray = useLevelsStore((s) => s.tray);
  const nextTray = useLevelsStore((s) => s.nextTray);
  const score = useLevelsStore((s) => s.score);
  const combo = useLevelsStore((s) => s.combo);
  const comboPeak = useLevelsStore((s) => s.comboPeak);
  const placements = useLevelsStore((s) => s.placements);
  const clears = useLevelsStore((s) => s.clears);
  const perfectClears = useLevelsStore((s) => s.perfectClears);
  const reshuffleUsed = useLevelsStore((s) => s.reshuffleUsed);
  const undosUsed = useLevelsStore((s) => s.undosUsed);
  const selectedTrayIndex = useLevelsStore((s) => s.selectedTrayIndex);
  const ghost = useLevelsStore((s) => s.ghost);
  const scorePopup = useLevelsStore((s) => s.scorePopup);
  const clearingRows = useLevelsStore((s) => s.clearingRows);
  const clearingCols = useLevelsStore((s) => s.clearingCols);
  const clearingBoard = useLevelsStore((s) => s.clearingBoard);
  const finishedStars = useLevelsStore((s) => s.finishedStars);
  const passed = useLevelsStore((s) => s.passed);

  const hydrate = useLevelsStore((s) => s.hydrate);
  const startLevel = useLevelsStore((s) => s.startLevel);
  const selectTray = useLevelsStore((s) => s.selectTray);
  const setGhost = useLevelsStore((s) => s.setGhost);
  const tryPlace = useLevelsStore((s) => s.tryPlace);
  const undo = useLevelsStore((s) => s.undo);
  const rotateSelected = useLevelsStore((s) => s.rotateSelected);
  const reshuffle = useLevelsStore((s) => s.reshuffle);
  const commitClear = useLevelsStore((s) => s.commitClear);
  const finishLevel = useLevelsStore((s) => s.finishLevel);

  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const settingsHydrate = useSettingsStore((s) => s.hydrate);
  const rotationEnabled = useSettingsStore((s) => s.rotation);
  const tapToSelect = useSettingsStore((s) => s.tapToSelect);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  const [muted, setMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const ghostRafRef = useRef<number | null>(null);
  const [hoveredAnchor, setHoveredAnchor] = useState<{ row: number; col: number } | null>(null);
  const [pickupOffset, setPickupOffset] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [pointerKind, setPointerKind] = useState<'mouse' | 'touch' | 'pen'>('mouse');
  const [cellDim, setCellDim] = useState<{ cell: number; gap: number }>({ cell: 60, gap: 5 });
  const [wobbleKey, setWobbleKey] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const {
    showTrayChrome,
    showRunStats,
  } = useGameChromeVisibility();
  const isTouchLike = useTouchLike();

  useEffect(() => {
    settingsHydrate();
    hydrate();
  }, [hydrate, settingsHydrate]);

  useEffect(() => {
    if (hydrated && settingsHydrated && levelId) {
      if (!level || level.id !== levelId) startLevel(levelId);
    }
  }, [hydrated, settingsHydrated, levelId, level, startLevel]);

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
        const gapPx = parsePx(gapRaw, 5);
        setCellDim({ cell: rect.width, gap: gapPx });
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
  }, [hydrated, level]);

  const activePiece =
    selectedTrayIndex !== null ? tray[selectedTrayIndex] ?? null : null;

  useEffect(() => {
    if (!activePiece || !hoveredAnchor) {
      setGhost(null);
      return;
    }
    setGhost({ row: hoveredAnchor.row, col: hoveredAnchor.col }, activePiece.shape);
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
      if (cell && selectedTrayIndex !== null) {
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
      const piece = tray[i];
      if (!piece) return;
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
      scheduleGhostUpdate();
      selectTray(i);
      playSfx('pickup', !muted, sfxVolume);
    },
    [selectTray, tray, muted, sfxVolume, scheduleGhostUpdate],
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
      if (selectedTrayIndex === null) return;
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
    [selectedTrayIndex, tryPlace, muted, tapToSelect, selectTray, pickupOffset, sfxVolume],
  );

  const onCellDown = useCallback(
    (row: number, col: number) => {
      if (!tapToSelect) return;
      if (selectedTrayIndex === null) return;
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
    [tapToSelect, selectedTrayIndex, tryPlace, muted, selectTray, pickupOffset, sfxVolume],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!level) return;
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const i = Number(e.key) - 1;
        if (tray[i]) selectTray(selectedTrayIndex === i ? null : i);
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
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        setMuted((v) => !v);
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [level, tray, selectedTrayIndex, selectTray, undo, rotateSelected, rotationEnabled]);

  const mask = level?.dims.mask;

  const preclear = useMemo(() => {
    if (!level || !activePiece || !ghost || !board.length) {
      return { rows: [] as number[], cols: [] as number[] };
    }
    if (!canPlace(board, activePiece.shape, ghost.row, ghost.col, mask)) {
      return { rows: [] as number[], cols: [] as number[] };
    }
    const placed = placePiece(board, activePiece, ghost.row, ghost.col, mask);
    const cleared = getClearedLines(placed, mask);
    return cleared;
  }, [level, activePiece, ghost, board, mask]);

  useEffect(() => {
    const total = clearingRows.length + clearingCols.length;
    if (total > 0) setAnnouncement(`Cleared ${total} line${total > 1 ? 's' : ''}.`);
  }, [clearingRows, clearingCols]);

  useEffect(() => {
    if (passed && finishedStars === null) {
      setAnnouncement('Target reached. Keep going for more stars, or finish the level.');
    }
  }, [passed, finishedStars]);

  useEffect(() => {
    if (finishedStars !== null) {
      setAnnouncement(`Level complete with ${finishedStars} star${finishedStars === 1 ? '' : 's'}.`);
    }
  }, [finishedStars]);

  if (!level) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)' }}>Loading level…</p>
      </div>
    );
  }

  const progress = Math.min(1, score / Math.max(1, level.targetScore));
  const starsNow =
    score >= level.starThresholds[2] ? 3 :
    score >= level.starThresholds[1] ? 2 :
    score >= level.starThresholds[0] ? 1 : 0;

  const canReshuffle =
    !reshuffleUsed &&
    finishedStars === null &&
    !canAnyPieceFit(board, tray, mask);

  const miniStatsRows = [
    { k: 'Placed', v: placements },
    { k: 'Clears', v: clears.single + clears.double + clears.triple + clears.quad },
    { k: 'Perfect', v: perfectClears },
    { k: 'Peak', v: `×${comboMultiplier(comboPeak).toFixed(2)}` },
  ];

  const chromeLive = passed ? 'target hit · keep going for more stars' : '';

  const comboDisplay = `×${comboMultiplier(combo).toFixed(2)}`;

  const trayHint = tapToSelect
    ? 'tap a piece, then tap the board'
    : rotationEnabled
      ? 'drag onto the board · R to rotate'
      : 'drag a piece onto the board';

  const levelBadges: LevelBonusId[] = [];
  if (placements > 0 && placements <= level.parMoves) levelBadges.push('under_par');
  if (undosUsed === 0) levelBadges.push('no_undo');
  if (perfectClears > 0) levelBadges.push('perfect_clear');
  if (comboPeak >= 6) levelBadges.push('combo_fire');

  return (
    <>
      <TopBar
        mode={`${level.name} · ${level.id}`}
        runId={`tier ${level.tier}`}
        startedAt={new Date().toISOString()}
        running={finishedStars === null}
        muted={muted}
        onToggleMute={() => setMuted((v) => !v)}
        onHelp={() => setHelpOpen((v) => !v)}
      />

      <div className="stage">
        <div className="left-stack">
          <HudCard
            variant="score"
            label="score"
            value={score.toLocaleString()}
            sub={`target ${level.targetScore.toLocaleString()} · ${Math.round(progress * 100)}%`}
          />
          <HudCard
            variant="high"
            label="stars"
            value={'★'.repeat(starsNow) + '☆'.repeat(3 - starsNow)}
            sub={`2★ ${level.starThresholds[1].toLocaleString()} · 3★ ${level.starThresholds[2].toLocaleString()}`}
          />
          <HudCard
            variant="combo"
            label="combo"
            value={comboDisplay}
            combo={combo}
          />
        </div>

        <div className="board-wrap" ref={boardWrapRef}>
          <GameBoard
            board={board}
            mask={mask}
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
                    combo,
                  }
                : null
            }
            clearingRows={clearingRows}
            clearingCols={clearingCols}
            clearingBoard={clearingBoard}
            onClearComplete={commitClear}
            chromeLive={chromeLive}
            onCellDown={onCellDown}
            onCellEnter={onCellEnter}
            onCellUp={onCellUp}
            onBoardLeave={() => setHoveredAnchor(null)}
          />
          <div key={wobbleKey} className={wobbleKey ? 'tray-wobble' : ''}>
            <Tray
              pieces={tray}
              activeIndex={isDragging ? selectedTrayIndex : null}
              selectedIndex={!isDragging ? selectedTrayIndex : null}
              onPointerDown={handleTrayDown}
              hint={trayHint}
              chromeVisible={showTrayChrome}
            />
          </div>
        </div>

        <div className="right-stack">
          {level.intro && placements === 0 && (
            <div className="mode-card" style={{ padding: '20px 22px' }}>
              <div className="eyebrow">brief</div>
              <p style={{ fontFamily: 'var(--font-body)', margin: '6px 0 0', lineHeight: 1.4 }}>
                {level.intro}
              </p>
            </div>
          )}
          <ReshuffleCard
            available={canReshuffle}
            used={reshuffleUsed}
            onUse={() => reshuffle()}
            passed={passed}
            stars={starsNow}
            onFinish={finishLevel}
          />
          {nextTray.length > 0 && (
            <div className="card next-tray">
              <div className="eyebrow">next tray</div>
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '6px 0',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginTop: 10,
                }}
              >
                {nextTray.slice(0, 3).map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 48,
                    }}
                  >
                    <PieceShape shape={p.shape} color={p.color} size="mini" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {showRunStats && <MiniStats rows={miniStatsRows} />}
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
          <PieceShape shape={activePiece.shape} color={activePiece.color} size="board" />
        </div>
      )}

      <ClearEffects
        board={board}
        clearingBoard={clearingBoard}
        clearingRows={clearingRows}
        clearingCols={clearingCols}
        combo={combo}
        boardWrapRef={boardWrapRef}
        mask={mask}
      />
      <ComboFx combo={combo} clearingBoard={clearingBoard} />

      {finishedStars !== null && (
        <LevelCompleteCard
          level={level}
          score={score}
          stars={finishedStars}
          badges={levelBadges}
          onRetry={() => startLevel(level.id)}
        />
      )}

      {helpOpen && (
        <GameHelpOverlay
          mode="levels"
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

function ReshuffleCard({
  available,
  used,
  onUse,
  passed,
  stars,
  onFinish,
}: {
  available: boolean;
  used: boolean;
  onUse: () => void;
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
  onFinish: () => void;
}) {
  return (
    <div className="undo-card">
      <div className="eyebrow">{passed ? 'level cleared' : 'reshuffle'}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, marginTop: 8 }}>
        {passed
          ? stars >= 3
            ? 'three stars — top marks.'
            : `keep playing for ${3 - stars}★ more, or finish now.`
          : used
            ? 'already used this run.'
            : available
              ? 'tray has no legal moves. redraw once for free.'
              : '1 per level · redraws the tray if you deadlock.'}
      </div>
      {passed ? (
        <button
          className="btn btn-primary"
          onClick={onFinish}
          style={{ marginTop: 12 }}
        >
          Finish level
        </button>
      ) : (
        <button
          className="btn btn-primary"
          disabled={!available}
          onClick={onUse}
          style={{ marginTop: 12, opacity: available ? 1 : 0.4 }}
        >
          Reshuffle tray
        </button>
      )}
      <Link
        href="/levels"
        className="btn btn-secondary"
        style={{ marginTop: 8, display: 'inline-block' }}
      >
        Back to levels
      </Link>
    </div>
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
