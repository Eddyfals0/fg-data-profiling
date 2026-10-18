"""Markdown version of the profile report.

Built straight from the computed description (not from the HTML), so that tools
and language models can read the profile as plain text: stable headings, tables
with raw numbers and one sentence per alert. Text follows ``config.language``.
"""
import math
import re
from datetime import date, datetime, timedelta
from typing import Any, Callable, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from data_profiling.config import Settings
from data_profiling.i18n import alert as alert_sentence
from data_profiling.i18n import label, t
from data_profiling.i18n import value as translate_value
from data_profiling.model import BaseDescription
from data_profiling.model.alerts import Alert, AlertType
from data_profiling.report.formatters import fmt_bytesize, fmt_monotonic

TOP_VALUES = 10
SAMPLE_ROWS = 10
FULL_MATRIX_LIMIT = 25

# (English label, summary key, kind). Only the keys a variable has are shown.
STATISTICS: List[Tuple[str, str, str]] = [
    ("Distinct", "n_distinct", "count"),
    ("Distinct (%)", "p_distinct", "percent"),
    ("Missing", "n_missing", "count"),
    ("Missing (%)", "p_missing", "percent"),
    ("Infinite", "n_infinite", "count"),
    ("Infinite (%)", "p_infinite", "percent"),
    ("Mean", "mean", "number"),
    ("Standard deviation", "std", "number"),
    ("Variance", "variance", "number"),
    ("Minimum", "min", "number"),
    ("5-th percentile", "5%", "number"),
    ("Q1", "25%", "number"),
    ("median", "50%", "number"),
    ("Q3", "75%", "number"),
    ("95-th percentile", "95%", "number"),
    ("Maximum", "max", "number"),
    ("Range", "range", "number"),
    ("Interquartile range (IQR)", "iqr", "number"),
    ("Coefficient of variation (CV)", "cv", "number"),
    ("Kurtosis", "kurtosis", "number"),
    ("Skewness", "skewness", "number"),
    ("Median Absolute Deviation (MAD)", "mad", "number"),
    ("Sum", "sum", "number"),
    ("Zeros", "n_zeros", "count"),
    ("Zeros (%)", "p_zeros", "percent"),
    ("Negative", "n_negative", "count"),
    ("Negative (%)", "p_negative", "percent"),
    ("Monotonicity", "monotonic", "monotonic"),
    ("Invalid dates", "n_invalid_dates", "count"),
    ("Invalid dates (%)", "p_invalid_dates", "percent"),
    ("Max length", "max_length", "number"),
    ("Median length", "median_length", "number"),
    ("Mean length", "mean_length", "number"),
    ("Min length", "min_length", "number"),
    ("Total characters", "n_characters", "count"),
    ("Distinct characters", "n_characters_distinct", "count"),
    ("Distinct categories", "n_category", "count"),
    ("Distinct scripts", "n_scripts", "count"),
    ("Distinct blocks", "n_block_alias", "count"),
    ("Memory size", "memory_size", "bytes"),
]


# ---------- Formatting ----------


def _scalar(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (bool, np.bool_)):
        return str(bool(value))
    if isinstance(value, (int, np.integer)):
        return str(int(value))
    if isinstance(value, (float, np.floating)):
        number = float(value)
        if math.isnan(number):
            return "NaN"
        if math.isinf(number):
            return "inf" if number > 0 else "-inf"
        if number.is_integer() and abs(number) < 1e15:
            return str(int(number))
        return f"{number:.6g}"
    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.isoformat()
    if isinstance(value, (timedelta, pd.Timedelta)):
        return str(value)
    return str(value)


def _per_report(value: Any, formatter: Callable[[Any], str]) -> str:
    """Comparison reports hold one value per dataset: join them with " / "."""
    if isinstance(value, (list, tuple)):
        return " / ".join(formatter(v) for v in value)
    return formatter(value)


def _percent(value: Any) -> str:
    try:
        return f"{float(value) * 100:.2f}%"
    except (TypeError, ValueError):
        return _scalar(value)


def _format(value: Any, kind: str) -> str:
    if kind == "percent":
        return _per_report(value, _percent)
    if kind == "bytes":
        return _per_report(value, lambda v: fmt_bytesize(float(v)))
    if kind == "monotonic":
        return _per_report(value, lambda v: str(translate_value(fmt_monotonic(int(v)))))
    return _per_report(value, _scalar)


def _cell(text: Any) -> str:
    content = str(text).replace("\\", "\\\\").replace("|", "\\|")
    return " ".join(content.split())


