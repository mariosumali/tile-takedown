'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { useStatsStore } from '@/stores/useStatsStore';
import { ACHIEVEMENTS } from '@/lib/achievements/definitions';
import { comboMultiplier } from '@/lib/engine/scoring';

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

export default function StatsView({ focus = 'stats' }: Props) {
  const hydrated = useStatsStore((s) => s.hydrated);
  const hydrate = useStatsStore((s) => s.hydrate);
  const stats = useStatsStore((s) => s.stats);
  const runs = useStatsStore((s) => s.runs);
  const streak = useStatsStore((s) => s.streak);
  const achievements = useStatsStore((s) => s.achievements);
  const resetAll = useStatsStore((s) => s.resetAll);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

  const unlockedCount = Object.keys(achievements).length;
  const achTotal = ACHIEVEMENTS.length;
  const achPct = Math.round((unlockedCount / achTotal) * 100);

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
            <div className="eyebrow">achievements</div>
            <span className="meta-section-meta">
              {unlockedCount} of {achTotal} · {achPct}%
            </span>
          </div>
          <div className="ach-progress">
            <div className="ach-progress-bar" style={{ width: `${achPct}%` }} />
          </div>
          <div className="ach-grid">
            {ACHIEVEMENTS.map((a) => {
              const st = achievements[a.id];
              const unlocked = !!st;
              return (
                <div
                  key={a.id}
                  className={`ach-card ${unlocked ? 'unlocked' : 'locked'}`}
                >
                  <div className="ach-icon">
                    <span>{a.icon ?? '◆'}</span>
                  </div>
                  <div className="ach-body">
                    <div className="ach-name">{a.name}</div>
                    <div className="ach-desc">{a.desc}</div>
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
        </section>

        <section className="meta-section">
          <div className="meta-section-head">
            <div className="eyebrow">recent runs</div>
            <Link href="/play" className="btn btn-primary">
              Play a run
            </Link>
          </div>
          {runs.length === 0 ? (
            <div className="meta-empty">
              Finish a classic run and it will show up here.
            </div>
          ) : (
            <div className="runs-list">
              {runs.slice(0, 10).map((r) => {
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
