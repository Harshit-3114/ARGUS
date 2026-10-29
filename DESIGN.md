---
name: ARGUS
description: Multimodal biometric login gate — face and typing rhythm fused inside a watchman's console.
colors:
  void: "#050505"
  core: "#0a0c11"
  ink: "#eef2f7"
  ink-soft: "#c3cbd7"
  ink-muted: "#8b96a5"
  hairline: "rgba(255, 255, 255, 0.08)"
  hairline-strong: "rgba(255, 255, 255, 0.14)"
  glass-fill: "rgba(255, 255, 255, 0.045)"
  signal-mint: "#34d399"
  signal-mint-wash: "rgba(52, 211, 153, 0.12)"
  scanner-cyan: "#22d3ee"
  optic-bright: "#5eead4"
  optic-deep: "#0e9488"
  danger-ember: "#f87171"
  danger-wash: "rgba(248, 113, 113, 0.12)"
  caution-amber: "#fbbf24"
  caution-wash: "rgba(251, 191, 36, 0.12)"
  signal-mint-deep: "#0ea87e"
  scanner-cyan-deep: "#0891b2"
  code-mint: "#86e8cb"
  ambient-violet: "rgba(139, 92, 246, 0.15)"
typography:
  display:
    fontFamily: "Space Grotesk, Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(28px, 4.6vw, 44px)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Space Grotesk, Plus Jakarta Sans, sans-serif"
    fontSize: "15.5px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    letterSpacing: "0.16em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Consolas, monospace"
    fontSize: "10.5px"
    fontWeight: 500
    letterSpacing: "0.16em"
rounded:
  outer: "30px"
  lg: "22px"
  md: "16px"
  sm: "12px"
  xs: "8px"
  nav-row: "14px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.optic-deep}"
    textColor: "#04110d"
    rounded: "{rounded.pill}"
    padding: "11px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "11px 20px"
  button-danger:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger-ember}"
    rounded: "{rounded.pill}"
    padding: "11px 20px"
  input-pill:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"
    width: "460px"
  card-shell:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.outer}"
    padding: "18px 22px 20px"
  chip-status:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  toast:
    backgroundColor: "rgba(12, 14, 18, 0.85)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  verdict-accept:
    backgroundColor: "{colors.signal-mint-wash}"
    textColor: "{colors.signal-mint}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  verdict-reject:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger-ember}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
---

# Design System: ARGUS

## Overview

**Creative North Star: "The Watchman's Console"**

ARGUS renders the hundred-eyed watchman at his instrument: a near-black void
(`void #050505`) where glass panels float in real depth and every optically live
element acquires colored light. The console is an *Operate* surface — the operator
enrolls classmates, judges logins and reads eval numbers — so craft concentrates
in precision furniture: hairline joints, machined radii, tabular numerals, a
dedicated console voice for machine channels. The rare theatrical moment (the
verification pipeline: scan sweep, staged module rows, verdict stamp) is a
committed product ritual, not decoration; the numbers it displays are always the
live pipeline's actual output. Theatrical motion is spent exactly and only there.

**Key Characteristics:**

- OLED void with fixed light-work: a faint emerald/violet/cyan mesh glow behind
  content, self-hosted grain at 3.5% opacity.
- Glass panels in honest depth — 1px white hairlines mark joints; large soft
  ambient shadows lift cards off the void; blur is reserved to *fixed* chrome
  (nav pill, toasts) where it dims a moving scene behind it.
- Optic accents (Signal Mint `#34d399` for activation/accept, Scanner Cyan
  `#22d3ee` for live optics) are earned by state — never decoration.
- Machine channels (module codes, HUD lines, chips, stamps) speak the console
  voice — JetBrains Mono at 10–10.5px, tracked caps.
- Double-bezel machining: every card is a glass shell around an inset darker
  core, radii strictly concentric.

## Colors

The palette is one trust hue (mint), one optics hue (cyan), two verdict
satellites (amber, ember) and a neutral ladder that is *white-in-black — grays
are never independent; secondary text tints from the ink family or the surface
hue.

