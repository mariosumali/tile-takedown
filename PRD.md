# TILE TAKEDOWN — PRD v0.1

Tile Takedown is a browser-native take on the block placement puzzle genre — a handmade paper-and-ink reimagining with a sandbox companion mode and zero backend.

---

## 00 · Overview

**Product.** A single-player web puzzle. Place polyomino pieces from a 3-piece tray onto an 8×8 grid. Fill rows or columns to clear them. Score accumulates via placements, clears, and combo chains. When no piece in the tray fits, the run ends.

**Tagline.** `PLACE. CLEAR. REPEAT.`

**Modes shipping in v1.**
1. **Classic** — the canonical game. Score, combos, game-over.
2. **Levels** — 100 handcrafted score puzzles with shaped boards, stars, and bonus badges.
3. **Gimmicks** — Classic pressure plus lives, obstacles, embedded powerups, and a power meter.
4. **Sandbox** — empty grid, free placement/paint tools, no game-over. A design / zen canvas.

**Platform.** Desktop + mobile web. Responsive down to 360px. Pointer and touch supported. Keyboard shortcuts on desktop.

**Stack.** Next.js 15 (App Router) · React 19 · TypeScript · Zustand · Framer Motion · Tailwind (utility base only; design tokens in CSS vars) · Vercel. No backend. All state in `localStorage`.

---

## 01 · Goals & non-goals

**Goals.**
- Feel better than the mobile block-placement puzzles it descends from within 60 seconds of first placement.
- Hold a distinctive visual identity: warm paper substrate, chunky retro-serif display, hard offset shadows, tactile tiles.
- Ship no-backend and still feel deep (stats, achievements, themes, daily streaks all local).
- Line-clear choreography that is the thing people screenshot.

**Non-goals (v1).**
- Online multiplayer, leaderboards, accounts, cross-device sync.
- Monetization, ads, analytics beyond local.
- Native apps.

---

## 02 · Game engine spec

### Grid
- 8×8, indexed `[row][col]` with `[0][0]` top-left.
- Each cell: `{ filled: boolean, color: PieceColor | null, placedAt: number }`.
- Grid state is the single source of truth during a run.

### Piece set (19 pieces)
Monominoes through pentominoes:

| Family | Pieces |
|---|---|
| 1-block | · |
| 2-block | horizontal, vertical |
| 3-block | I₃ h/v, L₃ (4 rotations) |
| 4-block | I₄ h/v, O₂, L₄ (4 rot), S/Z, T (4 rot) |
| 5-block | I₅ h/v, L₅ (4 rot), P (4 rot), cross (+) |

Each piece is a `cells: [number, number][]` array of occupied offsets from `[0,0]`, plus a `color: PieceColor`.

### Piece colors (6-color palette)
`orange` `#ff7a3d` · `mint` `#5dd4a1` · `amber` `#f5d547` · `periwinkle` `#7f8dff` · `rose` `#ff5d8f` · `bone` `#d4d4cb`.

Color is assigned at tray generation, not tied to shape.

### Tray
- Always 3 pieces visible.
- New tray of 3 generated when all 3 placed.
- Weighted random: smaller pieces more common early, larger pieces weighted up as board density increases (bias factor kicks in when grid >40% full).
- Pieces drawn without replacement from a shuffled bag of 60 to avoid bad streaks.

### Placement
- Pointer-down on tray piece → piece attaches to cursor.
- Hovering over grid shows **ghost cells** at anchor position. Green if legal, red if illegal (out-of-bounds or overlapping).
- Release over legal position → place. Invalid drop → piece returns to tray with a 200ms shake.
- Touch: long-press to pick up, drag to place. Tap-to-select then tap-to-place is an accessibility fallback (toggle in Settings).

### Clearing
- After placement: scan all 8 rows and all 8 columns. Any fully-filled line is queued to clear.
- Clearing happens simultaneously across all qualified lines.
- Animation: cells pulse white (80ms) → scale up 1.15 (120ms) → fade + collapse to the center of each line (280ms). Total clear animation ~500ms.
- Score credits on clear-complete.

### Scoring
```
placement           = cells_placed × 2
single_line_clear   = 50
double_line_clear   = 150
triple_line_clear   = 400
quad_line_clear     = 1000
combo_multiplier    = 1 + 0.3 × consecutive_clear_turns   (cap 4.0)
perfect_clear_bonus = 500             (board empty after clear)
```

Combo increments on clearing turns and decays by 1 on non-clearing turns.

### Game over
After a placement resolves (clears included), check: can any piece still in the tray fit anywhere on the grid? If no → game over.

