'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { useStatsStore } from '@/stores/useStatsStore';
import { useLevelsStore } from '@/stores/useLevelsStore';
import { ACHIEVEMENTS, type AchievementDef } from '@/lib/achievements/definitions';
import { comboMultiplier } from '@/lib/engine/scoring';
import { LEVELS } from '@/lib/levels/catalog';
import type { RunSummary } from '@/lib/types';

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

type Props = {
  focus?: 'stats' | 'achievements';
};

type RunFilter = 'all' | 'classic' | 'gimmicks';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateKeyFromISO(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? dateKey(new Date()) : dateKey(d);
}

function activityFromRuns(runs: ReadonlyArray<RunSummary>): Record<string, number> {
  return runs.reduce<Record<string, number>>((acc, run) => {
    const key = dateKeyFromISO(run.endedAt || run.startedAt);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function recentDays(playDates: Record<string, number>, count: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (count - 1 - i));
    const key = dateKey(d);
    return { key, count: playDates[key] ?? 0, label: d.toLocaleDateString() };
  });
}

function scoreBuckets(runs: ReadonlyArray<RunSummary>) {
  const scores = runs.map((r) => r.score).filter((score) => score > 0);
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const size = Math.max(1, Math.ceil(max / 10));
  const buckets = Array.from({ length: 10 }, (_, i) => {
    const start = i * size;
    const end = i === 9 ? max : (i + 1) * size - 1;
    return { label: `${start.toLocaleString()}-${end.toLocaleString()}`, count: 0 };
  });
  for (const score of scores) {
    const idx = Math.min(9, Math.floor(score / size));
    buckets[idx].count += 1;
  }
  return buckets;
}

function achievementGroup(id: string): string {
  if (
    id.includes('GIMMICKS') ||
    id.includes('POWER') ||
    id.includes('OBSTACLE') ||
    id === 'TOOLED_UP' ||
    id === 'CLUTCH_SAVE'
  ) {
    return 'Gimmicks';
  }
  if (id.includes('STAR') || id === 'PERFECTIONIST') return 'Levels';
  if (id.includes('SANDBOX') || id === 'SAVER') return 'Sandbox';
  if (
    id.includes('DAILY') ||
    id === 'NIGHT_OWL' ||
    id === 'CENTURION' ||
    id.includes('RUNS')
  ) {
    return 'Habits';
  }
  if (id.includes('PLACE') || id.includes('CLEARS') || id.includes('PERFECT')) return 'Lifetime';
  return 'Classic';
}

