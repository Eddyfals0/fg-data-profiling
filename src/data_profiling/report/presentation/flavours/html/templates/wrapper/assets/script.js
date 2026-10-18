{% raw %}
(function () {
  "use strict";

  var doc = document;
  var SVG_NS = "http://www.w3.org/2000/svg";

  function $(selector, scope) { return (scope || doc).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(selector)); }

  function h(tag, attrs, parent) {
    var node = doc.createElement(tag);
    setAttrs(node, attrs);
    if (parent) parent.appendChild(node);
    return node;
  }

  function s(tag, attrs, parent) {
    var node = doc.createElementNS(SVG_NS, tag);
    setAttrs(node, attrs);
    if (parent) parent.appendChild(node);
    return node;
  }

  function setAttrs(node, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined) return;
      if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    });
  }

  /* ---------- Text in the report language (strings come from the locale catalog) ---------- */

  // Same lookup rules as data_profiling/i18n.py: the active catalog first, English as fallback.
  var I18N = (function () {
    var node = doc.getElementById("report-i18n");
    try { return node ? JSON.parse(node.textContent) : null; } catch (error) { return null; }
  })() || { language: "en", fallback: "en", catalogs: {} };
  var LANG = I18N.language;
  var compiledPatterns = {};

  function fill(text, values) {
    return String(text).replace(/\{(\w+)\}/g, function (match, name) {
      return values && values[name] !== undefined ? values[name] : match;
    });
  }

  function lookup(section, key, lang) {
    var codes = [lang || LANG, I18N.fallback];
    for (var i = 0; i < codes.length; i++) {
      var catalog = I18N.catalogs[codes[i]];
      var entry = catalog && catalog[section] && catalog[section][key];
      if (entry !== undefined) return entry;
    }
    return undefined;
  }

  function patternsFor(lang) {
    if (compiledPatterns[lang]) return compiledPatterns[lang];
    var catalog = I18N.catalogs[lang] || {};
    compiledPatterns[lang] = Object.keys(catalog.patterns || {}).map(function (source) {
      var names = [];
      var regex = source.split(/\{(\w+)\}/).map(function (part, i) {
        if (i % 2) { names.push(part); return "([\\s\\S]+?)"; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("");
      return { regex: new RegExp("^" + regex + "$"), names: names, target: catalog.patterns[source] };
    });
    return compiledPatterns[lang];
  }

  function trLabel(text, lang) {
    var found = lookup("labels", text, lang);
    if (found !== undefined) return found;
    var codes = [lang || LANG, I18N.fallback];
    for (var c = 0; c < codes.length; c++) {
      var patterns = patternsFor(codes[c]);
      for (var p = 0; p < patterns.length; p++) {
        var match = patterns[p].regex.exec(text);
        if (!match) continue;
        var values = {};
        patterns[p].names.forEach(function (name, i) { values[name] = trLabel(match[i + 1], lang); });
        return fill(patterns[p].target, values);
      }
    }
    return text;
  }

  function T(key, values) {
    var text = lookup("ui", "js." + key);
    return text === undefined ? key : fill(text, values);
  }

  function readArgs(node) {
    try { return JSON.parse(node.getAttribute("data-a") || "{}"); } catch (error) { return {}; }
  }

  var BADGE = /\((\d+)\)/g;

  function translatePage(lang) {
    if (!I18N.catalogs[lang]) return;
    LANG = lang;
    // Alerts first: their sentences contain smaller translatable pieces.
    $$("[data-alert]").forEach(function (node) {
      var sentence = lookup("alerts", node.getAttribute("data-alert"));
      if (sentence !== undefined) node.innerHTML = fill(sentence, readArgs(node));
    });
    $$("[data-t]").forEach(function (node) {
      var text = lookup("ui", node.getAttribute("data-t"));
      if (text !== undefined) node.innerHTML = fill(text, readArgs(node));
    });
    $$("[data-l]").forEach(function (node) {
      var html = trLabel(node.getAttribute("data-l"));
      if (node.getAttribute("data-case") === "lower") html = html.toLowerCase();
      if (node.hasAttribute("data-badge")) html = html.replace(BADGE, '<span class="badge text-bg-secondary align-text-top">$1</span>');
      node.innerHTML = html;
    });
    $$("[data-v]").forEach(function (node) {
      var text = lookup("values", node.getAttribute("data-v"));
      if (text !== undefined) node.textContent = text;
    });
    $$("*").forEach(function (node) {
      if (!node.attributes) return;
      for (var i = 0; i < node.attributes.length; i++) {
        var attr = node.attributes[i];
        if (attr.name.indexOf("data-tl-") === 0) {
          node.setAttribute(attr.name.slice(8), trLabel(attr.value));
          continue;
        }
        if (attr.name.indexOf("data-ta-") !== 0) continue;
        try {
          var spec = JSON.parse(attr.value);
          var text = lookup("ui", spec.k);
          if (text !== undefined) node.setAttribute(attr.name.slice(8), fill(text, spec.a));
        } catch (error) { /* keep the current text */ }
      }
    });
    doc.documentElement.lang = lang;
    var heading = $(".masthead-title");
    if (heading) doc.title = heading.textContent.trim();
    $$("[data-lang]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-lang") === lang ? "true" : "false");
    });
  }

  function cssVar(name, fallback) {
    var value = getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  /* ---------- Number formatting ---------- */

  var grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  function trimZeros(text) {
    return text.indexOf(".") >= 0 ? text.replace(/\.?0+$/, "") : text;
  }

  function compact(value) {
    var abs = Math.abs(value);
    if (abs >= 1e12) return trimZeros((value / 1e12).toFixed(1)) + "T";
    if (abs >= 1e9) return trimZeros((value / 1e9).toFixed(1)) + "B";
    if (abs >= 1e6) return trimZeros((value / 1e6).toFixed(1)) + "M";
    if (abs >= 1e4) return trimZeros((value / 1e3).toFixed(1)) + "k";
    return null;
  }

  function formatTick(value, step) {
    var big = compact(value);
    if (big !== null) return big;
    var decimals = Math.max(0, Math.min(6, -Math.floor(Math.log10(step || 1) + 1e-9)));
    return trimZeros(value.toFixed(decimals)).replace(/^-0$/, "0");
  }

  function formatExact(value) {
    if (value === null || value === undefined || isNaN(value)) return "n/a";
    if (Number.isInteger(value)) return grouped.format(value);
    var abs = Math.abs(value);
    if (abs !== 0 && (abs < 1e-4 || abs >= 1e15)) return value.toExponential(3);
    var precise = trimZeros(value.toPrecision(abs >= 1000 ? 7 : 4));
    var parts = precise.split(".");
    parts[0] = grouped.format(Number(parts[0]));
    if (precise.charAt(0) === "-" && parts[0].charAt(0) !== "-") parts[0] = "-" + parts[0];
    return parts.join(".");
  }

  function formatCount(value) { return grouped.format(Math.round(value)); }

  function formatPercent(part, total) {
    if (!total) return "0%";
    var pct = (part / total) * 100;
    if (pct > 0 && pct < 0.1) return "<0.1%";
    return trimZeros(pct.toFixed(1)) + "%";
  }

  function formatDate(ms, span) {
    var date = new Date(ms);
    var iso = date.toISOString();
    if (span < 2 * 864e5) return iso.slice(0, 16).replace("T", " ");
    if (span < 720 * 864e5) return iso.slice(0, 10);
    return iso.slice(0, 7);
  }

  function niceStep(span, count) {
    var raw = span / Math.max(1, count);
    var power = Math.pow(10, Math.floor(Math.log10(raw)));
    var error = raw / power;
    var factor = error >= 7.5 ? 10 : error >= 3.5 ? 5 : error >= 1.5 ? 2 : 1;
    return factor * power;
  }

  function ticks(min, max, count) {
    if (!(max > min)) return { values: [min], step: 1 };
    var step = niceStep(max - min, count);
    var start = Math.ceil(min / step) * step;
    var values = [];
    for (var v = start; v <= max + step * 1e-9; v += step) values.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return { values: values, step: step };
  }

  /* ---------- Chart registry ---------- */

  var charts = [];

  function initCharts() {
    $$("[data-chart]").forEach(function (figure) {
      var source = $("script[type='application/json']", figure);
      if (!source) return;
      var spec;
      try { spec = JSON.parse(source.textContent); } catch (error) { return; }
      var chart = {
        figure: figure,
        plot: $(".chart-plot", figure),
        readout: $(".chart-readout", figure),
        spec: spec,
        width: 0,
        active: -1
      };
      figure.__chart = chart;
      charts.push(chart);
    });

    if ("ResizeObserver" in window) {
      var pending = new Set();
      var frame = 0;
      var observer = new ResizeObserver(function (entries) {
        entries.forEach(function (entry) { pending.add(entry.target.__chart); });
        if (!frame) {
          frame = requestAnimationFrame(function () {
            frame = 0;
            pending.forEach(drawIfResized);
            pending.clear();
          });
        }
      });
      charts.forEach(function (chart) {
        chart.plot.__chart = chart;
        observer.observe(chart.plot);
      });
    } else {
      var redrawAll = function () { charts.forEach(drawIfResized); };
      window.addEventListener("resize", redrawAll);
      redrawAll();
    }
  }

  function drawIfResized(chart) {
    var width = Math.floor(chart.plot.clientWidth);
    if (!width || width === chart.width) return;
    chart.width = width;
    var draw = DRAWERS[chart.spec.kind];
    if (draw) draw(chart, width);
  }

  function seriesColor(index) {
    return "var(--series-" + (index + 1) + ")";
  }

  function readout(chart, html) {
    chart.readout.innerHTML = html;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- Histogram ---------- */

  function drawHistogram(chart, width) {
    var spec = chart.spec;
    var mini = !!spec.mini;
    var layers = spec.series.filter(function (layer) { return layer.edges.length > 1; });
    if (!layers.length) return;
    var compare = layers.length > 1;

    var xMin = Infinity, xMax = -Infinity, yMax = 0;
    layers.forEach(function (layer) {
      layer.total = 0;
      layer.edges.forEach(function (edge) {
        if (edge === null) return;
        if (edge < xMin) xMin = edge;
        if (edge > xMax) xMax = edge;
      });
      layer.counts.forEach(function (count) {
        layer.total += count || 0;
        if (count > yMax) yMax = count;
      });
    });
    if (xMax === xMin) { xMax = xMin + 1; }
    var span = xMax - xMin;

    var height = mini ? Math.round(Math.max(84, Math.min(128, width * 0.5))) : width < 480 ? 196 : 236;
    var yTicks = ticks(0, yMax || 1, mini ? 2 : 4);
    var yTop = mini ? (yMax || 1) : Math.max(yMax, yTicks.values[yTicks.values.length - 1] || 1);
    var labelWidth = 0;
    if (!mini) {
      yTicks.values.forEach(function (v) { labelWidth = Math.max(labelWidth, formatTick(v, yTicks.step).length); });
    }
    var m = mini
      ? { top: 16, right: 1, bottom: 18, left: 1 }
      : { top: 10, right: 6, bottom: 28, left: Math.max(28, labelWidth * 6.6 + 12) };
    var innerW = Math.max(10, width - m.left - m.right);
    var innerH = height - m.top - m.bottom;

    function sx(v) { return m.left + ((v - xMin) / span) * innerW; }
    function sy(v) { return m.top + innerH - (v / yTop) * innerH; }

    var svg = s("svg", { viewBox: "0 0 " + width + " " + height, width: width, height: height, "aria-hidden": "true" });

    if (!mini) {
      var axisY = s("g", { "class": "axis" }, svg);
      yTicks.values.forEach(function (v) {
        if (v > yTop) return;
        var y = Math.round(sy(v)) + 0.5;
        if (v > 0) s("line", { "class": "grid-line", x1: m.left, x2: width - m.right, y1: y, y2: y }, axisY);
        s("text", { x: m.left - 8, y: y, dy: "0.32em", "text-anchor": "end", text: formatTick(v, yTicks.step) }, axisY);
      });
    }

    var bars = [];
    var band = null;
    if (compare) {
      // Datasets have their own bin edges: draw each as a step outline, told apart
      // by tone and dash rather than hue, with a band marking the hovered bin.
      band = s("rect", { "class": "band", y: m.top, height: innerH, width: 0, visibility: "hidden" }, svg);
      layers.forEach(function (layer, li) {
        var floor = m.top + innerH;
        var d = "";
        for (var j = 0; j < layer.counts.length; j++) {
          var x0 = layer.edges[j], x1 = layer.edges[j + 1];
          if (x0 === null || x1 === null) continue;
          var y = sy(layer.counts[j] || 0);
          d += (d ? "L" : "M" + sx(x0).toFixed(1) + " " + floor + "L") + sx(x0).toFixed(1) + " " + y.toFixed(1) + "L" + sx(x1).toFixed(1) + " " + y.toFixed(1);
        }
        var last = layer.edges[layer.edges.length - 1];
        if (last !== null) d += "L" + sx(last).toFixed(1) + " " + floor;
        s("path", {
          "class": "step",
          d: d,
          stroke: seriesColor(li),
          fill: li === 0 ? "rgb(17 17 17 / 0.07)" : "none",
          "stroke-dasharray": li === 0 ? null : li === 1 ? "4 3" : "1.5 2.5"
        }, svg);
      });
    } else {
      layers.forEach(function (layer) {
        var group = s("g", null, svg);
        var row = [];
        for (var j = 0; j < layer.counts.length; j++) {
          var x0 = layer.edges[j], x1 = layer.edges[j + 1], count = layer.counts[j] || 0;
          if (x0 === null || x1 === null) { row.push(null); continue; }
          var left = sx(x0), right = sx(x1);
          var gap = right - left > 5 ? 1 : 0;
          var y = sy(count);
          row.push(s("rect", {
            "class": "bar",
            x: left + gap / 2,
            y: y,
            width: Math.max(1, right - left - gap),
            height: Math.max(count > 0 ? 1 : 0, m.top + innerH - y),
            rx: mini ? 0.5 : 1
          }, group));
        }
        bars.push(row);
      });
    }

    var base = Math.round(m.top + innerH) + 0.5;
    s("line", { "class": "baseline", x1: m.left, x2: width - m.right, y1: base, y2: base }, svg);

    var axisX = s("g", { "class": "axis" }, svg);
    var fmtX = spec.date
      ? function (v) { return formatDate(v, span); }
      : null;
    if (mini) {
      // A single value mark gives the thumbnail its scale without a full axis.
      s("text", { x: width - m.right, y: m.top - 5, "text-anchor": "end", text: T("max", { n: formatCount(yMax) }) }, axisX);
      s("text", { x: m.left, y: height - 4, "text-anchor": "start", text: fmtX ? fmtX(xMin) : formatExact(xMin) }, axisX);
      s("text", { x: width - m.right, y: height - 4, "text-anchor": "end", text: fmtX ? fmtX(xMax) : formatExact(xMax) }, axisX);
    } else {
      var approx = spec.date ? 110 : 64;
      var xTicks = ticks(xMin, xMax, Math.max(2, Math.floor(innerW / approx)));
      xTicks.values.forEach(function (v) {
        var x = sx(v);
        if (x < m.left - 0.5 || x > width - m.right + 0.5) return;
        s("line", { "class": "baseline", x1: x, x2: x, y1: base, y2: base + 4 }, axisX);
        s("text", {
          x: x, y: height - 8, "text-anchor": "middle",
          text: fmtX ? fmtX(v) : formatTick(v, xTicks.step)
        }, axisX);
      });
    }

    var hit = s("rect", { "class": "hit", x: m.left, y: m.top, width: innerW, height: innerH + (mini ? 0 : 4) }, svg);

    var reference = layers[0];
    var binCount = reference.counts.length;

    function describe(index) {
      if (index < 0) return idleText();
      var x0 = reference.edges[index], x1 = reference.edges[index + 1];
      var lo = fmtX ? fmtX(x0) : formatExact(x0);
      var hi = fmtX ? fmtX(x1) : formatExact(x1);
      var range = T("range", { lo: lo, hi: hi });
      if (!compare) {
        var count = reference.counts[index] || 0;
        return "<b>" + escapeHtml(range) + "</b>  " + T("rows", { n: formatCount(count) }) + "  " + formatPercent(count, reference.total);
      }
      return "<b>" + escapeHtml(range) + "</b>" + layers.map(function (layer, li) {
        var count = layer.counts[index] || 0;
        var label = (spec.labels && spec.labels[li]) || T("dataset", { n: li + 1 });
        return "  " + escapeHtml(label) + " " + formatCount(count) + " (" + formatPercent(count, layer.total) + ")";
      }).join("");
    }

    function idleText() {
      if (mini) return "";
      var peak = 0;
      for (var j = 1; j < binCount; j++) if ((reference.counts[j] || 0) > (reference.counts[peak] || 0)) peak = j;
      var lo = fmtX ? fmtX(reference.edges[peak]) : formatExact(reference.edges[peak]);
      var hi = fmtX ? fmtX(reference.edges[peak + 1]) : formatExact(reference.edges[peak + 1]);
      return T("histogram_idle", { bins: binCount, count: formatCount(reference.counts[peak] || 0), lo: escapeHtml(lo), hi: escapeHtml(hi) });
    }

    function activate(index) {
      if (chart.active >= 0) bars.forEach(function (row) { var r = row[chart.active]; if (r) r.classList.remove("is-active"); });
      chart.active = index;
      if (index >= 0) bars.forEach(function (row) { var r = row[index]; if (r) r.classList.add("is-active"); });
      if (band) {
        if (index >= 0 && reference.edges[index] !== null && reference.edges[index + 1] !== null) {
          band.setAttribute("x", sx(reference.edges[index]));
          band.setAttribute("width", Math.max(1, sx(reference.edges[index + 1]) - sx(reference.edges[index])));
          band.setAttribute("visibility", "visible");
        } else {
          band.setAttribute("visibility", "hidden");
        }
      }
      readout(chart, describe(index));
    }

    function indexAt(clientX) {
      var box = svg.getBoundingClientRect();
      var x = ((clientX - box.left) / box.width) * width;
      var value = xMin + ((x - m.left) / innerW) * span;
      for (var j = 0; j < binCount; j++) {
        if (value >= reference.edges[j] && value <= reference.edges[j + 1]) return j;
      }
      return -1;
    }

    hit.addEventListener("pointermove", function (event) { activate(indexAt(event.clientX)); });
    hit.addEventListener("pointerleave", function () { activate(-1); });

    bindKeys(chart, binCount, activate);
    // Keep the figure's own label and add the summary once (redraws must not stack it).
    if (!chart.baseLabel) chart.baseLabel = chart.plot.getAttribute("aria-label") || "Histogram";
    chart.plot.setAttribute("aria-label", chart.baseLabel + ". " + idleText().replace(/<[^>]+>/g, ""));
    chart.plot.replaceChildren(svg);
    chart.active = -1;
    readout(chart, idleText());
  }

  function bindKeys(chart, count, activate) {
    var figure = chart.figure;
    if (!figure.hasAttribute("tabindex")) figure.setAttribute("tabindex", "0");
    figure.onkeydown = function (event) {
      var next = chart.active;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(count - 1, chart.active + 1);
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, chart.active < 0 ? 0 : chart.active - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = count - 1;
      else if (event.key === "Escape") next = -1;
      else return;
      event.preventDefault();
      activate(next);
    };
    figure.onblur = function () { activate(-1); };
  }

  /* ---------- Category frequencies ---------- */

  function drawFrequency(chart) {
    var spec = chart.spec;
    var series = spec.series;
    var compare = series.length > 1;
    var categories = [];
    var seen = {};
    series.forEach(function (layer) {
      layer.total = layer.counts.reduce(function (a, b) { return a + (b || 0); }, 0);
      layer.lookup = {};
      layer.categories.forEach(function (cat, i) {
        layer.lookup[cat] = layer.counts[i] || 0;
        if (!seen.hasOwnProperty(cat)) { seen[cat] = true; categories.push(cat); }
      });
    });
    var max = 0;
    series.forEach(function (layer) { layer.counts.forEach(function (c) { if (c > max) max = c; }); });

    var list = h("div", { "class": "fq" + (compare ? " fq--compare" : ""), role: "list" });
    var rows = categories.map(function (cat, index) {
      var row = h("div", { "class": "fq-row", role: "listitem" }, list);
      var name = spec.redact ? T("category", { n: index + 1 }) : cat;
      h("span", { "class": "fq-label", title: name, text: name }, row);
      var barBox = h("span", { "class": "fq-bars" }, row);
      series.forEach(function (layer, li) {
        var count = layer.lookup[cat] || 0;
        var bar = h("span", { "class": "fq-bar" }, barBox);
        bar.style.width = max ? (count / max) * 100 + "%" : "0";
        if (compare) bar.style.setProperty("--series-color", seriesColor(li));
        else if (spec.colors && spec.colors.length) bar.style.background = spec.colors[index % spec.colors.length];
      });
      var first = series[0];
      h("span", {
        "class": "fq-value",
        text: compare
          ? series.map(function (layer) { return formatCount(layer.lookup[cat] || 0); }).join(" / ")
          : formatCount(first.lookup[cat] || 0) + "  " + formatPercent(first.lookup[cat] || 0, first.total)
      }, row);
      row.addEventListener("pointerenter", function () { activate(index); });
      row.addEventListener("pointerleave", function () { activate(-1); });
      return { row: row, name: name, cat: cat };
    });

    function describe(index) {
      if (index < 0) return T("frequency_idle", { n: categories.length });
      var item = rows[index];
      return "<b>" + escapeHtml(item.name) + "</b>" + series.map(function (layer, li) {
        var count = layer.lookup[item.cat] || 0;
        var label = compare ? escapeHtml((spec.labels && spec.labels[li]) || T("dataset", { n: li + 1 })) + " " : "";
        return "  " + label + formatCount(count) + " (" + formatPercent(count, layer.total) + ")";
      }).join("");
    }

    function activate(index) {
      if (chart.active >= 0 && rows[chart.active]) rows[chart.active].row.classList.remove("is-active");
      chart.active = index;
      if (index >= 0) rows[index].row.classList.add("is-active");
      readout(chart, describe(index));
    }

    bindKeys(chart, rows.length, activate);
    chart.plot.replaceChildren(list);
    chart.active = -1;
    readout(chart, describe(-1));
  }

  /* ---------- Correlation matrix ---------- */

  function mix(a, b, t) {
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(",") + ")";
  }

  function hexToRgb(hex) {
    var value = hex.replace("#", "");
    if (value.length === 3) value = value.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(value, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function drawCorrelation(chart, width) {
    var spec = chart.spec;
    var rowsLabels = spec.rows, cols = spec.columns, values = spec.values;
    var n = cols.length, nr = rowsLabels.length;
    if (!n || !nr) return;
    var white = [255, 255, 255];
    var positive = hexToRgb(cssVar("--ink", "#111111"));
    var negative = hexToRgb(cssVar("--negative", "#6f8a12"));
    var showLabels = n <= 60;
    var longest = 0;
    rowsLabels.concat(cols).forEach(function (label) { longest = Math.max(longest, Math.min(label.length, 22)); });
    var labelW = showLabels ? Math.min(150, longest * 6.4 + 10) : 4;
    var topH = showLabels ? Math.min(120, longest * 4.9 + 12) : 4;
    var cell = Math.floor((Math.min(width, 980) - labelW - topH * 0.6 - 8) / n);
    cell = Math.max(showLabels ? 12 : 4, Math.min(64, cell));
    var gridW = cell * n, gridH = cell * nr;
    var svgW = labelW + gridW + topH * 0.6, svgH = topH + gridH + 2;

    var svg = s("svg", { viewBox: "0 0 " + svgW + " " + svgH, width: svgW, height: svgH, "aria-hidden": "true" });
    var defs = s("defs", null, svg);
    var pattern = s("pattern", { id: "corr-na-" + charts.indexOf(chart), width: 4, height: 4, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    s("rect", { width: 4, height: 4, fill: "#f2f2f2" }, pattern);
    s("line", { x1: 0, y1: 0, x2: 0, y2: 4, stroke: "#cfcfcf", "stroke-width": 1.5 }, pattern);

    var rowLabelNodes = [], colLabelNodes = [];
    if (showLabels) {
      rowsLabels.forEach(function (label, i) {
        rowLabelNodes.push(s("text", {
          "class": "corr-label", x: labelW - 6, y: topH + i * cell + cell / 2, dy: "0.32em", "text-anchor": "end",
          text: label.length > 22 ? label.slice(0, 21) + "…" : label
        }, svg));
      });
      cols.forEach(function (label, j) {
        var x = labelW + j * cell + cell / 2, y = topH - 6;
        colLabelNodes.push(s("text", {
          "class": "corr-label", x: x, y: y, "text-anchor": "start",
          transform: "rotate(-55 " + x + " " + y + ")",
          text: label.length > 22 ? label.slice(0, 21) + "…" : label
        }, svg));
      });
    }

    var cells = [];
    var showValues = cell >= 34;
    for (var i = 0; i < nr; i++) {
      for (var j = 0; j < n; j++) {
        var v = values[i][j];
        var fill = v === null ? "url(#corr-na-" + charts.indexOf(chart) + ")"
          : v >= 0 ? mix(white, positive, Math.pow(Math.min(1, v), 0.85))
          : mix(white, negative, Math.pow(Math.min(1, -v), 0.85));
        var rect = s("rect", { "class": "corr-cell", x: labelW + j * cell, y: topH + i * cell, width: cell, height: cell, fill: fill }, svg);
        rect.__pos = [i, j];
        cells.push(rect);
        if (showValues && v !== null) {
          // Same curve as the fill: switch to white text once the cell is mid-grey.
          var depth = Math.pow(Math.min(1, Math.abs(v)), 0.85);
          s("text", {
            "class": "corr-value", x: labelW + j * cell + cell / 2, y: topH + i * cell + cell / 2, dy: "0.32em",
            "text-anchor": "middle", fill: depth > 0.42 ? "#ffffff" : "#3a3a3a", text: v.toFixed(2)
          }, svg);
        }
      }
    }

    var focusRing = s("rect", {
      width: cell, height: cell, fill: "none", stroke: "var(--ink)", "stroke-width": 2,
      "pointer-events": "none", visibility: "hidden"
    }, svg);

    function describe(index) {
      if (index < 0) return T("correlation_idle", { rows: nr, cols: n });
      var i = Math.floor(index / n), j = index % n, v = values[i][j];
      return "<b>" + escapeHtml(rowsLabels[i]) + " × " + escapeHtml(cols[j]) + "</b>  " +
        (v === null ? T("coefficient_na") : T("coefficient", { v: (v >= 0 ? " " : "") + v.toFixed(3) }));
    }

    function activate(index) {
      if (chart.active >= 0) {
        var prev = cells[chart.active];
        if (prev) prev.classList.remove("is-active");
        var pi = Math.floor(chart.active / n), pj = chart.active % n;
        if (rowLabelNodes[pi]) rowLabelNodes[pi].classList.remove("is-active");
        if (colLabelNodes[pj]) colLabelNodes[pj].classList.remove("is-active");
      }
      chart.active = index;
      if (index < 0) focusRing.setAttribute("visibility", "hidden");
      if (index >= 0) {
        var node = cells[index];
        node.classList.add("is-active");
        // Outline drawn on top so the printed coefficient stays readable.
        focusRing.setAttribute("x", node.getAttribute("x"));
        focusRing.setAttribute("y", node.getAttribute("y"));
        focusRing.setAttribute("visibility", "visible");
        var ai = Math.floor(index / n), aj = index % n;
        if (rowLabelNodes[ai]) rowLabelNodes[ai].classList.add("is-active");
        if (colLabelNodes[aj]) colLabelNodes[aj].classList.add("is-active");
      }
      readout(chart, describe(index));
    }

    svg.addEventListener("pointermove", function (event) {
      var target = event.target;
      if (target.__pos) activate(target.__pos[0] * n + target.__pos[1]);
    });
    svg.addEventListener("pointerleave", function () { activate(-1); });

    var figure = chart.figure;
    if (!figure.hasAttribute("tabindex")) figure.setAttribute("tabindex", "0");
    figure.onkeydown = function (event) {
      var index = chart.active < 0 ? 0 : chart.active;
      var i = Math.floor(index / n), j = index % n;
      if (event.key === "ArrowRight") j = Math.min(n - 1, j + (chart.active < 0 ? 0 : 1));
      else if (event.key === "ArrowLeft") j = Math.max(0, j - 1);
      else if (event.key === "ArrowDown") i = Math.min(nr - 1, i + (chart.active < 0 ? 0 : 1));
      else if (event.key === "ArrowUp") i = Math.max(0, i - 1);
      else if (event.key === "Escape") { activate(-1); return; }
      else return;
      event.preventDefault();
      activate(i * n + j);
    };
    figure.onblur = function () { activate(-1); };

    chart.plot.replaceChildren(svg);

    // Lets an alert jump straight to the coefficient that proves it.
    chart.focusPair = function (rowName, colName) {
      var i = rowsLabels.indexOf(rowName), j = cols.indexOf(colName);
      if (i < 0 || j < 0) return false;
      activate(i * n + j);
      return true;
    };

    var legend = $(".corr-legend", chart.figure);
    if (!legend) {
      legend = h("div", { "class": "corr-legend", "aria-hidden": "true" });
      chart.plot.insertAdjacentElement("afterend", legend);
      var lowColor = spec.vmin < 0 ? mix(white, negative, 1) : "#ffffff";
      h("span", { text: spec.vmin < 0 ? "−1" : "0" }, legend);
      var bar = h("span", { "class": "corr-legend-bar" }, legend);
      bar.style.background = "linear-gradient(90deg, " + lowColor + ", #ffffff " + (spec.vmin < 0 ? "50%" : "0%") + ", " + mix(white, positive, 1) + ")";
      bar.style.boxShadow = "inset 0 0 0 1px #e6e6e6";
      h("span", { text: "1" }, legend);
      var hasMissing = values.some(function (row) { return row.some(function (v) { return v === null; }); });
      if (hasMissing) h("span", { "class": "corr-legend-missing", "data-t": "js.not_available", text: T("not_available") }, legend);
    }

    chart.active = -1;
    readout(chart, describe(-1));
  }

  /* ---------- Scatter ---------- */

  function drawScatter(chart, width) {
    var spec = chart.spec;
    var density = spec.density;
    var xs = spec.x || [], ys = spec.y || [];
    var xMin, xMax, yMin, yMax;
    if (density) {
      xMin = density.x_edges[0]; xMax = density.x_edges[density.x_edges.length - 1];
      yMin = density.y_edges[0]; yMax = density.y_edges[density.y_edges.length - 1];
    } else {
      if (!xs.length) { chart.plot.replaceChildren(); readout(chart, T("scatter_empty")); return; }
      xMin = Math.min.apply(null, xs); xMax = Math.max.apply(null, xs);
      yMin = Math.min.apply(null, ys); yMax = Math.max.apply(null, ys);
    }
    if (xMax === xMin) { xMin -= 0.5; xMax += 0.5; }
    if (yMax === yMin) { yMin -= 0.5; yMax += 0.5; }
    var padX = (xMax - xMin) * 0.03, padY = (yMax - yMin) * 0.05;
    if (!density) { xMin -= padX; xMax += padX; yMin -= padY; yMax += padY; }

    var height = Math.round(Math.max(240, Math.min(440, width * 0.58)));
    var yt = ticks(yMin, yMax, 5);
    var labelWidth = 0;
    yt.values.forEach(function (v) { labelWidth = Math.max(labelWidth, formatTick(v, yt.step).length); });
    var m = { top: 10, right: 10, bottom: 44, left: Math.max(36, labelWidth * 6.6 + 26) };
    var innerW = width - m.left - m.right, innerH = height - m.top - m.bottom;
    function sx(v) { return m.left + ((v - xMin) / (xMax - xMin)) * innerW; }
    function sy(v) { return m.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH; }

    var svg = s("svg", { viewBox: "0 0 " + width + " " + height, width: width, height: height, "aria-hidden": "true" });
    var axis = s("g", { "class": "axis" }, svg);
    yt.values.forEach(function (v) {
      var y = Math.round(sy(v)) + 0.5;
      s("line", { "class": "grid-line", x1: m.left, x2: width - m.right, y1: y, y2: y }, axis);
      s("text", { x: m.left - 8, y: y, dy: "0.32em", "text-anchor": "end", text: formatTick(v, yt.step) }, axis);
    });
    var xt = ticks(xMin, xMax, Math.max(2, Math.floor(innerW / 72)));
    var base = Math.round(m.top + innerH) + 0.5;
    s("line", { "class": "baseline", x1: m.left, x2: width - m.right, y1: base, y2: base }, axis);
    xt.values.forEach(function (v) {
      var x = sx(v);
      s("line", { "class": "baseline", x1: x, x2: x, y1: base, y2: base + 4 }, axis);
      s("text", { x: x, y: base + 17, "text-anchor": "middle", text: formatTick(v, xt.step) }, axis);
    });
    s("text", { "class": "label", x: m.left + innerW / 2, y: height - 4, "text-anchor": "middle", text: spec.x_label }, svg);
    s("text", { "class": "label", x: 12, y: m.top + innerH / 2, "text-anchor": "middle", transform: "rotate(-90 12 " + (m.top + innerH / 2) + ")", text: spec.y_label }, svg);

    var marker = null;
    var describeIdle = function () {
      return T(density ? "scatter_idle_density" : "scatter_idle", { n: formatCount(spec.n) });
    };

    if (density) {
      var cells = s("g", null, svg);
      var maxCount = 0;
      density.counts.forEach(function (col) { col.forEach(function (c) { if (c > maxCount) maxCount = c; }); });
      var ink = hexToRgb(cssVar("--ink", "#111111"));
      var nodes = [];
      density.counts.forEach(function (col, i) {
        col.forEach(function (count, j) {
          if (!count) return;
          var x0 = sx(density.x_edges[i]), x1 = sx(density.x_edges[i + 1]);
          var y0 = sy(density.y_edges[j + 1]), y1 = sy(density.y_edges[j]);
          var t = Math.pow(count / maxCount, 0.5);
          var rect = s("rect", { x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0), fill: mix([242, 242, 242], ink, 0.12 + t * 0.88) }, cells);
          rect.__cell = [i, j, count];
          nodes.push(rect);
        });
      });
      svg.addEventListener("pointermove", function (event) {
        var c = event.target.__cell;
        if (marker) marker.classList.remove("is-active");
        if (!c) { readout(chart, describeIdle()); return; }
        marker = event.target;
        marker.style.stroke = "var(--accent)";
        readout(chart, "<b>" + escapeHtml(spec.x_label) + "</b> " + T("range", { lo: formatExact(density.x_edges[c[0]]), hi: formatExact(density.x_edges[c[0] + 1]) }) +
          "  <b>" + escapeHtml(spec.y_label) + "</b> " + T("range", { lo: formatExact(density.y_edges[c[1]]), hi: formatExact(density.y_edges[c[1] + 1]) }) +
          "  " + T("rows", { n: formatCount(c[2]) }));
      });
      svg.addEventListener("pointerout", function (event) { if (event.target.__cell) event.target.style.stroke = ""; });
      svg.addEventListener("pointerleave", function () { readout(chart, describeIdle()); });
    } else {
      var dots = s("g", { fill: "var(--ink)", "fill-opacity": xs.length > 400 ? 0.35 : 0.5 }, svg);
      var radius = xs.length > 400 ? 2.2 : 3;
      var px = new Float32Array(xs.length), py = new Float32Array(xs.length);
      for (var i = 0; i < xs.length; i++) {
        px[i] = sx(xs[i]); py[i] = sy(ys[i]);
        s("circle", { cx: px[i].toFixed(1), cy: py[i].toFixed(1), r: radius }, dots);
      }
      var guideX = s("line", { "class": "guide", y1: m.top, y2: m.top + innerH, visibility: "hidden" }, svg);
      var guideY = s("line", { "class": "guide", x1: m.left, x2: m.left + innerW, visibility: "hidden" }, svg);
      marker = s("circle", { r: radius + 3, fill: "var(--ink)", stroke: "#ffffff", "stroke-width": 2, visibility: "hidden" }, svg);
      var hit = s("rect", { "class": "hit", x: m.left, y: m.top, width: innerW, height: innerH }, svg);
      var show = function (index) {
        if (index < 0) {
          [guideX, guideY, marker].forEach(function (n) { n.setAttribute("visibility", "hidden"); });
          readout(chart, describeIdle());
          return;
        }
        guideX.setAttribute("x1", px[index]); guideX.setAttribute("x2", px[index]);
        guideY.setAttribute("y1", py[index]); guideY.setAttribute("y2", py[index]);
        marker.setAttribute("cx", px[index]); marker.setAttribute("cy", py[index]);
        [guideX, guideY, marker].forEach(function (n) { n.setAttribute("visibility", "visible"); });
        readout(chart, "<b>" + escapeHtml(spec.x_label) + "</b> " + formatExact(xs[index]) + "  <b>" + escapeHtml(spec.y_label) + "</b> " + formatExact(ys[index]));
      };
      hit.addEventListener("pointermove", function (event) {
        var box = svg.getBoundingClientRect();
        var x = ((event.clientX - box.left) / box.width) * width;
        var y = ((event.clientY - box.top) / box.height) * height;
        var best = -1, bestDist = 24 * 24;
        for (var k = 0; k < px.length; k++) {
          var dx = px[k] - x, dy = py[k] - y, d = dx * dx + dy * dy;
          if (d < bestDist) { bestDist = d; best = k; }
        }
        show(best);
      });
      hit.addEventListener("pointerleave", function () { show(-1); });
    }

    chart.plot.replaceChildren(svg);
    readout(chart, describeIdle());
  }

  /* ---------- Missing values per column ---------- */

  function drawMissing(chart) {
    var spec = chart.spec;
    var series = spec.series;
    var compare = series.length > 1;
    var order = spec.columns.map(function (name, i) { return i; });
    order.sort(function (a, b) {
      var sa = 0, sb = 0;
      series.forEach(function (layer) {
        sa = Math.max(sa, layer.total ? (layer.missing[a] || 0) / layer.total : 0);
        sb = Math.max(sb, layer.total ? (layer.missing[b] || 0) / layer.total : 0);
      });
      return sb - sa || a - b;
    });

    var list = h("div", { "class": "fq fq--missing" + (compare ? " fq--compare" : ""), role: "list" });
    var complete = 0;
    var rows = order.map(function (i, position) {
      var name = spec.columns[i];
      var worst = 0;
      series.forEach(function (layer) { if ((layer.missing[i] || 0) > 0) worst = 1; });
      if (!worst) complete += 1;
      var row = h("div", { "class": "fq-row" + (worst ? "" : " is-complete"), role: "listitem" }, list);
      h("span", { "class": "fq-label", title: name, text: name }, row);
      var bars = h("span", { "class": "fq-bars" }, row);
      series.forEach(function (layer, li) {
        var track = h("span", { "class": "fq-track" }, bars);
        var bar = h("span", { "class": "fq-bar" }, track);
        var share = layer.total ? (layer.missing[i] || 0) / layer.total : 0;
        bar.style.width = share * 100 + "%";
        if (compare) bar.style.setProperty("--series-color", seriesColor(li));
      });
      h("span", {
        "class": "fq-value",
        text: worst
          ? series.map(function (layer) { return formatPercent(layer.missing[i] || 0, layer.total); }).join(" / ")
          : T("complete")
      }, row);
      row.addEventListener("pointerenter", function () { activate(position); });
      row.addEventListener("pointerleave", function () { activate(-1); });
      return { row: row, index: i };
    });

    function describe(position) {
      if (position < 0) {
        var incomplete = rows.length - complete;
        return incomplete
          ? T("missing_idle", { k: incomplete, n: rows.length })
          : T("missing_none");
      }
      var i = rows[position].index;
      return "<b>" + escapeHtml(spec.columns[i]) + "</b>" + series.map(function (layer, li) {
        var label = compare ? escapeHtml((spec.labels && spec.labels[li]) || T("dataset", { n: li + 1 })) + " " : "";
        var missing = layer.missing[i] || 0;
        return "  " + label + T("missing_of", { m: formatCount(missing), t: formatCount(layer.total), p: formatPercent(missing, layer.total) });
      }).join("");
    }

    function activate(position) {
      if (chart.active >= 0 && rows[chart.active]) rows[chart.active].row.classList.remove("is-active");
      chart.active = position;
      if (position >= 0) rows[position].row.classList.add("is-active");
      readout(chart, describe(position));
    }

    bindKeys(chart, rows.length, activate);
    chart.plot.replaceChildren(list);
    chart.active = -1;
    readout(chart, describe(-1));
  }

  var DRAWERS = {
    histogram: drawHistogram,
    frequency: drawFrequency,
    correlation: drawCorrelation,
    scatter: drawScatter,
    missing: drawMissing
  };

  /* ---------- Tabs ---------- */

  function initTabs() {
    $$("[data-tabs]").forEach(function (group) {
      var tablist = $(":scope > .tablist, :scope > .tabs-axis > .tablist", group);
      if (tablist) {
        var tabs = $$(":scope > .tab", tablist);
        var select = function (tab, focus) {
          tabs.forEach(function (other) {
            var selected = other === tab;
            other.setAttribute("aria-selected", selected ? "true" : "false");
            other.tabIndex = selected ? 0 : -1;
            var panel = doc.getElementById(other.getAttribute("aria-controls"));
            if (panel) panel.hidden = !selected;
          });
          if (focus) tab.focus();
          tab.scrollIntoView({ block: "nearest", inline: "nearest" });
        };
        tabs.forEach(function (tab, index) {
          tab.addEventListener("click", function () { select(tab, false); });
          tab.addEventListener("keydown", function (event) {
            var next = null;
            if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
            else if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
            else if (event.key === "Home") next = tabs[0];
            else if (event.key === "End") next = tabs[tabs.length - 1];
            if (next) { event.preventDefault(); select(next, true); }
          });
        });
      }
      var chooser = $(":scope > .field > [data-tab-select]", group);
      if (chooser) {
        chooser.addEventListener("change", function () {
          $$(":scope > .tabpanel", group).forEach(function (panel) { panel.hidden = panel.id !== chooser.value; });
        });
      }
    });
  }

  function revealTarget(target) {
    // Open any hidden tab or closed disclosure that contains the target.
    var node = target;
    while (node && node !== doc.body) {
      if (node.classList && node.classList.contains("tabpanel") && node.hidden) {
        var tab = doc.querySelector("[aria-controls='" + node.id + "']");
        if (tab) tab.click();
        var chooser = node.parentNode && $(":scope > .field > [data-tab-select]", node.parentNode);
        if (chooser) { chooser.value = node.id; chooser.dispatchEvent(new Event("change")); }
      }
      if (node.tagName === "DETAILS" && !node.open) node.open = true;
      node = node.parentNode;
    }
  }

  /* ---------- Variables: filters, index, keyboard ---------- */

  var sheets = [];
  var state = { query: "", type: "", alertsOnly: false };

  function sheetName(sheet) {
    var node = $(".var-name", sheet);
    return node ? (node.getAttribute("title") || node.textContent).trim() : "";
  }

  function initVariables() {
    // Filter by the same type names the index shows (e.g. "Numeric"), falling back to the sheet label.
    // Types keep their translatable markup (innerHTML) so the language switch reaches them.
    var indexTypes = {};
    var typeMarkup = {};
    $$(".index-list a").forEach(function (link) {
      var type = $(".index-type", link);
      if (type) indexTypes[link.getAttribute("href").slice(1)] = { text: type.textContent.trim(), html: type.innerHTML };
    });
    sheets = $$("[data-sheet]").map(function (sheet) {
      var typeNode = $(".var-type", sheet);
      // Lead with the index's type word; keep the library's finer label as secondary detail.
      var indexType = indexTypes[sheet.id];
      if (typeNode && indexType && typeNode.textContent.trim() !== indexType.text) {
        var detail = typeNode.innerHTML;
        typeNode.innerHTML = indexType.html;
        h("span", { "class": "var-subtype" }, typeNode).innerHTML = detail;
      }
      var type = indexType ? indexType.text : (typeNode ? typeNode.textContent.trim() : "");
      typeMarkup[type] = indexType ? indexType.html : escapeHtml(type);
      return {
        node: sheet,
        name: sheetName(sheet).toLowerCase(),
        type: type,
        alerts: $$(".var-alerts .badge", sheet).length > 0
      };
    });

    var typeBox = $("[data-type-filters]");
    if (typeBox && sheets.length) {
      var counts = {};
      var order = [];
      sheets.forEach(function (sheet) {
        if (!counts[sheet.type]) { counts[sheet.type] = 0; order.push(sheet.type); }
        counts[sheet.type] += 1;
      });
      var make = function (labelHtml, value, count) {
        var chip = h("button", { type: "button", "class": "chip", "data-type": value, "aria-pressed": value === "" ? "true" : "false" }, typeBox);
        h("span", null, chip).innerHTML = labelHtml;
        h("span", { "class": "chip-count", text: String(count) }, chip);
        chip.addEventListener("click", function () {
          state.type = state.type === value ? "" : value;
          syncTypeChips();
          applyFilters();
        });
      };
      if (order.length > 1) {
        make('<span data-t="js.all">' + escapeHtml(T("all")) + "</span>", "", sheets.length);
        order.forEach(function (type) { make(typeMarkup[type], type, counts[type]); });
      } else {
        typeBox.hidden = true;
      }
    }

    $$("[data-variable-filter]").forEach(function (input) {
      input.addEventListener("input", function () {
        state.query = input.value.trim().toLowerCase();
        $$("[data-variable-filter]").forEach(function (other) { if (other !== input) other.value = input.value; });
        applyFilters();
      });
      input.addEventListener("keydown", function (event) {
        if (event.key === "Escape") { input.value = ""; state.query = ""; applyFilters(); input.blur(); }
        if (event.key === "Enter") {
          var first = visibleSheets()[0];
          if (first) { goTo(first.node); closeIndex(); }
        }
      });
    });

    var alertToggle = $("[data-alert-filter]");
    if (alertToggle) {
      if (!sheets.some(function (sheet) { return sheet.alerts; })) alertToggle.closest(".switch").hidden = true;
      alertToggle.addEventListener("change", function () { state.alertsOnly = alertToggle.checked; applyFilters(); });
    }

    applyFilters();
  }

  function syncTypeChips() {
    $$("[data-type-filters] .chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-type") === state.type ? "true" : "false");
    });
  }

  function matches(sheet) {
    return (!state.query || sheet.name.indexOf(state.query) >= 0) &&
      (!state.type || sheet.type === state.type) &&
      (!state.alertsOnly || sheet.alerts);
  }

  function visibleSheets() {
    return sheets.filter(function (sheet) { return !sheet.node.hidden; });
  }

  function applyFilters() {
    var shown = 0;
    sheets.forEach(function (sheet) {
      var visible = matches(sheet);
      sheet.node.hidden = !visible;
      if (visible) shown += 1;
    });
    var count = $("[data-variable-count]");
    if (count) count.textContent = shown === sheets.length ? T("variables", { n: sheets.length }) : T("variables_shown", { shown: shown, total: sheets.length });
    var empty = $("[data-variable-empty]");
    if (empty) empty.hidden = shown !== 0 || !sheets.length;

    var indexShown = 0;
    $$(".index-list > li").forEach(function (item) {
      var visible = !state.query || (item.getAttribute("data-name") || "").indexOf(state.query) >= 0;
      item.hidden = !visible;
      if (visible) indexShown += 1;
    });
    var indexEmpty = $(".index-empty");
    if (indexEmpty) indexEmpty.hidden = indexShown !== 0;
  }

  function clearFiltersFor(target) {
    var sheet = sheets.filter(function (item) { return item.node === target; })[0];
    if (!sheet || !sheet.node.hidden) return;
    state.query = ""; state.type = ""; state.alertsOnly = false;
    $$("[data-variable-filter]").forEach(function (input) { input.value = ""; });
    var alertToggle = $("[data-alert-filter]");
    if (alertToggle) alertToggle.checked = false;
    syncTypeChips();
    applyFilters();
  }

  function goTo(node) {
    clearFiltersFor(node);
    revealTarget(node);
    node.classList.remove("is-arrived");
    void node.offsetWidth;
    node.classList.add("is-arrived");
    if (node.id && history.replaceState) history.replaceState(null, "", "#" + node.id);
    node.scrollIntoView({ block: "start" });
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
    node.focus({ preventScroll: true });
  }

  function currentSheetIndex(list) {
    var offset = parseFloat(getComputedStyle(doc.documentElement).getPropertyValue("--topbar-h")) || 0;
    var line = offset + 96;
    var index = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].node.getBoundingClientRect().top - line <= 1) index = i;
      else break;
    }
    return index;
  }

  function initKeyboard() {
    doc.addEventListener("keydown", function (event) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      var tag = (event.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea" || event.target.isContentEditable) return;
      if (event.key === "/") {
        var filter = $(".toolbar [data-variable-filter]") || $("[data-variable-filter]");
        if (filter) { event.preventDefault(); filter.scrollIntoView({ block: "nearest" }); filter.focus(); }
        return;
      }
      if (event.key !== "j" && event.key !== "k") return;
      var list = visibleSheets();
      if (!list.length) return;
      var index = currentSheetIndex(list);
      var next = event.key === "j" ? Math.min(list.length - 1, index + 1) : Math.max(0, index - 1);
      if (event.key === "k" && index < 0) return;
      event.preventDefault();
      goTo(list[next].node);
    });
  }

  /* ---------- Index drawer and scroll spy ---------- */

  var lastFocus = null;

  function openIndex() {
    doc.body.classList.add("index-open");
    var scrim = $(".scrim");
    if (scrim) scrim.hidden = false;
    var opener = $("[data-index-open]");
    if (opener) opener.setAttribute("aria-expanded", "true");
    lastFocus = doc.activeElement;
    var close = $(".index-close");
    if (close) close.focus();
  }

  function closeIndex() {
    if (!doc.body.classList.contains("index-open")) return;
    doc.body.classList.remove("index-open");
    var scrim = $(".scrim");
    if (scrim) scrim.hidden = true;
    var opener = $("[data-index-open]");
    if (opener) opener.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function initIndex() {
    var opener = $("[data-index-open]");
    if (opener) opener.addEventListener("click", openIndex);
    $$("[data-index-close]").forEach(function (node) { node.addEventListener("click", closeIndex); });
    doc.addEventListener("keydown", function (event) { if (event.key === "Escape") closeIndex(); });

    var index = $("#index");
    if (index) {
      index.addEventListener("click", function (event) {
        var link = event.target.closest("a[href^='#']");
        if (!link) return;
        var target = doc.getElementById(link.getAttribute("href").slice(1));
        if (target && target.hasAttribute("data-sheet")) { event.preventDefault(); goTo(target); }
        closeIndex();
      });
    }

    if (!("IntersectionObserver" in window)) return;
    var links = {};
    $$("[data-spy]").forEach(function (link) { links[link.getAttribute("data-spy")] = link; });
    var current = { section: null, sheet: null };
    var visible = new Map();

    function mark(kind, id) {
      if (current[kind] === id) return;
      if (current[kind] && links[current[kind]]) links[current[kind]].removeAttribute("aria-current");
      current[kind] = id;
      var link = id && links[id];
      if (!link) return;
      link.setAttribute("aria-current", "true");
      if (kind === "sheet") {
        var list = link.closest(".index-list");
        if (list) {
          var top = link.offsetTop - list.offsetTop;
          if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - 40) list.scrollTop = top - list.clientHeight / 2;
        }
      }
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.set(entry.target, entry.boundingClientRect.top);
        else visible.delete(entry.target);
      });
      var bestSection = null, bestSheet = null;
      visible.forEach(function (top, node) {
        var isSheet = node.hasAttribute("data-sheet");
        if (isSheet) { if (!bestSheet || node.getBoundingClientRect().top < bestSheet.getBoundingClientRect().top) bestSheet = node; }
        else if (!bestSection || node.getBoundingClientRect().top < bestSection.getBoundingClientRect().top) bestSection = node;
      });
      if (bestSection) mark("section", bestSection.id);
      mark("sheet", bestSheet ? bestSheet.id : null);
    }, { rootMargin: "-20% 0px -55% 0px" });

    $$(".section").forEach(function (section) { observer.observe(section); });
    sheets.forEach(function (sheet) { observer.observe(sheet.node); });
  }

  /* ---------- Alert ledger ---------- */

  function initLedger() {
    $$("[data-ledger]").forEach(function (ledger) {
      var rows = $$("[data-alert-type]", ledger);
      var title = $(".ledger-title", ledger);
      if (title) h("span", { "class": "ledger-total", text: String(rows.length) }, title);
      var box = $("[data-ledger-filters]", ledger);
      if (!box || rows.length < 4) return;
      var counts = {}, order = [];
      rows.forEach(function (row) {
        var type = row.getAttribute("data-alert-type");
        if (!counts[type]) { counts[type] = 0; order.push(type); }
        counts[type] += 1;
      });
      if (order.length < 2) return;
      var active = "";
      var chips = [];
      var make = function (labelHtml, value, count) {
        var chip = h("button", { type: "button", "class": "chip", "aria-pressed": value === "" ? "true" : "false" }, box);
        h("span", null, chip).innerHTML = labelHtml;
        h("span", { "class": "chip-count", text: String(count) }, chip);
        chips.push([chip, value]);
        chip.addEventListener("click", function () {
          active = active === value ? "" : value;
          chips.forEach(function (pair) { pair[0].setAttribute("aria-pressed", pair[1] === active ? "true" : "false"); });
          rows.forEach(function (row) { row.hidden = !!active && row.getAttribute("data-alert-type") !== active; });
        });
      };
      make('<span data-t="js.all">' + escapeHtml(T("all")) + "</span>", "", rows.length);
      // Chip names reuse the (translated) type label shown on each row.
      order.forEach(function (type) {
        var sample = rows.filter(function (row) { return row.getAttribute("data-alert-type") === type; })[0];
        var shown = sample && $(".ledger-type", sample);
        make(shown ? shown.innerHTML : escapeHtml(type.replace(/_/g, " ")), type, counts[type]);
      });
      box.hidden = false;
    });
  }

  /* ---------- Data tables and comparison labels ---------- */

  var NUMERIC = /^[-+]?(\d[\d,]*\.?\d*|\.\d+)(e[-+]?\d+)?%?$/i;

  function initDataTables() {
    // pandas tables carry no column types: right-align only columns that read as numbers.
    $$("table.dataframe").forEach(function (table) {
      var rows = $$("tbody tr", table);
      var headers = $$("thead tr:last-child th", table);
      headers.forEach(function (header, col) {
        var seen = 0, numeric = 0;
        rows.forEach(function (row) {
          var cell = row.children[col];
          if (!cell) return;
          var text = cell.textContent.trim();
          if (!text || text === "NaN" || text === "None" || text === "NaT") return;
          seen += 1;
          if (NUMERIC.test(text)) numeric += 1;
        });
        if (seen && numeric === seen) {
          header.classList.add("num");
          rows.forEach(function (row) { if (row.children[col]) row.children[col].classList.add("num"); });
        }
      });
    });

    $$(".table-scroll--data").forEach(function (box) {
      var update = function () {
        box.classList.toggle("can-scroll-left", box.scrollLeft > 2);
        box.classList.toggle("can-scroll-right", box.scrollLeft + box.clientWidth < box.scrollWidth - 2);
      };
      box.addEventListener("scroll", update, { passive: true });
      if ("ResizeObserver" in window) new ResizeObserver(update).observe(box);
      update();
    });
  }

  function initCompareLabels() {
    // In comparison reports the per-dataset tables render side by side without a name:
    // borrow the dataset names and swatches from the masthead legend.
    var legend = $$(".masthead .legend li");
    if (legend.length < 2) return;
    $$(".sheet-cell, .grid-cell, .tabpanel").forEach(function (cell) {
      var tables = $$(":scope > .minifreq, :scope > .table-scroll > .freq", cell);
      if (tables.length < 2) return;
      tables.forEach(function (table, idx) {
        var source = legend[idx];
        if (!source) return;
        var label = h("p", { "class": "dataset-label" });
        label.innerHTML = source.innerHTML;
        var anchor = table.classList.contains("freq") ? table.parentNode : table;
        anchor.parentNode.insertBefore(label, anchor);
      });
    });
  }

  function initCorrelationLinks() {
    doc.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest("[data-corr-row]");
      if (!link) return;
      var section = doc.getElementById("correlations_tab");
      if (!section) return;
      event.preventDefault();
      var figure = $(".chart--correlation", section);
      if (figure) revealTarget(figure);
      var target = figure || section;
      target.scrollIntoView({ block: "center" });
      var focus = function () {
        var chart = figure && figure.__chart;
        if (chart && chart.focusPair) chart.focusPair(link.getAttribute("data-corr-row"), link.getAttribute("data-corr-col"));
      };
      requestAnimationFrame(function () { requestAnimationFrame(focus); });
      target.classList.remove("is-arrived");
      void target.offsetWidth;
      target.classList.add("is-arrived");
    }, true);
  }

  /* ---------- Links ---------- */

  function initLinks() {
    $$("a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      if (href.charAt(0) === "#") return;
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });

    doc.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest("a[href^='#']");
      if (!link || link.closest("#index")) return;
      var target = doc.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      if (target.hasAttribute("data-sheet")) { event.preventDefault(); goTo(target); }
      else revealTarget(target);
    });

    window.addEventListener("hashchange", function () {
      var target = location.hash && doc.getElementById(location.hash.slice(1));
      if (target) { clearFiltersFor(target); revealTarget(target); }
    });
  }

  /* ---------- Language switch ---------- */

  var LANG_KEY = "data-profiling-language";

  function setLanguage(lang, remember) {
    if (!I18N.catalogs[lang]) return;
    translatePage(lang);
    applyFilters();
    // Charts write their own text: draw them again in the new language.
    charts.forEach(function (chart) {
      var source = chart.plot.getAttribute("data-tl-aria-label");
      chart.baseLabel = source ? trLabel(source) : chart.baseLabel;
      chart.width = 0;
      drawIfResized(chart);
    });
    if (remember) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (error) { /* storage unavailable */ }
    }
  }

  function initLanguage() {
    $$("[data-lang]").forEach(function (button) {
      button.addEventListener("click", function () { setLanguage(button.getAttribute("data-lang"), true); });
    });
    var stored = null;
    try { stored = localStorage.getItem(LANG_KEY); } catch (error) { stored = null; }
    // The reader's last choice wins over the language the report was generated in.
    if (stored && stored !== LANG && I18N.catalogs[stored]) translatePage(stored);
  }

  function init() {
    initDataTables();
    initCompareLabels();
    initCorrelationLinks();
    initTabs();
    initLedger();
    initVariables();
    initLanguage();
    applyFilters();
    initIndex();
    initKeyboard();
    initLinks();
    initCharts();
    var target = location.hash && doc.getElementById(location.hash.slice(1));
    if (target) { revealTarget(target); target.scrollIntoView(); }
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
{% endraw %}