def _table(headers: Sequence[str], rows: Iterable[Sequence[Any]]) -> str:
    lines = [
        "| " + " | ".join(_cell(h) for h in headers) + " |",
        "|" + "|".join(" --- " for _ in headers) + "|",
    ]
    for row in rows:
        lines.append("| " + " | ".join(_cell(c) for c in row) + " |")
    return "\n".join(lines)


def _code(text: Any) -> str:
    return f"`{str(text).replace('`', '')}`"


def _first(value: Any) -> Any:
    return value[0] if isinstance(value, (list, tuple)) and value else value


def _is_compare(description: BaseDescription) -> bool:
    return isinstance(description.table.get("n"), (list, tuple))


# ---------- Sections ----------


def _header(description: BaseDescription, config: Settings) -> List[str]:
    title = re.sub(r"<[^>]+>", "", str(label(_first(description.analysis.title))))
    started = _first(description.analysis.date_start)
    version = description.package.get("data_profiling_version", "")
    lines = [
        f"# {title}",
        "",
        t(
            "md.generated",
            version=_first(version),
            date=started.strftime("%Y-%m-%d %H:%M") if hasattr(started, "strftime") else started,
        ),
    ]
    labels = config.html.style._labels
    if len(labels) > 1:
        lines.append(t("md.compared", labels=", ".join(labels)))
    return lines


def _dataset_info(config: Settings) -> List[str]:
    metadata = {k: v for k, v in config.dataset.dict().items() if v}
    descriptions = config.variables.descriptions
    if not metadata and not descriptions:
        return []
    lines = ["", f"## {t('md.dataset_info')}", ""]
    if metadata:
        lines.append(
            _table(
                [t("md.metric"), t("md.value")],
                [(k.replace("_", " ").capitalize(), v) for k, v in metadata.items()],
            )
        )
    if descriptions:
        lines += [
            "",
            _table(
                [t("md.variable"), t("md.description")],
                [(_code(k), v) for k, v in descriptions.items()],
            ),
        ]
    return lines


def _overview(description: BaseDescription) -> List[str]:
    table = description.table
    rows = [
        (label("Number of observations"), _format(table.get("n"), "count")),
        (label("Number of variables"), _format(table.get("n_var"), "count")),
        (label("Missing cells"), _format(table.get("n_cells_missing"), "count")),
        (label("Missing cells (%)"), _format(table.get("p_cells_missing"), "percent")),
    ]
    if "n_duplicates" in table:
        rows += [
            (label("Duplicate rows"), _format(table["n_duplicates"], "count")),
            (label("Duplicate rows (%)"), _format(table["p_duplicates"], "percent")),
        ]
    if "memory_size" in table:
        rows += [
            (label("Total size in memory"), _format(table["memory_size"], "bytes")),
            (label("Average record size in memory"), _format(table["record_size"], "bytes")),
        ]
    lines = ["", f"## {t('md.overview')}", "", _table([t("md.metric"), t("md.value")], rows)]

    types = table.get("types", {})
    if isinstance(types, (list, tuple)):
        types = types[0] if types else {}
    if types:
        lines += [
            "",
            f"### {t('md.variable_types')}",
            "",
            _table(
                [t("md.type"), t("md.count")],
                [(label(name), _format(count, "count")) for name, count in types.items()],
            ),
        ]
    return lines


def _alert_text(alert: Alert) -> str:
    values = alert.values or {}
    column = _code(alert.column_name) if alert.column_name is not None else ""
    key = alert.alert_type.name.lower()
    params: dict = {"column": column}
    if key == "constant":
        counts = values.get("value_counts_without_nan")
        params["value"] = counts.index[0] if counts is not None and len(counts) else ""
    elif key in ("dirty_category",):
        params["n"] = values.get("n_fuzzy_vals", "")
    elif key == "high_cardinality":
        params["n"] = values.get("n_distinct", "")
    elif key == "imbalance":
        params["p"] = _percent(values.get("imbalance"))
    elif key in ("infinite", "missing", "zeros", "truncated"):
        params["n"] = values.get(f"n_{key}", "")
        params["p"] = _percent(values.get(f"p_{key}"))
    elif key == "skewed":
        params["v"] = _scalar(values.get("skewness"))
    elif key == "duplicates":
        params.update(
            n=values.get("n_duplicates", ""),
            p=_percent(values.get("p_duplicates")),
            rows=t("alerts.duplicate_rows"),
        )
    elif key == "near_duplicates":
        params.update(
            n=values.get("n_near_dups", ""),
            p=_percent(values.get("p_near_dups")),
            rows=t("alerts.near_duplicate_rows"),
        )
    elif key == "high_correlation":
        fields = list(values.get("fields", []))
        params.update(
            corr=translate_value(values.get("corr", "")),
            field=_code(fields[0]) if fields else "",
            others=t("alerts.and_others", n=len(fields) - 1) if len(fields) > 1 else "",
        )
        if len(fields) > 1:
            params["others"] += " (" + ", ".join(_code(f) for f in fields[1:]) + ")"
    elif key == "type_date":
        params["code"] = "`pd.to_datetime()`"
    try:
        return alert_sentence(key, **params)
    except (KeyError, IndexError):
        return f"{column} {label(alert.alert_type_name)}".strip()


