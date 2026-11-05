---
name: ARGUS
description: Multimodal biometric login gate — face and typing rhythm fused inside a watchman's console, rendered in daylight.
colors:
  paper: "#f4f5f2"
  core: "#ffffff"
  ink: "#14181d"
  ink-soft: "#333b44"
  ink-muted: "#64707d"
  hairline: "rgba(20, 24, 29, 0.09)"
  hairline-strong: "rgba(20, 24, 29, 0.16)"
  shell-fill: "rgba(20, 24, 29, 0.035)"
  signal-mint: "#0da271"
  signal-mint-wash: "rgba(12, 151, 106, 0.10)"
  scanner-cyan: "#0e7490"
  optic-bright: "#0e8f7c"
  optic-deep: "#0b7565"
  danger-ember: "#d92d20"
  danger-wash: "rgba(217, 45, 32, 0.09)"
  caution-amber: "#b54708"
  caution-wash: "rgba(181, 71, 8, 0.10)"
  signal-mint-deep: "#0b9370"
  scanner-cyan-deep: "#0c7f9c"
  code-jade: "#0b7565"
  ambient-violet: "rgba(139, 92, 246, 0.10)"
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
    backgroundColor: "{colors.signal-mint-deep}"
    textColor: "#ffffff"
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
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"
    width: "460px"
  card-shell:
    backgroundColor: "{colors.shell-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.outer}"
    padding: "18px 22px 20px"
  chip-status:
    backgroundColor: "{colors.shell-fill}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  toast:
    backgroundColor: "rgba(255, 255, 255, 0.92)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  verdict-accept:
    backgroundColor: "{colors.signal-mint-wash}"
    textColor: "#067a52"
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

**Creative North Star: "The Watchman's Console — in daylight"**

ARGUS renders the hundred-eyed watchman at his instrument. This revision moves
that instrument into daylight: warm paper (`paper #f4f5f2`) instead of a void,
deep graphite ink instead of glowing white, and *porcelain* panels — white
cores seated inside a pale shell — instead of black glass in the dark. The
console is an *Operate* surface: the operator enrolls classmates, judges logins
and reads eval numbers — so craft concentrates in precision furniture: hairline
joints, machined radii, tabular numerals, a dedicated console voice for machine
channels. The rare theatrical moment (the verification pipeline: scan sweep,
staged module rows, verdict stamp) survives the re-skin — it is a committed
product ritual, not decoration; the numbers it displays are always the live
pipeline's actual output. Theatrical motion is spent exactly and only there.

**Key Characteristics:**

- Daylight surface: a faint emerald/violet/cyan *mesh* (10–13% alpha) sits on
  warm paper, with self-hosted grain at 2.8% opacity.
- Porcelain panels in honest depth — 1px ink hairlines mark joints; soft
  ambient shadows lift cards off the paper; blur is reserved to *fixed* chrome
  (nav pill, toasts) where it frosts a moving scene behind it.
- Optic accents (Signal Mint `#0da271` for activation/accept, Scanner Cyan
  `#0e7490` for live optics) are earned by state — never decoration.
- Machine channels (module codes, HUD lines, chips, stamps) speak the console
  voice — JetBrains Mono at 10–10.5px, tracked caps.
- Double-bezel machining survives the re-skin: every card is a pale shell
  around an inset porcelain core, radii strictly concentric.

### What this revision changed

- **The world inverted.** Dark OLED void → warm paper + porcelain cores. The
  accent hues were re-tuned for daylight contrast (deeper mint/cyan) rather
  than flipped to pale pastels.
- **Camera has an on-switch.** The Face step auto-starts the sensor and always
  shows an explicit **Enable camera** control plus a live/blocked state chip.
- **Typing is phased and forgiving.** The rhythm step names the phase
  (A · dwell, B · flight, C · correction) in the HUD line, and a typo corrected
  with backspace no longer voids the round — the correction stays inside the
  sample as behavior.

## Colors

The palette is one trust hue (mint), one optics hue (cyan), two verdict
satellites (amber, ember) and a neutral ladder that is *ink-on-paper — grays
are never independent; secondary text tints from the ink family or the surface
hue.

### Primary

- **Signal Mint** (`#0da271`, wash `rgba(12,151,106,0.10)`): accept verdict,
  active nav/stepper states, live "good" chips, meter fills.
  This is trust earned — the gate said yes.

### Secondary

- **Scanner Cyan** (`#0e7490`): the optics color — camera brackets, FS-code
  text, phase chip, pulse bars. It marks *light entering a sensor*.
- **Bright Optic** (`#0e8f7c`): links, focus outline, foreground accent where
  mint would read as acceptance.
