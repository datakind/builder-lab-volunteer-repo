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
  },
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
