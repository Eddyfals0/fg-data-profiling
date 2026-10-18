"""Contains all templates used for generating the HTML profile report"""
import shutil
from pathlib import Path

import jinja2

from data_profiling import i18n
from data_profiling.config import Settings
from data_profiling.report.formatters import fmt, fmt_badge, fmt_numeric, fmt_percent
from data_profiling.visualisation.charts import ChartSpec

# Initializing Jinja
package_loader = jinja2.PackageLoader(
    "data_profiling", "report/presentation/flavours/html/templates"
)
jinja2_env = jinja2.Environment(
    lstrip_blocks=True, trim_blocks=True, loader=package_loader
)
jinja2_env.filters["is_list"] = lambda x: isinstance(x, list)
jinja2_env.filters["fmt_badge"] = fmt_badge
jinja2_env.filters["fmt_percent"] = fmt_percent
jinja2_env.filters["fmt_numeric"] = fmt_numeric
jinja2_env.filters["fmt"] = fmt
jinja2_env.tests["chart"] = lambda x: isinstance(x, ChartSpec)

# Report text in the active language (see data_profiling.i18n.use_language).
# Visible text is emitted with the metadata the in-report language switch needs.
jinja2_env.globals["t"] = i18n.t
jinja2_env.globals["tt"] = i18n.html_t
jinja2_env.globals["ta"] = i18n.html_attr
jinja2_env.globals["alert_text"] = i18n.html_alert
jinja2_env.globals["language"] = i18n.get_language
jinja2_env.globals["languages"] = i18n.languages
jinja2_env.globals["js_catalogs"] = i18n.js_catalogs
jinja2_env.filters["label"] = i18n.html_label
jinja2_env.filters["label_text"] = i18n.label
jinja2_env.filters["value"] = i18n.html_value
jinja2_env.filters["badges"] = i18n.html_badges


def template(template_name: str) -> jinja2.Template:
    """Get the template object given the name.

    Args:
      template_name: The name of the template file (.html)

    Returns:
      The jinja2 environment.

    """
    return jinja2_env.get_template(template_name)


def create_html_assets(config: Settings, output_file: Path) -> None:
    path = output_file.with_name(str(config.html.assets_prefix))
    if path.is_dir():
        shutil.rmtree(path)

    path.joinpath("images").mkdir(parents=True, exist_ok=True)

    # The report ships its own stylesheet (with the font embedded) and script.
    css = ["wrapper/assets/style.css"]
    js = ["wrapper/assets/script.js"]

    css_dir = path / "css"
    if not css_dir.exists():
        css_dir.mkdir()
        for css_file in css:
            (css_dir / Path(css_file).name).write_text(
                template(css_file).render(
                    primary_colors=config.html.style.primary_colors,
                    nav=config.html.navbar_show,
                    style=config.html.style,
                )
            )

    js_dir = path / "js"
    if not js_dir.exists():
        js_dir.mkdir()
        for js_file in js:
            (js_dir / Path(js_file).name).write_text(template(js_file).render())
