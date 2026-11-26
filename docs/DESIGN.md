# StudySync — Design System: Neo-Brutal Glass

## Concept

Two visual languages coexist on every screen:

| Layer | Style | Elements |
|---|---|---|
| Surfaces | **Glass** — calm, airy, transparent | Header, sections, modals, popovers, banners, demo toolbar, weekly columns |
| Interaction | **Neo-Brutal** — tactile, high-contrast, hard-shadow | Buttons, inputs, chips, task cards, progress bars, toggles |

**Golden rule**: never nest a glass panel inside another glass panel.

---

## Colour Tokens

| CSS var | Light | Dark | Usage |
|---|---|---|---|
| `--ink` | `#111111` | `#F0EDE6` | All borders, hard shadows, body text |
| `--paper` | `#FFFDF5` | `#141210` | Page background, card fill |
| `--violet` | `#6C5CE7` | `#8B7FF0` | Primary accent, focus ring, active nav |
| `--yellow` | `#FFD43B` | `#FFD43B` | Primary button, marker highlight |
| `--pink` | `#FF6B9D` | `#FF6B9D` | Revision chip |
| `--teal` | `#2DD4BF` | `#2DD4BF` | Done state, success toasts |
| `--red` | `#FF4D4D` | `#FF4D4D` | Missed state, error toasts |

Subject colours (6 slots):
`#6C5CE7` · `#FF6B9D` · `#2DD4BF` · `#FFD43B` · `#FF7043` · `#00B4D8`

---

## Brutal Element Tokens

```css
border:        2.5px solid var(--ink)
shadow-rest:   4px 4px 0 var(--ink)        /* no blur */
shadow-hover:  6px 6px 0 var(--ink) + translateY(-2px)
shadow-active: 2px 2px 0 var(--ink) + translateY(+2px)
radius:        12px interactive  |  8px chips  |  6px tiny
```

## Glass Panel Tokens

```css
/* Light */
background:        rgba(255,255,255,0.45)
background-heavy:  rgba(255,255,255,0.72)   /* text-heavy areas */
border:            1.5px solid rgba(255,255,255,0.6)
blur:              backdrop-filter: blur(16px)
radius:            22px

/* Dark */
background:        rgba(20,18,16,0.55)
background-heavy:  rgba(20,18,16,0.80)
border:            1.5px solid rgba(255,255,255,0.12)

/* Fallback (no backdrop-filter support) */
background:        rgba(255,253,245,0.97)   /* or dark equivalent */
```

---

## Typography

| Role | Font | Weight |
|---|---|---|
| Headings, labels, buttons | Space Grotesk | 400 / 500 / 700 |
| Body copy, paragraphs | Inter | 400 / 500 / 600 |
| Numbers, durations, code | JetBrains Mono | 400 / 500 |

All self-hosted via `@fontsource/*` — no external requests.

---

## Utility Classes (defined in `src/index.css`)

| Class | Description |
|---|---|
| `.glass` | Standard glass panel (45% alpha) |
| `.glass-heavy` | Opaque glass for text-heavy areas (72% alpha) |
| `.brutal-card` | Paper fill + 2.5px ink border + 4px hard shadow |
| `.btn-brutal` | Base for all buttons: 44px min-height, brutal border+shadow, hover/active transforms |
| `.btn-primary` | Yellow fill |
| `.btn-done` | Teal fill |
| `.btn-missed` | Red fill |
| `.btn-secondary` | Paper fill |
| `.input-brutal` | Paper bg, ink border, violet focus shadow |
| `.chip` | Inline label: ink border, 8px radius |
| `.chip-study` | Yellow chip (Study tasks) |
| `.chip-revision` | Pink chip (Revision tasks) |
| `.mono-badge` | JetBrains Mono, ink border, duration display |
| `.stamp-text` | Rotated DONE/MISSED overlay text |
| `.factor-bar-track` | 12px flat bar container for priority breakdown |
| `.marker-highlight` | Yellow linear-gradient underline for headings |
| `.animate-fade-rise` | 200ms ease-out fade + translateY(8px→0) entry |

---

## Component Catalogue

### Button
- Always use `.btn-brutal` + variant class
- Minimum 44px height for touch targets
- Motion: `translateY(-2px)` hover, `translateY(+2px)` active — both wrapped in `prefers-reduced-motion: no-preference`
- Disabled: `opacity-50`, no transform, no shadow

### Task Card
- Solid `.brutal-card` — not glass (list items must not blur)
- Left colour block 6px wide (subject colour)
- Study chip = yellow, Revision chip = pink
- Duration in `.mono-badge`
- Done: teal border + `.stamp-text.stamp-done` overlay
- Missed: dashed ink border + `.stamp-text.stamp-missed` overlay

### Why This? Popover
- Glass panel with ink brutal border + shadow (1 blur layer)
- Ink title strip
- Factor bars: `.factor-bar-track` — flat 12px, no border-radius

### Plan Banner
- `.glass` with `border-left: 4px solid var(--yellow)`
- Change items as inline `.chip` elements

### Header
- `.glass-heavy` sticky bar
- Active nav: yellow chip (`.btn-brutal` variant)

### Mobile Nav
- `.glass-heavy` fixed bottom bar
- Active indicator: bold text + yellow dot (never colour alone)

### Weekly Grid
- Glass day columns (`border-radius: 12px`)
- Task blocks: solid subject-colour fill + ink border + 2px shadow

### Modals
- Ink semi-transparent backdrop
- `.glass-heavy` card + 2.5px ink brutal border
- Ink title strip

---

## Background Mesh

Three animated radial-gradient blobs via CSS pseudo-elements and `.mesh-blob-3`:
- Blob 1 (`#root::before`): violet → pink, top-left
- Blob 2 (`#root::after`): teal → yellow, bottom-right
- Blob 3 (`.mesh-blob-3`): yellow → orange, mid-right

All three animate with `drift1–3` keyframes (20–30s, `ease-in-out infinite alternate`).
Wrapped in `@media (prefers-reduced-motion: no-preference)` — static by default.

Dot-grid overlay on `body` via `radial-gradient` background-image.

---

## Dark Mode

Purposefully designed, not inverted. Key differences:
- `--ink` becomes warm off-white `#F0EDE6`
- `--paper` becomes near-black `#141210`
- Glass backgrounds darken to `rgba(20,18,16,0.55/0.80)`
- Glass borders become dim white `rgba(255,255,255,0.12)`
- Accent colours (`--violet`, `--yellow`, `--teal`, `--pink`, `--red`) remain unchanged — they read well on dark backgrounds

---

## Accessibility

- Focus ring: `3px solid var(--violet)`, `outline-offset: 2px`, never suppressed
- Status communicated with icon **and** text (never colour alone)
- WCAG AA contrast verified on rendered background (glass + gradient mesh)
- Mobile-first, fully usable at 375px
- Reduce transparency: `html.reduce-transparency` removes all blur and replaces glass with solid `var(--glass-fallback)`. Toggle in Settings writes to `localStorage`.
- Max 3 blur layers on screen simultaneously. No blur on list items.

---

## Motion Summary

| Event | Duration | Easing |
|---|---|---|
| Button hover/press | 100ms | ease |
| Page section entry | 200ms | ease-out (`fade-rise`) |
| Done stamp appear | 250ms | spring `cubic-bezier(0.34,1.56,0.64,1)` |
| Background blobs | 20–30s | ease-in-out infinite alternate |

All motion disabled by default; enabled inside `@media (prefers-reduced-motion: no-preference)`.
