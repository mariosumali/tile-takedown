'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BoardState } from '@/lib/types';
import { boardIsEmpty } from '@/lib/engine/grid';
import { comboMultiplier } from '@/lib/engine/scoring';

/**
 * Renders big-moment feedback on top of a clearing board: a short screen
 * flash, a radial shockwave, a confetti burst, and a banner like
 * "triple!" / "quad!" / "perfect!". Also toggles `.board-shake` on the
 * supplied wrap element so the board itself jolts in sympathy.
 *
 * Intensity scales with `lines` and `perfect`:
 *   - 2 lines  → light flash, no banner
 *   - 3 lines  → medium flash, shockwave, "triple!" banner, shake
 *   - 4+ lines → strong flash, shockwave + confetti, "quad!" banner, big shake
 *   - perfect  → golden flash, confetti cascade, "perfect!" banner
 */
type Props = {
  board: BoardState;
  clearingBoard: BoardState | null;
  clearingRows: ReadonlyArray<number>;
  clearingCols: ReadonlyArray<number>;
  /** Current run combo count when the clear resolved. */
  combo: number;
  /** Ref to the board wrap element — receives `.board-shake` class. */
  boardWrapRef: React.RefObject<HTMLElement | null>;
  /** Optional playable mask; used to judge "perfect" on levels. */
  mask?: ReadonlyArray<ReadonlyArray<boolean>>;
};

type FxEvent = {
  id: number;
  lines: number;
  perfect: boolean;
  combo: number;
};

// Must stay in sync with the CSS animations. The banner + flash together
// take about 900ms; confetti hangs around a beat longer.
const FX_LIFETIME_MS = 1200;
const SHAKE_LIFETIME_MS = 520;

export default function ClearEffects({
  board,
  clearingBoard,
  clearingRows,
  clearingCols,
  combo,
  boardWrapRef,
  mask,
}: Props) {
  const [event, setEvent] = useState<FxEvent | null>(null);
  const prevClearingRef = useRef<BoardState | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    // `clearingBoard` transitions from null → populated exactly once per
    // clear batch. That edge is our trigger.
    const prev = prevClearingRef.current;
    prevClearingRef.current = clearingBoard;
    if (prev || !clearingBoard) return;

    const lines = clearingRows.length + clearingCols.length;
    if (lines <= 0) return;
    const perfect = boardIsEmpty(board, mask);
    idRef.current += 1;
    setEvent({ id: idRef.current, lines, perfect, combo });
  }, [clearingBoard, clearingRows, clearingCols, combo, board, mask]);

  // Clear the event once its animation is done so it can re-fire cleanly.
  useEffect(() => {
    if (!event) return;
    const t = window.setTimeout(() => {
      setEvent((cur) => (cur && cur.id === event.id ? null : cur));
    }, FX_LIFETIME_MS + 200);
    return () => window.clearTimeout(t);
  }, [event]);

  // Add / remove the shake class on the board wrap.
  useEffect(() => {
    if (!event) return;
    const el = boardWrapRef.current;
    if (!el) return;
    const cls =
      event.perfect || event.lines >= 4
        ? 'board-shake board-shake-strong'
        : event.lines >= 3
          ? 'board-shake'
          : null;
    if (!cls) return;
    for (const c of cls.split(' ')) el.classList.add(c);
    const t = window.setTimeout(() => {
      for (const c of cls.split(' ')) el.classList.remove(c);
    }, SHAKE_LIFETIME_MS);
    return () => {
      window.clearTimeout(t);
      for (const c of cls.split(' ')) el.classList.remove(c);
    };
  }, [event, boardWrapRef]);

  const confettiPieces = useMemo(() => {
    if (!event) return [] as ConfettiPiece[];
    const heavy = event.perfect || event.lines >= 4;
    const count = event.perfect ? 40 : heavy ? 28 : event.lines >= 3 ? 14 : 0;
    if (count === 0) return [] as ConfettiPiece[];
    return buildConfetti(count, event.perfect);
  }, [event]);

  if (!event) return null;

  const { lines, perfect } = event;
  const banner = perfect
    ? 'perfect!'
    : lines >= 4
      ? 'quad!'
      : lines >= 3
        ? 'triple!'
        : null;
  const intensity = perfect ? 'perfect' : lines >= 4 ? 'quad' : lines >= 3 ? 'triple' : 'soft';

  return (
    <div className="clear-fx" aria-hidden="true" key={event.id}>
      <div className={`clear-fx-flash clear-fx-flash-${intensity}`} />
      {intensity !== 'soft' && (
        <div className={`clear-fx-shockwave clear-fx-shockwave-${intensity}`} />
      )}
      {banner && (
        <div className={`clear-fx-banner clear-fx-banner-${intensity}`}>
          <span>{banner}</span>
          {perfect && event.combo > 0 && (
            <small>combo ×{comboMultiplier(event.combo).toFixed(2)}</small>
          )}
        </div>
      )}
      {confettiPieces.length > 0 && (
        <div className="clear-fx-confetti">
          {confettiPieces.map((p, i) => (
            <span
              key={i}
              className={`clear-fx-piece clear-fx-piece-${p.color}`}
              style={{
                left: `${p.left}%`,
                ['--fx-x' as string]: `${p.dx}px`,
                ['--fx-y' as string]: `${p.dy}px`,
                ['--fx-rot' as string]: `${p.rot}deg`,
                ['--fx-delay' as string]: `${p.delay}ms`,
                ['--fx-dur' as string]: `${p.dur}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ConfettiColor = 'tomato' | 'mustard' | 'olive' | 'sky' | 'plum' | 'cream';
type ConfettiPiece = {
  left: number;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
  dur: number;
  color: ConfettiColor;
};

const CONFETTI_COLORS: ConfettiColor[] = [
  'tomato',
  'mustard',
  'olive',
  'sky',
  'plum',
  'cream',
];

function buildConfetti(count: number, perfect: boolean): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const spread = perfect ? 360 : 260;
    pieces.push({
      left: 50 + (Math.random() - 0.5) * 16,
      dx: side * (80 + Math.random() * spread),
      dy: -140 - Math.random() * (perfect ? 280 : 180),
      rot: (Math.random() - 0.5) * 720,
      delay: Math.random() * (perfect ? 220 : 140),
      dur: 820 + Math.random() * (perfect ? 480 : 320),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    });
  }
  return pieces;
}
