'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { RunState } from '@/lib/types';
import { comboMultiplier, comboTier } from '@/lib/engine/scoring';

type Props = {
  run: RunState;
  highScore: number;
  onPlayAgain: () => void;
  durationMs: number;
};

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export default function GameOverCard({
  run,
  highScore,
  onPlayAgain,
  durationMs,
}: Props) {
  const totalClears =
    run.clears.single + run.clears.double + run.clears.triple + run.clears.quad;
  const delta = run.score - highScore;
  const isBest = run.score > highScore && run.score > 0;
  const deltaText = delta.toLocaleString();
  const peakTier = comboTier(run.comboPeak);
  const peakTierLabel =
    peakTier === 'none' ? null : peakTier.charAt(0).toUpperCase() + peakTier.slice(1);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  async function shareScorecard() {
    const text = [
      'Tile Takedown Classic',
      `Score: ${run.score.toLocaleString()}`,
      `Peak combo: ×${comboMultiplier(run.comboPeak).toFixed(2)}`,
      `Clears: ${totalClears}`,
      `Placements: ${run.placements}`,
      `Duration: ${fmtDuration(durationMs)}`,
      typeof window !== 'undefined' ? window.location.origin : '',
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      await navigator.share({ title: 'Tile Takedown scorecard', text });
      return;
    }
    await navigator.clipboard?.writeText(text);
    setShareFeedback('Scorecard copied.');
  }

  return (
    <div className="gameover-overlay" role="dialog" aria-label="Run complete">
      <div className="gameover-card">
        <div className="eyebrow">run complete</div>
        <h2 className="go-title">Game over</h2>
        <div className="go-score">
          <span className="label">final</span>
          <span className="num">{run.score.toLocaleString()}</span>
          {isBest ? (
            <span className="delta best">new high score</span>
          ) : (
            <span className="delta">{delta >= 0 ? `+${deltaText}` : deltaText}</span>
          )}
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
            <div className="eyebrow">longest combo</div>
            <div className="num">
              &times;{comboMultiplier(run.comboPeak).toFixed(2)}
            </div>
            {peakTierLabel && <div className="go-stat-note">{peakTierLabel}</div>}
          </div>
          <div className="go-stat">
            <div className="eyebrow">duration</div>
            <div className="num">{fmtDuration(durationMs)}</div>
          </div>
        </div>

        <div className="go-cta">
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play again
            <span className="btn-arrow" aria-hidden="true" />
          </button>
          <Link href="/" className="btn btn-secondary">
            Home
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              void shareScorecard();
            }}
          >
            Share score
          </button>
        </div>
        {shareFeedback && <p className="go-share-feedback">{shareFeedback}</p>}
      </div>
    </div>
  );
}