- **Code Jade** (`#0b7565`): inline code literal pills — the deep jade end of
  the optic family (8px pill, tabular numerals).

### Tertiary

- **Optic Deep** (`#0b7565`): the text-grade register of the optic family —
  phase labels, eyebrow text, nav active state.
- **Caution Amber** (`#b54708`, wash `rgba(181,71,8,0.10)`): pending/bypass
  states, the `tag` (θ operating point).
- **Danger Ember** (`#d92d20`, wash `rgba(217,45,32,0.09)`): REJECT, delete,
  knowledge-gate fault, rate-limited notices.

### Neutral

- **Paper** (`#f4f5f2`): the world; page background (mesh sits atop it).
- **Core Panel** (`#ffffff`, gradient `#ffffff→#fcfdfc`): the inner card body —
  a porcelain panel inside each shell.
- **Ink** (`#14181d`): primary text, display type.
- **Ink Soft** (`#333b44`): secondary text, row names.
- **Ink Muted** (`#64707d`): labels, hints, HUD meta text — minimum contrast for
  small caps on paper.
- **Hairline** (`rgba(20,24,29,0.09)` / strong `0.16`): *the only border color
  in the system* — tables, inputs, cards, chips, dividers.
- **Shell Fill** (`rgba(20,24,29,0.035)`): resting fill of pills, shells,
  hover washes.

### Named Rules

**The Live-Earns-Color Rule.** Colored shadows, rings and tints attach only to
live or decision states — running sensor chips, focus, the verdict, the phase
chip. At rest, cards stay seated on ambient shadow alone.

**The Numeral-Only Gradient Rule.** A brand gradient may paint type in exactly
one place — dashboard KPI numerals (`background-clip: text`). Prose and headings
never wear it.

**The Multiply-Not-Screen Rule.** The scan band over the camera feed blends
`multiply` (a bright band would *erase* the feed under `screen`). A
screen-blended light effect only ever belongs on a dark surface.

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
  codes `FS-01`, HUD lines, status chips, phase labels, elapsed counters.

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

