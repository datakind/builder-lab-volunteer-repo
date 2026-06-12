import type {
  DashboardFilters,
  DashboardMetrics,
  GeneratedReportSection,
  Project,
  ReportingTemplate,
  ScheduleStatus,
} from "./types";

export function scheduleStatus(dueDate: string, hasSavedReport: boolean, submittedAt?: string | null): ScheduleStatus {
  if (submittedAt) return "submitted";
  if (hasSavedReport) return "generated";

  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return "overdue";
  if (days <= 45) return "due_soon";
  return "upcoming";
}

export function chooseTemplate(project: Project, reportType: string, templates: ReportingTemplate[]) {
  const report = reportType.toLowerCase();
  const funder = project.funder.toLowerCase();
  return [...templates].sort((a, b) => scoreTemplate(b, funder, report, project.id) - scoreTemplate(a, funder, report, project.id))[0];
}

function scoreTemplate(template: ReportingTemplate, funder: string, reportType: string, projectId: string) {
  const templateFunder = template.funder.toLowerCase();
  const cadence = template.cadence.toLowerCase();
  const templateReport = template.reportType.toLowerCase();
  let score = 0;

  if (template.projectId === projectId) score += 20;
  if (templateFunder === funder) score += 10;
  if (templateFunder === "all funders") score += 3;
  if (templateReport === reportType) score += 7;
  if (templateReport && reportType.includes(templateReport)) score += 5;
  if (reportType.includes("monthly") && cadence.includes("monthly")) score += 4;
  if (reportType.includes("quarter") && cadence.includes("quarter")) score += 4;
  if (reportType.includes("final") && cadence.includes("final")) score += 6;
  return score;
}

export function requiredSectionCoverage(requiredSections: string[], sections: GeneratedReportSection[]) {
  const generated = new Set(sections.map((section) => normalizeHeading(section.heading)));
  return requiredSections.map((section) => ({
    section,
    present: generated.has(normalizeHeading(section)),
  }));
}

export function missingRequiredSections(requiredSections: string[], sections: GeneratedReportSection[]) {
  return requiredSectionCoverage(requiredSections, sections)
    .filter((item) => !item.present)
    .map((item) => item.section);
}

export function normalizeGeneratedSections(requiredSections: string[], sections: GeneratedReportSection[]) {
  const byHeading = new Map(sections.map((section) => [normalizeHeading(section.heading), section]));

  return requiredSections.map((requiredSection) => {
    const found = byHeading.get(normalizeHeading(requiredSection));
    if (found) {
      return { ...found, heading: requiredSection };
    }

    return {
      heading: requiredSection,
      body: "[REQUIRES HUMAN UPDATE] Evidence not found in the uploaded project documents. This required template section must be completed before donor submission.",
      evidence: [],
      missingEvidence: true,
    };
  });
}

function normalizeHeading(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function filterProjects(projects: Project[], filters: DashboardFilters) {
  const query = filters.query.trim().toLowerCase();

  return projects.filter((project) => {
    const searchText = [
      project.code,
      project.title,
      project.funder,
      project.sector,
      project.manager,
      project.countries.join(" "),
      project.objective,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || searchText.includes(query);
    const matchesStatus = filters.status === "all" || project.status === filters.status;
    const matchesFunder = filters.funder === "all" || project.funder === filters.funder;
    const matchesSector = filters.sector === "all" || project.sector === filters.sector;
    const matchesCountry = filters.country === "all" || project.countries.includes(filters.country);
    const matchesReport =
      filters.reportStatus === "all" ||
      project.reportingSchedule.some((report) => report.status === filters.reportStatus);
    const matchesBudget =
      filters.budgetRange === "all" ||
      (filters.budgetRange === "under-2m" && project.budget < 2_000_000) ||
      (filters.budgetRange === "2m-5m" && project.budget >= 2_000_000 && project.budget <= 5_000_000) ||
      (filters.budgetRange === "over-5m" && project.budget > 5_000_000);

    return matchesQuery && matchesStatus && matchesFunder && matchesSector && matchesCountry && matchesReport && matchesBudget;
  });
}

export function dashboardMetrics(projects: Project[]): DashboardMetrics {
  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const countriesCount = new Set(projects.flatMap((project) => project.countries)).size;
  const upcomingReports = projects.flatMap((project) => project.reportingSchedule).filter((report) => report.status === "due_soon").length;
  const overdueReports = projects.flatMap((project) => project.reportingSchedule).filter((report) => report.status === "overdue").length;

  return {
    projectCount: projects.length,
    totalBudget,
    countriesCount,
    upcomingReports,
    overdueReports,
    averageBudget: projects.length ? totalBudget / projects.length : 0,
  };
}
