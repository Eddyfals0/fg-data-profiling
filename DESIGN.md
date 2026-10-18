---
name: fg-data-profiling HTML report
description: A one-file data report in a single neutral scale where every alert links to the chart that proves it.
colors:
  bg: "#fafafa"
  sheet: "#ffffff"
  sunk: "#f2f2f2"
  line: "#e6e6e6"
  line-strong: "#cfcfcf"
  ink: "#111111"
  ink-2: "#3a3a3a"
  muted: "#6b6b6b"
  faint: "#a6a6a6"
  bar: "#c9c9c9"
  accent: "#a6c23f"
  negative: "#6f8a12"
  series-2: "#8a8a8a"
  series-3: "#c2c2c2"
  ledger-text: "#f1f1f1"
  ledger-muted: "#8f8f8f"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2rem, 1.35rem + 2.2vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  figure:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.2rem + 0.9vw, 2rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1.2rem + 0.6vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Mono, Roboto Mono, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  bar: "2px"
  s: "6px"
  item: "8px"
  m: "10px"
  l: "16px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "20": "80px"
components:
  chip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
    height: "32px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.pill}"
  more-toggle:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 12px 6px 14px"
    height: "34px"
  icon-button:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    size: "38px"
  input-search:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    padding: "8px 40px 8px 34px"
    height: "38px"
  tab:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.muted}"
    rounded: "{rounded.item}"
    padding: "5px 14px"
    height: "32px"
  tab-selected:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.item}"
  nav-item:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.item}"
    padding: "6px 10px 6px 24px"
  nav-item-active:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.item}"
  count-badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.pill}"
    height: "18px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.l}"
    padding: "28px 32px"
  ledger:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ledger-text}"
    rounded: "{rounded.l}"
    padding: "28px 32px 12px"
  ledger-proof:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.pill}"
    size: "32px"
  chart-readout:
    textColor: "{colors.muted}"
    typography: "{typography.mono}"
---

# Design System: fg-data-profiling HTML report

## Overview

**Creative North Star: "The Claim and Its Proof"**

The report is an analysis document set in one neutral scale. Near-white ground, white sheets on hairlines, near-black ink, and a ladder of greys carry everything; hue is almost absent. Every claim the report makes has a place where it is proven: an alert is a plain sentence in the ledger, and its round arrow lands on the variable sheet whose table and chart demonstrate it. Exact numbers are always one hover away, read out in a monospace strip under the chart rather than in floating tooltips.

Density is high but calm. A sticky left index holds sections and a filterable list of every variable with its type and alert count; the main column opens with a large title, a hairline-split stats strip, and the inverted ledger, so the state of the data is legible in the first viewport. Below, each variable is a white sheet with key/value tables, a mini chart and a "more details" disclosure.

Emphasis is carried by contrast, never by colour. The one inverted near-black panel is the alert ledger; the one chromatic token is a small olive marker that only ever signals "you are here" or "this one".

