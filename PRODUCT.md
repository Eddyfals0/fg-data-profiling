# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences read the same report with equal weight:

- **Data scientists** (the owner of this fork included) who open the report in a browser or Jupyter to explore a dataset in depth: they need information density and fast navigation between variables.
- **Non-technical stakeholders** who receive the HTML file: they need to understand the state of the data at a glance (overview, quality alerts) without reading the statistical detail.

## Product Purpose

fg-data-profiling (renamed from ydata-profiling / pandas-profiling) turns a pandas or Spark DataFrame into a one-line exploratory data analysis. The HTML report is the main deliverable: a single shareable file summarising the dataset, each variable, correlations, missing values, duplicates, samples and data-quality alerts. Success means a reader finds the problems in the data quickly and trusts the numbers.

## Operating Context

- Reports are generated from Python (`ProfileReport(df).to_file(...)`, `to_notebook_iframe()`, the `data_profiling` CLI) and opened locally, embedded in a Jupyter iframe, or sent as an attachment.
- The report must work offline as one self-contained HTML file (`html.inline`, `html.use_local_assets`).
- Report variants that share the template: single dataset, comparison of several datasets (`compare`), time-series mode (`tsmode`), sensitive mode (values redacted), minimal mode.

## Capabilities and Constraints

- Rendering pipeline: `BaseDescription` (computed stats) -> `report/structure` (abstract Renderable tree) -> `report/presentation/flavours/html` (Jinja templates). Computation must not change for a UI redesign.
- Report variable types: Numeric, Categorical, Boolean, DateTime, Text, URL, Path, File, Image, TimeSeries, Unsupported.
- Interactive charts: budget of roughly 150 KB extra per report, no third-party chart library; charts are drawn in-browser from data already computed in Python.
- This is a personal fork: the incumbent Bootstrap/Bootswatch report can be replaced rather than kept behind a flag. The widget flavour (ipywidgets) is out of scope.
- Reports can be very wide (hundreds of variables) and very long; layout must stay usable from phone width to wide desktop.

## Brand Commitments

None confirmed. The upstream YData logo and name are not binding for this fork.

## Evidence on Hand

Real datasets for previews live in `examples/` and `tests/` (e.g. titanic, meteorites). No testimonials, metrics or claims exist and none should be invented.

## Product Principles

1. Problems first: data-quality alerts and missingness must be impossible to miss.
2. One file, zero setup: whatever is shipped must open offline from a double click.
3. Numbers are exact and inspectable: interactions reveal exact values, never decorate them away.
4. Scales to wide data: navigation and layout must hold for hundreds of variables.

## Accessibility & Inclusion

No product-specific requirement established; follow WCAG AA as the baseline (contrast, keyboard navigation, charts with text equivalents).
