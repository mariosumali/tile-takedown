'use client';

import { useEffect, useRef, useState } from 'react';
import type { BoardState } from '@/lib/types';
import { comboTier } from '@/lib/engine/scoring';

/**
 * Ambient + event-driven VFX layered above the board when the combo climbs
 * into high tiers. Independent of `ClearEffects` but mounted next to it.
 *
 *  - hot tier     (combo >= 4): soft warm vignette around the viewport
 *  - fire tier    (combo >= 6): flickering flame frame along the viewport edges
 *  - inferno tier (combo >= 8): stronger fire frame + lightning flashes on each
 *    subsequent clear and a small screenshake wobble.
 */
type Props = {
  /** Current combo count. Drives the ambient tier frame. */
  combo: number;
  /**
   * Transitions from null to a populated board exactly once per clear batch.
   * Used as the trigger edge for per-clear lightning flashes at inferno tier.
   */
  clearingBoard: BoardState | null;
};

const LIGHTNING_LIFETIME_MS = 520;

export default function ComboFx({ combo, clearingBoard }: Props) {
  const tier = comboTier(combo);
  const [lightningId, setLightningId] = useState(0);
  const prevClearingRef = useRef<BoardState | null>(null);

  useEffect(() => {
    const prev = prevClearingRef.current;
    prevClearingRef.current = clearingBoard;
    if (prev || !clearingBoard) return;
    if (tier !== 'inferno') return;
    setLightningId((n) => n + 1);
  }, [clearingBoard, tier]);

  useEffect(() => {
    if (lightningId === 0) return;
    const t = window.setTimeout(() => {
      setLightningId((cur) => (cur === lightningId ? 0 : cur));
    }, LIGHTNING_LIFETIME_MS + 80);
    return () => window.clearTimeout(t);
  }, [lightningId]);

  if (tier !== 'hot' && tier !== 'fire' && tier !== 'inferno') return null;

  return (
    <div className={`combo-fx combo-fx-${tier}`} aria-hidden="true">
      <div className="combo-fx-frame" />
      {tier === 'inferno' && lightningId > 0 && (
        <div key={lightningId} className="combo-fx-lightning">
          <svg viewBox="0 0 100 400" preserveAspectRatio="none">
            <polyline
              points="50,0 42,120 58,180 38,260 60,320 46,400"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