**Layered porcelain** (operator's recorded rule): soft shadow and hairline are
the material — cards float above the paper as real layers, not decals. Shadow
stays large, soft and *ambient* (offset down, wide blur, negative spread) so
nothing reads as a sticker; joints are marked by hairlines, and a machine ring
may join only when the panel is live.

### Shadow Vocabulary

- **Ambient seat** (`0 1px 2px rgba(20,24,29,0.05), 0 18px 44px -24px rgba(20,24,29,0.22)`):
  default under every card shell and KPI.
- **Pop lift** (`0 24px 70px -28px rgba(20,24,29,0.35)`): foreground chrome
  only (toasts, nav pill).
- **Press/lift pool** (`0 10px 30px -12px rgba(11,147,112,0.55)`): primary
  button's own colored pool; hover adds `translateY(-1px)`.
- **Live ring** (`0 0 0 1px rgba(13,148,136,0.35), 0 10px 34px -14px rgba(14,116,144,0.35)`):
  the ring token — sensor-live and focus moments.
- **Verdict seat** (`0 12px 34px -18px rgba(12,151,106,0.5)`): ACCEPT banner;
  ember variant `rgba(217,45,32,0.45)` for REJECT.
- **Inset lip** (`inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(20,24,29,0.05)`):
  the inner core's lip — depth that costs no light.

### Named Rules

**The Porcelain Rule.** Blur belongs to fixed chrome (nav, toasts) where it
frosts a live scene behind it; scrolling content never carries
`backdrop-filter`. Depth is shadow + hairline + inset lip — never a darker,
offset "drop shadow" costume, and never a hard black shadow on paper.

## Shapes

Radii form a strict concentric family: `outer 30px → lg 22px → md 16px →
sm 12px → pill 999px`. Cards are **double-bezel**: the outer shell (30px)
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

The system's furniture favors pills and pale shells with wide generous padding;
states are declared with color shifts plus 300–500ms `--ease` motion (accent
deepens where meaning grows). Full snippets (incl. the primary gradient and
motion) live in `.impeccable/design.json`.

### Buttons

- **Shape:** pill (`999px`), padding `11px 20px`, 13.5px/600 text.
- **Primary:** gradient `135deg #0b9370 → #0c7f9c`, text `#ffffff`, colored
  pool shadow, inset top lip. Trailing `↗`/`→` sits in its own 26px inner orb
  that nudges +3px/−2px on hover; press = `scale(0.97)`.
- **Ghost / Danger:** transparent or ember-wash fill, hairline or ember-30%
  border; hover raises fill only.
- **Focus/hover:** border → `rgba(13,148,136,.55)` + a 4px mint focus ring;
  `:focus-visible` ring is always 2px `optic-bright`.

### Chips (HUD)

- **Style:** JetBrains 10px caps, hairline border, shell fill, 5px 12px.
- **State:** `.live` = deep mint text/border with blinking 5px dot (1.6s);
  `.bad` = ember wash. Default dot sits at 50% opacity.

### Cards / Containers

- **Corner Style:** outer 30px shell, concentric inner core 10px (see Shapes).
- **Background:** shell = white-on-paper gradient (`155deg, 92%→66%` fill) at
  hairline border; core = `#ffffff→#fcfdfc` with an inset lip.
- **Shadow Strategy:** ambient seat; live ring only per The Live-Earns-Color
  Rule.
- **Internal Padding:** 18px 22px 20px (14px 16px 16px ≤860px).

### Inputs / Fields

- **Style:** pill, white fill, hairline border, 11px 18px; labels 13px/550
  above (password fields add 0.08em tracking).
- **Focus:** border `rgba(13,148,136,0.55)` + a single soft ring
  (`0 0 0 4px rgba(13,148,136,0.13)`) — no neon halo in daylight.
- **Error:** ember text on ember wash, 1px 28% ember border, 13.5px.

### Navigation

- **Island nav:** detached pill `rgba(255,255,255,0.82)` + 22px blur + 140%
  saturate; links 13.5px/500 with 7px 15px pills. Active link = deep jade text
  on mint-wash with mint-24% inset ring; Admin anchor is a dimmer side pill.
- **Admin sidebar:** 250px fixed column on a paper-white wash, `sidenav` rows
  11px 14px radius 14px; active identical mint treatment; content column
  padding 44px/4vw.

### Signature: KPI numerals

- 30px Space Grotesk 600 with the sanctioned mint→cyan gradient text (the
  Numeral-Only exception), gradient-active envelopes may outline the envelope
  pills themselves (`stepper li.active`).

### Signature: Verdict + console theatre

- **Verdict banner:** lg-radius wash panel, 19–23px Space Grotesk 650, soft
  accept/ember seat (`0 12px 34px −18px`).
- **Stamp:** Space Grotesk 700, `clamp(21px,3.2vw,30px)`, +0.14em tracking; the
  ACCESS GRANTED/DENIED block stamps in (460ms, scale 1.5→0.97→1 with blur
  resolving) and is the system's single loudest authored moment.
- **Console rows:** 4-line grid (62px code / name / 170px bar / 120px stat);
  module codes in Scanner Cyan; fault = ember wash, bypass = amber wash.

### Signature: Phase chip (KD-02)

- The typing phase (`Phase A · Dwell & Hold`) lives in the HUD line as a
  mono chip on a mint wash with a mint hairline; the phase's plain-language
  characteristic sits beside it in muted prose. Changing phase is a 320ms
  color/border shift — never a layout jump.

## Do's and Don'ts

### Do:

- **Do** animate `transform`, `opacity` and bounded `filter` only; use
  `--ease cubic-bezier(0.32,0.72,0,1)` for UI, `--ease-io` for sweeps.
- **Do** keep borders `rgba(20,24,29,0.09)` hairlines and data numerals
  `font-variant-numeric: tabular-nums`.
- **Do** self-host every asset (fonts, noise svg, favicon) — the CSP is
  `default-src 'self'` with no inline style/script; page config rides the
  `#bio-config` JSON block.
- **Do** stagger sibling entrances 90–450ms via `data-delay` steps through the
  `motion.js` observer; state entrances land 240–400ms.
- **Do** treat reduced-motion as global: the stylesheet collapses all
  animation/transition to 0.01ms and neutralizes reveals.
- **Do** give every sensor a visible on-switch and a state chip — the camera
  says `camera on` / `camera off`, the phase says which trait it is measuring.

### Don't:

- **Don't** put a colored shadow or ring on anything that isn't live, focus,
  or a verdict (The Live-Earns-Color Rule).
- **Don't** use backdrop-blur on scrolling content; fixed chrome only.
- **Don't** animate `width/height/top/left` — bars fill with `scaleX`,
  strips with `scaleY`.
- **Don't** introduce a third accent or paint free-floating gradients on gaps;
  mint and cyan are state-earned, ≤ ~10% of any screen combined.
- **Don't** use `mix-blend-mode: screen` on a light surface (The
  Multiply-Not-Screen Rule).
- **Don't** hard-code raster font links, inline styles, or inline scripts;
  mono is for console voice, never for prose.