export default function StatsView({ focus = 'stats' }: Props) {
  const [runFilter, setRunFilter] = useState<RunFilter>('all');
  const hydrated = useStatsStore((s) => s.hydrated);
  const hydrate = useStatsStore((s) => s.hydrate);
  const stats = useStatsStore((s) => s.stats);
  const runs = useStatsStore((s) => s.runs);
  const streak = useStatsStore((s) => s.streak);
  const achievements = useStatsStore((s) => s.achievements);
  const resetAll = useStatsStore((s) => s.resetAll);
  const hydrateLevels = useLevelsStore((s) => s.hydrate);
  const levelProgress = useLevelsStore((s) => s.progress);

  useEffect(() => {
    hydrate();
    hydrateLevels();
  }, [hydrate, hydrateLevels]);

  const totalClears =
    stats.clears.single +
    stats.clears.double +
    stats.clears.triple +
    stats.clears.quad;
  const avg = stats.gamesPlayed
    ? Math.round(stats.totalScore / stats.gamesPlayed)
    : 0;
  const classicRecord = stats.modeRecords?.classic;
  const gimmicksRecord = stats.modeRecords?.gimmicks;
  const playDates =
    stats.playDates && Object.keys(stats.playDates).length > 0
      ? stats.playDates
      : activityFromRuns(runs);
  const heatmapDays = useMemo(() => recentDays(playDates, 90), [playDates]);
  const buckets = useMemo(() => scoreBuckets(runs), [runs]);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));
  const filteredRuns =
    runFilter === 'all'
      ? runs
      : runs.filter((r) => (r.mode ?? 'classic') === runFilter);
  const levelTotals = useMemo(() => {
    const records = Object.values(levelProgress);
    return {
      completed: records.filter((r) => r.stars > 0).length,
      threeStarred: records.filter((r) => r.stars === 3).length,
      stars: records.reduce((sum, r) => sum + r.stars, 0),
    };
  }, [levelProgress]);

  const unlockedCount = Object.keys(achievements).length;
  const achTotal = ACHIEVEMENTS.length;
  const achPct = Math.round((unlockedCount / achTotal) * 100);
  const groupedAchievements = useMemo(() => {
    return ACHIEVEMENTS.reduce<Record<string, AchievementDef[]>>((acc, achievement) => {
      const group = achievementGroup(achievement.id);
      acc[group] = [...(acc[group] ?? []), achievement];
      return acc;
    }, {});
  }, []);

  return (
    <>
      <Nav active="stats" />
      <main className="meta-stage">
        <header className="meta-header">
          <div className="eyebrow">meta</div>
          <h1 className="meta-title">{focus === 'achievements' ? 'achievements' : 'stats'}</h1>
          <p className="meta-sub">
            {focus === 'achievements'
              ? 'badges, bragging rights, and tiny paper trophies.'
              : 'your lifetime play, at a glance.'}
          </p>
        </header>

        <section className="stats-grid">
          <StatCard label="Games" value={stats.gamesPlayed} />
          <StatCard label="High score" value={stats.highScore.toLocaleString()} accent="tomato" />
          <StatCard
            label="Classic PB"
            value={(classicRecord?.highScore ?? 0).toLocaleString()}
            sub={classicRecord ? `${classicRecord.gamesPlayed} runs` : 'no runs yet'}
          />
          <StatCard
            label="Gimmicks PB"
            value={(gimmicksRecord?.highScore ?? 0).toLocaleString()}
            sub={gimmicksRecord ? `${gimmicksRecord.gamesPlayed} runs` : 'no runs yet'}
          />
          <StatCard
            label="Levels cleared"
            value={`${levelTotals.completed} / ${LEVELS.length}`}
            sub={`${levelTotals.threeStarred} three-star`}
          />
          <StatCard
            label="Level stars"
            value={`${levelTotals.stars} / ${LEVELS.length * 3}`}
          />
          <StatCard label="Total score" value={stats.totalScore.toLocaleString()} />
          <StatCard label="Avg per run" value={avg.toLocaleString()} />
          <StatCard label="Placements" value={stats.totalPlacements.toLocaleString()} />
          <StatCard label="Line clears" value={totalClears.toLocaleString()} />
          <StatCard label="Longest combo" value={`×${comboMultiplier(stats.longestCombo).toFixed(2)}`} />
          <StatCard label="Perfect clears" value={stats.perfectClears} accent="mustard" />
          <StatCard label="Time played" value={formatDuration(stats.msPlayed)} />
          <StatCard
            label="Daily streak"
            value={`${streak.current}`}
            sub={streak.longest ? `longest ${streak.longest}` : 'start today'}
          />
        </section>

        <section className="meta-section">
          <div className="eyebrow">clears breakdown</div>
          <div className="clears-grid">
            <ClearBar kind="single" label="Single" value={stats.clears.single} />
            <ClearBar kind="double" label="Double" value={stats.clears.double} />
            <ClearBar kind="triple" label="Triple" value={stats.clears.triple} />
            <ClearBar kind="quad" label="Quad+" value={stats.clears.quad} />
          </div>
        </section>

        <section className="meta-section">
          <div className="meta-section-head">
            <div>
              <div className="eyebrow">90-day activity</div>
              <p className="meta-hint">Each square is a local day with at least one finished run.</p>
            </div>
            <span className="meta-section-meta">
              {heatmapDays.reduce((sum, d) => sum + (d.count > 0 ? 1 : 0), 0)} active days
            </span>
          </div>
          <div className="activity-grid" aria-label="90-day activity heatmap">
            {heatmapDays.map((day) => (
              <span
                key={day.key}
                className={`activity-cell level-${Math.min(4, day.count)}`}
                title={`${day.label}: ${day.count} run${day.count === 1 ? '' : 's'}`}
                aria-label={`${day.label}: ${day.count} run${day.count === 1 ? '' : 's'}`}
              />
            ))}
          </div>
        </section>

        <section className="meta-section">
          <div className="meta-section-head">
            <div>
              <div className="eyebrow">score histogram</div>
              <p className="meta-hint">Your saved run scores, bucketed into ten ranges.</p>
            </div>
          </div>
          {buckets.length === 0 ? (
            <div className="meta-empty">Finish a run and the score shape appears here.</div>
          ) : (
            <div className="score-histogram">
              {buckets.map((bucket) => (
                <div key={bucket.label} className="hist-bar-wrap">
                  <div
                    className="hist-bar"
                    style={{ height: `${Math.max(8, (bucket.count / maxBucket) * 100)}%` }}
                    title={`${bucket.label}: ${bucket.count}`}
                  />
                  <div className="hist-count">{bucket.count}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="meta-section">
          <div className="meta-section-head">
            <div className="eyebrow">achievements</div>
            <span className="meta-section-meta">
              {unlockedCount} of {achTotal} · {achPct}%
            </span>
          </div>
          <div className="ach-progress">
            <div className="ach-progress-bar" style={{ width: `${achPct}%` }} />
          </div>
          <div className="ach-groups">
            {Object.entries(groupedAchievements).map(([group, items]) => (
              <div key={group} className="ach-group">
                <div className="ach-group-title">{group}</div>
                <div className="ach-grid">
                  {items.map((a) => {
                    const st = achievements[a.id];
                    const unlocked = !!st;
                    return (
                      <div
                        key={a.id}
                        className={`ach-card ${unlocked ? 'unlocked' : 'locked'}`}
                      >
                        <div className="ach-icon">
                          <span>{unlocked ? (a.icon ?? '◆') : '?'}</span>
                        </div>
                        <div className="ach-body">
                          <div className="ach-name">{unlocked ? a.name : '???'}</div>
                          <div className="ach-desc">
                            {unlocked ? a.desc : 'A tiny paper trophy is hiding here.'}
                          </div>
                          {unlocked && st && (
                            <div className="ach-when">
                              unlocked {new Date(st.unlockedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="meta-section">
          <div className="meta-section-head">
            <div>
              <div className="eyebrow">recent runs</div>
              <p className="meta-hint">Stored locally, up to the last 50 Classic and Gimmicks runs.</p>
            </div>
            <div className="run-filters" aria-label="Run mode filter">
              {(['all', 'classic', 'gimmicks'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`mini-filter ${runFilter === filter ? 'on' : ''}`}
                  onClick={() => setRunFilter(filter)}
                  aria-pressed={runFilter === filter}
                >
                  {filter}
                </button>
              ))}
            </div>
            <Link href="/play" className="btn btn-primary">
              Play a run
            </Link>
          </div>
          {filteredRuns.length === 0 ? (
            <div className="meta-empty">
              Finish a matching run and it will show up here.
            </div>
          ) : (
            <div className="runs-list">
              {filteredRuns.slice(0, 50).map((r) => {
                const dur = new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime();
                return (
                  <div key={r.id} className="run-row">
                    <div className="run-date">
                      {new Date(r.startedAt).toLocaleDateString()}
                      <span className="run-mode">{r.mode ?? 'classic'}</span>
                    </div>
                    <div className="run-score">
                      <strong>{r.score.toLocaleString()}</strong>
                      <span>pts</span>
                    </div>
                    <div className="run-meta">
                      <span>{r.placements} placements</span>
                      <span>·</span>
                      <span>{r.clears.single + r.clears.double + r.clears.triple + r.clears.quad} clears</span>
                      <span>·</span>
                      <span>{formatDuration(dur)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="meta-section danger-zone">
          <div className="meta-section-head">
            <div>
              <div className="eyebrow">danger zone</div>
              <p className="meta-hint">
                Wipes stats, runs, and unlocked achievements. Cannot be undone.
              </p>
            </div>
            <button
              className="btn btn-ghost danger-btn"
              onClick={() => {
                if (
                  typeof window !== 'undefined' &&
                  window.confirm('Erase ALL stats, achievements, and run history? This cannot be undone.')
                ) {
                  resetAll();
                }
              }}
            >
              Reset all stats
            </button>
          </div>
        </section>

        {!hydrated && <div className="sb-loading">loading…</div>}
      </main>
      <Footer />
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'tomato' | 'mustard';
}) {
  return (
    <div className={`stat-card ${accent ? `accent-${accent}` : ''}`}>
      <div className="eyebrow">{label}</div>
      <div className="stat-big">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function ClearBar({ kind, label, value }: { kind: string; label: string; value: number }) {
  return (
    <div className="clear-bar">
      <div className="cb-head">
        <span className={`cb-dot ${kind}`} />
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
