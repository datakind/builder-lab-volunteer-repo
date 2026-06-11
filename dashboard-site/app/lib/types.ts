export type Language = "vi" | "en";

export type AnnualMetric = {
  row?: number;
  family: string;
  key_en: string;
  key_vi: string;
  unit?: string | null;
  value_2025: number;
  value_2024?: number | null;
  value_current_year?: number;
  value_previous_year?: number | null;
};

export type DisasterCount = {
  row?: number;
  order?: number;
  type_vi: string;
  type_en?: string | null;
  count: number;
};

export type MonthlyPattern = {
  row?: number;
  type_vi: string;
  type_en?: string | null;
  count_2025: number;
  months: Record<string, number | null>;
};

export type EventSummary = {
  column?: number;
  event_vi: string;
  event_en?: string | null;
  feature: string;
  feature_vi?: string | null;
  feature_en?: string | null;
  time?: string | null;
  month?: string | null;
  area?: string | null;
  cause?: string | null;
  report_no?: string | null;
  report_date?: string | null;
  event_count?: number | null;
  deaths: number;
  missing: number;
  injured: number;
  affected_households: number;
  house_impact: number;
  total_damage_million_vnd: number;
};

export type ProvinceSummary = {
  column?: number;
  province: string;
  deaths: number;
  missing: number;
  injured: number;
  affected_households: number;
  house_impact: number;
  total_damage_million_vnd: number;
};

export type DisasterDataset = {
  source_file: string;
  reporting_year?: number;
  comparison_year?: number;
  annual_metrics: AnnualMetric[];
  annual_compare?: {
    reporting_year?: number;
    comparison_year?: number;
    people_current?: number;
    people_previous?: number;
    people_2024: number;
    people_2025: number;
    people_ratio: number;
    economic_current?: number;
    economic_previous?: number;
    economic_2024: number;
    economic_2025: number;
    economic_ratio: number;
  };
  disaster_counts: DisasterCount[];
  monthly_patterns: MonthlyPattern[];
  event_summary: EventSummary[];
  province_summary: ProvinceSummary[];
  filter_lists: {
    languages: string[];
    impact_families: string[];
    event_features: string[];
    event_types: string[];
    months: string[];
    provinces: string[];
  };
};

export type DatasetMetadata = {
  id: number | null;
  label: string;
  sourceFile: string;
  originalFilename: string;
  uploadedBy: string;
  createdAt: string | null;
  isSeed: boolean;
};

export type DataResponse = {
  dataset: DisasterDataset;
  metadata: DatasetMetadata;
};

export type SessionUser = {
  username: string;
  role: "viewer" | "admin";
};
