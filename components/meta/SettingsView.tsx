'use client';

import { useEffect } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/stores/useSettingsStore';
import { playSfx } from '@/lib/audio/sfx';
import type { PieceSet, Theme } from '@/lib/types';

const THEMES: { id: Theme; label: string; desc: string }[] = [
  { id: 'paper', label: 'Paper', desc: 'Warm, default.' },
  { id: 'linen', label: 'Linen', desc: 'Soft & bright.' },
  { id: 'noir', label: 'Noir', desc: 'Paper-ink inverted.' },
  { id: 'high_contrast', label: 'High contrast', desc: 'Accessible, bolder lines.' },
];

const PIECE_SETS: { id: PieceSet; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'The full default mix.' },
  { id: 'tetro_only', label: 'Tetro-only', desc: 'Only 4-cell tetrominoes.' },
  { id: 'pentomino_chaos', label: 'Pentomino chaos', desc: 'Weighted toward 5-cell pieces.' },
  { id: 'small_only', label: 'Small only', desc: '1–3 cell pieces only.' },
];

export default function SettingsView() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const setV = useSettingsStore((s) => s.set);
  const reset = useSettingsStore((s) => s.reset);
  const theme = useSettingsStore((s) => s.theme);
  const pieceSet = useSettingsStore((s) => s.pieceSet);
  const rotation = useSettingsStore((s) => s.rotation);
  const nextTrayPreview = useSettingsStore((s) => s.nextTrayPreview);
  const tapToSelect = useSettingsStore((s) => s.tapToSelect);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const haptics = useSettingsStore((s) => s.haptics);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <Nav active="settings" />
      <main className="meta-stage">
        <header className="meta-header">
          <div className="eyebrow">meta</div>
          <h1 className="meta-title">settings</h1>
          <p className="meta-sub">tune your run. changes apply instantly.</p>
        </header>

        <section className="meta-section">
          <div className="eyebrow">theme</div>
          <div className="opt-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`opt-card ${theme === t.id ? 'on' : ''}`}
                onClick={() => setV('theme', t.id)}
              >
                <ThemeSwatch theme={t.id} />
                <div className="opt-label">{t.label}</div>
                <div className="opt-desc">{t.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="meta-section">
          <div className="eyebrow">piece set</div>
          <div className="opt-grid">
            {PIECE_SETS.map((p) => (
              <button
                key={p.id}
                className={`opt-card ${pieceSet === p.id ? 'on' : ''}`}
                onClick={() => setV('pieceSet', p.id)}
              >
                <div className="opt-label">{p.label}</div>
                <div className="opt-desc">{p.desc}</div>
              </button>
            ))}
          </div>
          <div className="meta-hint">changes take effect on the next new run.</div>
        </section>

        <section className="meta-section">
          <div className="eyebrow">gameplay</div>
          <div className="toggle-list">
            <Toggle
              label="Rotation"
              desc="Enable R to rotate the selected piece."
              on={rotation}
              onChange={(v) => setV('rotation', v)}
            />
            <Toggle
              label="Next tray preview"
              desc="Show the upcoming tray on the right."
              on={nextTrayPreview}
              onChange={(v) => setV('nextTrayPreview', v)}
            />
            <Toggle
              label="Tap-to-select"
              desc="Tap a tray piece, then tap the board to place."
              on={tapToSelect}
              onChange={(v) => setV('tapToSelect', v)}
            />
            <Toggle
              label="Haptics"
              desc="Vibration feedback on supported devices."
              on={haptics}
              onChange={(v) => setV('haptics', v)}
            />
          </div>
        </section>

        <section className="meta-section">
          <div className="eyebrow">sound</div>
          <div className="slider-row">
            <label htmlFor="sfx">SFX volume</label>
            <input
              id="sfx"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVolume}
              onChange={(e) => setV('sfxVolume', Number(e.target.value))}
              onPointerUp={() => playSfx('pickup', true, sfxVolume)}
            />
            <span className="slider-value">{Math.round(sfxVolume * 100)}%</span>
          </div>
        </section>

        <section className="meta-section danger-zone">
          <div className="eyebrow">reset</div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (
                typeof window !== 'undefined' &&
                window.confirm('Reset all settings to defaults?')
              ) {
                reset();
              }
            }}
          >
            Reset to defaults
          </button>
        </section>

        {!hydrated && <div className="sb-loading">loading…</div>}
      </main>
      <Footer />
    </>
  );
}

function Toggle({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`tgl ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      type="button"
      aria-pressed={on}
    >
      <div className="tgl-body">
        <div className="tgl-label">{label}</div>
        <div className="tgl-desc">{desc}</div>
      </div>
      <span className="tgl-switch" aria-hidden>
        <span className="tgl-dot" />
      </span>
    </button>
  );
}

function ThemeSwatch({ theme }: { theme: Theme }) {
  const vars: Record<Theme, React.CSSProperties> = {
    paper: { background: '#f2e7d3', border: '2px solid #1c1714' },
    linen: { background: '#f8eed9', border: '2px solid #1c1714' },
    noir: { background: '#1c1714', border: '2px solid #f2e7d3' },
    high_contrast: { background: '#ffffff', border: '3px solid #000000' },
  };
  return <div className="theme-swatch" style={vars[theme]} />;
}
