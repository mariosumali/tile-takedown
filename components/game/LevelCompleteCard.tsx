'use client';

import Link from 'next/link';
import type { LevelBonusId, LevelDef, LevelStars } from '@/lib/types';

type Props = {
  level: LevelDef;
  score: number;
  stars: LevelStars;
  badges?: ReadonlyArray<LevelBonusId>;
  onRetry: () => void;
};

const BADGE_COPY: Record<LevelBonusId, { label: string; desc: string }> = {
  under_par: { label: 'Under par', desc: 'Finished in par moves or fewer.' },
  no_undo: { label: 'No undo', desc: 'Clean run. No take-backs.' },
  perfect_clear: { label: 'Perfect clear', desc: 'Emptied the board during the run.' },
  combo_fire: { label: 'Fire combo', desc: 'Reached the fire combo tier.' },
};

export default function LevelCompleteCard({
  level,
  score,
  stars,
  badges = [],
  onRetry,
}: Props) {
  const passed = stars >= 1;
  const nextIndex = level.index + 1;
  const nextId = nextIndex <= 100 ? `L${String(nextIndex).padStart(3, '0')}` : null;

  const remainingForNextStar =
    stars === 0
      ? level.starThresholds[0] - score
      : stars === 1
        ? level.starThresholds[1] - score
        : stars === 2
          ? level.starThresholds[2] - score
          : 0;

  return (
    <div className="gameover-overlay" role="dialog" aria-label="Level complete">
      <div className="gameover-card">
        <div className="eyebrow">{passed ? 'level cleared' : 'no more moves'}</div>
        <h2 className="go-title">{passed ? 'Nicely done.' : 'Close — try again.'}</h2>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            margin: '16px 0 4px',
            fontSize: 56,
            letterSpacing: 2,
          }}
          aria-label={`${stars} out of 3 stars`}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                color:
                  i < stars ? 'var(--mustard, #e0aa3e)' : 'var(--ink-20, #0000001a)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {i < stars ? '★' : '☆'}
            </span>
          ))}
        </div>

        <div className="go-score">
          <span className="label">score</span>
          <span className="num">{score.toLocaleString()}</span>
          <span className="delta">of {level.targetScore.toLocaleString()}</span>
        </div>

        <div className="go-stats">
          <div className="go-stat">
            <div className="eyebrow">1★</div>
            <div className="num">{level.starThresholds[0].toLocaleString()}</div>
          </div>
          <div className="go-stat">
            <div className="eyebrow">2★</div>
            <div className="num">{level.starThresholds[1].toLocaleString()}</div>
          </div>
          <div className="go-stat">
            <div className="eyebrow">3★</div>
            <div className="num">{level.starThresholds[2].toLocaleString()}</div>
          </div>
          <div className="go-stat">
            <div className="eyebrow">par moves</div>
            <div className="num">{level.parMoves}</div>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="level-badge-list" aria-label="Bonus badges earned">
            {badges.map((badge) => (
              <div key={badge} className="level-badge-earned">
                <div className="eyebrow">{BADGE_COPY[badge].label}</div>
                <div>{BADGE_COPY[badge].desc}</div>
              </div>
            ))}
          </div>
        )}

        {stars < 3 && remainingForNextStar > 0 && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              textAlign: 'center',
              margin: '16px 0 0',
              opacity: 0.75,
            }}
          >
            {remainingForNextStar.toLocaleString()} more for {stars + 1}★.
          </p>
        )}

        <div className="go-cta">
          <button className="btn btn-primary" onClick={onRetry}>
            {passed ? 'Replay for more stars' : 'Try again'}
            <span className="btn-arrow" aria-hidden="true" />
          </button>
          {passed && nextId ? (
            <Link href={`/levels/${nextId}`} className="btn btn-secondary">
              Next level
            </Link>
          ) : (
            <Link href="/levels" className="btn btn-secondary">
              Back to levels
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