Game-over sequence:
1. Grid fades to 50% opacity (400ms).
2. Remaining tray pieces slide off-screen down.
3. `GAME_OVER` card reveals with final score, high-score delta, run stats (placements, clears, longest combo, duration). Buttons: `PLAY AGAIN` · `HOME`.

---

## 03 · Sandbox mode

Same engine, modified rules:
- Piece palette + paint tools replace the normal tray.
- No score tracking, no combos, no game-over check.
- Toolbar/palette actions: `PAINT` · `CLEAR LINES` · `CLEAR ALL` · `SAVE SNAPSHOT` · `LOAD SNAPSHOT`.
- Up to 24 snapshots stored in `localStorage`, named with timestamp, with URL sharing support.
- Clear animations still trigger — the satisfaction is the point.
- "Piece palette" sidebar (desktop): shows the piece roster; click to select a shape and color directly.

---

## 04 · Features

### Combo system
- HUD shows current multiplier `×1.00` → `×4.00`.
- Multiplier cell pulses on increment, fades red for 600ms on break.
- Floating score popups and combo VFX scale from spark to hot, fire, and inferno tiers.

### Undo
- Classic has no undo. Deadlocks end the run.
- Levels and Gimmicks can still expose limited undo where their mode rules allow it.
- Sandbox: unlimited undo + redo stack.

### Next-tray preview
- Small panel showing the next 3 pieces that will appear once the current tray is emptied.
- Silhouettes only (no color) to keep planning a gentle hint, not a solved puzzle.
- Toggleable in Settings (default on).

### Ghost placement
- While dragging, overlay legal footprint at cursor. Legal: piece color at 40% opacity + 2px dashed border in mint. Illegal: 25% opacity in rose with `INVALID` micro-label.

### Piece rotation toggle
- Off (default, classic): pieces come pre-oriented.
- On (relaxed): hold `R` or long-press piece to rotate 90° before placing. Setting persists per-mode.

### Daily streak
- Each day (local midnight) a `PLAYED_TODAY` flag is set after the first run (Classic) or first 10 placements (Sandbox).
- Current streak + longest streak tracked. Streak breaks if a day is missed.
- Small calendar heatmap on the Stats page (last 90 days).

### Stats (tracked locally)
- Lifetime: games played, total score, total placements, total clears (by type), longest combo, highest perfect-clear streak, hours played.
- Per-run history: last 50 runs (score, duration, clears, combo peak).
- Distribution chart: score histogram, 10-bucket.

### Achievements
Examples:
- `FIRST_PLACEMENT` — place your first piece.
- `FIRST_BLOOD` — first line clear.
- `TRIPLE_THREAT` — clear 3 lines in one move.
- `QUAD_SQUAD` — clear 4 lines in one move (the max).
- `PERFECT_10` — 10 perfect clears across all runs.
- `COMBO_BREAKER` — ×3.00 multiplier achieved.
- `CENTURION` — 100 runs played.
- `MARATHON` — 200+ placements in a single run.
- `SANDBOX_ARCHITECT` — save 5 snapshots.
- `DAILY_DEVOTED` — 7-day streak.
- `NIGHT_OWL` — run played between 00:00–04:00 local.
- `MINIMALIST` — win a run using only 1–3 cell pieces (no 4/5-cell placements).
- `MAXIMALIST` — run with 20+ pentomino placements.

Unlock toast: top-center, 240ms slide-down, stays 3s, dismissible. `ACHIEVEMENT` label in mono, name in Barlow Condensed. Plays one-shot tone if SFX on.

### Themes (4 at launch)
- **PAPER** (default) — warm cream `#f4ecd8`, ink `#1c1714`, tomato + mustard + olive palette.
- **LINEN** — cooler cream `#eef0e2`, same ink, slightly desaturated pieces.
- **NOIR** — warm espresso `#1e1813` substrate, off-white ink, pieces +10% sat.
- **HIGH_CONTRAST** — pure `#fffcf2` paper, pure `#000` ink, max-sat pieces. Accessibility-first.

Theme is stored in localStorage, applied via `data-theme` attribute on `<html>`. All color vars transition on swap.

### Piece set variants (Settings)
- **CLASSIC** (default) — full 19-piece roster.
- **TETRO_ONLY** — only 4-block pieces (tetrominoes).
- **PENTOMINO_CHAOS** — pentomino-heavy bag, 1/2/3-block pieces removed.
- **SMALL_ONLY** — 1/2/3-block pieces only. Easier, longer runs.