**Key Characteristics:**
- One neutral scale; ink #111111 on near-white, greys for hierarchy.
- The alert ledger is the only inverted surface.
- A single olive marker for position, hover guide and arrival, never for text or data categories (correlation's negative pole is the one data exception).
- Figtree at 400/500/600, tabular figures everywhere numbers sit in columns, monospace only for values and readouts.
- Hairlines, soft radii, almost no shadow.

## Colors

A monochrome ladder from near-white to near-black with one small olive marker.

### Primary
- **Report Ink** (ink): text, solid count badges, selected chips, the ledger ground, active bars and the missingness fill. The system's real "primary".

### Secondary
- **Olive Marker** (accent): the active index dot, the hover guide line in histograms, the scatter hover ring, the switch knob ring, the arrival ring on a deep-linked sheet or chart, and (as a 32% wash) text selection. Never text, never a fill area, never the only signal of state.
- **Deep Olive** (negative): the negative pole of the correlation heatmap only. Positive coefficients run to ink.

### Neutral
- **Paper Ground** (bg): page, index and toolbar background.
- **Sheet White** (sheet): variable sheets, inputs, chips, the selected tab and the active index row.
- **Sunk Grey** (sunk): tab tray, hover rows, bar tracks, inline code, sticky data-table header.
- **Hairline** (line): every divider, sheet border, stats-strip rule and table row rule.
- **Strong Hairline** (line-strong): control borders, table header rules, scrollbar thumb, hatching for "other" and missing cells.
- **Second Ink** (ink-2): secondary body text, labels in frequency rows, nav items at rest.
- **Muted Grey** (muted): metadata, captions, column headers, readouts, stat labels.
- **Faint Grey** (faint): control hover borders and the "missing" frequency bar. Not a text colour.
- **Bar Grey** (bar): chart bars at rest; they turn ink on hover.
- **Series Greys** (ink, series-2, series-3): comparison datasets, injected at render time from the Python style config as `--series-1..3`. Told apart by tone plus line dash (solid, `4 3`, `1.5 2.5`).
- **Ledger Text / Ledger Muted** (ledger-text, ledger-muted): body and secondary text inside the inverted ledger; rules there are white at 10% opacity.

### Named Rules
**The Contrast Not Hue Rule.** Severity is carried by inversion and weight: the ledger is ink, alert rows in key/value tables go 600 weight with an ink dot, warning badges go solid ink. No red, amber or green status colours.

**The One Marker Rule.** Olive marks position and focus of attention, at dot, line or ring scale. If it covers an area or carries a word, it is wrong.

**The Grey Series Rule.** Comparison series are greys plus dashes. Olive is never a series colour.

## Typography

**Display Font:** Figtree (inlined as a variable WOFF2, 400 to 700), falling back to ui-sans-serif / system-ui
**Body Font:** Figtree
**Label/Mono Font:** ui-monospace stack (SF Mono, Cascadia Mono, Roboto Mono, Menlo, Consolas)

**Character:** A plain, slightly rounded grotesque set tight at large sizes and relaxed at body size; the monospace appears only where a value is being read out, so it reads as instrumentation.

### Hierarchy
- **Display** (600, fluid 32 to 52px, 1.04): the report title only, max 22ch.
- **Figure** (500, fluid 24 to 32px, 1.1, tabular): the five stats-strip numbers; score values use the same treatment at 40px.
- **Headline** (600, fluid 22 to 28px, 1.2): section titles (Variables, Correlations, ...).
- **Title** (600, 19px): variable names on sheets; item titles drop to 15px/600.
- **Body** (400, 15px, 1.55): running text; descriptions cap at 60ch. Table cells sit at 14px.
- **Label** (500, 13px): stat labels, column heads, chip and tab text (tabs 14px), ledger alert types, captions (muted).
- **Mono** (400, 12px, 1.5, tabular): chart readouts and inline code (0.86em); bold ink for the hovered value.

### Named Rules
**The Tabular Rule.** Any number that can sit above another number uses tabular figures: stats, tables, counts, badges, axes, readouts.

**The Mono Is Instrumentation Rule.** Monospace is for values and readouts (code, column names, chart readouts), not for labels or headings.

## Layout

A two-column shell: a 288px sticky index on the left, a main column up to 1360px with a fluid gutter (`clamp(16px, 3.6vw, 56px)`), padded 48px on top. Sections are separated by 80px (64px on phones) and the footer by 96px; inside, the rhythm steps 4 / 8 / 12 / 16 / 24 / 32.

The stats strip is an auto-fit grid (min 150px) split by vertical hairlines with the first cell flush left. Variable sheets lay out a top grid that is one column on phones, two from 760px, and from 1240px a fixed 200 to 260px info column followed by fluid table and chart columns. Generic grids go 1 / 2 / 3 columns at 760px, and 4-up only at 1200px.

Below 1024px the index becomes an off-canvas drawer (min(340px, 88vw)) behind a 56px sticky top bar and a 28% ink scrim. Below 760px the stats strip goes two-up with crossed hairlines, ledger rows stack type over sentence with the proof arrow at the right, sheets tighten to 20/18px padding, and toolbar chips become a single horizontal scroller. The variables toolbar is sticky on wide screens and static on phones.

## Elevation & Depth

Flat and tonal. Depth comes from the step between Paper Ground and Sheet White plus a hairline; shadows are whispers. The only lifted things are transient: the tooltip, the mobile index drawer, and the switch knob.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 2px rgb(17 17 17 / 0.04), 0 12px 32px -20px rgb(17 17 17 / 0.12)`): variable sheets only; removed in print.
- **Selected tab** (`box-shadow: 0 0 0 1px #e6e6e6, 0 1px 2px rgb(17 17 17 / 0.06)`): the selected segment lifting out of the sunk tray.
- **Tooltip** (`box-shadow: 0 8px 24px -8px rgb(0 0 0 / 0.35)`): ink tooltips on `data-bs-title` elements.
- **Drawer** (`box-shadow: 0 24px 64px -16px rgb(0 0 0 / 0.3)`): the off-canvas index on narrow screens.
- **Scroll edge** (`inset ±28px 0 20px -20px rgb(17 17 17 / 0.18)`): shows more columns in a scrolling data table.

### Named Rules
**The Hairline First Rule.** Separate with a 1px #e6e6e6 rule or a ground step before reaching for a shadow. A new surface that needs a shadow to be seen is in the wrong tone.

## Shapes

Soft, consistent corners: 2px on bars and meter tracks, 6px on tooltips and small rows, 8px on index rows and tab segments, 10px on controls and data tables, 16px on sheets and the ledger (10px for both on phones). Anything count-like or toggle-like is a full pill: chips, count badges, the more-details toggle, the switch. The ledger's proof link and the index section markers are circles. Hatching (135deg stripes in line-strong) marks "other", missing and redacted values.

## Components

### Buttons
Ghost hairline pills; solid ink only for the selected state.
- **Shape:** pill (999px) for chips and the more-details toggle; 10px square for the 38px icon button.
- **Ghost:** Sheet White ground, 1px Strong Hairline border, Second Ink text at 13px/500.
- **Hover / Focus:** border goes to ink (160ms, `cubic-bezier(0.16, 1, 0.3, 1)`); focus is a 2px ink outline offset 2px (white inside the ledger).
- **Selected (chip):** solid ink with white text; its count dims to #bdbdbd.
- **Inverted (in the ledger):** transparent with a 22% white border; selected flips to solid white with ink text.

### Chips
- **Style:** filter chips with an inline muted count, 32px tall, used for alert-type filters in the ledger and variable-type filters in the toolbar.
- **State:** `aria-pressed` toggles; one "All" chip plus one per type.

### Cards / Containers
- **Sheet:** Sheet White, 1px Hairline, 16px radius, Sheet shadow, 28/32px padding. Ignored variables drop to 72% opacity. On arrival from a deep link, a 4px olive ring fades out over 1.6s.
- **Ledger:** the inverted ink panel, 16px radius, rows split by 10%-white rules in a three-column grid (alert type 120 to 168px, sentence, 32px circular proof arrow). Column names in sentences are inline code chips with an underline.
- **Stats strip:** borderless figures between top and bottom hairlines.

### Inputs / Fields
- **Style:** 38px, Sheet White, 1px Strong Hairline, 10px radius, 16px search glyph at left in muted stroke SVG, a `/` keycap hint at right that hides on focus or input.
- **Focus:** border goes ink plus a 3px ink halo at 8%.
- **Select:** same field with a custom chevron; label sits to its left in muted 13px.
- **Switch:** 34x20 pill, Strong Hairline track turning ink when on, white knob with an olive inner ring.

### Navigation
- **Index:** sticky, full-height, on Paper Ground with a right hairline. Section links carry a 6px ring marker that fills olive when current; current rows lift to Sheet White with a 1px hairline ring. Variable rows show name, muted type and a solid ink count badge when the variable has alerts; a filter field sits above the list.
- **Tabs:** a segmented control in a Sunk Grey tray (11px radius, 3px inset); the selected segment is Sheet White with the lifted-tab shadow. A tab list with a single tab hides itself.
- **Keyboard:** `/` focuses the filter, J/K step between sheets, Escape closes the drawer; the footer lists the keys on wide screens.

### Charts and Readout (signature)
In-browser SVG charts: grey bars (Bar Grey) that go ink under the pointer, hairline grid lines, muted 11px axis text. The histogram shows an olive 2px guide on hover. Every chart has a fixed mono readout line below it showing the exact value with the value in bold ink; charts are focusable and keyboard-steppable. The frequency chart is a subgrid of label, bar and value whose row tints Sunk Grey on hover. The correlation heatmap diverges Deep Olive (negative) through white to ink (positive), with hatched cells for missing coefficients.

### Key/Value Tables
Muted 14px row labels left, ink values right, tabular, hairline between rows. A row flagged by an alert goes 600 weight with a 6px ink dot before its label.

## Do's and Don'ts

### Do:
- **Do** keep every surface in the neutral scale and let the ledger be the single inverted panel.
- **Do** pair each alert with a link to the sheet or chart that proves it, and ring the target in olive for 1.6s on arrival.
- **Do** show exact values in the mono readout under each chart (12px, muted, bold ink value).
- **Do** use tabular figures for every number in a column, stat, badge or axis.
- **Do** separate with 1px #e6e6e6 hairlines and the bg-to-sheet step; keep the sheet shadow as the only resting shadow.
- **Do** distinguish comparison datasets by grey tone and dash pattern.
- **Do** hatch "other", missing and redacted values instead of colouring them.

### Don't:
- **Don't** introduce status hues (red, amber, green) for alerts or badges; severity is ink and weight.
- **Don't** use the olive accent for text, filled areas, or comparison series.
- **Don't** put alerts behind a tab or above-the-fold tabs in the overview.
- **Don't** set labels or headings in monospace.
- **Don't** add floating chart tooltips in place of the fixed readout.
- **Don't** use weights outside 400 / 500 / 600.
