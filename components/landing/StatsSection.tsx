'use client';

import { useEffect, useMemo } from 'react';
import { useStatsStore } from '@/stores/useStatsStore';

export default function StatsSection() {
  const hydrate = useStatsStore((s) => s.hydrate);
  const hydrated = useStatsStore((s) => s.hydrated);
  const stats = useStatsStore((s) => s.stats);
  const runs = useStatsStore((s) => s.runs);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const totalClears = useMemo(
    () =>
      stats.clears.single + stats.clears.double + stats.clears.triple + stats.clears.quad,
    [stats.clears],
  );

  const weekAgo = Date.now() - 7 * 86400000;
  const weekRuns = runs.filter((r) => new Date(r.endedAt).getTime() >= weekAgo);
  const weekHigh = weekRuns.reduce((m, r) => Math.max(m, r.score), 0);
  const gamesThisWeek = weekRuns.length;

  const singlesPct =
    totalClears > 0 ? Math.round((stats.clears.single / totalClears) * 100) : 0;

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Your numbers
          </div>
          <h2>Everything, at a glance.</h2>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card a">
          <div className="eyebrow">high score</div>
          <div className="big-num">
            {hydrated ? stats.highScore.toLocaleString() : '—'}
          </div>
          <div className="delta">
            {weekHigh > 0 ? `+ ${weekHigh.toLocaleString()} this week` : 'play to see progress'}
          </div>
        </div>
        <div className="stat-card b">
          <div className="eyebrow">games played</div>
          <div className="big-num">{hydrated ? stats.gamesPlayed : 0}</div>
          <div className="delta">
            {gamesThisWeek > 0 ? `+ ${gamesThisWeek} this week` : 'first run awaits'}
          </div>
        </div>
        <div className="stat-card c">
          <div className="eyebrow">longest combo</div>
          <div className="big-num">&times;{hydrated ? stats.longestCombo : 0}</div>
          <div className="delta">
            {stats.longestCombo > 0 ? 'personal best' : 'chain clears for bonus'}
          </div>
        </div>
        <div className="stat-card">
          <div className="eyebrow">total clears</div>
          <div className="big-num">{totalClears.toLocaleString()}</div>
          <div className="delta">
            {totalClears > 0
              ? `${singlesPct}% singles, ${100 - singlesPct}% doubles+`
              : 'one clean sweep gets you started'}
          </div>
        </div>
      </div>
    </section>
  );
}
