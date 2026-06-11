import { strFromU8, unzipSync } from "fflate";
import type {
  AnnualMetric,
  DisasterDataset,
  EventSummary,
  MonthlyPattern,
  ProvinceSummary,
} from "./types";

const MONTH_KEYS = Array.from({ length: 12 }, (_, index) => `T${index + 1}`);

const FEATURE_LABELS: Record<string, { vi: string; en: string }> = {
  storm: { vi: "Bão", en: "Storm" },
  "storm/flood": { vi: "Bão + lũ", en: "Storm + flood" },
  "flood/rain": { vi: "Mưa/lũ", en: "Flood / rain" },
  "drought/salinity": { vi: "Hạn hán / mặn", en: "Drought / salinity" },
  "erosion/landslide": { vi: "Sạt lở", en: "Erosion / landslide" },
  "cold spell": { vi: "Rét", en: "Cold spell" },
  "strong marine wind": { vi: "Gió mạnh biển", en: "Strong marine wind" },
  earthquake: { vi: "Động đất", en: "Earthquake" },
  "thunderstorm/lightning": { vi: "Dông lốc / sét", en: "Thunderstorm / lightning" },
  other: { vi: "Khác", en: "Other" },
};

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number: string) => String.fromCharCode(parseInt(number, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function attr(xml: string, name: string) {
  const match = xml.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function columnIndex(ref: string) {
  const letters = ref.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return letters.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function normalizePath(target: string) {
  if (target.startsWith("/")) {
    return target.replace(/^\//, "");
  }
  return `xl/${target}`.replace("xl/xl/", "xl/");
}

function readText(files: Record<string, Uint8Array>, path: string) {
  const file = files[path];
  if (!file) {
    throw new Error(`Missing ${path} in uploaded workbook.`);
  }
  return strFromU8(file);
}

function parseSharedStrings(xml: string) {
  const strings: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let siMatch: RegExpExecArray | null;
  while ((siMatch = siRegex.exec(xml))) {
    const parts: string[] = [];
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRegex.exec(siMatch[1]))) {
      parts.push(decodeXml(tMatch[1]));
    }
    strings.push(parts.join(""));
  }
  return strings;
}

function parseSheetNames(workbookXml: string, relsXml: string) {
  const rels = new Map<string, string>();
  const relRegex = /<Relationship\b([^>]*)\/>/g;
  let relMatch: RegExpExecArray | null;
  while ((relMatch = relRegex.exec(relsXml))) {
    rels.set(attr(relMatch[1], "Id"), normalizePath(attr(relMatch[1], "Target")));
  }

  const sheets = new Map<string, string>();
  const sheetRegex = /<sheet\b([^>]*)\/>/g;
  let sheetMatch: RegExpExecArray | null;
  while ((sheetMatch = sheetRegex.exec(workbookXml))) {
    const name = attr(sheetMatch[1], "name");
    const rid = attr(sheetMatch[1], "r:id");
    const target = rels.get(rid);
    if (name && target) {
      sheets.set(name.trim().toLowerCase(), target);
    }
  }
  return sheets;
}

function parseRows(xml: string, sharedStrings: string[]) {
  const rows: unknown[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(xml))) {
    const row: unknown[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const cellAttrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attr(cellAttrs, "r");
      const type = attr(cellAttrs, "t");
      const index = columnIndex(ref);
      const valueMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
      const inlineMatch = body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
      let value: unknown = "";

      if (type === "s" && valueMatch) {
        value = sharedStrings[Number(valueMatch[1])] ?? "";
      } else if (type === "inlineStr" && inlineMatch) {
        value = decodeXml(inlineMatch[1]);
      } else if (valueMatch) {
        const raw = decodeXml(valueMatch[1]);
        const numeric = Number(raw);
        value = Number.isFinite(numeric) && raw.trim() !== "" ? numeric : raw;
      }

      row[index] = value;
    }
    rows.push(row);
  }
  return rows;
}

function headerKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rowsToObjects(rows: unknown[][]) {
  const headers = (rows[0] ?? []).map(headerKey);
  return rows
    .slice(1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])))
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
}