### Audio & haptics
- SFX: pick-up, drop-legal, drop-invalid, line-clear (pitched up per combo step), game-over, achievement.
- Ambient: off by default. Optional low-volume drone on the Game page, theme-dependent.
- Mobile: `navigator.vibrate()` on drop, clear, achievement, game-over. Patterns differ per event.
- Master mute in HUD + Settings.

---

## 05 · Pages

### `/` — Landing
Hero with live auto-playing demo grid. Mode cards (Classic, Levels, Gimmicks, Sandbox). Stats row. Feature grid. Controls reference. Footer.

### `/play` — Classic
Grid center, score/combo HUD top, tray bottom, sidebar right with next-tray preview + current run stats.

### `/levels` and `/levels/[id]` — Levels
Tiered catalog, daily featured level, shaped boards, target score, stars, and bonus badges.

### `/gimmicks` — Gimmicks
Classic board flow with lives, obstacles, powerups, and embedded board pickups.

### `/sandbox` — Sandbox
Grid center, piece palette left, toolbar bottom, snapshot drawer right.

### `/stats` — Stats
Lifetime numbers, calendar heatmap, score histogram, last 50 runs list with mini score sparkline.

### `/achievements` — Achievements
Grouped achievement cards. Locked = silhouette + `???`. Unlocked = full name, description, unlock timestamp.

### `/settings` — Settings
Theme · piece set variant · rotation on/off · next-tray preview on/off · tap-to-select accessibility · SFX volume · ambient volume · haptics on/off · export data (JSON download) · import data · reset all (double-confirm).

---

## 06 · Design system

Direction: **warm tactile tabletop**. The product should feel like a handcrafted paper-and-wood puzzle, not a dashboard. Soft cream substrate, ink-black line weight, hard offset shadows evocative of risograph prints, rounded tiles with a sense of physical weight. All-serif typography. No monospace, no condensed, no sans-serif.

### Color tokens (paper theme — default)
```
--paper         #f4ecd8    /* warm cream background */
--paper-2       #ecddb7    /* slightly darker, for elevation contrast */
--paper-3       #dfcb9a    /* deepest paper, used sparingly */
--ink           #1c1714    /* warm near-black, all lines & text */
--ink-2         #4a3f34    /* body copy */
--ink-3         #8a7d6e    /* muted labels */
--tomato        #e85a4f    /* primary accent (CTAs, combo, active) */
--mustard       #e9b949    /* secondary accent (highlights, gold states) */
--olive         #7a8450    /* success / preview / preclear glow */
--sky           #6e94b8    /* tertiary (links, info) */
--plum          #9a5a8a    /* accents, rare states */
--cream-tile    #e8ddb5    /* cream piece color — always borders in ink */
```

Piece palette: `--tomato` `--mustard` `--olive` `--sky` `--plum` `--cream-tile`. Every piece tile has a 2px `--ink` border and a 3px ink drop-shadow offset, so tiles read as objects sitting on the paper.

### Typography
- **Display**: **Caprasimo** (Google Fonts) — a chunky, rounded, retro-flared serif. Hero titles, score numerals, section titles. Unforgettable and warm.
- **Body**: **Fraunces** (Google Fonts, variable) — soft opsz/wght axis. Handles labels (opsz 14, wght 500), body prose (opsz 14, wght 400), and micro-chrome (opsz 9, wght 500, uppercase with wide tracking for small-caps moments).
- **No mono. No sans. No condensed.** Numerals use Fraunces tabular figures with `font-feature-settings: "tnum"`.
- Type hierarchy leans on *size and weight contrast*, not case or tracking.

### Grid & spacing
- Base unit: 8px; components usually at multiples of 4.
- Cell size: 60px desktop / 44px tablet / min 34px mobile.
- Border radius: **8px small**, **14px medium**, **20px large**, **full (pill)** for tags. No zero-radius anywhere.
- Line weight: 2px for primary borders (panels, tiles, cells), 1px only for dividers inside already-bordered containers.
- **Hard offset shadow** is the dominant elevation device:
  - `--shadow-sm: 3px 3px 0 0 var(--ink)`
  - `--shadow: 4px 4px 0 0 var(--ink)`
  - `--shadow-lg: 6px 6px 0 0 var(--ink)`
- Hover on interactive elements: translate `-2px, -2px` and grow shadow by 2px, producing a "lift" effect. Press: translate `+2px, +2px` and collapse shadow to 0. Real-feel.
- Paper grain: 0.06 opacity SVG feTurbulence overlay on `<body>`, fixed position, mix-blend multiply. Barely visible; adds warmth.
- No numbered-section chrome anymore. Labels are friendly small-caps Fraunces (e.g. "modes", "your stats").

