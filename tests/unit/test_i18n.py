import re

import numpy as np
import pandas as pd
import pytest

from data_profiling import ProfileReport
from data_profiling import i18n


@pytest.fixture(scope="module")
def df():
    rng = np.random.default_rng(0)
    return pd.DataFrame(
        {
            "amount": rng.normal(100, 15, 200),
            "city": rng.choice(["Lima", "Quito", "Bogotá"], 200),
            "score": np.where(rng.random(200) < 0.3, np.nan, rng.random(200)),
        }
    )


def _keys(catalog: dict) -> dict:
    return {section: set(values) for section, values in catalog.items() if isinstance(values, dict)}


@pytest.mark.parametrize("language", [lang for lang in i18n.SUPPORTED_LANGUAGES if lang != "en"])
def test_catalogs_have_the_same_keys(language):
    assert _keys(i18n.catalog(language)) == _keys(i18n.catalog("en"))


@pytest.mark.parametrize("language", i18n.SUPPORTED_LANGUAGES)
def test_alert_sentences_keep_their_placeholders(language):
    english = i18n.catalog("en")["alerts"]
    for key, sentence in i18n.catalog(language)["alerts"].items():
        placeholders = set(re.findall(r"\{(\w+)\}", sentence))
        assert placeholders == set(re.findall(r"\{(\w+)\}", english[key])), key


def test_label_and_patterns():
    with i18n.use_language("es"):
        assert i18n.label("Number of observations") == "Número de observaciones"
        assert i18n.label("Alerts (7)") == "Alertas (7)"
        assert i18n.label("Minimum 10 values") == "10 valores mínimos"
        assert i18n.label("not in the catalog") == "not in the catalog"
    assert i18n.label("Number of observations") == "Number of observations"


def test_unsupported_language_falls_back_to_english():
    with pytest.warns(UserWarning):
        assert i18n.normalize_language("fr") == "en"
    assert i18n.normalize_language("es-MX") == "es"


def test_default_language_is_english(df):
    report = ProfileReport(df, progress_bar=False, minimal=True)
    assert report.config.language == "en"
    html = report.to_html()
    assert '<html lang="en">' in html or "<html lang=en>" in html
    assert "Number of observations" in html


def test_spanish_html(df):
    html = ProfileReport(df, progress_bar=False, minimal=True, language="es").to_html()
    assert "<html lang=es>" in html or '<html lang="es">' in html
    assert "Número de observaciones" in html
    assert "Celdas faltantes" in html
    assert '"js.complete": "Completa"' in html or '"js.complete":"Completa"' in html


def test_markdown_sections(df):
    markdown = ProfileReport(df, title="Ventas", progress_bar=False).to_markdown()
    assert markdown.startswith("# Ventas\n")
    for heading in ["## Overview", "## Alerts", "## Variables", "## Missing values"]:
        assert heading in markdown
    assert "| `score` |" in markdown
    assert "`score` has" in markdown


def test_spanish_markdown(df):
    markdown = ProfileReport(df, progress_bar=False, language="es").to_markdown()
    for heading in ["## Resumen", "## Alertas", "## Variables", "## Valores faltantes"]:
        assert heading in markdown
    assert "valores faltantes" in markdown


def test_markdown_file(df, tmp_path):
    output = tmp_path / "report.md"
    ProfileReport(df, progress_bar=False, minimal=True).to_file(output)
    assert output.read_text(encoding="utf-8").startswith("# ")


def test_sensitive_markdown_hides_values(df):
    markdown = ProfileReport(df, progress_bar=False, sensitive=True).to_markdown()
    assert "Quito" not in markdown and "Bogotá" not in markdown


def test_html_carries_the_language_switch(df):
    html = ProfileReport(df, progress_bar=False, minimal=True, language="es").to_html()
    assert "data-lang=en" in html and "data-lang=es" in html
    assert 'id=report-i18n' in html or 'id="report-i18n"' in html
    # Visible labels keep their English source so the browser can translate them back.
    assert re.search(r"data-l=\"?Number of observations\"?>Número de observaciones<", html)
