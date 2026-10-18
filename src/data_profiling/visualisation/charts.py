"""Data specifications for charts drawn in the browser by the HTML report.

Instead of rendering a static matplotlib image, the plotting functions can return a
``ChartSpec``: the already computed data plus the kind of chart. The HTML flavour
serialises it to JSON and the report script draws it as interactive SVG. Flavours
that cannot run JavaScript (the Jupyter widgets) call ``fallback`` to get the
static image instead.
"""
import json
import math
from datetime import datetime
from typing import Any, Callable, List, Optional, Sequence

import numpy as np
import pandas as pd


class ChartSpec:
    """Chart data for the browser plus the recipe for a static fallback image.

    The fallback is kept as a module-level function and its arguments (not a
    closure) so that reports holding chart specs can still be pickled.
    """

    def __init__(
        self,
        kind: str,
        data: dict,
        fallback: Callable[..., Optional[str]],
        fallback_args: tuple = (),
    ) -> None:
        self.kind = kind
        self.data = data
        self._fallback = fallback
        self._fallback_args = fallback_args

    def fallback(self) -> Optional[str]:
        """Render the chart as a static matplotlib image."""
        return self._fallback(*self._fallback_args)

    def to_dict(self) -> dict:
        return {"kind": self.kind, **self.data}

    def to_json(self) -> str:
        payload = json.dumps(self.to_dict(), default=_json_default, allow_nan=False)
        # The JSON is embedded in a <script> element: never let it close the tag.
        return payload.replace("</", "<\\/")

    def __repr__(self) -> str:
        return f"ChartSpec({self.kind})"


def _json_default(o: Any) -> Any:
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return _clean_float(float(o))
    if isinstance(o, np.ndarray):
        return [_json_default(v) if not isinstance(v, (int, str)) else v for v in o]
    if isinstance(o, (datetime, pd.Timestamp)):
        return o.isoformat()
    return str(o)


def _clean_float(value: float) -> Optional[float]:
    return value if math.isfinite(value) else None


def _floats(values: Sequence) -> List[Optional[float]]:
    return [_clean_float(float(v)) for v in np.asarray(values, dtype=float)]


def _edges(bins: Any, date: bool) -> List[Optional[float]]:
    edges = _floats(bins)
    if date:
        # Date histograms carry their edges in seconds since the epoch; JS wants ms.
        return [None if e is None else e * 1000 for e in edges]
    return edges


def histogram_spec(
    series: Any,
    bins: Any,
    labels: List[str],
    date: bool,
    mini: bool,
    fallback: Callable[..., Optional[str]],
    fallback_args: tuple,
) -> ChartSpec:
    if isinstance(bins, list):
        layers = [
            {"counts": _floats(counts), "edges": _edges(edges, date)}
            for counts, edges in zip(series, bins)
        ]
    else:
        layers = [{"counts": _floats(series), "edges": _edges(bins, date)}]
    return ChartSpec(
        "histogram",
        {"series": layers, "labels": labels, "date": date, "mini": mini},
        fallback,
        fallback_args,
    )


def _css_color(color: str) -> str:
    """Convert any matplotlib colour (e.g. "gold", "C1") to a CSS hex value."""
    from matplotlib.colors import to_hex

    try:
        return to_hex(color)
    except ValueError:
        return str(color)


def frequency_spec(
    data: Any,
    labels: List[str],
    redact: bool,
    colors: Optional[List[str]],
    fallback: Callable[..., Optional[str]],
    fallback_args: tuple,
) -> ChartSpec:
    frames = data if isinstance(data, list) else [data]
    series = []
    for frame in frames:
        counts = pd.Series(frame)
        series.append(
            {
                "categories": [
                    "" if redact else str(c) for c in counts.index.to_list()
                ],
                "counts": _floats(counts.to_numpy()),
            }
        )
    return ChartSpec(
        "frequency",
        {
            "series": series,
            "labels": labels,
            "redact": redact,
            # Only set when the user configured category colours explicitly.
            "colors": [_css_color(c) for c in colors] if colors else None,
        },
        fallback,
        fallback_args,
    )


def correlation_spec(
    data: pd.DataFrame,
    vmin: int,
    fallback: Callable[..., Optional[str]],
    fallback_args: tuple,
) -> ChartSpec:
    try:
        matrix = np.asarray(data, dtype=float)
    except Exception:
        matrix = np.full((len(data), len(data)), np.nan, dtype=float)
    return ChartSpec(
        "correlation",
        {
            "rows": [str(c) for c in data.index],
            "columns": [str(c) for c in data.columns],
            "values": [_floats(row) for row in matrix],
            "vmin": vmin,
        },
        fallback,
        fallback_args,
    )


def _rounded(values: Any) -> List[Optional[float]]:
    # Six significant digits keep scatter payloads small without visible loss.
    return [
        None if v is None else float(f"{v:.6g}") for v in _floats(values)
    ]


def scatter_spec(
    x: pd.Series,
    y: pd.Series,
    x_label: str,
    y_label: str,
    threshold: int,
    fallback: Callable[..., Optional[str]],
    fallback_args: tuple,
) -> ChartSpec:
    mask = x.notna() & y.notna()
    xs = np.asarray(x[mask], dtype=float)
    ys = np.asarray(y[mask], dtype=float)
    finite = np.isfinite(xs) & np.isfinite(ys)
    xs, ys = xs[finite], ys[finite]
    data: dict = {"x_label": str(x_label), "y_label": str(y_label), "n": int(len(xs))}
    if len(xs) > threshold:
        # Too many points to draw one by one: send a 2D density instead.
        counts, x_edges, y_edges = np.histogram2d(xs, ys, bins=40)
        data["density"] = {
            "x_edges": _rounded(x_edges),
            "y_edges": _rounded(y_edges),
            "counts": counts.astype(int).tolist(),
        }
    else:
        data["x"] = _rounded(xs)
        data["y"] = _rounded(ys)
    return ChartSpec("scatter", data, fallback, fallback_args)


def missing_spec(
    columns: List[str],
    missing: List[List[float]],
    totals: List[float],
    labels: List[str],
    fallback: Callable[..., Optional[str]],
    fallback_args: tuple,
) -> ChartSpec:
    return ChartSpec(
        "missing",
        {
            "columns": [str(c) for c in columns],
            "series": [
                {"missing": _floats(values), "total": float(total)}
                for values, total in zip(missing, totals)
            ],
            "labels": labels,
        },
        fallback,
        fallback_args,
    )


def static_image(image: Optional[str]) -> Optional[str]:
    """Fallback for specs built from an image that was already rendered."""
    return image
