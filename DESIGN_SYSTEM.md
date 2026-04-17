# TILE TAKEDOWN — DESIGN SYSTEM v0.1

The visual and interaction language for Tile Takedown. Pair this with `PRD.md` (product spec) and `CLAUDE.md` (build blueprint).

**Direction:** warm tactile tabletop. A handcrafted paper-and-ink puzzle, not a dashboard. Soft cream substrate, warm-black line weight, hard offset shadows evocative of risograph prints, rounded tiles with physical weight. All-serif typography — no mono, no sans, no condensed.

---

## 01 · Brand

### Name
**Tile Takedown** — always capitalized as two words. Lowercase in product chrome (`tile takedown` in nav + brand lockup) for warmth. Uppercase in formal contexts (docs, legal, ACHIEVEMENT labels).

### Mark
A tilted tomato-filled rounded square with two smaller shapes clipped inside — a mustard dot top-left and a cream tile bottom-right. Reads as a miniature stylized puzzle. Rotate the mark `-6deg` in lockups. Never straighten.

- Size: 36px in nav, 28px in compressed chrome, 24px in footer.
- Border: always 2px `--ink`.
- Shadow: `3px 3px 0 0 var(--ink)` in nav, none at ≤24px.
- Interior dot + tile: 8px + 10px rounded 3px, each with 2px ink border.

### Wordmark
Caprasimo, lowercase. Never all-caps the wordmark. Size matches the mark's bounding box + 8–12px taller.

---

## 02 · Color tokens

All tokens are CSS custom properties on `:root`, themed via `html[data-theme]`.

### Paper (default theme)

| Token | Hex | Usage |
|---|---|---|
| `--paper` | `#f4ecd8` | Page background, card fills |
| `--paper-2` | `#ecddb7` | Card elevation contrast, empty cells |
| `--paper-3` | `#dfcb9a` | Deepest paper, board backing |
| `--ink` | `#1c1714` | All borders, display type, primary text |
| `--ink-2` | `#4a3f34` | Body copy |
| `--ink-3` | `#8a7d6e` | Muted labels, captions |
| `--tomato` | `#e85a4f` | Primary accent · CTAs · combo · active |
| `--mustard` | `#e9b949` | Secondary · highlights · gold states |
| `--olive` | `#7a8450` | Success · preview · preclear glow |
| `--sky` | `#6e94b8` | Tertiary · info · links |
| `--plum` | `#9a5a8a` | Accents · rare states |
| `--cream-tile` | `#e8ddb5` | Cream piece color (always ink-bordered) |

### Piece palette
The six piece colors: `--tomato` `--mustard` `--olive` `--sky` `--plum` `--cream-tile`. Every piece tile receives a 2px `--ink` border and a 2px ink drop-shadow offset so pieces read as objects sitting on paper.

### Semantic aliases
- **Accent**: `--tomato`
- **Accent-2**: `--mustard`
- **Success / preview**: `--olive`
- **Info**: `--sky`
- **Warning / rare**: `--plum`

### Theme variants

| Theme | Substrate | Ink | Piece sat shift |
|---|---|---|---|
| `paper` (default) | `#f4ecd8` | `#1c1714` | — |
| `linen` | `#eef0e2` | `#1c1714` | −8% |
| `noir` | `#1e1813` | `#f4ecd8` | +10% |
| `high_contrast` | `#fffcf2` | `#000000` | +20% |

Swap is implemented via `html[data-theme="noir"]` etc. All color tokens transition 320ms ease-out on swap.

---

## 03 · Typography

Two typefaces. No fallbacks beyond the generic family.

### Faces
- **Caprasimo** (Google Fonts) — display. Weight 400 only (display face ships single-weight). Chunky, rounded, flared retro serif. Instantly identifiable.
- **Fraunces** (Google Fonts, variable) — body and labels. Axes: `opsz` (9–144), `wght` (300–700). A soft, characterful serif that handles both fine micro-text and expressive mid-scale copy.

