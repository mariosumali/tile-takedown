'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { LEVELS } from '@/lib/levels/catalog';
import { TIER_SPECS } from '@/lib/levels/balance';
import type { LevelBonusId, LevelDef, LevelStars, LevelTier } from '@/lib/types';
import { useLevelsStore } from '@/stores/useLevelsStore';

const TIERS: LevelTier[] = [1, 2, 3, 4, 5];

const BADGE_LABELS: Record<LevelBonusId, string> = {
  under_par: 'par',
  no_undo: 'no undo',
  perfect_clear: 'perfect',
  combo_fire: 'combo',
};

function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dailyLevel(): LevelDef {
  const start = new Date(2026, 0, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return LEVELS[((day % LEVELS.length) + LEVELS.length) % LEVELS.length];
}

async function shareDaily(level: LevelDef, bestScore: number, stars: LevelStars) {
  const text = [
    `Tile Takedown daily level ${localDateKey()}`,
    `${level.id}: ${level.name}`,
    bestScore > 0 ? `Best: ${bestScore.toLocaleString()} (${stars}/3 stars)` : 'No local best yet.',
    `${window.location.origin}/levels/${level.id}`,
  ].join('\n');

  if (navigator.share) {
    await navigator.share({ title: 'Tile Takedown daily level', text });
    return;
  }
  await navigator.clipboard?.writeText(text);
}

export default function LevelsIndex() {
  const hydrate = useLevelsStore((s) => s.hydrate);
  const hydrated = useLevelsStore((s) => s.hydrated);
  const progress = useLevelsStore((s) => s.progress);
  const isUnlocked = useLevelsStore((s) => s.isUnlocked);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const totalStars = Object.values(progress).reduce((acc, r) => acc + r.stars, 0);
  const totalLevels = LEVELS.length;
  const completed = Object.values(progress).filter((r) => r.stars > 0).length;
  const todayLevel = dailyLevel();
  const todayRecord = progress[todayLevel.id];

  return (
    <>
      <Nav />
      <main className="landing-main" style={{ paddingTop: 40 }}>
        <section
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '24px 28px 16px',
          }}
        >
          <div className="eyebrow">levels mode</div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(44px, 7vw, 72px)',
              lineHeight: 0.95,
              margin: '8px 0 12px',
            }}
          >
            One hundred handcrafted runs.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              maxWidth: 640,
              fontSize: 18,
              lineHeight: 1.5,
              opacity: 0.8,
            }}
          >
            Five tiers, twenty levels each. Shaped boards, curated pieces, and a
            score target you have to hit to unlock the next run. Three stars if
            you&rsquo;re feeling ambitious.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 24,
              flexWrap: 'wrap',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Stat label="cleared" value={`${completed} / ${totalLevels}`} />
            <Stat label="stars" value={`${totalStars} / ${totalLevels * 3}`} />
            <Stat
              label="last tier"
              value={
                TIER_SPECS[highestTier(progress, LEVELS) as LevelTier]?.label ??
                'Onboarding'
              }
            />
          </div>

          <div className="daily-level-card">
            <div>
              <div className="eyebrow">daily featured · {localDateKey()}</div>
              <h2>{todayLevel.name}</h2>
              <p>
                {todayLevel.id} · tier {todayLevel.tier} · target{' '}
                {todayLevel.targetScore.toLocaleString()} · par {todayLevel.parMoves}
              </p>
              <div className="daily-level-stars" aria-label={`${todayRecord?.stars ?? 0} daily stars`}>
                {'★'.repeat(todayRecord?.stars ?? 0)}
                {'☆'.repeat(3 - (todayRecord?.stars ?? 0))}
                <span>
                  {todayRecord?.bestScore
                    ? ` best ${todayRecord.bestScore.toLocaleString()}`
                    : ' no local best yet'}
                </span>
              </div>
            </div>
            <div className="daily-level-actions">
              <Link href={`/levels/${todayLevel.id}`} className="btn btn-primary">
                Play daily
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  void shareDaily(
                    todayLevel,
                    todayRecord?.bestScore ?? 0,
                    todayRecord?.stars ?? 0,
                  );
                }}
              >
                Share
              </button>
            </div>
          </div>
        </section>

        {TIERS.map((tier) => {
          const levels = LEVELS.filter((l) => l.tier === tier);
          const spec = TIER_SPECS[tier];
          return (
            <section
              key={tier}
              style={{
                maxWidth: 1080,
                margin: '0 auto',
                padding: '32px 28px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div className="eyebrow">tier {tier}</div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(32px, 5vw, 48px)',
                      lineHeight: 1,
                      margin: '6px 0 4px',
                    }}
                  >
                    {spec.label}
                  </h2>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      opacity: 0.75,
                      margin: 0,
                      maxWidth: 540,
                    }}
                  >
                    {spec.blurb}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 12,
                }}
              >
                {levels.map((level) => (
                  <LevelCell
                    key={level.id}
                    level={level}
                    stars={progress[level.id]?.stars ?? 0}
                    bestScore={progress[level.id]?.bestScore ?? 0}
                    badges={progress[level.id]?.badges ?? []}
                    unlocked={hydrated ? isUnlocked(level.id) : level.index === 1}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          lineHeight: 1,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function LevelCell({
  level,
  stars,
  bestScore,
  badges,
  unlocked,
}: {
  level: LevelDef;
  stars: LevelStars;
  bestScore: number;
  badges: ReadonlyArray<LevelBonusId>;
  unlocked: boolean;
}) {
  const cls = `mode-card ${unlocked ? '' : 'locked'}`;
  const body = (
    <>
      <div
        className="eyebrow"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{level.id}</span>
        <span aria-label={`${stars} stars`}>
          {'★'.repeat(stars)}
          {'☆'.repeat(3 - stars)}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          lineHeight: 1.1,
          marginTop: 6,
        }}
      >
        {unlocked ? level.name : 'Locked'}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          opacity: 0.7,
          marginTop: 6,
        }}
      >
        target {level.targetScore.toLocaleString()}
      </div>
      {bestScore > 0 && (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            opacity: 0.55,
            marginTop: 2,
          }}
        >
          best {bestScore.toLocaleString()}
        </div>
      )}
      {badges.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 8,
          }}
        >
          {badges.slice(0, 3).map((badge) => (
            <span key={badge} className="level-badge-chip">
              {BADGE_LABELS[badge]}
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (!unlocked) {
    return (
      <div
        className={cls}
        style={{
          padding: '12px 14px',
          opacity: 0.4,
          cursor: 'not-allowed',
        }}
        aria-disabled="true"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/levels/${level.id}`}
      className={cls}
      style={{
        padding: '12px 14px',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      {body}
    </Link>
  );
}

function highestTier(
  progress: Record<string, { stars: number }>,
  levels: ReadonlyArray<LevelDef>,
): number {
  let maxTier = 1;
  for (const l of levels) {
    if (progress[l.id]?.stars) maxTier = Math.max(maxTier, l.tier);
  }
  return maxTier;
}