def _alerts(description: BaseDescription, config: Settings) -> List[str]:
    groups = description.alerts if isinstance(description.alerts, tuple) else [description.alerts]
    labels = config.html.style._labels
    lines = ["", f"## {t('md.alerts')}", ""]
    found = False
    for idx, group in enumerate(groups):
        items = [a for a in group if a.alert_type != AlertType.REJECTED]
        if len(groups) > 1:
            lines += [f"### {labels[idx] if idx < len(labels) else idx + 1}", ""]
        for item in items:
            found = True
            lines.append(f"- **{label(item.alert_type_name)}**: {_alert_text(item)}")
        if len(groups) > 1:
            lines.append("")
    if not found:
        lines.append(t("md.no_alerts"))
    return lines


def _variable_alerts(description: BaseDescription) -> dict:
    groups = description.alerts if isinstance(description.alerts, tuple) else [description.alerts]
    names: dict = {}
    for group in groups:
        for item in group:
            if item.alert_type == AlertType.REJECTED or item.column_name is None:
                continue
            bucket = names.setdefault(item.column_name, [])
            name = label(item.alert_type_name)
            if name not in bucket:
                bucket.append(name)
    return names


def _variables(description: BaseDescription, config: Settings) -> List[str]:
    alerts = _variable_alerts(description)
    compare = _is_compare(description)
    lines = ["", f"## {t('md.variables')}", "", f"### {t('md.summary')}", ""]
    lines.append(
        _table(
            [t("md.variable"), t("md.type"), t("md.missing_pct"), t("md.distinct"), t("md.alerts_count")],
            [
                (
                    _code(name),
                    label(str(_first(summary.get("type", "")))),
                    _format(summary.get("p_missing"), "percent"),
                    _format(summary.get("n_distinct"), "count"),
                    ", ".join(alerts.get(name, [])),
                )
                for name, summary in description.variables.items()
            ],
        )
    )

    for name, summary in description.variables.items():
        var_type = str(_first(summary.get("type", "")))
        lines += ["", f"### {_code(name)}", "", f"- {t('md.type')}: {label(var_type)}"]
        if alerts.get(name):
            lines.append(f"- {t('md.alerts')}: {', '.join(alerts[name])}")
        description_text = config.variables.descriptions.get(name)
        if description_text:
            lines.append(f"- {t('md.description')}: {description_text}")

        rows = [
            (label(english), _format(summary[key], kind))
            for english, key, kind in STATISTICS
            if key in summary and summary[key] is not None
        ]
        if rows:
            lines += ["", f"#### {t('md.statistics')}", "", _table([t("md.statistic"), t("md.value")], rows)]

        lines += _top_values(summary, var_type, config, compare)
    return lines


def _top_values(summary: dict, var_type: str, config: Settings, compare: bool) -> List[str]:
    counts = summary.get("value_counts_without_nan")
    if counts is None or compare or not isinstance(counts, pd.Series) or counts.empty:
        return []
    redact = (var_type == "Categorical" and config.vars.cat.redact) or (
        var_type == "Text" and config.vars.text.redact
    )
    lines = ["", f"#### {t('md.top_values')}", ""]
    if redact:
        return lines + [t("md.redacted")]
    total = float(summary.get("count", counts.sum()) or counts.sum())
    top = counts.head(TOP_VALUES)
    rows = [
        (_scalar(index), _scalar(count), _percent(count / total if total else 0))
        for index, count in top.items()
    ]
    rest = counts.iloc[TOP_VALUES:]
    if len(rest):
        rows.append(
            (
                t("md.other_values", n=len(rest)),
                _scalar(rest.sum()),
                _percent(rest.sum() / total if total else 0),
            )
        )
    return lines + [_table([t("md.value"), t("md.count"), t("md.frequency")], rows)]