### Primary

- **Signal Mint** (`#34d399`, wash `rgba(52,211,153,0.12)`): accept verdict,
  active nav/stepper states, primary-action gradient partner, live "good" chips.
  This is trust earned — the gate said yes.

### Secondary

- **Scanner Cyan** (`#22d3ee`): the optics color — scan band, camera brackets,
  FS-code text, focus glow halos, pulse bars. It marks *light entering a sensor*.
- **Bright Optic** (`#5eead4`): links, focus outline, foreground accent where
  mint would read as acceptance.
- **Code Mint** (`#86e8cb`): inline code literal pills — the bright mint end of
  the optic family (8px pill, tabular numerals).

### Tertiary

- **Optic Deep** (`#0e9488`): the flat stand-in / press-end of the primary
  action's gradient (the gradient itself lives in the sidecar).
- **Caution Amber** (`#fbbf24`, wash `rgba(251,191,36,0.12)`): pending/bypass
  states, the `tag` (θ operating point).
- **Danger Ember** (`#f87171`, wash `rgba(248,113,113,0.12)`): REJECT, delete,
  knowledge-gate fault, rate-limited notices.

### Neutral

- **Void** (`#050505`): the world; page background (mesh glow sits atop it).
- **Core Panel** (`#0a0c11`, gradient core `#0b0e14→#08090d`): the inner card
  body — a screen of near-black glass inside each shell.
- **Ink** (`#eef2f7`): primary text, display type.
- **Ink Soft** (`#c3cbd7`): secondary text, row names.
- **Ink Muted** (`#8b96a5`): labels, hints, HUD meta text — minimum on-glass
  contrast for small caps.
- **Hairline** (`rgba(255,255,255,0.08)` / strong `0.14`): *the only border
  color in the system* — tables, inputs, cards, chips, dividers.
- **Glass Fill** (`rgba(255,255,255,0.045)`): resting fill of pills, shells,
  hover washes.

### Named Rules

**The Live-Earns-Glow Rule.** Box glows and colored shadows attach only to live
or decision states — running sensor chips, focus, the verdict. At rest, cards
stay seated on ambient shadow alone.

**The Numeral-Only Gradient Rule.** A brand gradient may paint type in exactly
one place — dashboard KPI numerals (`background-clip: text`). Prose and headings
never wear it.

## Typography

**Display Font:** Space Grotesk (variable 300–700, self-hosted woff2; fallback
Plus Jakarta Sans → system sans).
**Body Font:** Plus Jakarta Sans (variable 200–800, self-hosted; fallback Segoe
UI → system-ui).
**Label/Mono Font:** JetBrains Mono (variable 100–800, self-hosted) for the
console voice.

**Character:** A geometric grotesk with scanner crispness reads headings and
numerals; a warm-but-precise Jakarta carries UI prose; the mono exists strictly
for the machine's own speech. The pairing stays legible at label size because
every smallcaps role gets +0.14em tracking minimum.

### Hierarchy

- **Display** (Space Grotesk 600, `clamp(28px, 4.6vw, 44px)`, 1.06,
  −0.035em): page h1, verdict banner, KPI numerals (30px turn).
- **Title** (Space Grotesk 600, 15.5px, 0.01em): card h2, nav brand.
- **Body** (Jakarta 400, 15px, 1.65): page copy; leads capped ≈66ch.
- **Label** (Jakarta 600, 10.5px, +0.16em, uppercase): kpi labels, table
  headers (rows 12–13.5px body).
- **Console/Mono** (JetBrains 500, 10–10.5px, +0.16em, uppercase): module
  codes `FS-01`, HUD lines, status chips, elapsed counters.

### Named Rules

**The Console Column Rule.** JetBrains Mono belongs to machine channels — codes,
measurements, machine state. Body prose never borrows mono as a technicality
costume.

## Layout

