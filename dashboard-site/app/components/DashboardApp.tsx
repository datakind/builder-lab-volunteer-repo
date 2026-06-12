"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  eventSeverity,
  peopleImpact,
  provinceSeverity,
  sumMetric,
} from "@/app/lib/metrics";
import type {
  DataResponse,
  EventSummary,
  Language,
  ProvinceSummary,
  SessionUser,
} from "@/app/lib/types";

const monthLabels = {
  vi: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const copy = {
  vi: {
    title: "Thiệt hại thiên tai",
    subtitle: "Dashboard tương tác theo loại hình, đặc trưng, tháng và tỉnh",
    loginTitle: "Đăng nhập dashboard",
    username: "Tên đăng nhập",
    password: "Mật khẩu",
    signIn: "Đăng nhập",
    signOut: "Đăng xuất",
    feature: "Đặc trưng thiên tai",
    month: "Tháng",
    province: "Tỉnh",
    searchProvince: "Tìm tỉnh",
    selectAll: "Chọn tất cả",
    clear: "Bỏ chọn",
    totalDamage: "Thiệt hại",
    people: "Ảnh hưởng người",
    houseImpact: "Nhà bị ảnh hưởng",
    highSeverity: "Mức cao",
    pivotTitle: "PivotTable / PivotChart chính thức",
    eventPivot: "Pivot theo loại hình thiên tai",
    provincePivot: "Pivot theo tỉnh",
    monthlyTrend: "Xu hướng theo tháng",
    uploadTitle: "Cập nhật dữ liệu",
    upload: "Tải lên",
    template: "Tải template Excel",
    currentData: "Dữ liệu hiện tại",
    comparisonYear: "Năm so sánh",
    rank: "Hạng",
    type: "Loại hình",
    deaths: "Chết",
    missing: "Mất tích",
    injured: "Bị thương",
    affected: "Hộ ảnh hưởng",
    houses: "Nhà ảnh hưởng",
    severity: "Điểm nghiêm trọng",
    band: "Mức",
    damage: "Thiệt hại (triệu VND)",
    selected: "Được chọn",
    yes: "Có",
    noRows: "Không có dòng phù hợp",
  },
  en: {
    title: "Disaster Impact Dashboard",
    subtitle: "Visualization by disaster feature, month, and province.",
    loginTitle: "Dashboard login",
    username: "Username",
    password: "Password",
    signIn: "Sign in",
    signOut: "Sign out",
    feature: "Disaster feature",
    month: "Month",
    province: "Province",
    searchProvince: "Search province",
    selectAll: "Select all",
    clear: "Clear",
    totalDamage: "Damage",
    people: "People impact",
    houseImpact: "House impact",
    highSeverity: "High severity",
    pivotTitle: "Formal PivotTable / PivotChart",
    eventPivot: "Pivot by disaster type",
    provincePivot: "Pivot by province",
    monthlyTrend: "Monthly trend",
    uploadTitle: "Update data",
    upload: "Upload",
    template: "Download Excel template",
    currentData: "Current data",
    comparisonYear: "Comparison year",
    rank: "Rank",
    type: "Type",
    deaths: "Deaths",
    missing: "Missing",
    injured: "Injured",
    affected: "Affected HH",
    houses: "House impact",
    severity: "Severity score",
    band: "Band",
    damage: "Damage (million VND)",
    selected: "Selected",
    yes: "Yes",
    noRows: "No matching rows",
  },
};

const displayCopy = {
  ...copy,
  vi: {
    ...copy.vi,
    pivotTitle: "Xếp hạng số lần",
    eventPivot: "Thiên tai theo tác động",
    provincePivot: "Tác động theo tỉnh",
    monthlyTrend: "Số lần thiên tai theo tháng",
    monthlyTrendNote: "Tóm tắt số lần ghi nhận theo tháng trong dữ liệu hiện tại.",
    monthlyTrendLegend: "Số lần ghi nhận",
    occurrences: "Số lần",
    reportYear: "Năm báo cáo",
    mapTitle: "Bản đồ tác động theo tỉnh",
    mapNote: "Kích thước điểm thể hiện thiệt hại ước tính; màu sắc thể hiện mức nghiêm trọng.",
    mapLegendDamage: "Thiệt hại lớn hơn",
    mapLegendSeverity: "Mức nghiêm trọng",
    mapNoData: "Không có dữ liệu tỉnh phù hợp",
  },
  en: {
    ...copy.en,
    pivotTitle: "Occurrence Ranking",
    eventPivot: "Disasters by impact",
    provincePivot: "Impact by province",
    monthlyTrend: "Monthly disaster occurrences",
    monthlyTrendNote: "Total recorded disaster occurrences by month in the current dataset.",
    monthlyTrendLegend: "Recorded occurrences",
    occurrences: "Occurrences",
    reportYear: "Report Year",
    mapTitle: "Province impact map",
    mapNote: "Bubble size represents estimated damage; color represents severity band.",
    mapLegendDamage: "Higher damage",
    mapLegendSeverity: "Severity band",
    mapNoData: "No matching province data",
  },
};

const provinceCoordinates: Record<string, { lat: number; lon: number }> = {
  "Hà Giang": { lat: 22.82, lon: 104.98 },
  "Cao Bằng": { lat: 22.67, lon: 106.25 },
  "Lào Cai": { lat: 22.48, lon: 103.95 },
  "Sơn La": { lat: 21.33, lon: 103.91 },
  "Lai Châu": { lat: 22.39, lon: 103.45 },
  "Bắc Kạn": { lat: 22.15, lon: 105.84 },
  "Lạng Sơn": { lat: 21.85, lon: 106.76 },
  "Tuyên Quang": { lat: 21.82, lon: 105.21 },
  "Yên Bái": { lat: 21.72, lon: 104.91 },
  "Thái Nguyên": { lat: 21.59, lon: 105.84 },
  "Điện Biên": { lat: 21.38, lon: 103.02 },
  "Phú Thọ": { lat: 21.32, lon: 105.19 },
  "Vĩnh Phúc": { lat: 21.31, lon: 105.6 },
  "Bắc Giang": { lat: 21.28, lon: 106.2 },
  "Bắc Ninh": { lat: 21.19, lon: 106.07 },
  "Hà Nội": { lat: 21.03, lon: 105.85 },
  "Quảng Ninh": { lat: 21.25, lon: 107.33 },
  "Hải Dương": { lat: 20.94, lon: 106.33 },
  "Hải Phòng": { lat: 20.84, lon: 106.68 },
  "Hòa Bình": { lat: 20.82, lon: 105.34 },
  "Hưng Yên": { lat: 20.65, lon: 106.06 },
  "Hà Nam": { lat: 20.54, lon: 105.92 },
  "Thái Bình": { lat: 20.45, lon: 106.34 },
  "Nam Định": { lat: 20.43, lon: 106.16 },
  "Ninh Bình": { lat: 20.25, lon: 105.97 },
  "Thanh Hóa": { lat: 19.81, lon: 105.78 },
  "Nghệ An": { lat: 19.23, lon: 104.92 },
  "Hà Tĩnh": { lat: 18.34, lon: 105.9 },
  "Quảng Bình": { lat: 17.47, lon: 106.62 },
  "Quảng Trị": { lat: 16.75, lon: 107.19 },
  "Thừa Thiên Huế": { lat: 16.47, lon: 107.59 },
  "Đà Nẵng": { lat: 16.05, lon: 108.2 },
  "Quảng Nam": { lat: 15.57, lon: 108.48 },
  "Quảng Ngãi": { lat: 15.12, lon: 108.8 },
  "Kon Tum": { lat: 14.35, lon: 107.98 },
  "Gia Lai": { lat: 13.98, lon: 108 },
  "Bình Định": { lat: 13.78, lon: 109.22 },
  "Phú Yên": { lat: 13.09, lon: 109.09 },
  "Đắk Lắk": { lat: 12.71, lon: 108.24 },
  "Khánh Hòa": { lat: 12.25, lon: 109.18 },
  "Đắk Nông": { lat: 12.26, lon: 107.61 },
  "Lâm Đồng": { lat: 11.94, lon: 108.45 },
  "Ninh Thuận": { lat: 11.57, lon: 108.99 },
  "Bình Phước": { lat: 11.75, lon: 106.92 },
  "Tây Ninh": { lat: 11.36, lon: 106.15 },
  "Bình Dương": { lat: 11.17, lon: 106.67 },
  "Đồng Nai": { lat: 11.07, lon: 107.17 },
  "Bình Thuận": { lat: 10.94, lon: 108.1 },
  "TP. Hồ Chí Minh": { lat: 10.78, lon: 106.7 },
  "Long An": { lat: 10.69, lon: 106.25 },
  "Bà Rịa - Vũng Tàu": { lat: 10.54, lon: 107.24 },
  "Đồng Tháp": { lat: 10.58, lon: 105.68 },
  "An Giang": { lat: 10.52, lon: 105.13 },
  "Tiền Giang": { lat: 10.36, lon: 106.35 },
  "Vĩnh Long": { lat: 10.25, lon: 105.97 },
  "Bến Tre": { lat: 10.24, lon: 106.38 },
  "Cần Thơ": { lat: 10.04, lon: 105.78 },
  "Kiên Giang": { lat: 10.02, lon: 105.08 },
  "Trà Vinh": { lat: 9.93, lon: 106.34 },
  "Hậu Giang": { lat: 9.78, lon: 105.47 },
  "Sóc Trăng": { lat: 9.6, lon: 105.98 },
  "Bạc Liêu": { lat: 9.29, lon: 105.72 },
  "Cà Mau": { lat: 9.18, lon: 105.15 },
};

function numberFormat(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value || 0);
}