### Iconography
Line icons, 2px stroke, rounded caps, drawn custom. No icon library. Style inspired by hand-drawn board-game manuals. Undo: curved arrow loop. Menu: three bars with rounded ends. Close: X with rounded caps. All icons 18–20px.

### Alternate themes
The `editorial_dark` theme from earlier is retired. Four new themes, all built around "tactile substrate + bold ink":
- **PAPER** (default) — tokens above.
- **LINEN** — cooler cream `#eef0e2`, ink stays warm, pieces slightly desaturated.
- **NOIR** — deep espresso `#1e1813` substrate, off-white ink `#f4ecd8`, same piece palette but saturation +10%. Still warm, just inverted.
- **HIGH_CONTRAST** — pure `#fffcf2` paper, pure `#000` ink, pieces at max saturation. 7:1 contrast for accessibility.

Theme applied via `data-theme` attribute on `<html>`.

---

## 07 · Motion spec

Framer Motion for state, CSS for hover micro. Motion character is **springy, weighted, tactile** — like real physical tiles on a paper board. Nothing linear. Everything settles with a small overshoot.

**Tray spawn (new tray of 3)**
- Stagger 80ms each.
- From `y: +20, rotate: -4deg, opacity: 0` → settled with a spring (stiffness 240, damping 18). Each piece tilts a few degrees on spawn and rights itself — like being dealt cards.

**Piece pick-up**
- Scale 1.0 → 1.06, shadow grows from `--shadow-sm` to `--shadow-lg`. 140ms spring. The piece "lifts" off the paper.

**Piece drop (legal)**
- Piece snaps into grid with a slight bounce: scale 1.06 → 0.94 → 1.0 over 260ms (spring stiffness 320, damping 14).
- Cells settle with a 40ms stagger per cell. Each cell's ink-shadow grows in from 0 to `3px 3px 0` across 180ms so the tile feels like it just pressed into the paper.

**Piece drop (illegal)**
- Wobble: `rotate: 0 → -3deg → 3deg → -2deg → 0`, 280ms. Piece jiggles back to tray rather than shaking clinically.

**Line clear**
1. Cells in cleared line wobble one by one (stagger 30ms): `rotate: ±4deg`, scale 1.0 → 1.1.
2. A cream highlight sweeps across the line L→R, 220ms.
3. Cells puff and vanish: scale 1.1 → 1.3, opacity 1 → 0, translate y +4 to y -8, 320ms.
4. Paper underneath bounces once (scale 1.0 → 1.015 → 1.0, 240ms) to sell the release of weight.
5. Score popup emerges with spring from line midpoint: `scale: 0.6 → 1.1 → 1.0`, opacity 0 → 1, rising `y: -32` over 900ms before fading.
6. If combo >1, multiplier chip in HUD does a satisfying rubber-band scale 1.0 → 1.18 → 1.0 (320ms spring).

**Combo break**
- Multiplier chip deflates: scale 1.0 → 0.92 over 180ms, color flashes plum, then springs back.

**Game over**
- Grid fades to 0.6 opacity, 420ms ease.
- Remaining tray pieces tumble off: each rotates `-12deg` to `12deg` random, translates `y: +240, x: ±60`, 480ms stagger 80ms — as if sliding off a tilted board.
- `GAME_OVER` card scales up from 0.7 with a springy overshoot (stiffness 200, damping 16), 500ms delay after grid fade begins.

**Achievement toast**
- Drops from top like a ribbon: `y: -80, rotate: -6deg` → `y: 0, rotate: 0`, 360ms spring (stiffness 180, damping 15). Carries a small wobble at rest.

**Hover / press micro**
- Buttons, mode cards, tiles: `translate(-2px, -2px)` with shadow grow on hover (120ms), `translate(+2px, +2px)` with shadow collapse on press (80ms). Never skipped — core to the tactile identity.

**Theme transition**
- All color vars transition 320ms ease-out. Paper grain opacity cross-fades.

---

## 08 · Persistence schema (`localStorage`)

Single namespaced JSON blob under key `tile-takedown:v1`:
```ts
{
  meta: { version: 1, createdAt: ISOString, lastOpenedAt: ISOString },
  settings: {
    theme: "paper" | "linen" | "noir" | "high_contrast",
    pieceSet: "classic" | "tetro_only" | "crazy" | "small_only",
    rotation: boolean,
    nextTrayPreview: boolean,
    tapToSelect: boolean,
    sfxVolume: number,        // 0..1
    ambientVolume: number,
    haptics: boolean
  },
  stats: {
    gamesPlayed: number,
    totalScore: number,
    highScore: number,
    totalPlacements: number,
    clears: { single: number, double: number, triple: number, quad: number },
    longestCombo: number,
    perfectClears: number,
    msPlayed: number
  },
  achievements: { [id: string]: { unlockedAt: ISOString } },
  streak: {
    current: number,
    longest: number,
    lastPlayedDate: string   // YYYY-MM-DD, local
  },
  runs: Array<{
    id: string,
    startedAt: ISOString,
    endedAt: ISOString,
    score: number,
    placements: number,
    clears: { single, double, triple, quad },
    comboPeak: number
  }>,                         // cap 50, FIFO
  sandbox: {
    snapshots: Array<{ id: string, createdAt: ISOString, grid: CellState[][] }>,
    currentGrid: CellState[][] | null
  },
  activeRun: RunState | null  // Classic: resume on reload
}
```

