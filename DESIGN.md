---
name: ARGUS
description: Multimodal biometric login gate — designed so someone who has never used a biometric can set it up and sign in.
colors:
  paper: "#fffdf9"
  surface: "#ffffff"
  ink: "#1b1b1f"
  ink-2: "#4a4f5a"
  slate: "#5a5f6b"
  hairline: "#e8e4dc"
  hairline-strong: "#d8d3c9"
  teal: "#0f9d8c"
  teal-deep: "#0b7c6e"
  teal-wash: "#e4f6f3"
  clay: "#b45309"
  clay-wash: "#faf0e4"
  rose: "#c0392b"
  rose-wash: "#fbebe9"
typography:
  display:
    fontFamily: "Outfit, DM Sans, sans-serif"
    fontSize: "clamp(30px, 3.6vw, 38px)"
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Outfit, DM Sans, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "DM Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Atkinson Hyperlegible Next, DM Sans, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0"
  helper:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  card: "24px"
  panel: "20px"
  button: "20px"
  input: "16px"
  sm: "12px"
  xs: "8px"
  nav-row: "14px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    padding: "14px 26px"
    minHeight: "56px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "14px 26px"
    minHeight: "56px"
  button-danger:
    backgroundColor: "{colors.rose-wash}"
    textColor: "{colors.rose}"
    rounded: "{rounded.button}"
    padding: "14px 26px"
    minHeight: "56px"
  input-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "14px 20px"
    minHeight: "56px"
    width: "460px"
  card-shell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px 26px 26px"
  chip-status:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.teal-deep}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  toast:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
  verdict-accept:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.teal-deep}"
    rounded: "{rounded.card}"
    padding: "20px 24px"
  verdict-reject:
    backgroundColor: "{colors.rose-wash}"
    textColor: "{colors.rose}"
    rounded: "{rounded.card}"
    padding: "20px 24px"
---

# Design System: ARGUS

## Overview

**Creative North Star: "The Watchman's Console — in daylight"**

ARGUS is a login gate that checks a person's face *and* their typing rhythm. That
fact alone sets the design problem: the person setting it up may not know what a
biometric is, may be on a borrowed laptop, and may be nervous about a camera
pointed at them. So the console is built as a **welcoming desk**, not an
instrument panel — warm paper, one friendly teal accent, plain words, generous
controls, and the reassurance (repeated where it matters) that photos, typing
samples and logs never leave the machine.

**Key characteristics:**