function compactMoney(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${numberFormat(value / 1_000_000, 1)}T`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${numberFormat(value / 1_000, 1)}B`;
  }
  return numberFormat(value, 1);
}

function eventLabel(row: EventSummary, language: Language) {
  return language === "en" ? row.event_en || row.event_vi : row.event_vi;
}

function featureLabel(row: EventSummary, language: Language) {
  return language === "en" ? row.feature_en || row.feature : row.feature_vi || row.feature;
}

function severityClass(score: number) {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function Slicer({
  title,
  options,
  selected,
  onChange,
  label,
  searchable,
  language,
}: {
  title: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  label?: (value: string) => string;
  searchable?: boolean;
  language: Language;
}) {
  const t = displayCopy[language];
  const [query, setQuery] = useState("");
  const filtered = searchable
    ? options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(next);
  }

  return (
    <section className="slicer">
      <div className="slicer-heading">
        <h2>{title}</h2>
        <span>{selected.size}/{options.length}</span>
      </div>
      {searchable ? (
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchProvince}
        />
      ) : null}
      <div className="slicer-actions">
        <button type="button" onClick={() => onChange(new Set(options))}>{t.selectAll}</button>
        <button type="button" onClick={() => onChange(new Set())}>{t.clear}</button>
      </div>
      <div className="slicer-list">
        {filtered.map((option) => (
          <button
            className={selected.has(option) ? "slicer-chip active" : "slicer-chip"}
            key={option}
            onClick={() => toggle(option)}
            type="button"
          >
            <span aria-hidden="true">{selected.has(option) ? "\u2713" : ""}</span>
            {label ? label(option) : option}
          </button>
        ))}
      </div>
    </section>
  );
}