Active-run resume: any placement mutates `activeRun`. On load, if `activeRun` exists and game-over flag false, offer `RESUME` on landing.

---

## 09 · File structure

```
app/
  layout.tsx
  page.tsx                  # Landing
  play/page.tsx             # Classic
  sandbox/page.tsx
  stats/page.tsx
  achievements/page.tsx
  settings/page.tsx
components/
  game/
    Grid.tsx
    Cell.tsx
    Tray.tsx
    TrayPiece.tsx
    Piece.tsx
    Hud.tsx
    NextTrayPreview.tsx
    ScorePopup.tsx
    GameOverCard.tsx
    AchievementToast.tsx
  landing/
    Hero.tsx
    LiveDemoBoard.tsx
    ModeCards.tsx
    StatsBar.tsx
    FeatureGrid.tsx
  chrome/
    Nav.tsx
    Footer.tsx
    SectionHeader.tsx       # numbered 00/01/02
lib/
  engine/
    pieces.ts               # 19-piece definitions
    grid.ts                 # placement, clearing, game-over
    scoring.ts
    bag.ts                  # weighted-random tray generator
    rotation.ts
  storage/
    schema.ts
    load.ts
    save.ts
    migrate.ts
  audio/
    sfx.ts
    ambient.ts
    haptics.ts
  achievements/
    definitions.ts
    checker.ts
  stats/
    aggregate.ts
stores/
  useGameStore.ts           # Zustand, Classic run
  useSandboxStore.ts
  useSettingsStore.ts
  useStatsStore.ts
styles/
  globals.css
  themes.css
```

---

## 10 · Build phases

**Phase 1 — Engine.** Grid, pieces, placement, clearing, scoring. No animation. No UI chrome. One ugly HTML test page that proves the rules are right.

**Phase 2 — Classic UI.** Grid render, tray, drag interactions, HUD, game-over. Framer Motion choreography. Keyboard shortcuts.

**Phase 3 — Persistence & stats.** localStorage schema, run history, high-score updates, active-run resume.

**Phase 4 — Sandbox.** Fork engine. Toolbar. Snapshots. Piece palette.

**Phase 5 — Landing.** Live demo board (engine auto-play loop). Hero. Mode cards. Stats bar.

**Phase 6 — Meta.** Stats page, achievements page, achievement toasts, daily streak.

**Phase 7 — Settings & themes.** Theme system, piece set variants, rotation toggle, accessibility options, export/import.

**Phase 8 — Audio, haptics, polish.** SFX, ambient, mobile vibration patterns. Edge cases: tiny viewports, reduced-motion, ESC handling, focus rings.

---

## 11 · Controls reference

| Input | Action |
|---|---|
| Click/drag piece | Pick up |
| Release over grid | Place |
| `R` (hold) | Rotate (if rotation on) |
| `Z` | Undo in Levels/Gimmicks |
| `1` `2` `3` | Select tray slot |
| `Esc` | Cancel drag / close modal |
| `M` | Toggle mute |
| `?` | Open controls overlay |

Mobile: long-press piece, drag, release. Tap-to-select mode for accessibility swaps long-press for single tap.

---

## 12 · Accessibility

- `prefers-reduced-motion`: disables clear animation (cells just hide), disables stagger delays, keeps instant feedback.
- Keyboard-only flow: `Tab` between tray slots + grid cells, `Enter` to place at focused cell.
- Min contrast 4.5:1 on all text in default theme. HIGH_CONTRAST theme targets 7:1.
- Screen reader: ARIA-live region announces placements, clears, score changes, game over.
- Focus rings: 2px outline in accent color, 2px offset, never removed.

---

## 13 · Out of scope (v1, noted for v2)

- Online Duel mode (requires Supabase).
- Daily Challenge with shared seed + global leaderboard.
- Level-based "Fit" preset-puzzle mode.
- Replays / shareable run recordings.
- Cloud save.

---

**END v0.1**