function text(row: Record<string, unknown>, key: string, fallback = "") {
  const value = row[key];
  return String(value ?? fallback).trim();
}

function number(row: Record<string, unknown>, key: string) {
  const value = row[key];
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function nullableNumber(row: Record<string, unknown>, key: string) {
  const raw = String(row[key] ?? "").trim();
  if (!raw) {
    return null;
  }
  const numeric = Number(raw.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function bySheet(files: Record<string, Uint8Array>, sheets: Map<string, string>, name: string, sharedStrings: string[]) {
  const target = sheets.get(name.toLowerCase());
  if (!target) {
    throw new Error(`Missing required sheet: ${name}`);
  }
  return rowsToObjects(parseRows(readText(files, target), sharedStrings));
}

function bySheetOrEmpty(files: Record<string, Uint8Array>, sheets: Map<string, string>, name: string, sharedStrings: string[]) {
  const target = sheets.get(name.toLowerCase());
  return target ? rowsToObjects(parseRows(readText(files, target), sharedStrings)) : [];
}

function firstNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = nullableNumber(row, key);
    if (value !== null) return value;
  }
  return 0;
}

function detectReportingYear(settingsRows: Array<Record<string, unknown>>, filename: string) {
  const reportingRow = settingsRows.find((row) => {
    const key = text(row, "setting") || text(row, "key") || text(row, "parameter");
    return key.toLowerCase() === "reporting_year";
  });
  const fromSheet = reportingRow ? firstNumber(reportingRow, ["value", "year", "reporting_year"]) : 0;
  if (fromSheet >= 1900 && fromSheet <= 2200) return Math.round(fromSheet);

  const fromFilename = filename.match(/\b(20\d{2}|19\d{2})\b/);
  return fromFilename ? Number(fromFilename[1]) : 2025;
}

function annualCompare(metrics: AnnualMetric[], reportingYear: number) {
  const metric = (key: string) => metrics.find((row) => row.key_en === key);
  const deaths = metric("Deaths");
  const missing = metric("Missing");
  const damage = metric("Estimated damage");
  const comparisonYear = reportingYear - 1;
  const peopleCurrent = (deaths?.value_current_year ?? deaths?.value_2025 ?? 0) + (missing?.value_current_year ?? missing?.value_2025 ?? 0);
  const peoplePrevious = (deaths?.value_previous_year ?? deaths?.value_2024 ?? 0) + (missing?.value_previous_year ?? missing?.value_2024 ?? 0);
  const economicCurrent = damage?.value_current_year ?? damage?.value_2025 ?? 0;
  const economicPrevious = damage?.value_previous_year ?? damage?.value_2024 ?? 0;

  return {
    reporting_year: reportingYear,
    comparison_year: comparisonYear,
    people_current: peopleCurrent,
    people_previous: peoplePrevious,
    people_2024: peoplePrevious,
    people_2025: peopleCurrent,
    people_ratio: peoplePrevious > 0 ? peopleCurrent / peoplePrevious : 0,
    economic_current: economicCurrent,
    economic_previous: economicPrevious,
    economic_2024: economicPrevious,
    economic_2025: economicCurrent,
    economic_ratio: economicPrevious > 0 ? economicCurrent / economicPrevious : 0,
  };
}

export function parseDashboardWorkbook(bytes: Uint8Array, filename: string): DisasterDataset {
  const files = unzipSync(bytes);
  const sharedStrings = files["xl/sharedStrings.xml"] ? parseSharedStrings(readText(files, "xl/sharedStrings.xml")) : [];
  const sheets = parseSheetNames(
    readText(files, "xl/workbook.xml"),
    readText(files, "xl/_rels/workbook.xml.rels")
  );

  const settingsRows = bySheetOrEmpty(files, sheets, "Settings", sharedStrings);
  const reportingYear = detectReportingYear(settingsRows, filename);
  const annualRows = bySheet(files, sheets, "AnnualMetrics", sharedStrings);
  const countRows = bySheet(files, sheets, "DisasterCounts", sharedStrings);
  const eventRows = bySheet(files, sheets, "EventSummary", sharedStrings);
  const provinceRows = bySheet(files, sheets, "ProvinceSummary", sharedStrings);
  const monthlyRows = bySheet(files, sheets, "MonthlyPattern", sharedStrings);

  const annual_metrics = annualRows.map((row, index) => ({
    row: index + 2,
    family: text(row, "family", "other"),
    key_vi: text(row, "key_vi"),
    key_en: text(row, "key_en"),
    unit: text(row, "unit") || null,
    value_2025: firstNumber(row, ["value_current_year", "value_2025"]),
    value_2024: nullableNumber(row, "value_previous_year") ?? nullableNumber(row, "value_2024"),
    value_current_year: firstNumber(row, ["value_current_year", "value_2025"]),
    value_previous_year: nullableNumber(row, "value_previous_year") ?? nullableNumber(row, "value_2024"),
  }));

  const disaster_counts = countRows.map((row, index) => ({
    row: index + 2,
    order: number(row, "order") || index + 1,
    type_vi: text(row, "type_vi"),
    type_en: text(row, "type_en") || null,
    count: number(row, "count"),
  }));

  const event_summary = eventRows.map((row, index) => {
    const feature = text(row, "feature", "other");
    const featureLabels = FEATURE_LABELS[feature] ?? FEATURE_LABELS.other;
    return {
      column: index + 2,
      event_vi: text(row, "event_vi"),
      event_en: text(row, "event_en") || null,
      feature,
      feature_vi: text(row, "feature_vi") || featureLabels.vi,
      feature_en: text(row, "feature_en") || featureLabels.en,
      deaths: number(row, "deaths"),
      missing: number(row, "missing"),
      injured: number(row, "injured"),
      affected_households: number(row, "affected_households"),
      house_impact: number(row, "house_impact"),
      total_damage_million_vnd: number(row, "total_damage_million_vnd"),
    } satisfies EventSummary;
  });

  const province_summary = provinceRows.map((row, index) => ({
    column: index + 2,
    province: text(row, "province"),
    deaths: number(row, "deaths"),
    missing: number(row, "missing"),
    injured: number(row, "injured"),
    affected_households: number(row, "affected_households"),
    house_impact: number(row, "house_impact"),
    total_damage_million_vnd: number(row, "total_damage_million_vnd"),
  } satisfies ProvinceSummary));

  const monthly_patterns = monthlyRows.map((row, index) => {
    const months = Object.fromEntries(MONTH_KEYS.map((key) => [key, nullableNumber(row, key)]));
    const derivedCount = Object.values(months).reduce((total, value) => total + (value ?? 0), 0);
    return {
      row: index + 2,
      type_vi: text(row, "type_vi"),
      type_en: text(row, "type_en") || null,
      count_2025: number(row, "count_2025") || derivedCount,
      months,
    } satisfies MonthlyPattern;
  });

  if (!annual_metrics.length || !event_summary.length || !province_summary.length || !monthly_patterns.length) {
    throw new Error("The workbook template is missing data rows.");
  }

  const impactFamilies = unique(["all", ...annual_metrics.map((row) => row.family)]);
  const eventFeatures = unique(["all", ...event_summary.map((row) => row.feature)]);

  return {
    source_file: filename,
    reporting_year: reportingYear,
    comparison_year: reportingYear - 1,
    annual_metrics,
    annual_compare: annualCompare(annual_metrics, reportingYear),
    disaster_counts,
    monthly_patterns,
    event_summary,
    province_summary,
    filter_lists: {
      languages: ["Vietnamese", "English"],
      impact_families: impactFamilies,
      event_features: eventFeatures,
      event_types: unique(disaster_counts.map((row) => row.type_vi)),
      months: Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")),
      provinces: unique(province_summary.map((row) => row.province)),
    },
  };
}