function BarChart({ data }: { data: Array<{ label: string; value: number; tone?: string }> }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="chart-bars">
      {data.length ? data.map((item) => (
        <div className="bar-row" key={item.label}>
          <span title={item.label}>{item.label}</span>
          <div>
            <i style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
          <strong>{compactMoney(item.value)}</strong>
        </div>
      )) : <p className="empty-chart">No data</p>}
    </div>
  );
}

function LineChart({
  points,
  legendLabel,
  yAxisLabel,
}: {
  points: Array<{ label: string; value: number }>;
  legendLabel: string;
  yAxisLabel: string;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const width = 780;
  const height = 250;
  const padding = { top: 18, right: 18, bottom: 44, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
  const ticks = Array.from(new Set([0, Math.round(max / 2), Math.ceil(max)])).sort((a, b) => a - b);
  const pointPosition = (point: { value: number }, index: number) => ({
    x: padding.left + index * step,
    y: padding.top + (1 - point.value / max) * plotHeight,
  });
  const path = points
    .map((point, index) => {
      const { x, y } = pointPosition(point, index);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="line-chart-wrap">
      <div className="chart-legend">
        <span />
        {legendLabel}
      </div>
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={legendLabel}>
        <title>{legendLabel}</title>
        {ticks.map((tick) => {
          const y = padding.top + (1 - tick / max) * plotHeight;
          return (
            <g className="axis-tick" key={tick}>
              <path d={`M${padding.left},${y} L${width - padding.right},${y}`} />
              <text x={padding.left - 10} y={y + 5} textAnchor="end">
                {numberFormat(tick)}
              </text>
            </g>
          );
        })}
        <path className="axis-line" d={`M${padding.left},${padding.top} L${padding.left},${height - padding.bottom} L${width - padding.right},${height - padding.bottom}`} />
        <text className="axis-label" x={18} y={padding.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`}>
          {yAxisLabel}
        </text>
        <path className="trend-line" d={path} />
        {points.map((point, index) => {
          const { x, y } = pointPosition(point, index);
          return (
            <g className="chart-point" key={point.label}>
              <title>{`${point.label}: ${numberFormat(point.value)} ${legendLabel.toLowerCase()}`}</title>
              <circle cx={x} cy={y} r="5" />
            </g>
          );
        })}
        {points.map((point, index) => (
          <text className="month-label" key={point.label} x={padding.left + index * step} y={height - 16} textAnchor="middle">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function EventTable({ rows, language }: { rows: EventSummary[]; language: Language }) {
  const t = displayCopy[language];
  const severity = eventSeverity(rows);
  const ranked = rows
    .map((row, index) => ({ row, severity: severity[index] }))
    .sort((a, b) => b.row.total_damage_million_vnd - a.row.total_damage_million_vnd)
    .slice(0, 18);

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t.rank}</th>
            <th>{t.type}</th>
            <th>{t.feature}</th>
            <th>{t.deaths}</th>
            <th>{t.missing}</th>
            <th>{t.injured}</th>
            <th>{t.people}</th>
            <th>{t.houses}</th>
            <th>{t.damage}</th>
            <th>{t.severity}</th>
            <th>{t.band}</th>
          </tr>
        </thead>
        <tbody>
          {ranked.length ? ranked.map(({ row, severity: score }, index) => (
            <tr key={`${row.event_vi}-${index}`}>
              <td>{index + 1}</td>
              <td>{eventLabel(row, language)}</td>
              <td>{featureLabel(row, language)}</td>
              <td>{numberFormat(row.deaths)}</td>
              <td>{numberFormat(row.missing)}</td>
              <td>{numberFormat(row.injured)}</td>
              <td>{numberFormat(peopleImpact(row))}</td>
              <td>{numberFormat(row.house_impact)}</td>
              <td>{numberFormat(row.total_damage_million_vnd, 1)}</td>
              <td>{numberFormat(score.score, 1)}</td>
              <td><span className={`severity ${severityClass(score.score)}`}>{language === "en" ? score.bandEn : score.bandVi}</span></td>
            </tr>
          )) : (
            <tr><td colSpan={11}>{t.noRows}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProvinceTable({ rows, language }: { rows: ProvinceSummary[]; language: Language }) {
  const t = displayCopy[language];
  const severity = provinceSeverity(rows);
  const ranked = rows
    .map((row, index) => ({ row, severity: severity[index] }))
    .sort((a, b) => b.row.total_damage_million_vnd - a.row.total_damage_million_vnd)
    .slice(0, 15);

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t.rank}</th>
            <th>{t.province}</th>
            <th>{t.deaths}</th>
            <th>{t.missing}</th>
            <th>{t.injured}</th>
            <th>{t.people}</th>
            <th>{t.affected}</th>
            <th>{t.houses}</th>
            <th>{t.damage}</th>
            <th>{t.severity}</th>
            <th>{t.band}</th>
          </tr>
        </thead>
        <tbody>
          {ranked.length ? ranked.map(({ row, severity: score }, index) => (
            <tr key={row.province}>
              <td>{index + 1}</td>
              <td>{row.province}</td>
              <td>{numberFormat(row.deaths)}</td>
              <td>{numberFormat(row.missing)}</td>
              <td>{numberFormat(row.injured)}</td>
              <td>{numberFormat(peopleImpact(row))}</td>
              <td>{numberFormat(row.affected_households)}</td>
              <td>{numberFormat(row.house_impact)}</td>
              <td>{numberFormat(row.total_damage_million_vnd, 1)}</td>
              <td>{numberFormat(score.score, 1)}</td>
              <td><span className={`severity ${severityClass(score.score)}`}>{language === "en" ? score.bandEn : score.bandVi}</span></td>
            </tr>
          )) : (
            <tr><td colSpan={11}>{t.noRows}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type ProvinceMarker = {
  row: ProvinceSummary;
  score: number;
  band: string;
  x: number;
  y: number;
  radius: number;
};

function ProvinceImpactMap({ rows, language }: { rows: ProvinceSummary[]; language: Language }) {
  const t = displayCopy[language];
  const [hovered, setHovered] = useState<ProvinceMarker | null>(null);
  const severity = provinceSeverity(rows);
  const maxDamage = Math.max(...rows.map((row) => row.total_damage_million_vnd), 1);
  const width = 420;
  const height = 720;
  const minLon = 102.6;
  const maxLon = 109.55;
  const minLat = 8.7;
  const maxLat = 23.05;

  function project(lat: number, lon: number) {
    const x = 36 + ((lon - minLon) / (maxLon - minLon)) * 332;
    const y = 24 + ((maxLat - lat) / (maxLat - minLat)) * 644;
    return { x, y };
  }

  const markers = rows
    .map((row, index) => {
      const coordinate = provinceCoordinates[row.province];
      if (!coordinate) return null;
      const { x, y } = project(coordinate.lat, coordinate.lon);
      const score = severity[index]?.score ?? 0;
      const radius = 5 + Math.sqrt(Math.max(row.total_damage_million_vnd, 0) / maxDamage) * 20;
      return {
        row,
        score,
        band: language === "en" ? severity[index]?.bandEn ?? "Low" : severity[index]?.bandVi ?? "Thấp",
        x,
        y,
        radius,
      } satisfies ProvinceMarker;
    })
    .filter((marker): marker is ProvinceMarker => Boolean(marker))
    .sort((a, b) => a.radius - b.radius);

  const tooltipX = hovered ? Math.max(12, Math.min(hovered.x > 235 ? hovered.x - 194 : hovered.x + 18, width - 188)) : 0;
  const tooltipY = hovered ? Math.max(14, Math.min(hovered.y - 76, height - 136)) : 0;

  return (
    <div className="province-map-panel">
      <div className="map-legend" aria-label={t.mapLegendSeverity}>
        <span>{t.mapLegendDamage}</span>
        <i className="legend-dot low" />
        <b>{language === "en" ? "Low" : "Thấp"}</b>
        <i className="legend-dot medium" />
        <b>{language === "en" ? "Medium" : "Trung bình"}</b>
        <i className="legend-dot high" />
        <b>{language === "en" ? "High" : "Cao"}</b>
      </div>
      <svg className="province-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t.mapTitle}>
        <defs>
          <linearGradient id="mapSea" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f3faf7" />
            <stop offset="100%" stopColor="#e1eef5" />
          </linearGradient>
        </defs>
        <rect className="map-sea" width={width} height={height} rx="18" />
        <path
          className="vietnam-shape"
          d="M168 30 C124 58 92 98 110 144 C126 184 148 196 139 235 C127 290 160 320 148 374 C139 416 178 456 168 503 C158 552 118 590 137 640 C154 685 214 698 259 664 C214 636 213 592 243 548 C273 503 267 465 237 429 C207 392 218 348 252 319 C292 285 293 239 255 209 C217 179 224 132 270 93 C235 55 204 36 168 30 Z"
        />
        <path
          className="vietnam-coast"
          d="M267 94 C231 132 224 179 256 209 C293 239 292 285 253 319 C218 348 207 392 238 429 C268 465 274 503 244 548 C214 592 215 636 260 664"
        />
        <path
          className="map-river"
          d="M117 641 C156 623 194 621 236 648"
        />
        {markers.length ? markers.map((marker) => (
          <g
            className={`province-marker ${severityClass(marker.score)}`}
            key={marker.row.province}
            onBlur={() => setHovered(null)}
            onFocus={() => setHovered(marker)}
            onMouseEnter={() => setHovered(marker)}
            onMouseLeave={() => setHovered(null)}
            tabIndex={0}
          >
            <title>
              {`${marker.row.province}: ${numberFormat(marker.row.total_damage_million_vnd, 1)} million VND, ${numberFormat(peopleImpact(marker.row))} people impact, severity ${numberFormat(marker.score, 1)}`}
            </title>
            <circle cx={marker.x} cy={marker.y} r={marker.radius} />
            {marker.radius >= 16 ? <text x={marker.x} y={marker.y + 4} textAnchor="middle">{numberFormat(marker.score, 0)}</text> : null}
          </g>
        )) : (
          <text className="map-empty" x={width / 2} y={height / 2} textAnchor="middle">{t.mapNoData}</text>
        )}
        {hovered ? (
          <g className="map-tooltip" transform={`translate(${tooltipX} ${tooltipY})`}>
            <rect width="176" height="122" rx="10" />
            <text className="tooltip-title" x="12" y="22">{hovered.row.province}</text>
            <text x="12" y="44">{`${t.damage}: ${numberFormat(hovered.row.total_damage_million_vnd, 1)}`}</text>
            <text x="12" y="62">{`${t.people}: ${numberFormat(peopleImpact(hovered.row))}`}</text>
            <text x="12" y="80">{`${t.affected}: ${numberFormat(hovered.row.affected_households)}`}</text>
            <text x="12" y="98">{`${t.houses}: ${numberFormat(hovered.row.house_impact)}`}</text>
            <text x="12" y="116">{`${t.severity}: ${numberFormat(hovered.score, 1)} (${hovered.band})`}</text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function AdminUpload({
  language,
  onUploaded,
}: {
  language: Language;
  onUploaded: (data: DataResponse) => void;
}) {
  const t = displayCopy[language];
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setStatus("");
    const form = new FormData();
    form.set("file", file);
    form.set("label", label);
    const response = await fetch("/api/upload", { method: "POST", body: form });
    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setStatus(body.error ?? "Upload failed");
      return;
    }

    setStatus(language === "en" ? "Dataset updated" : "Đã cập nhật dữ liệu");
    onUploaded(body);
  }

  return (
    <section className="admin-panel">
      <div>
        <h2>{t.uploadTitle}</h2>
        <a href="/templates/disaster_dashboard_upload_template.xlsx">{t.template}</a>
      </div>
      <form onSubmit={submit}>
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Dataset label" />
        <input
          accept=".xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        <button className="primary-action" disabled={!file || loading} type="submit">
          {loading ? "Uploading" : t.upload}
        </button>
      </form>
      {status ? <p>{status}</p> : null}
    </section>
  );
}

function Dashboard({
  user,
  data,
  onData,
}: {
  user: SessionUser | null;
  data: DataResponse;
  onData: (data: DataResponse) => void;
}) {
  const [language, setLanguage] = useState<Language>("vi");
  const dataset = data.dataset;
  const featureOptions = dataset.filter_lists.event_features.filter((feature) => feature !== "all");
  const monthOptions = dataset.filter_lists.months;
  const provinceOptions = dataset.filter_lists.provinces;
  const [selectedFeatures, setSelectedFeatures] = useState(new Set(featureOptions));
  const [selectedMonths, setSelectedMonths] = useState(new Set(monthOptions));
  const [selectedProvinces, setSelectedProvinces] = useState(new Set(provinceOptions));
  const t = displayCopy[language];
  const reportingYear = dataset.reporting_year ?? dataset.annual_compare?.reporting_year ?? 2025;

  const featureNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of dataset.event_summary) {
      map.set(row.feature, featureLabel(row, language));
    }
    return map;
  }, [dataset, language]);

  const filteredEvents = dataset.event_summary.filter((row) => selectedFeatures.has(row.feature));
  const filteredProvinces = dataset.province_summary.filter((row) => selectedProvinces.has(row.province));
  const highCount = eventSeverity(filteredEvents).filter((row) => row.score >= 70).length;
  const totalDamage = sumMetric(filteredEvents, "total_damage_million_vnd");
  const totalPeople = filteredEvents.reduce((total, row) => total + peopleImpact(row), 0);
  const houseImpact = sumMetric(filteredEvents, "house_impact");
  const chartEvents = [...filteredEvents]
    .sort((a, b) => b.total_damage_million_vnd - a.total_damage_million_vnd)
    .slice(0, 10)
    .map((row) => ({ label: eventLabel(row, language), value: row.total_damage_million_vnd }));
  const chartProvinces = [...filteredProvinces]
    .sort((a, b) => b.total_damage_million_vnd - a.total_damage_million_vnd)
    .slice(0, 10)
    .map((row) => ({ label: row.province, value: row.total_damage_million_vnd }));
  const monthPoints = monthOptions.map((month, index) => {
    const key = `T${Number(month)}`;
    const value = selectedMonths.has(month)
      ? dataset.monthly_patterns.reduce((total, row) => total + (row.months[key] ?? 0), 0)
      : 0;
    return { label: monthLabels[language][index], value };
  });

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DataKind Bangkok</p>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="topbar-controls">
          <div className="segmented" aria-label="Language">
            <button className={language === "vi" ? "active" : ""} onClick={() => setLanguage("vi")} type="button">VI</button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">EN</button>
          </div>
        </div>
      </header>

      <section className="dataset-strip">
        <span>{t.reportYear}</span>
        <strong>{reportingYear}</strong>
      </section>

      <div className="slicer-grid">
        <Slicer
          title={t.feature}
          options={featureOptions}
          selected={selectedFeatures}
          onChange={setSelectedFeatures}
          label={(feature) => featureNames.get(feature) ?? feature}
          language={language}
        />
        <Slicer
          title={t.month}
          options={monthOptions}
          selected={selectedMonths}
          onChange={setSelectedMonths}
          label={(month) => monthLabels[language][Number(month) - 1]}
          language={language}
        />
        <Slicer
          title={t.province}
          options={provinceOptions}
          selected={selectedProvinces}
          onChange={setSelectedProvinces}
          searchable
          language={language}
        />
      </div>

      <section className="kpi-grid">
        <Kpi label={t.totalDamage} value={`${compactMoney(totalDamage)} VND`} note={t.damage} />
        <Kpi label={t.people} value={numberFormat(totalPeople)} note={`${t.deaths} + ${t.missing} + ${t.injured}`} />
        <Kpi label={t.houseImpact} value={numberFormat(houseImpact)} note={t.houses} />
        <Kpi label={t.highSeverity} value={numberFormat(highCount)} note={t.severity} />
      </section>

      <section className="analysis-band">
        <div className="section-heading">
          <h2>{t.pivotTitle}</h2>
        </div>
        <div className="pivot-layout">
          <EventTable rows={filteredEvents} language={language} />
          <div className="chart-panel">
            <h3>{t.eventPivot}</h3>
            <BarChart data={chartEvents} />
          </div>
        </div>
      </section>

      <section className="analysis-band">
        <div className="section-heading">
          <h2>{t.provincePivot}</h2>
        </div>
        <div className="pivot-layout">
          <ProvinceTable rows={filteredProvinces} language={language} />
          <div className="chart-panel">
            <h3>{t.provincePivot}</h3>
            <BarChart data={chartProvinces} />
          </div>
        </div>
      </section>

      <section className="analysis-band map-band">
        <div className="section-heading">
          <div>
            <h2>{t.mapTitle}</h2>
            <p>{t.mapNote}</p>
          </div>
        </div>
        <ProvinceImpactMap rows={filteredProvinces} language={language} />
      </section>

      <section className="analysis-band">
        <div className="section-heading">
          <div>
            <h2>{t.monthlyTrend}</h2>
            <p>{t.monthlyTrendNote}</p>
          </div>
        </div>
        <LineChart points={monthPoints} legendLabel={t.monthlyTrendLegend} yAxisLabel={t.occurrences} />
      </section>

      {user?.role === "admin" ? <AdminUpload language={language} onUploaded={onData} /> : null}
    </main>
  );
}

export default function DashboardApp() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<DataResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const response = await fetch("/api/data");
    if (response.ok) {
      setData(await response.json());
    }
  }

  useEffect(() => {
    async function bootstrap() {
      const sessionResponse = await fetch("/api/session");
      const sessionBody = await sessionResponse.json();
      setUser(sessionBody.user);
      await loadData();
      setLoading(false);
    }
    void bootstrap();
  }, []);

  if (loading) {
    return <main className="loading-screen">Loading dashboard</main>;
  }

  if (!data) {
    return <main className="loading-screen">Loading data</main>;
  }

  return (
    <Dashboard
      key={`${data.metadata.id ?? "seed"}-${data.dataset.source_file}`}
      user={user}
      data={data}
      onData={setData}
    />
  );
}
