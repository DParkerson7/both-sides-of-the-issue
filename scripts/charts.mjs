import { readFileSync } from "node:fs";
import path from "node:path";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readSeries(file, root) {
  const text = readFileSync(path.join(root, file), "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("#"));
  const header = lines[0].split(",").map((cell) => cell.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const row = {};
    header.forEach((name, index) => {
      row[name] = cells[index];
    });
    return row;
  });
  return { header, rows };
}

function niceStep(span, target) {
  const raw = span / Math.max(target, 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const error = raw / mag;
  const nice = error >= 7.5 ? 10 : error >= 3 ? 5 : error >= 1.5 ? 2 : 1;
  return nice * mag;
}

function ticks(min, max, count) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const step = niceStep(max - min, count);
  const start = Math.ceil((min - step * 0.001) / step) * step;
  const values = [];
  for (let value = start; value <= max + step * 0.001; value += step) {
    values.push(Number(value.toFixed(8)));
    if (values.length > 12) break;
  }
  return values;
}

function formatTick(value) {
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value).toLocaleString("en-US");
  if (abs >= 100) return String(Math.round(value));
  if (Number.isInteger(value)) return String(value);
  if (abs >= 10) return value.toFixed(0);
  if (abs >= 1) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/0$/, "").replace(/\.$/, "");
}

function formatValue(value, decimals) {
  if (decimals === 0) return Math.round(value).toLocaleString("en-US");
  if (decimals > 0) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return formatTick(value);
}

function domain(values, includeZero) {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.08;
  if (includeZero && min === 0) min = 0;
  else min -= pad;
  if (includeZero && max === 0) max = 0;
  else max += pad;
  return { min, max };
}

function svgText(x, y, text, extra = "") {
  return `<text x="${x}" y="${y}" ${extra}>${escapeHtml(text)}</text>`;
}

function lineChart(chart, seriesList) {
  const width = 640;
  const height = 400;
  const left = 72;
  const right = 16;
  const top = seriesList.length > 1 ? 52 : 16;
  const bottom = 46;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const values = seriesList.flatMap((series) => series.values);
  const { min, max } = domain(values, chart.includeZero !== false);
  const yTicks = ticks(min, max, 5).filter((tick) => tick >= min - 1e-9 && tick <= max + 1e-9);
  const xValues = seriesList[0].points.map((point) => point.x);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xSpan = xMax - xMin || 1;
  const xAt = (x) => left + ((x - xMin) / xSpan) * plotW;
  const yAt = (y) => top + ((max - y) / (max - min)) * plotH;
  const xTickCount = xValues.length > 80 ? 5 : 4;
  const xTicks = ticks(xMin, xMax, xTickCount).filter((tick) => tick >= xMin && tick <= xMax);
  const grid = yTicks
    .map((tick) => {
      const y = yAt(tick).toFixed(1);
      return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="grid"/><text class="tick" x="${left - 8}" y="${y}" dy="0.32em" text-anchor="end">${formatTick(tick)}</text>`;
    })
    .join("");
  const xLabels = xTicks
    .map((tick) => svgText(xAt(tick).toFixed(1), height - 18, String(Math.round(tick)), 'class="tick" text-anchor="middle"'))
    .join("");
  const zero = min < 0 && max > 0 ? `<line x1="${left}" y1="${yAt(0).toFixed(1)}" x2="${width - right}" y2="${yAt(0).toFixed(1)}" class="zero"/>` : "";
  const colors = ["#0b4f4c", "#8a4630"];
  const paths = seriesList
    .map((series, index) => {
      const d = series.points
        .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${xAt(point.x).toFixed(1)} ${yAt(point.y).toFixed(1)}`)
        .join(" ");
      const dash = index === 1 ? ' stroke-dasharray="7 4"' : "";
      return `<path d="${d}" fill="none" stroke="${colors[index % colors.length]}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"${dash}/>`;
    })
    .join("");
  const legend = seriesList
    .map((series, index) => {
      if (!series.name) return "";
      const y = 18 + index * 18;
      const dash = index === 1 ? ' stroke-dasharray="6 3"' : "";
      return `<line x1="${left + 8}" y1="${y}" x2="${left + 32}" y2="${y}" stroke="${colors[index % colors.length]}" stroke-width="2.6"${dash}/><text class="legend" x="${left + 38}" y="${y}" dy="0.32em">${escapeHtml(series.name)}</text>`;
    })
    .join("");
  return { width, height, body: `${grid}${zero}${paths}${xLabels}${legend}`, yLabel: chart.yLabel, xLabel: chart.xLabel };
}

function barChart(chart, points) {
  const width = 640;
  const row = 32;
  const top = 12;
  const left = 118;
  const right = 84;
  const height = top + points.length * row + 16;
  const values = points.map((point) => point.y);
  const max = Math.max(...values, 0) * 1.05 || 1;
  const plotW = width - left - right;
  const bars = points
    .map((point, index) => {
      const y = top + index * row;
      const barW = Math.max(0, (point.y / max) * plotW);
      return `<text class="tick" x="${left - 8}" y="${y + 16}" text-anchor="end">${escapeHtml(point.label)}</text>
        <rect x="${left}" y="${y + 4}" width="${barW.toFixed(1)}" height="18" rx="3" fill="#0b4f4c"/>
        <text class="tick" x="${(left + barW + 6).toFixed(1)}" y="${y + 17}">${escapeHtml(point.valueLabel)}</text>`;
    })
    .join("");
  return { width, height, body: bars, yLabel: "", xLabel: chart.xLabel || "" };
}

