"""Data for the report masthead (headline figures) and the variable index."""
from typing import Any, Callable, Dict, List

from data_profiling.i18n import html_label, html_t
from data_profiling.model import BaseDescription
from data_profiling.model.alerts import AlertType
from data_profiling.report.formatters import fmt_bytesize, fmt_number, fmt_percent


def _per_report(value: Any, formatter: Callable[[Any], str]) -> str:
    """Format a statistic; in comparison reports it holds one value per dataset."""
    if isinstance(value, (list, tuple)):
        return " / ".join(formatter(v) for v in value)
    return formatter(value)


def _first(value: Any) -> Any:
    return value[0] if isinstance(value, (list, tuple)) and value else value


def _alerts_by_column(alerts: Any) -> Dict[str, int]:
    # Comparison reports hold a list of alerts per dataset.
    groups = alerts if isinstance(alerts, tuple) else [alerts]
    counts: Dict[str, int] = {}
    for group in groups:
        seen = set()
        for alert in group:
            if alert.alert_type == AlertType.REJECTED or alert.column_name is None:
                continue
            key = (alert.alert_type, alert.column_name)
            if key in seen:
                continue
            seen.add(key)
            counts[alert.column_name] = counts.get(alert.column_name, 0) + 1
    return counts


def _count_alerts(alerts: Any) -> int:
    groups = alerts if isinstance(alerts, tuple) else [alerts]
    keys = {
        (alert.alert_type, alert.column_name)
        for group in groups
        for alert in group
        if alert.alert_type != AlertType.REJECTED
    }
    return len(keys)


def get_masthead(description: BaseDescription) -> Dict[str, Any]:
    table = description.table
    stats: List[Dict[str, str]] = [
        {"label": html_t("stats.observations"), "value": _per_report(table["n"], fmt_number)},
        {
            "label": html_t("stats.variables"),
            "value": _per_report(table["n_var"], fmt_number),
            "note": " · ".join(
                f"{_per_report(count, fmt_number)} {html_label(name, case='lower')}"
                for name, count in _first_list(table.get("types", {})).items()
            ),
        },
        {
            "label": html_t("stats.missing_cells"),
            "value": _per_report(table["p_cells_missing"], fmt_percent),
            "note": html_t("stats.cells", n=_per_report(table["n_cells_missing"], fmt_number)),
        },
    ]
    if "n_duplicates" in table:
        stats.append(
            {
                "label": html_t("stats.duplicate_rows"),
                "value": _per_report(table["n_duplicates"], fmt_number),
                "note": _per_report(table["p_duplicates"], fmt_percent),
            }
        )
    if "memory_size" in table:
        stats.append(
            {
                "label": html_t("stats.memory"),
                "value": _per_report(table["memory_size"], fmt_bytesize),
                "note": html_t("stats.per_row", size=_per_report(table["record_size"], fmt_bytesize))
                if "record_size" in table
                else "",
            }
        )

    alert_counts = _alerts_by_column(description.alerts)
    variables = [
        {
            "name": str(name),
            "type": html_label(str(_first(summary["type"]))),
            "anchor": f"pp_var_{hash(name)}",
            "alerts": alert_counts.get(name, 0),
        }
        for name, summary in description.variables.items()
    ]

    return {
        "stats": stats,
        "index_variables": variables,
        "n_alerts": _count_alerts(description.alerts),
    }


def _first_list(types: Any) -> Dict[str, Any]:
    if isinstance(types, (list, tuple)):
        return types[0] if types else {}
    return types
