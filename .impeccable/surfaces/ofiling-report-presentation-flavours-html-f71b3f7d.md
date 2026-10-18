---
version: 1
slug: "ofiling-report-presentation-flavours-html-f71b3f7d"
primary_target: "src/data_profiling/report/presentation/flavours/html"
related_targets: []
---

# HTML profile report

Scope: the single-file HTML report rendered by the `html` flavour (`report.html` and every template it includes). Mode: Operate.

Audience and job: data scientists exploring a dataset in depth, and non-technical stakeholders who receive the file and need the state of the data at a glance. Success: problems are found in the first viewport and every number can be inspected.

Constraints: one self-contained offline HTML file; interactive charts drawn in-browser from data computed in Python, no third-party chart library, roughly 150 KB budget for CSS+JS; responsive from 360 px to wide desktop; hundreds of variables must stay navigable; compare, time-series, sensitive and minimal variants share the templates.

## Direction contract

THESIS: A data report in one neutral scale where every claim sits next to its proof: each alert is a sentence that links to the chart demonstrating it. Refuses the category default of colourful Bootstrap tabs and badge confetti where alerts hide behind a tab.

OWN-WORLD: Near-white ground #FAFAFA with white sheets hairline-bordered in #E6E6E6, ink #111111, greys #6B6B6B/#A6A6A6/#CFCFCF; one olive accent #A6C23F used only as a marker (active nav ring, hovered bar, focus); alerts carried by contrast, not hue: the alert ledger is the one inverted near-black panel. System sans at two weights, tabular figures, monospace for values and readouts. Ghost hairline buttons, solid black primary.

STORY: The reader sees the dataset's size and health as a stats strip, reads the alert ledger as plain sentences, clicks one and lands on the variable sheet whose chart proves it, hovers bars for exact values, and moves variable to variable from the side index.

FIRST VIEWPORT: Left: sticky index (sections, then a filterable variable list with type and alert count). Main: report title large, dataset line in grey beneath; a full-width stats strip of five figures split by vertical hairlines (observations, variables, missing cells %, duplicate rows, memory); directly below, the inverted alert ledger listing every alert as a linked sentence. No tabs above the fold.

FORM: Monochrome product-marketing canon translated to an analysis report (claim and proof pairing), adopted by the user from the declined challengers; seed key 2f239b4d. Signature interaction: chart hover readout in a fixed mono strip under each chart; alert to proof deep links with a brief highlight on arrival; J/K steps between variable sheets.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Adaptations

- Correlation heatmap: a diverging scale needs a second pole, so negative coefficients use the darker olive #6f8a12 (the accent family) while positive ones use ink. This is the only data use of the accent; comparison series are told apart by grey tone and dash, never by olive.
- Word clouds stay static matplotlib images in greys; their face is the library default unless the user sets `plot.font_path`. Shipping a TTF to match Figtree is out of scope for this build.
