'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import DemoBoard from './DemoBoard';
import { useStatsStore } from '@/stores/useStatsStore';

function formatRelative(iso: string): string {
  if (!iso) return '—';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Hero() {
  const hydrate = useStatsStore((s) => s.hydrate);
  const hydrated = useStatsStore((s) => s.hydrated);
  const stats = useStatsStore((s) => s.stats);
  const runs = useStatsStore((s) => s.runs);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const lastRun = useMemo(() => runs[0], [runs]);

  const highScore = hydrated ? stats.highScore.toLocaleString() : '—';
  const gamesPlayed = hydrated ? stats.gamesPlayed : 0;

  return (
    <main className="hero">
      <div>
        <div className="eyebrow" style={{ marginBottom: 20 }}>
          A cozy block puzzle
        </div>
        <h1>
          <span className="display">Place.</span>
          <br />
          <span className="display">Clear.</span>
          <br />
          <span className="display repeat">Repeat.</span>
        </h1>
        <p className="lede">
          A handmade take on the block placement puzzle. Chunky tiles, warm
          paper, and satisfying combo chains.
        </p>

        <div className="cta-row">
          <Link href="/play" className="btn btn-primary">
            Start Classic
            <span className="btn-arrow" aria-hidden="true" />
          </Link>
          <Link href="/sandbox" className="btn btn-secondary">
            Open Sandbox
            <span className="btn-arrow" aria-hidden="true" />
          </Link>
        </div>

        <div className="hero-meta">
          <div className="meta-card">
            <div className="eyebrow">high score</div>
            <div className="big">{highScore}</div>
            <div className="sub">
              {gamesPlayed > 0 ? `${gamesPlayed} runs played` : 'no runs yet'}
            </div>
          </div>
          <div className="meta-card">
            <div className="eyebrow">last played</div>
            <div className="big">
              {lastRun ? formatRelative(lastRun.endedAt) : '—'}
            </div>
            <div className="sub">
              {lastRun
                ? `${lastRun.score.toLocaleString()} · ${lastRun.comboPeak}-combo`
                : 'start your first run'}
            </div>
          </div>
        </div>
      </div>

      <DemoBoard />
    </main>
  );
}
