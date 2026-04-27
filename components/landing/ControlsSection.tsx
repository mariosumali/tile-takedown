'use client';

import { useTouchLike } from '@/lib/useTouchLike';

type Control = { key: string; label: string };

const touchControls: Control[] = [
  { key: 'Drag', label: 'Move a piece to the board' },
  { key: 'Ghost', label: 'Green fits, red bounces' },
  { key: 'Tap mode', label: 'Optional piece, then cell placement' },
  { key: 'No moves', label: 'Classic ends when the tray locks' },
  { key: 'Powerups', label: 'Gimmicks tools target board cells' },
  { key: 'Settings', label: 'Tune tap, sound, haptics, and chrome' },
];

const desktopControls: Control[] = [
  { key: 'Drag', label: 'Pick up piece' },
  { key: 'Drop', label: 'Place on grid' },
  { key: 'R', label: 'Rotate 90° when enabled' },
  { key: 'Z', label: 'Undo in Levels/Gimmicks' },
  { key: '1/2/3', label: 'Select slot' },
  { key: 'Esc', label: 'Cancel drag or powerup' },
  { key: 'M', label: 'Mute sound' },
  { key: '?', label: 'Show mode help' },
];

export default function ControlsSection() {
  const isTouchLike = useTouchLike();
  const controls = isTouchLike ? touchControls : desktopControls;

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            How to play
          </div>
          <h2>Controls.</h2>
          <p className="lede">
            {isTouchLike
              ? 'Touch gets the short version: drag, preview, drop. Tap-to-select is in settings if you want a calmer rhythm.'
              : 'Keyboard is optional, but handy. The help button changes per mode when the rules do.'}
          </p>
        </div>
      </div>

      <div className="controls-panel">
        <div className="controls-grid">
          {controls.map((c) => (
            <div key={c.key} className="control-row">
              <span className="kbd">{c.key}</span>
              <span className="control-label">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
