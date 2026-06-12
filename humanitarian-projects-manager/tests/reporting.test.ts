import { describe, expect, it } from "vitest";
import { filterProjects, missingRequiredSections, normalizeGeneratedSections, scheduleStatus } from "@/lib/reporting";
import { seedProjects } from "@/lib/seed-data";
import type { DashboardFilters, GeneratedReportSection, Project } from "@/lib/types";

describe("reporting helpers", () => {
  it("keeps every required template section and flags missing evidence", () => {
    const sections: GeneratedReportSection[] = [
      {
        heading: "Delivery summary",
        body: "Transfers started.",
        evidence: ["Q1 report"],
        missingEvidence: false,
      },
    ];

    const normalized = normalizeGeneratedSections(["Delivery summary", "Market monitoring"], sections);

    expect(normalized).toHaveLength(2);
    expect(normalized[1]).toMatchObject({
      heading: "Market monitoring",
      missingEvidence: true,
    });
    expect(missingRequiredSections(["Delivery summary", "Market monitoring"], sections)).toEqual(["Market monitoring"]);
  });

  it("calculates schedule status from due dates and saved reports", () => {
    expect(scheduleStatus("2000-01-01", false)).toBe("overdue");
    expect(scheduleStatus("2099-01-01", true)).toBe("generated");
    expect(scheduleStatus("2099-01-01", false, "2026-01-01T00:00:00.000Z")).toBe("submitted");
  });

  it("filters projects by funder, sector, country, budget, and search", () => {
    const projects = seedProjects.map(
      (project) =>
        ({
          ...project,
          documents: [],
          reportingSchedule: [],
          templates: [],
          auditEvents: [],
          vectorStoreId: null,
          updatedAt: "2026-06-11T00:00:00.000Z",
        }) satisfies Project,
    );
    const filters: DashboardFilters = {
      query: "cash",
      status: "all",
      funder: "FCDO",
      sector: "Cash Assistance",
      country: "Somalia",
      reportStatus: "all",
      budgetRange: "2m-5m",
    };

    expect(filterProjects(projects, filters).map((project) => project.id)).toEqual(["dignity-through-cash"]);
  });

  it("keeps report prompts strict about evidence and human-update flags", async () => {
    const { reportPrompt } = await import("@/server/ai");
    const project = {
      ...seedProjects[0],
      documents: [],
      reportingSchedule: [],
      templates: [],
      auditEvents: [],
      vectorStoreId: null,
      updatedAt: "2026-06-11T00:00:00.000Z",
    } satisfies Project;
    const prompt = reportPrompt(
      project,
      { id: "schedule-test", reportType: "Progress Report", dueDate: "2026-10-01" },
      {
        id: "tpl-test",
        projectId: project.id,
        name: "Embedded Progress Template",
        funder: project.funder,
        cadence: "Progress",
        reportType: "Progress Report",
        requiredSections: ["Financial Update"],
        metadataFields: ["Reporting Period"],
        sourceDocument: "Investment Document.docx",
        filePath: null,
        uploadedAt: "2026-06-12T00:00:00.000Z",
        isDefault: false,
      },
      "- Evidence package",
      "Use reporting period 1.",
    );

    expect(prompt).toContain("[REQUIRES HUMAN UPDATE]");
    expect(prompt).toContain("Do not provide your own judgment");
    expect(prompt).toContain("Use reporting period 1.");
  });
});