- **Warm, not clinical.** Cream paper (#fffdf9) rather than white, one soft
  teal accent, hairline borders instead of hard edges.
- **Plain language everywhere.** Nothing a person must read says *physiological*,
  *modality*, *dwell*, *clean rounds*, *cosine similarity* or *FAR*. The
  technical vocabulary lives behind a link ("Show me the technical numbers").
- **Big, forgiving controls.** 56px buttons and inputs, sentence-case labels in
  a low-vision typeface, helper text under every field that says what will
  happen — not what is forbidden.
- **No dead ends.** If the camera is off there is always a visible button to
  turn it on; if a step cannot continue, the page says why and what to do.
- **Machine channels stay technical.** Module codes and identifiers live in
  monospace at 13px, in the places where an operator actually wants them.

### What this revision changed

The previous version was a dark, instrument-like console: OLED black, 10px
uppercase mono labels, module codes as the primary way to name things, and a
camera panel that could sit dead and grey with no way to wake it. This revision
keeps the product truth and replaces the visual world and the voice.

## Colors

One trust hue, one accent, two verdict satellites, and a warm neutral ladder.
Grays are never independent — secondary text tints from the ink family.

### Primary

- **Friendly Teal** (`#0f9d8c`, wash `#e4f6f3`): the single accent. Primary
  buttons, the active step, progress, success. Earned by state — it marks
  "this worked", never decoration.

### Secondary

- **Deep Teal** (`#0b7c6e`): text-grade teal for links, the eyebrow, and any
  teal text on paper — light enough to brighten a panel, dark enough to read.
- **Quiet Teal** (`#0e8f7c`): the focus ring and the "runs on this computer"
  chip.

### Tertiary

- **Gentle Clay** (`#b45309`, wash `#faf0e4`): warnings and pending states.
  Softer than amber so it never shouts.
- **Calm Rose** (`#c0392b`, wash `#fbebe9`): errors and "turned away". A
  softened red — the product should never alarm a first-time user.

### Neutral

- **Warm Paper** (`#fffdf9`): the world; page background.
- **Clean Surface** (`#ffffff`): cards, panels, inputs.
- **Deep Ink** (`#1b1b1f`): primary text (never pure black).
- **Ink Soft** (`#4a4f5a`) and **Soft Slate** (`#5a5f6b`): secondary text and
  helper text.
- **Whisper Line** (`#e8e4dc`) and **Whisper Line Strong** (`#d8d3c9`): the only
  border colors in the system.

### Named Rules

**The Plain-Language Rule.** Anything a person must read is written the way a
helpful colleague would say it. Banned in visible copy: *physiological*,
*behavioral*, *modality*, *modality fusion*, *normalized*, *embedding*,
*gallery*, *cosine similarity*, *clean rounds*, *dwell*, *flight*, *FAR*, *FRR*,
*EER*, *AUC*, *threshold*. These may appear only inside the technical
disclosure, where the reader asked for them.

**The No-Dead-End Rule.** A screen may never present a sensor that is off
without a visible, labelled control that turns it on — and that control must
never grey itself out, hide below the fold, or be swallowed by the element it
sits in. The camera toggle lives in the card header beside the state chip, so
it is always on screen and always live.

**The Reassurance Rule.** Wherever a camera or a keyboard is involved, the page
states that the data stays on the machine ("Everything runs on this computer.
Nothing is uploaded."). It appears in the footer of every page and beside every
capture step.

**The One-Accent Rule.** Teal is the only accent. Clay and Rose appear only as
verdict colours. Nothing else is coloured for emphasis.

## Typography

**Display Font:** Outfit (400–700, self-hosted woff2) — friendly geometric
sans, weight-led hierarchy.
**Body Font:** DM Sans (400–700, self-hosted woff2) — warm, very legible.
**Label Font:** Atkinson Hyperlegible Next (400/700, self-hosted woff2) — drawn
for low vision; used for every field label, button and step name.
**Mono Font:** JetBrains Mono (100–800, self-hosted woff2) — identifiers, module
codes and technical readouts only.

### Hierarchy

- **Display** (Outfit 600, `clamp(30px, 3.6vw, 38px)`, 1.14, −0.025em): page
  h1.
- **Title** (Outfit 600, 19px): card h2, brand.
- **Body** (DM Sans 400, 17px, 1.6): all prose; leads capped ≈62ch.
- **Label** (Atkinson 700, 17px): field labels, buttons, step names — never
  uppercase, never small.
- **Helper** (DM Sans 400, 15px, 1.45): the line under a field that explains
  what happens.
- **Mono** (JetBrains 500, 13px): module codes, IDs, numbers in the lab log.

### Named Rules

**The Console Column Rule.** JetBrains Mono belongs to machine channels. It is
never used for an instruction, a label a person acts on, or a sentence.

**The 15px Floor Rule.** No text a person must read is smaller than 15px.
Technical mono may be 13px.

## Layout

One centered column, `max-width: 1120px`, 24px side padding. The novice path
(set up, sign in) is a **single column of steps**; the two-panel form-and-camera
composition only appears where two things must happen side by side. Cards are
24px radius with a 1px hairline and a very soft warm shadow.

- **Spacing rhythm:** 32px between blocks, 44–64px between sections; controls
  are at least 56px tall.
- **Breakpoints:** `md` 900px — nav wraps to a full-width bar, grids collapse to
  one column, the lab sidebar stacks; `sm` 640px — the verification console
  drops its bar column.
- **Responsive discipline:** no horizontal scroll at any width; tap targets
  never below 48px.

## Elevation & Depth

**Porcelain, not glass.** Depth comes from a 1px hairline and a soft, warm,
low-opacity shadow (offset down, wide blur, negative spread) — never a hard
black shadow and never a glow. There is exactly one "live" treatment in the
system: a breathing teal dot on a status chip.

### Shadow Vocabulary

- **Ambient seat** (`0 1px 2px rgba(27,27,31,.05), 0 18px 44px -24px rgba(27,27,31,.22)`):
  under every card and stat tile.
- **Pop lift** (`0 24px 70px -28px rgba(27,27,31,.35)`): foreground chrome only
  (toasts, nav island).
- **Press pool** (`0 10px 26px -14px rgba(15,157,140,.7)`): the primary
  button's own colored pool; hover adds `translateY(-1px)`.
- **Inset lip** (`inset 0 1px 0 rgba(255,255,255,.85), inset 0 -1px 0 rgba(20,24,29,.05)`):
  depth that costs no light.

### Named Rules

**The Porcelain Rule.** Blur belongs to fixed chrome (nav, toasts). Scrolling
content never carries `backdrop-filter`. Depth is hairline + soft shadow +
inset — never a dark offset "drop shadow" costume, and never a glow on a
non-live element.

## Shapes

Radii form one family: `card 24px → panel 20px → button 20px → input 16px →
sm 12px → pill 999px`. Controls break toward the pill — every button, input and
chip is fully rounded. The camera panel is a 24px rectangle with a **dashed**
2px border while it waits, and a solid hairline once the feed is live: the
dashed line is itself a signal ("not ready yet").

### Named Rules

**The Dashed Means Waiting Rule.** A dashed border is reserved for an element
that is waiting for the person (the camera panel, empty photo slots). Solid
hairlines mean "ready".

## Components

States are declared with colour shifts plus 240–420ms `--ease` motion. Full
snippets live in `.impeccable/design.json`.

### Buttons

- **Shape:** pill (20px radius), 56px minimum height, 17px Atkinson 700.
- **Primary:** Friendly Teal fill, white text, colored pool shadow. Exactly one
  primary per screen.
- **Secondary:** white surface, hairline border, deep ink text.
- **Copy:** the button says what happens — "Turn on camera", "Continue to your
  face", "Save my account", "Work it out". Never "Submit", "OK" or "Save".
- **Press:** `translateY(0) scale(0.985)`; hover lifts 1px.

### Inputs

- Label **above** (Atkinson 700, 17px), input below (56px, 16px radius, 1px
  border), helper text **below** the input (15px, Soft Slate).
- The helper answers "what happens", never "what not to do": *"This is also how
  you type — we check your typing rhythm too. A typo is fine, just fix it."*
- Placeholders are human examples (`e.g. priya.sharma`), never instructions.
- Focus: teal border plus a single soft ring `0 0 0 4px rgba(15,157,140,.16)`.

### The camera panel

The single most important component. The panel is a large 24px rectangle that
is in exactly one of two states, and the two states **cross-fade in place**
(240ms) rather than one vanishing and the other popping in somewhere else:

- **Waiting:** a dashed 2px frame over a pale teal wash, a drawn oval face
  guide, and the line *"Look at the camera to switch it on."*
- **Live:** the dashed frame fades out, the video fills the panel, teal corner
  brackets appear, and a calm overlay reads *"Camera on — look straight ahead"*.

The **toggle always lives in the card header**, beside the state chip
(**Camera on** / **Camera off**, with the breathing dot) — never inside the
panel, never below the fold, and never disabled: a control that greys itself
out after it has worked is a dead end. Its label cross-fades over 160ms as it
changes between *Turn on camera* and *Turn camera off*.

The same panel is used on sign-in and on set-up; on set-up it also shows ten
photo slots that fill as frames arrive, plus a plain progress line ("6 of 10
photos taken").

### The step indicator

A row of numbered pills with plain-language names — "Your details", "Your face",
"Your typing", "All done". The current step is filled teal; finished steps get
a check. No module codes, no numbers-only steps.

### Status messages

Always plain English, always reassuring: *"Camera is off — that's fine, switch
it on below."* / *"Nice — round 3 of 8 saved."* / *"No problem — just carry on
typing."* / *"We couldn't switch the camera on — that's fine, you can try
again."* Errors never show an exception name to a person (the error code goes
in parentheses at most).

### The technical disclosure

Numbers live behind a link — "Show me the technical numbers" — which expands
the table and charts. The plain-language answer is always shown first: *"44.0%
of impostors got in, 0.0% of the real person was turned away."*

### Icons

Inline SVG symbols in a same-document sprite (`#i-camera`, `#i-shield`,
`#i-face`, `#i-check-plain`, `#i-bulb`, …). No icon font, no external request,
and every icon sits beside text that carries the meaning on its own.

## Do's and Don'ts

### Do:

- **Do** write instructions as a helpful colleague would: what happens, what to
  do, what if it goes wrong.
- **Do** put a visible, labelled control next to anything that can be off.
- **Do** say where the data goes (nowhere) whenever a camera or keyboard is
  involved.
- **Do** keep the technical numbers behind a disclosure, and state the plain
  answer first.
- **Do** animate `transform` and `opacity` only; `--ease
  cubic-bezier(0.22,1,0.36,1)` for UI, `--ease-io` for the breathing dot.
- **Do** keep tap targets ≥ 48px and text ≥ 15px.
- **Do** treat reduced-motion as global: the stylesheet collapses all
  animation/transition to 0.01ms.
- **Do** self-host every asset — the CSP is `default-src 'self'` with no inline
  style or script; page config rides the `#bio-config` JSON block.

### Don't:

- **Don't** use jargon in anything a person must read (The Plain-Language
  Rule).
- **Don't** name things in all-caps mono labels or module codes — that is the
  operator's language, not the user's.
- **Don't** show a sensor that is off without a button to turn it on (The
  No-Dead-End Rule).
- **Don't** use `mix-blend-mode: screen` on a light surface; use `multiply`.
- **Don't** use backdrop-blur on scrolling content; fixed chrome only.
- **Don't** animate `width/height/top/left` — bars fill with `scaleX`.
- **Don't** introduce a second accent, or colour something for emphasis.
- **Don't** hard-code raster font links, inline styles, or inline scripts.