def _correlations(description: BaseDescription, config: Settings) -> List[str]:
    if not description.correlations:
        return []
    names = {
        "pearson": "Pearson's r",
        "spearman": "Spearman's ρ",
        "kendall": "Kendall's τ",
        "phi_k": "Phik (φk)",
        "cramers": "Cramér's V (φc)",
        "auto": label("Auto"),
    }
    lines = ["", f"## {t('md.correlations')}"]
    for key, matrix in description.correlations.items():
        matrix = _first(matrix)
        if not isinstance(matrix, pd.DataFrame) or matrix.empty:
            continue
        threshold = getattr(config.correlations.get(key), "threshold", 0.5)
        lines += [
            "",
            f"### {names.get(key, key)}",
            "",
            t("md.correlation_method", name=names.get(key, key), threshold=threshold),
            "",
        ]
        columns = list(matrix.columns)
        pairs = []
        for i, a in enumerate(columns):
            for b in columns[i + 1 :]:
                try:
                    coefficient = float(matrix.loc[a, b])
                except (KeyError, TypeError, ValueError):
                    continue
                if not math.isnan(coefficient) and abs(coefficient) >= threshold:
                    pairs.append((a, b, coefficient))
        pairs.sort(key=lambda pair: -abs(pair[2]))
        if pairs:
            lines.append(
                _table(
                    [t("md.pair"), t("md.coefficient")],
                    [(f"{_code(a)} × {_code(b)}", f"{c:.3f}") for a, b, c in pairs],
                )
            )
        else:
            lines.append(t("md.correlation_none", threshold=threshold))
        if len(columns) <= FULL_MATRIX_LIMIT:
            lines += [
                "",
                _table(
                    [""] + [_code(c) for c in columns],
                    [
                        [_code(row)]
                        + [
                            "" if pd.isna(matrix.loc[row, col]) else f"{float(matrix.loc[row, col]):.3f}"
                            for col in columns
                        ]
                        for row in matrix.index
                    ],
                ),
            ]
    return lines


def _missing(description: BaseDescription) -> List[str]:
    rows = []
    for name, summary in description.variables.items():
        missing = summary.get("n_missing", 0)
        per_report = missing if isinstance(missing, (list, tuple)) else [missing]
        if any(_first_float(v) > 0 for v in per_report):
            share = _first_float(_first(summary.get("p_missing")))
            rows.append((name, missing, summary.get("p_missing"), share))
    lines = ["", f"## {t('md.missing')}", ""]
    if not rows:
        return lines + [t("md.missing_none")]
    rows.sort(key=lambda row: -row[3])
    return lines + [
        _table(
            [t("md.column"), t("md.missing_count"), t("md.missing_pct")],
            [(_code(n), _format(m, "count"), _format(p, "percent")) for n, m, p, _ in rows],
        )
    ]


def _first_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _frame(frame: Any, limit: int) -> Optional[str]:
    if not isinstance(frame, pd.DataFrame) or frame.empty:
        return None
    head = frame.head(limit)
    return _table(
        [""] + [str(c) for c in head.columns],
        [[_scalar(index)] + [_scalar(v) for v in row] for index, row in zip(head.index, head.itertuples(index=False))],
    )


def _sample(description: BaseDescription) -> List[str]:
    samples = description.sample
    if not samples:
        return []
    if isinstance(samples, tuple):
        samples = samples[0]
    lines = ["", f"## {t('md.sample')}"]
    for item in samples:
        table = _frame(getattr(item, "data", None), SAMPLE_ROWS)
        if table:
            lines += ["", f"### {label(item.name)}", "", table]
    return lines if len(lines) > 2 else []


def _duplicates(description: BaseDescription) -> List[str]:
    duplicates = _first(description.duplicates)
    count = description.table.get("n_duplicates")
    if count is None and duplicates is None:
        return []
    lines = ["", f"## {t('md.duplicates')}", ""]
    if count is not None:
        lines.append(t("md.duplicates_count", n=_format(count, "count")))
    table = _frame(duplicates, SAMPLE_ROWS)
    if table:
        lines += ["", table]
    return lines


def _reproduction(description: BaseDescription) -> List[str]:
    analysis = description.analysis
    rows = [
        (label("Analysis started"), _scalar(_first(analysis.date_start))),
        (label("Analysis finished"), _scalar(_first(analysis.date_end))),
        (label("Software version"), _scalar(_first(description.package.get("data_profiling_version")))),
    ]
    return ["", f"## {t('md.reproduction')}", "", _table([t("md.metric"), t("md.value")], rows)]


def render_markdown(description: BaseDescription, config: Settings) -> str:
    """Render the profile as Markdown in the active language (see ``i18n.use_language``)."""
    lines: List[str] = []
    lines += _header(description, config)
    lines += _dataset_info(config)
    lines += _overview(description)
    lines += _alerts(description, config)
    lines += _variables(description, config)
    lines += _correlations(description, config)
    lines += _missing(description)
    lines += _sample(description)
    lines += _duplicates(description)
    lines += _reproduction(description)
    return "\n".join(lines).strip() + "\n"