A single centered ledger column: `.topbar` floats the nav as a detached island
pill (9px 12px padding, 22px top margin); `main` is capped at 1140px with 22px
side padding and 54px first gap. Content grids split 1fr/1fr (`.grid`), or
1.45fr/1fr for form-needs-camera companions (`.grid.two-thirds`), gap 22px; the
KPI band is `repeat(auto-fit, minmax(190px, 1fr))` at 16px gap.

- **Spacing rhythm:** macro sections breathe (50px+ between page header and
  content; card padding 18/22/20); measurement deltas stay tight (4–12px).
- **Breakpoints:** `md` 860px — island nav wraps to a full-width rounded bar
  (26px radius), grids collapse to one column, admin sidebar stacks; `sm` 640px — console rows
  drop their bar column, HUD lines wrap, stamp tracking eases.
- **Responsive discipline:** asymmetric companions reset to single column
  `w-full`; tables scroll horizontally inside `.table-wrap`.

## Elevation & Depth

**Layered glass** (operator's recorded rule): blur and soft shadow are the
material — cards float above the void as real layers, not paper. Shadow stays
large, soft and *ambient* (offset down, wide blur, negative spread) so nothing
reads as a decal; joints are marked by hairlines, and a machine-glow ring may
join only when the panel is live.

### Shadow Vocabulary

- **Ambient seat** (`0 20px 60px -30px rgba(0,0,0,0.7)`): default under every
  card shell and KPI.
- **Pop lift** (`0 30px 90px -40px rgba(0,0,0,0.9)`): foreground chrome only
  (toasts, nav pill).
- **Press/lift pool** (`0 10px 34px -12px rgba(13,168,126,0.55)`): primary
  button's own colored pool; hover adds `translateY(-1px)`.
- **Live ring** (`0 0 0 1px rgba(94,234,212,0.35), 0 8px 40px -12px rgba(34,211,238,0.25)`):
  the glow token — sensor-live and focus moments.
- **Inset machining** (`inset 0 1px 1px rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.4)`):
  the inner core's lip — depth that costs no light.

### Named Rules

**The Layered Glass Rule.** Blur belongs to fixed chrome (nav, toasts) where it
dims a live scene behind it; scrolling content never carries `backdrop-filter`.
Depth is shadow + hairline + inset — never a sharper, darker, offset "drop
shadow" costume.

## Shapes

Radii form a strict concentric family: `outer 30px → lg 22px → md 16px →
sm 12px → pill 999px`. Cards are **double-bezel**: the outer glass shell (30px)
wraps an inset inner core (`inset 18px 22px 20px` desktop, `14px 16px 16px`
mobile) whose radius is exactly *outer − bezel thickness* (`calc(30px − 20px)`
→ 10px desktop) so the curve stays concentric. All borders are 1px hairlines —
never solid gray, never thicker than 1px. Controls break the family toward the
pill: every button, input, chip and nav link is fully rounded; squarer corners
only explain containment, never decoration. Micro geometry sits below the
family floor: code pills and console fault/bypass rows at 8px, sidenav rows at
14px, the md-width island at 26px, strips and dots at 1–6px — containment and
chrome variants, never new card corners.

### Named Rules

**The Double-Bezel Rule.** Machining is concentric or it is wrong: inner radius
= outer radius − bezel inset. A card's core never out-corners its shell.

## Components

The system's furniture favors pills and glass shells with wide generous
padding; states are declared with color shifts plus 300–500ms `--ease` motion
(accent light grows where meaning grows). Full snippets (incl. the primary
gradient and motion) live in `.impeccable/design.json`.

### Buttons

- **Shape:** pill (`999px`), padding `11px 20px`, 13.5px/600 text.
- **Primary:** gradient `135deg #0ea87e → #0891b2` (flat token `optic-deep`),
  text `#04110d`, colored pool shadow, inset top lip. Trailing `↗`/`→` sits in
  its own 26px inner orb that nudges +3px/−2px on hover; press = `scale(0.97)`.
- **Ghost / Danger:** transparent or ember-wash fill, hairline or ember-30%
  border; hover raises fill only.
- **Focus/hover:** border → `rgba(94,234,212,.5)`; no outline change on hover
  (`:focus-visible` ring is always 2px `optic-bright`).

### Chips (HUD)

- **Style:** JetBrains 10px caps, hairline border, glass fill, 5px 12px.
- **State:** `.live` = mint text/border/glow with blinking 5px dot (1.6s);
  `.bad` = ember wash. Default dot sits at 50% opacity.

### Cards / Containers

- **Corner Style:** outer 30px shell, concentric inner core 10px (see Shapes).
- **Background:** shell = white-on-black gradient (`155deg, 6%→1.5%` fill) at
  hairline border; core = `#0b0e14→#08090d`.
- **Shadow Strategy:** ambient seat; live ring only per The Live-Earns-Glow
  Rule.
- **Internal Padding:** 18px 22px 20px (14px 16px 16px ≤860px).

### Inputs / Fields

- **Style:** pill, glass fill `rgba(255,255,255,0.04)`, hairline border,
  11px 18px; labels 13px/550 above (password fields add 0.08em tracking).
- **Focus:** border `rgba(94,234,212,0.5)` + dual halo (`0 0 0 4px
  rgba(34,211,238,0.12)`, `0 0 24px −6px rgba(34,211,238,0.35)`), fill lightens.
- **Error:** ember text on ember wash, 1px 28% ember border, 13.5px.

### Navigation

- **Island nav:** detached pill `rgba(12,14,18,0.72)` + 22px blur + 140%
  saturate; links 13.5px/500 with 7px 15px pills. Active link = mint text on
  mint-wash with mint-22% inset ring; Admin anchor is a dimmer side pill.
- **Admin sidebar:** 250px fixed column, `sidenav` rows 11px 14px radius 14px;
  active identical mint treatment; content column padding 44px/4vw.

### Signature: KPI numerals

- 30px Space Grotesk 600 with the sanctioned mint→cyan gradient text (the
  Numeral-Only exception), gradient-active envelopes may outline the envelope
  pills themselves (`stepper li.active`).

### Signature: Verdict + console theatre

- **Verdict banner:** lg-radius wash panel, 19–23px Space Grotesk 650, glowing
  accept/ember shadow (`0 0 50px −18px`).
- **Stamp:** Space Grotesk 700, `clamp(21px,3.2vw,30px)`, +0.14em tracking; the
  ACCESS GRANTED/DENIED block stamps in (460ms, scale 1.5→0.97→1 with blur
  resolving) and is the system's single loudest authored moment.
- **Console rows:** 4-line grid (62px code / name / 170px bar / 120px stat);
  module codes in Scanner Cyan; fault = ember wash, bypass = amber wash.

## Do's and Don'ts

### Do:

- **Do** animate `transform`, `opacity` and bounded `filter` only; use
  `--ease cubic-bezier(0.32,0.72,0,1)` for UI, `--ease-io` for sweeps.
- **Do** keep borders `rgba(255,255,255,0.08)` hairlines and data numerals
  `font-variant-numeric: tabular-nums`.
- **Do** self-host every asset (fonts, noise svg, favicon) — the CSP is
  `default-src 'self'` with no inline style/script; page config rides the
  `#bio-config` JSON block.
- **Do** stagger sibling entrances 90–450ms via `data-delay` steps through the
  `motion.js` observer; state entrances land 240–400ms.
- **Do** treat reduced-motion as global: the stylesheet collapses all
  animation/transition to 0.01ms and neutralizes reveals.

### Don't:

- **Don't** put a glow or colored shadow on anything that isn't live,
  focus, or a verdict (The Live-Earns-Glow Rule).
- **Don't** use backdrop-blur on scrolling content; fixed chrome only.
- **Don't** animate `width/height/top/left` — bars fill with `scaleX`,
  strips with `scaleY`.
- **Don't** introduce a third accent or paint free-floating gradients on gaps;
  mint and cyan are state-earned, ≤ ~10% of any screen combined.
- **Don't** hard-code raster font links, inline styles, or inline scripts;
  mono is for console voice, never for prose.