### Type scale

| Role | Face | Size | Line height | Variation settings | Use |
|---|---|---|---|---|---|
| Display XL | Caprasimo | `clamp(72px, 11vw, 168px)` | 0.88 | — | Hero title |
| Display L | Caprasimo | `clamp(40px, 5vw, 72px)` | 0.95 | — | Section titles, mode names |
| Display M | Caprasimo | 52px | 0.95 | — | Big numerals in cards |
| Display S | Caprasimo | 26px | 1.0 | — | Brand wordmark, toast names |
| Display XS | Caprasimo | 18–20px | 1.0 | — | In-card labels, kbd, mode pill |
| Body L | Fraunces | 19px | 1.5 | `opsz 24, wght 400` | Hero lede |
| Body M | Fraunces | 17px | 1.5 | `opsz 18, wght 400` | Section ledes, card copy |
| Body S | Fraunces | 14–15px | 1.5 | `opsz 14, wght 400` | Default body, labels |
| Eyebrow | Fraunces | 11–12px | 1 | `opsz 9, wght 600, uppercase, tracking 0.14em` | Small-caps labels |
| Micro | Fraunces | 13px | 1.3 | `opsz 9, wght 500` | Captions, sub-text |

### Numerals
All numerals use `font-feature-settings: "tnum"` for tabular figures, so score counters don't jitter.

### Hierarchy rules
- **Two typefaces only.** No exceptions.
- Big moments lean on **Caprasimo at size**. Small moments use **Fraunces weight contrast**.
- Tracking is only ever applied to the **eyebrow** style. Everywhere else, default letter-spacing.
- Case: sentence case everywhere except eyebrows (uppercase) and achievement IDs/labels (uppercase).

---

## 04 · Spacing & layout

### Scale
Base unit **4px**. Standard scale: `4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 72, 80, 100`.

### Container widths
- Landing: `max-width: 1440px`, padding `40px` desktop / `20px` mobile.
- Game stage: `max-width: 1360px`, padding `32px` desktop / `20px` mobile.

### Breakpoints
- Mobile: `≤640px`
- Tablet: `641–1100px`
- Desktop: `>1100px`

Layout switches at `1100px` (sidebars fold under center column) and at `640px` (single-column, tray reflows, board downsizes).

### Grid geometry (game)
- Cell size: **60px** desktop · **44px** tablet · **36px** mobile (min).
- Grid gap: 5px desktop, 4px tablet, 3px mobile.
- Board padding: 14–16px.

---

## 05 · Elevation & borders

### Radius scale
- `--r-sm`: 6px (cells, small chips)
- `--r-md`: 10–12px (kbd, icon buttons, small cards)
- `--r-lg`: 14–16px (buttons, medium cards)
- `--r-xl`: 20px (major panels, board)
- `--r-pill`: 999px (tags, nav links, mode pill, live badge)
- Never 0.

### Border weights
- **2px solid `--ink`** for all primary borders (buttons, cards, tiles, cells when filled).
- **1.5px dashed `rgba(ink, 0.28)`** for empty cells and divider rules.
- **2px dashed `--ink`** for empty tray slots (they solidify on hover).
- **2px dashed `--ink`** for footer dividers.
- **1px** forbidden. We commit to the chunky look.

### Shadow tokens
```
--shadow-sm:  3px 3px 0 0 var(--ink)
--shadow:     4px 4px 0 0 var(--ink)
--shadow-lg:  6px 6px 0 0 var(--ink)
--shadow-xl:  9px 9px 0 0 var(--ink)   (hover of --shadow-lg)
```
Shadows are **hard offsets**, never blurred, never softened. They are the primary elevation device.

### Tactile hover/press
Interactive elements obey this pair:
- **Hover**: `translate(-2px, -2px)` + grow shadow offset by 2px. Timing: 120ms.
- **Press**: `translate(+2px, +2px)` + collapse shadow to `0 0 0 0`. Timing: 80ms.