function tableHtml(chart, columns, rows) {
  const head = columns.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<details class="chart-data">
    <summary>See the numbers in this chart</summary>
    <div class="chart-table-wrap">
      <table>
        <caption>${escapeHtml(chart.title)}. ${escapeHtml(chart.sourceName)}, retrieved ${escapeHtml(chart.retrieved)}.</caption>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </details>`;
}

export function renderChart(chart, root) {
  const { header, rows } = readSeries(chart.dataFile, root);
  for (const name of chart.columns) {
    if (!header.includes(name)) throw new Error(`Chart ${chart.id} is missing column ${name} in ${chart.dataFile}`);
  }
  let drawing;
  let table;
  if (chart.type === "line") {
    const series = chart.series.map((series) => ({
      name: series.name || "",
      points: rows.map((row) => ({ x: Number(row[chart.x]), y: Number(row[series.column]) })),
      values: rows.map((row) => Number(row[series.column])),
    }));
    drawing = lineChart(chart, series);
    const tableRows = rows.map((row) => [row[chart.x], ...chart.series.map((series) => row[series.column])]);
    table = tableHtml(chart, [{ label: chart.xLabel || "Year" }, ...chart.series.map((series) => ({ label: series.name || chart.yLabel }))], tableRows);
  } else if (chart.type === "bar") {
    const points = rows.map((row) => ({
      label: row[chart.x],
      y: Number(row[chart.y]),
      valueLabel: formatValue(Number(row[chart.y]), chart.decimals),
    }));
    drawing = barChart(chart, points);
    const tableColumns = [
      { label: chart.xLabel || "Period" },
      { label: chart.yLabel || "Value" },
    ];
    const tableRows = rows.map((row) => [row[chart.x], formatValue(Number(row[chart.y]), chart.decimals)]);
    if (chart.rawColumn) {
      tableColumns.push({ label: chart.rawLabel || "Raw count" });
      rows.forEach((row, index) => {
        tableRows[index].push(formatValue(Number(row[chart.rawColumn]), 0));
      });
    }
    table = tableHtml(chart, tableColumns, tableRows);
    if (chart.rawColumn) {
      const rawPoints = rows.map((row) => ({
        label: row[chart.x],
        y: Number(row[chart.rawColumn]),
        valueLabel: formatValue(Number(row[chart.rawColumn]), 0),
      }));
      const rawDrawing = barChart({ xLabel: "" }, rawPoints);
      table += `<details class="chart-data">
        <summary>${escapeHtml(chart.rawSummary || "See the raw counts")}</summary>
        <svg viewBox="0 0 ${rawDrawing.width} ${rawDrawing.height}" role="img" aria-label="${escapeHtml(chart.rawSummary || "Raw counts")}">
          ${rawDrawing.body}
        </svg>
        <p class="chart-note">${escapeHtml(chart.rawNote || "These are the same decades before dividing by population.")}</p>
      </details>`;
    }
  } else {
    throw new Error(`Unknown chart type ${chart.type}`);
  }
  const titleId = `${chart.id}-title`;
  const descId = `${chart.id}-desc`;
  const yAxis = drawing.yLabel
    ? `<text class="axis" x="18" y="${drawing.height / 2}" transform="rotate(-90 18 ${drawing.height / 2})" text-anchor="middle">${escapeHtml(drawing.yLabel)}</text>`
    : "";
  const xAxis = drawing.xLabel
    ? svgText(drawing.width / 2, drawing.height - 2, drawing.xLabel, 'class="axis" text-anchor="middle"')
    : "";
  return `<figure class="chart">
    <svg viewBox="0 0 ${drawing.width} ${drawing.height}" role="img" aria-labelledby="${titleId} ${descId}">
      <title id="${titleId}">${escapeHtml(chart.title)}</title>
      <desc id="${descId}">Shows: ${escapeHtml(chart.shows)} Does not show: ${escapeHtml(chart.doesNotShow)}</desc>
      ${yAxis}${xAxis}${drawing.body}
    </svg>
    <figcaption>
      <span class="chart-title">${escapeHtml(chart.title)}</span>
      <span class="chart-note"><strong>Shows: </strong>${escapeHtml(chart.shows)}</span>
      <span class="chart-note"><strong>Does not show: </strong>${escapeHtml(chart.doesNotShow)}</span>
      <span class="chart-note"><strong>Usually cited for: </strong>${escapeHtml(chart.citedFor)}</span>
      <span class="chart-source">Source: <a href="${escapeHtml(chart.sourceUrl)}">${escapeHtml(chart.sourceName)}</a>. Retrieved ${escapeHtml(chart.retrieved)}.</span>
    </figcaption>
    ${table}
  </figure>`;
}
