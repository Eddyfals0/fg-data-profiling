import re

from ipywidgets import widgets

from data_profiling.config import ImageType
from data_profiling.report.presentation.core.image import Image
from data_profiling.visualisation.charts import ChartSpec


class WidgetImage(Image):
    def render(self) -> widgets.Widget:
        image = self.content["image"]
        if isinstance(image, ChartSpec):
            # Widgets cannot run the report script: draw the static version.
            image = image.fallback() or ""
        if self.content["image_format"] == ImageType.svg:
            image = image.replace("svg ", 'svg style="max-width: 100%" ')

            image = re.sub('height="[\\d]+pt"', "", image)
        else:
            alt = self.content["alt"]
            image = f'<img src="{image}" alt="{alt}" />'

        widget = widgets.HTML(image)
        if "caption" in self.content and self.content["caption"] is not None:
            caption = self.content["caption"]
            caption = widgets.HTML(f'<p style="color: #999"><em>{caption}</em></p>')
            return widgets.VBox([widget, caption])
        else:
            return widget
