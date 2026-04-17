'use client';

import Link from 'next/link';
import BrandMark from '../BrandMark';
import RunTimer from './RunTimer';

type Props = {
  mode?: string;
  runId?: string;
  startedAt?: string;
  running?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  onHelp?: () => void;
};

export default function TopBar({
  mode = 'Classic',
  runId = '#001',
  startedAt,
  running = true,
  muted = false,
  onToggleMute,
  onHelp,
}: Props) {
  return (
    <div className="topbar">
      <div className="tb-left">
        <Link href="/" className="brand-lockup">
          <BrandMark size="md" />
          <span className="brand-name" style={{ fontSize: 20 }}>
            tile takedown
          </span>
        </Link>
        <div className="mode-pill">{mode}</div>
      </div>

      <div className="tb-center">
        <span className="rec" />
        {startedAt ? (
          <RunTimer startedAt={startedAt} running={running} />
        ) : (
          <span className="timer">00:00:00</span>
        )}
        <span className="run-id">&middot; run {runId}</span>
      </div>

      <div className="tb-right">
        <button
          className="icon-btn"
          title={muted ? 'Unmute' : 'Mute'}
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={onToggleMute}
        >
          {muted ? '/' : '\u266A'}
        </button>
        <button
          className="icon-btn"
          title="Help"
          aria-label="Help"
          onClick={onHelp}
        >
          ?
        </button>
        <Link className="icon-btn" href="/settings" title="Settings" aria-label="Settings">
          &equiv;
        </Link>
      </div>
    </div>
  );
}
