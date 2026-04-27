'use client';

import { Fragment as ReactFragment, useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { useGameChromeVisibility } from '@/components/game/GameChromeControls';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { playSfx } from '@/lib/audio/sfx';
import { CHEATS, isKnownCheat, normalizeCheatInput } from '@/lib/cheats';
import { downloadSaveBundle, importSaveBundle } from '@/lib/storage/saveData';
import type { PieceSet, Theme, WorldTheme } from '@/lib/types';

const THEMES: { id: Theme; label: string; desc: string }[] = [
  { id: 'paper', label: 'Paper', desc: 'Warm, default.' },
  { id: 'linen', label: 'Linen', desc: 'Soft & bright.' },
  { id: 'noir', label: 'Noir', desc: 'Paper-ink inverted.' },
  { id: 'high_contrast', label: 'High contrast', desc: 'Accessible, bolder lines.' },
];

type WorldThemeMeta = {
  id: WorldTheme;
  label: string;
  flavor: string;
  group: 'Standard' | 'Naturals' | 'Atmospheric' | 'Playful';
  /** Preview swatch colors — hand-picked to match the CSS theme tokens. */
  swatch: {
    backdrop: string;
    board: string;
    tiles: [string, string, string];
    border: string;
  };
};

const WORLD_THEMES: WorldThemeMeta[] = [
  {
    id: 'none',
    label: 'None (classic)',
    flavor: 'The default look.',
    group: 'Standard',
    swatch: {
      backdrop: '#f4ecd8',
      board: '#dfcb9a',
      tiles: ['#e85a4f', '#e9b949', '#6e94b8'],
      border: '#1c1714',
    },
  },
  {
    id: 'jungle',
    label: 'Jungle',
    flavor: 'Stone blocks. Vines in the cracks.',
    group: 'Naturals',
    swatch: {
      backdrop: 'linear-gradient(180deg, #3f5a2f, #1e2f18)',
      board: '#2f4a2a',
      tiles: ['#a45e45', '#b69a4a', '#5d7d4c'],
      border: '#0e1a0d',
    },
  },
  {
    id: 'volcano',
    label: 'Volcano',
    flavor: 'Blocky crust. Lava pockets.',
    group: 'Naturals',
    swatch: {
      backdrop: 'linear-gradient(180deg, #2a110b, #3a1a0e)',
      board: '#1a0d0b',
      tiles: ['#ff5a22', '#ffb12c', '#d44735'],
      border: '#ff6a28',
    },
  },
  {
    id: 'abyssal',
    label: 'Abyssal',
    flavor: 'Porous reef. Chunky coral.',
    group: 'Naturals',
    swatch: {
      backdrop: 'linear-gradient(180deg, #1c5c74, #061b36)',
      board: '#0a1b30',
      tiles: ['#f06f7f', '#46bfd5', '#49c897'],
      border: '#47cfe8',
    },
  },
  {
    id: 'sakura',
    label: 'Sakura Garden',
    flavor: 'Blossom, bamboo, tea gold.',
    group: 'Naturals',
    swatch: {
      backdrop: 'linear-gradient(180deg, #fdeef0, #f0cdd0)',
      board: '#c48b6a',
      tiles: ['#c73a4a', '#c25a8d', '#5b9a5e'],
      border: '#5a3a28',
    },
  },
  {
    id: 'arctic',
    label: 'Arctic',
    flavor: 'Translucent ice. Trapped bubbles.',
    group: 'Naturals',
    swatch: {
      backdrop: 'linear-gradient(180deg, #b4c9d8, #8fadc0)',
      board: '#2a4560',
      tiles: ['#a7dfd0', '#d8d3f0', '#9bd6f0'],
      border: '#142538',
    },
  },
  {
    id: 'desert',
    label: 'Desert',
    flavor: 'Sunbaked walls. Chipped mortar.',
    group: 'Naturals',
    swatch: {
      backdrop: 'linear-gradient(180deg, #fae7c2, #c09770)',
      board: '#a8825a',
      tiles: ['#c76a46', '#d8aa56', '#6ca1a0'],
      border: '#3a251a',
    },
  },
  {
    id: 'cosmic',
    label: 'Cosmic Drift',
    flavor: 'Nebula. Obsidian. Starlight.',
    group: 'Atmospheric',
    swatch: {
      backdrop: 'linear-gradient(180deg, #0a082a, #050316)',
      board: '#060515',
      tiles: ['#ff4a9e', '#4ac9ff', '#a260ff'],
      border: '#2a2660',
    },
  },
  {
    id: 'haunted',
    label: 'Haunted',
    flavor: 'Dark brick, bones, tiny skulls.',
    group: 'Atmospheric',
    swatch: {
      backdrop: 'linear-gradient(180deg, #363646, #0f0f18)',
      board: '#14141c',
      tiles: ['#7a3c3e', '#8a6b3c', '#4d5a6e'],
      border: '#3a3a4a',
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    flavor: 'PCB traces. Diode glow.',
    group: 'Playful',
    swatch: {
      backdrop: 'linear-gradient(180deg, #0a1124, #040610)',
      board: '#050814',
      tiles: ['#ff35bd', '#33e8ff', '#40ff87'],
      border: '#33e8ff',
    },
  },
  {
    id: 'arcade',
    label: 'Arcade',
    flavor: 'Rough pixels. Low-res charm.',
    group: 'Playful',
    swatch: {
      backdrop: 'linear-gradient(180deg, #0a140a, #050a05)',
      board: '#0a1a0a',
      tiles: ['#ff3f73', '#ffd831', '#3eb9ff'],
      border: '#5effa0',
    },
  },
];

const WORLD_THEME_GROUPS: Array<WorldThemeMeta['group']> = [
  'Standard',
  'Naturals',
  'Atmospheric',
  'Playful',
];

const PIECE_SETS: { id: PieceSet; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'Curated tetros, blocks, bars, and bends.' },
  { id: 'tetro_only', label: 'Tetro-only', desc: 'Only 4-cell tetrominoes.' },
  { id: 'crazy', label: 'Crazy', desc: 'The old everything-goes classic mix.' },
  { id: 'small_only', label: 'Small only', desc: '1–3 cell pieces only.' },
];

export default function SettingsView() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const setV = useSettingsStore((s) => s.set);
  const reset = useSettingsStore((s) => s.reset);
  const theme = useSettingsStore((s) => s.theme);
  const worldTheme = useSettingsStore((s) => s.worldTheme);
  const pieceSet = useSettingsStore((s) => s.pieceSet);
  const rotation = useSettingsStore((s) => s.rotation);
  const nextTrayPreview = useSettingsStore((s) => s.nextTrayPreview);
  const tapToSelect = useSettingsStore((s) => s.tapToSelect);
  const instantTrayRefill = useSettingsStore((s) => s.instantTrayRefill);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const haptics = useSettingsStore((s) => s.haptics);
  const { showTrayChrome, showRunStats } = useGameChromeVisibility();
  const cheats = useSettingsStore((s) => s.cheats);
  const activateCheat = useSettingsStore((s) => s.activateCheat);
  const deactivateCheat = useSettingsStore((s) => s.deactivateCheat);
  const [worldPickerOpen, setWorldPickerOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const selectedWorldTheme =
    WORLD_THEMES.find((w) => w.id === worldTheme) ?? WORLD_THEMES[0];

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
          <details
            className="world-theme-picker"
            open={worldPickerOpen}
            onToggle={(e) => setWorldPickerOpen(e.currentTarget.open)}
          >
            <summary className="world-theme-summary">
              <div className="world-theme-summary-copy">
                <div className="eyebrow">world theme</div>
                <div className="world-theme-current">
                  <WorldThemePreview meta={selectedWorldTheme} />
                  <div>
                    <div className="opt-label">{selectedWorldTheme.label}</div>
                    <div className="flavor">{selectedWorldTheme.flavor}</div>
                  </div>
                </div>
                <p className="meta-hint">
                  Immersive visual overhaul that only applies during play.
                </p>
              </div>
              <span className="world-theme-summary-action" aria-hidden>
                <span className="world-theme-action-open">Change</span>
                <span className="world-theme-action-close">Collapse</span>
              </span>
            </summary>
            <div className="opt-grid world-theme-grid">
              {WORLD_THEME_GROUPS.map((group) => {
                const items = WORLD_THEMES.filter((w) => w.group === group);
                if (items.length === 0) return null;
                return (
                  <ReactFragment key={group}>
                    <div className="world-theme-subhead">{group}</div>
                    {items.map((w) => (
                      <button
                        key={w.id}
                        className={`opt-card world-theme-card ${worldTheme === w.id ? 'on' : ''}`}
                        onClick={() => {
                          setV('worldTheme', w.id);
                          setWorldPickerOpen(false);
                        }}
                      >
                        <WorldThemePreview meta={w} />
                        <div className="opt-label">{w.label}</div>
                        <div className="flavor">{w.flavor}</div>
                      </button>
                    ))}
                  </ReactFragment>
                );
              })}
            </div>
          </details>
        </section>

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
              label="Instant tray refill"
              desc="Refill each slot the moment you place it, instead of waiting for all three."
              on={instantTrayRefill}
              onChange={(v) => setV('instantTrayRefill', v)}
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
          <div className="eyebrow">display</div>
          <div className="toggle-list">
            <Toggle
              label="Tray frame"
              desc="Show the tray heading, hint, frame, slot outlines, and slot numbers."
              on={showTrayChrome}
              onChange={(v) => setV('showTrayChrome', v)}
            />
            <Toggle
              label="This run"
              desc="Show the per-run stats card beside the board."
              on={showRunStats}
              onChange={(v) => setV('showRunStats', v)}
            />
          </div>
          <div className="meta-hint">
            Tray frame defaults hidden. This run defaults visible on desktop and tucked away on mobile.
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

        <section className="meta-section">
          <div className="eyebrow">cheat codes</div>
          <p className="meta-hint" style={{ marginBottom: 12 }}>
            Type a code to unlock hidden features. Wrong codes stay quiet.
          </p>
          <CheatCodeEntry
            onActivate={activateCheat}
            activeCheats={cheats}
          />
          {cheats.length > 0 && (
            <div className="cheat-list">
              {cheats.map((code) => {
                const known = isKnownCheat(code) ? CHEATS[code] : null;
                return (
                  <div key={code} className="cheat-chip">
                    <div className="cheat-chip-body">
                      <div className="cheat-chip-code">{code}</div>
                      <div className="cheat-chip-desc">
                        {known ? known.desc : 'Unknown code (no-op).'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cheat-chip-off"
                      onClick={() => deactivateCheat(code)}
                      aria-label={`Deactivate ${code}`}
                    >
                      off
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="meta-section">
          <div className="meta-section-head">
            <div>
              <div className="eyebrow">save file</div>
              <p className="meta-hint">
                Export or import your local runs, settings, achievements, levels, and snapshots.
              </p>
            </div>
            <div className="save-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const result = downloadSaveBundle();
                  setSaveFeedback(
                    result.ok ? 'Save file exported.' : result.message,
                  );
                }}
              >
                Export save
              </button>
              <label className="btn btn-ghost save-import">
                Import save
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = '';
                    if (!file) return;
                    void file.text().then((raw) => {
                      const result = importSaveBundle(raw);
                      if (!result.ok) {
                        setSaveFeedback(result.message);
                        return;
                      }
                      setSaveFeedback('Save imported. Reloading…');
                      window.setTimeout(() => window.location.reload(), 600);
                    });
                  }}
                />
              </label>
            </div>
          </div>
          {saveFeedback && <div className="meta-hint save-feedback">{saveFeedback}</div>}
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

function CheatCodeEntry({
  onActivate,
  activeCheats,
}: {
  onActivate: (code: string) => boolean;
  activeCheats: string[];
}) {
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<
    | { kind: 'ok'; label: string }
    | { kind: 'already'; label: string }
    | { kind: 'bad' }
    | null
  >(null);

  function submit() {
    const code = normalizeCheatInput(value);
    if (!code) return;
    if (!isKnownCheat(code)) {
      setFeedback({ kind: 'bad' });
      setValue('');
      return;
    }
    if (activeCheats.includes(code)) {
      setFeedback({ kind: 'already', label: code });
      setValue('');
      return;
    }
    const ok = onActivate(code);
    if (ok) {
      setFeedback({ kind: 'ok', label: CHEATS[code].name });
      setValue('');
    } else {
      setFeedback({ kind: 'bad' });
    }
  }

  return (
    <div className="cheat-entry">
      <input
        type="text"
        className="cheat-input"
        value={value}
        placeholder="enter code…"
        spellCheck={false}
        autoCapitalize="characters"
        autoComplete="off"
        onChange={(e) => {
          setValue(e.target.value);
          if (feedback) setFeedback(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="button"
        className="btn btn-ghost cheat-activate"
        onClick={submit}
        disabled={!value.trim()}
      >
        Activate
      </button>
      {feedback && (
        <div className={`cheat-feedback cheat-feedback-${feedback.kind}`}>
          {feedback.kind === 'ok' && `✓ ${feedback.label} unlocked.`}
          {feedback.kind === 'already' && `${feedback.label} is already on.`}
          {feedback.kind === 'bad' && 'Nope. Try another code.'}
        </div>
      )}
    </div>
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

function WorldThemePreview({ meta }: { meta: WorldThemeMeta }) {
  const { backdrop, board, tiles, border } = meta.swatch;
  // Twelve mini-cells, arranged 4x3. Hard-coded piece layout shows two
  // sample shapes (L-tromino + 2-cell) so the preview feels like a real board.
  const layout: Array<number | null> = [
    0, 0, null, null,
    null, 0, 1, 1,
    null, null, 2, 2,
  ];
  return (
    <div
      className="preview"
      style={{
        background: backdrop,
        borderColor: border,
        boxShadow: `2px 2px 0 0 ${border}`,
      }}
    >
      <div className="mini-board" style={{ background: board, borderColor: border }}>
        {layout.map((fill, i) => (
          <div
            key={i}
            className={`mini-cell ${fill === null ? 'empty' : ''}`}
            style={
              fill === null
                ? { borderColor: border }
                : { background: tiles[fill], borderColor: border }
            }
          />
        ))}
      </div>
    </div>
  );
}
