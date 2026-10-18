"""Translations for the report text (HTML and Markdown).

Every string lives in a JSON catalog per language under ``data_profiling/locales``:

- ``ui``: interface and Markdown strings, looked up by key (``t("stats.memory")``).
- ``labels``: statistic names, section titles and other labels that the report
  structure builds in English; they are translated by their English text.
- ``patterns``: labels with a variable part, e.g. ``"Minimum {n} values"``.
- ``values``: the few statistic values that are words (e.g. monotonicity).
- ``alerts``: one sentence per alert type, with named placeholders.

English is the default and the fallback for any missing entry.
"""
import json
import re
import warnings
from contextlib import contextmanager
from contextvars import ContextVar
from functools import lru_cache
from html import escape
from importlib import resources
from typing import Any, Dict, Iterator, List, Optional, Pattern, Tuple

DEFAULT_LANGUAGE = "en"
SUPPORTED_LANGUAGES = ("en", "es")

_current: ContextVar[str] = ContextVar("data_profiling_language", default="en")


def normalize_language(language: Optional[str]) -> str:
    """Return a supported language code, falling back to English with a warning."""
    code = (language or DEFAULT_LANGUAGE).strip().lower().replace("_", "-")
    code = code.split("-")[0]
    if code not in SUPPORTED_LANGUAGES:
        warnings.warn(
            f"Language '{language}' is not supported, using English. "
            f"Supported languages: {', '.join(SUPPORTED_LANGUAGES)}."
        )
        return DEFAULT_LANGUAGE
    return code


@lru_cache(maxsize=None)
def catalog(language: str) -> Dict[str, Any]:
    text = (
        resources.files("data_profiling")
        .joinpath("locales", f"{language}.json")
        .read_text(encoding="utf-8")
    )
    return json.loads(text)


@lru_cache(maxsize=None)
def _patterns(language: str) -> List[Tuple[Pattern, str]]:
    compiled = []
    for source, target in catalog(language).get("patterns", {}).items():
        parts = re.split(r"\{(\w+)\}", source)
        regex = "".join(
            re.escape(part) if i % 2 == 0 else f"(?P<{part}>.+?)"
            for i, part in enumerate(parts)
        )
        compiled.append((re.compile(f"^{regex}$", re.S), target))
    return compiled


def get_language() -> str:
    return _current.get()


@contextmanager
def use_language(language: Optional[str]) -> Iterator[str]:
    """Render everything inside the block in ``language``."""
    token = _current.set(normalize_language(language))
    try:
        yield _current.get()
    finally:
        _current.reset(token)


def _lookup(section: str, key: str, language: Optional[str]) -> Optional[str]:
    lang = language or get_language()
    for code in (lang, DEFAULT_LANGUAGE):
        value = catalog(code).get(section, {}).get(key)
        if value is not None:
            return value
    return None


def t(key: str, language: Optional[str] = None, **values: Any) -> str:
    """Interface string by key, with ``{placeholders}`` filled in."""
    text = _lookup("ui", key, language)
    if text is None:
        return key
    return text.format(**values) if values else text


def label(text: Any, language: Optional[str] = None) -> Any:
    """Translate a label the report structure produced in English."""
    if not isinstance(text, str) or not text:
        return text
    translated = _lookup("labels", text, language)
    if translated is not None:
        return translated
    lang = language or get_language()
    for code in dict.fromkeys((lang, DEFAULT_LANGUAGE)):
        for regex, target in _patterns(code):
            match = regex.match(text)
            if match:
                parts = {k: label(v, lang) for k, v in match.groupdict().items()}
                return target.format(**parts)
    return text


def value(text: Any, language: Optional[str] = None) -> Any:
    """Translate a statistic value that is a word (e.g. "Not monotonic")."""
    if not isinstance(text, str):
        return text
    translated = _lookup("values", text, language)
    return translated if translated is not None else text


def alert(key: str, language: Optional[str] = None, **values: Any) -> str:
    """Sentence describing an alert, e.g. ``alert("missing", column=..., n=..., p=...)``."""
    text = _lookup("alerts", key, language)
    if text is None:
        return key
    return text.format(**values)


_BADGE = re.compile(r'(<span class="badge[^"]*"[^>]*>)([^<]+)(</span>)')


def badges(html: Any, language: Optional[str] = None) -> Any:
    """Translate the text of alert badges already rendered as HTML."""
    if not isinstance(html, str):
        return html
    return _BADGE.sub(
        lambda m: m.group(1) + label(m.group(2), language) + m.group(3), html
    )


# ---------- HTML that the report can re-translate in the browser ----------
#
# Visible text is wrapped in a <span> that remembers where it came from (the
# catalog key, or the English label), so the language switch in the report can
# swap it without regenerating the file. Attributes carry the same in data-ta-*.


def _json_attr(data: Any) -> str:
    return escape(json.dumps(data, ensure_ascii=False, default=str), quote=True)


def html_t(key: str, **values: Any) -> str:
    args = f' data-a="{_json_attr(values)}"' if values else ""
    return f'<span data-t="{escape(key, quote=True)}"{args}>{t(key, **values)}</span>'


def html_label(text: Any, badge: bool = False, case: Optional[str] = None) -> Any:
    if not isinstance(text, str) or not text:
        return text
    translated = label(text)
    if case == "lower":
        translated = translated.lower()
    if badge:
        from data_profiling.report.formatters import fmt_badge

        translated = fmt_badge(translated)
    flags = (" data-badge" if badge else "") + (f' data-case="{case}"' if case else "")
    return f'<span data-l="{escape(text, quote=True)}"{flags}>{translated}</span>'


def html_value(text: Any) -> Any:
    if not isinstance(text, str) or _lookup("values", text, DEFAULT_LANGUAGE) is None:
        return text
    return f'<span data-v="{escape(text, quote=True)}">{value(text)}</span>'


def html_alert(key: str, **values: Any) -> str:
    return (
        f'<span data-alert="{escape(key, quote=True)}" data-a="{_json_attr(values)}">'
        f"{alert(key, **values)}</span>"
    )


def html_attr(name: str, key: str, **values: Any) -> str:
    """``name="translated"`` plus what the browser needs to translate it again."""
    return (
        f'{name}="{escape(t(key, **values), quote=True)}" '
        f'data-ta-{name}="{_json_attr({"k": key, "a": values})}"'
    )


def html_badges(html: Any) -> Any:
    """Wrap the text of alert badges (already rendered as HTML) as translatable labels."""
    if not isinstance(html, str):
        return html
    return _BADGE.sub(lambda m: m.group(1) + html_label(m.group(2)) + m.group(3), html)


def languages() -> List[Tuple[str, str]]:
    return [(code, catalog(code).get("language", code)) for code in SUPPORTED_LANGUAGES]


def js_catalogs(language: Optional[str] = None) -> str:
    """Every catalog plus the starting language, as JSON safe inside <script>."""
    data = {
        "language": language or get_language(),
        "fallback": DEFAULT_LANGUAGE,
        "catalogs": {code: catalog(code) for code in SUPPORTED_LANGUAGES},
    }
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