This produces a real-feel "lifting" and "pressing" sensation. Never skip. It's the signature of the system.

---

## 06 · Surface & texture

### Paper grain
A fixed SVG noise overlay sits at `z-index: 1`, `opacity: 0.09`, `mix-blend-mode: multiply`, applied to the entire viewport. Baseline atmospherics; barely visible but missed if removed.

```css
body::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: 1;
  opacity: 0.09; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg …feTurbulence baseFrequency='0.85'…/></svg>");
}
```

### Subtle rotations
Stickers and "dealt card" cards carry small rotations to break rigidity:
- Brand mark: `rotate(-6deg)`
- Badge stickers: `rotate(-10deg)`
- Score card: `rotate(-0.6deg)`, High card: `rotate(+0.5deg)`, Combo card: `rotate(-0.3deg)`
- Demo board on landing: `rotate(+1.5deg)`
- Score popup: `rotate(-3deg)` → drifts to `rotate(-6deg)` as it floats up

Never more than `±3deg` on a major component. Never more than `±12deg` on a sticker.

---

## 07 · Component specs

### Button (primary)
- Height: 52px (padding `16px 26px`)
- Background: `--tomato`; text: `--paper`
- Border: 2px `--ink`; radius: `--r-lg` (14px)
- Shadow: `--shadow`
- Typeface: Fraunces `opsz 14, wght 600`, 17px
- States: hover lifts `-2,-2` + `--shadow-lg`; press `+2,+2` + 0 shadow

### Button (secondary)
Same shape; background `--paper`, text `--ink`.

### Icon button
- 44×44px square, radius `--r-md` (12px)
- Background `--paper`, 2px ink border, `--shadow-sm`
- Caprasimo glyph or 18–20px line icon inside
- Tactile hover/press obeys the standard rule

### Card (HUD)
- Background: `--paper` (or accent for combo card)
- Border: 2px `--ink`; radius: `--r-lg` (16px)
- Shadow: `--shadow`
- Padding: 20–22px
- Eyebrow → Big numeral → sub-text composition
- HUD variants can carry small rotations for "dealt" feel

### Card (mode)
- Larger; radius `--r-xl` (20px); `--shadow-lg`
- Tomato or mustard fill; 36px padding
- `mc-eyebrow` pill at top, Caprasimo mode name at 80px, body copy, tag chips, circular "go" button in bottom-right

### Tag chip / Pill
- Background `--paper`, 2px ink border, radius `--r-pill`
- Padding: `6px 12px`
- Fraunces `opsz 9, wght 500`, 12px
- Used for feature tags, mode pill, live badges, nav links

### Kbd
- 42px min-width, 42px height, padding `0 12px`
- Background `--paper-2`, 2px ink border, radius 10px, `--shadow-sm`
- Caprasimo 15px

### Tile (piece cell)
- 60×60 desktop, radius 6px
- Filled: 2px `--ink` border, `2px 2px 0 0 ink` shadow
- Empty: background `--paper-2`, 1.5px dashed ink-at-28% border
- Ghost (placement preview): piece color at 38% opacity, 2px dashed `--ink` border, no shadow
- Preclear state: animation bobs the tile 3px on Y with brightness + saturation +12%

### Tray slot
- Dashed border default, solidifies on hover
- Active slot (being dragged from): `--mustard` fill + solid border + lifted shadow + "Dragging" ribbon pill at top-left

### Achievement toast
- Mustard fill, 2px ink border, radius 16px, `--shadow-lg`
- Rotated `-1.2deg` at rest
- Tomato icon square on left (44px, rotated `+4deg`)
- Eyebrow + Caprasimo name + body desc on right
- Springs in from top

### Score popup (in-game floating)
- Tomato chip with Caprasimo "+N" and mustard "×M" inline
- Rotated `-3deg` at entry, drifts to `-6deg` on exit
- Hard shadow `--shadow-lg`

