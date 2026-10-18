from data_profiling.report.presentation.flavours.html import HTMLHTML
from data_profiling.report.presentation.flavours.html.templates import template


def test_report_title_strip_tags():
    html = template("report.html").render(
        title="<strong>Title</strong>: with <em>tags</em>",
        theme=None,
        body=HTMLHTML("Body"),
        footer=HTMLHTML("Footer"),
        nav=True,
    )

    # Tags should be removed from the report
    assert "<title>Title: with tags</title>" in html

    # But not from the navigation bar
    assert (
        "<strong>Title</strong>: with <em>tags</em></span></a>"
        in html
    )
