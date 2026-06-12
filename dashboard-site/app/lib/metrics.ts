import type {
  AnnualMetric,
  DisasterDataset,
  EventSummary,
  ProvinceSummary,
} from "./types";

export type SeverityResult = {
  score: number;
  bandVi: string;
  bandEn: string;
  damagePerHouse: number;
};

type MetricFns<T> = {
  people: (row: T) => number;
  affected: (row: T) => number;
  house: (row: T) => number;
  damage: (row: T) => number;
};

function finiteNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function currentYearValue(metric: AnnualMetric | undefined) {
  return finiteNumber(metric?.value_current_year ?? metric?.value_2025);
}

function previousYearValue(metric: AnnualMetric | undefined) {
  return finiteNumber(metric?.value_previous_year ?? metric?.value_2024);
}

function normalize(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    return 0;
  }

  return (value - min) / (max - min);
}

export function buildSeveritySeries<T>(rows: T[], metricFns: MetricFns<T>) {
  const peopleValues = rows.map((row) => finiteNumber(metricFns.people(row)));
  const affectedValues = rows.map((row) => finiteNumber(metricFns.affected(row)));
  const houseValues = rows.map((row) => finiteNumber(metricFns.house(row)));
  const damageValues = rows.map((row) => finiteNumber(metricFns.damage(row)));
  const minPeople = Math.min(...peopleValues, 0);
  const maxPeople = Math.max(...peopleValues, 0);
  const minAffected = Math.min(...affectedValues, 0);
  const maxAffected = Math.max(...affectedValues, 0);
  const minHouse = Math.min(...houseValues, 0);
  const maxHouse = Math.max(...houseValues, 0);
  const minDamage = Math.min(...damageValues, 0);
  const maxDamage = Math.max(...damageValues, 0);

  return rows.map((row) => {
    const people = finiteNumber(metricFns.people(row));
    const affected = finiteNumber(metricFns.affected(row));
    const house = finiteNumber(metricFns.house(row));
    const damage = finiteNumber(metricFns.damage(row));
    const score = Math.round(
      100 *
        (
          0.35 * normalize(people, minPeople, maxPeople) +
          0.15 * normalize(affected, minAffected, maxAffected) +
          0.15 * normalize(house, minHouse, maxHouse) +
          0.35 * normalize(damage, minDamage, maxDamage)
        ) *
        10
    ) / 10;

    return {
      score,
      bandVi: score >= 70 ? "Cao" : score >= 40 ? "Trung bình" : "Thấp",
      bandEn: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low",
      damagePerHouse: house > 0 ? damage / house : 0,
    } satisfies SeverityResult;
  });
}

export function eventSeverity(rows: EventSummary[]) {
  return buildSeveritySeries(rows, {
    people: (row) => row.deaths + row.missing + row.injured,
    affected: (row) => row.affected_households,
    house: (row) => row.house_impact,
    damage: (row) => row.total_damage_million_vnd,
  });
}

export function provinceSeverity(rows: ProvinceSummary[]) {
  return buildSeveritySeries(rows, {
    people: (row) => row.deaths + row.missing + row.injured,
    affected: (row) => row.affected_households,
    house: (row) => row.house_impact,
    damage: (row) => row.total_damage_million_vnd,
  });
}

export function sumMetric(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce((total, row) => total + finiteNumber(row[key]), 0);
}

export function peopleImpact(row: EventSummary | ProvinceSummary) {
  return finiteNumber(row.deaths) + finiteNumber(row.missing) + finiteNumber(row.injured);
}

export function getAnnualMetric(metrics: AnnualMetric[], englishKey: string) {
  return currentYearValue(metrics.find((metric) => metric.key_en === englishKey));
}

export function withDerivedAnnualCompare(dataset: DisasterDataset) {
  const reportingYear = dataset.reporting_year ?? dataset.annual_compare?.reporting_year ?? 2025;
  const comparisonYear = dataset.comparison_year ?? dataset.annual_compare?.comparison_year ?? reportingYear - 1;
  const normalizeExisting = dataset.annual_compare
    ? {
        ...dataset,
        reporting_year: reportingYear,
        comparison_year: comparisonYear,
        annual_compare: {
          ...dataset.annual_compare,
          reporting_year: reportingYear,
          comparison_year: comparisonYear,
          people_current: dataset.annual_compare.people_current ?? dataset.annual_compare.people_2025,
          people_previous: dataset.annual_compare.people_previous ?? dataset.annual_compare.people_2024,
          economic_current: dataset.annual_compare.economic_current ?? dataset.annual_compare.economic_2025,
          economic_previous: dataset.annual_compare.economic_previous ?? dataset.annual_compare.economic_2024,
        },
      }
    : null;

  if (normalizeExisting) return normalizeExisting;

  const deaths = dataset.annual_metrics.find((row) => row.key_en === "Deaths");
  const missing = dataset.annual_metrics.find((row) => row.key_en === "Missing");
  const damage = dataset.annual_metrics.find((row) => row.key_en === "Estimated damage");
  const peopleCurrent = currentYearValue(deaths) + currentYearValue(missing);
  const peoplePrevious = previousYearValue(deaths) + previousYearValue(missing);
  const economicCurrent = currentYearValue(damage);
  const economicPrevious = previousYearValue(damage);

  return {
    ...dataset,
    reporting_year: reportingYear,
    comparison_year: comparisonYear,
    annual_compare: {
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
    },
  };
}