---

## 08 · Iconography

No icon library. All glyphs are either **Caprasimo symbols** (arrows, stars, hashes — works because Caprasimo is chunky enough to feel icon-like) or **custom 2px-stroke line SVGs** with rounded caps, sized 18–20px.

Common icons:
- Arrow right: `→` curved pen stroke, rounded caps
- Undo: counterclockwise curved arrow with ball end
- Menu: three horizontal bars with rounded ends
- Close: X with rounded caps, 2px stroke
- Music note: `♪` (Caprasimo glyph acceptable)
- Star (achievement): ★ filled

All icons inherit `currentColor`.

---

## 09 · Motion

Motion is **springy, weighted, tactile**. Real physical tiles on paper. Nothing linear. Everything settles with small overshoot.

### Easing
- Default: `cubic-bezier(0.34, 1.56, 0.64, 1)` (light spring overshoot)
- Lift/press micro: `cubic-bezier(0.4, 0, 0.2, 1)` (crisp snap)
- Fade only: `ease-out`

### Spring configs (Framer Motion)

| Use | Stiffness | Damping |
|---|---|---|
| Tile drop settle | 320 | 14 |
| Achievement toast | 180 | 15 |
| Tray spawn | 240 | 18 |
| Pick-up scale | 260 | 18 |
| Combo chip bounce | 280 | 12 |
| Game-over reveal | 200 | 16 |

### Signature moments
- **Placement**: scale `1.06 → 0.94 → 1.0` over 260ms spring; shadow grows from 0 to `2px 2px 0` over 180ms per cell with 40ms stagger. Feels like a tile pressing into paper.
- **Line clear**: cells wobble `±4deg`, cream highlight sweeps L→R over 220ms, tiles puff and vanish (`scale 1.1 → 1.3, opacity 1 → 0, y +4 → -8`, 320ms), board bounces once (`scale 1.0 → 1.015 → 1.0`, 240ms) to sell release of weight.
- **Game over**: remaining tray pieces tumble off — each rotates `±12deg` random, translates `y+240, x±60`, stagger 80ms, 480ms each.
- **Achievement toast**: drops from `y -80, rotate -6deg` → rests at `y 0, rotate -1.2deg` with spring overshoot.

### Reduced motion
`@media (prefers-reduced-motion: reduce)` disables all spring animations — state changes become immediate, hover/press translates still applied (they're 80–120ms; small enough to feel responsive without motion sickness risk).

---

## 10 · Voice & tone

Product copy is **warm, direct, slightly wry**. Never breathless, never corporate.

**Do:**
- "A cozy puzzle for your browser"
- "drag a piece onto the board"
- "made with warmth"
- "Your numbers, locally."
- "No bloat. No dark patterns."

**Don't:**
- "Welcome to the ultimate block-placement experience!"
- "Unlock hundreds of unique powerups."
- "Revolutionary puzzle gameplay."
- Any ALLCAPS yelling in body copy.

Sentence-case headings. Short, punctuated. Periods on one-liners. Comma-splices are fine when they feel conversational.

---

## 11 · Accessibility baselines

- Contrast: **4.5:1 minimum** in default theme. `high_contrast` theme targets **7:1**.
- Focus rings: 2px outline in `--tomato`, 2px offset. Never removed.
- `prefers-reduced-motion` respected globally.
- Screen reader: ARIA-live for score changes, placements, clears, game-over. Tray slots are buttons, cells are grid cells with row/col labels.
- Keyboard-only flow supported end to end (see PRD §11 Controls).

---

## 12 · Files in this scaffold

`app/globals.css` is the single source of truth for tokens and base styles. Components reference CSS classes by name. All motion primitives are defined with keyframes in that file; complex animations upgrade to Framer Motion during Phase 2 (see CLAUDE.md).

**END**
