import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tempDir = "";

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), "hpm-test-"));
  process.env.DATABASE_URL = path.join(tempDir, "test.db");
  delete process.env.OPENAI_API_KEY;
  vi.resetModules();
});

afterEach(async () => {
  const { resetDbForTests } = await import("@/server/db");
  resetDbForTests();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("repository flow", () => {
  it("seeds portfolio projects and funder templates", async () => {
    const { getDashboardModel, getProjectById } = await import("@/server/db");
    const model = getDashboardModel();
    const dignity = getProjectById("dignity-through-cash");

    expect(model.projects).toHaveLength(10);
    expect(dignity?.funder).toBe("FCDO");
    expect(dignity?.templates.some((template) => template.id === "tpl-fcdo-cash")).toBe(true);
  });

  it("applies mocked AI extraction updates to project fields", async () => {
    const { getProjectById } = await import("@/server/db");
    const { applyProjectExtraction } = await import("@/server/repository");

    applyProjectExtraction("dignity-through-cash", {
      summary: "Updated beneficiary evidence from uploaded report.",
      beneficiaries: "42,376 individuals reached cumulatively",
      components: ["Cash transfer cycles", "Market monitoring"],
      evidenceNotes: ["Q3 report"],
      missingFields: [],
    });

    const project = getProjectById("dignity-through-cash");
    expect(project?.beneficiaries).toBe("42,376 individuals reached cumulatively");
    expect(project?.components).toContain("Market monitoring");
  });

  it("creates a generated draft without attaching a saved download", async () => {
    const { getProjectById, getGeneratedReportById } = await import("@/server/db");
    const { createGeneratedReportDraft } = await import("@/server/repository");
    const project = getProjectById("clean-water-for-recovery");
    const schedule = project?.reportingSchedule[0];
    const template = schedule?.template;
    expect(project && schedule && template).toBeTruthy();

    const draft = createGeneratedReportDraft({
      id: "report-test",
      projectId: project!.id,
      scheduleId: schedule!.id,
      templateId: template!.id,
      title: "ADPC-P011 Monthly Situation Report",
      prompt: "Prompt text",
      evidenceSummary: "Evidence summary",
      missingFields: ["Attachments"],
      sections: template!.requiredSections.map((heading) => ({
        heading,
        body: "Draft body",
        evidence: [],
        missingEvidence: heading === "Attachments",
      })),
    });

    const stored = getGeneratedReportById(draft!.id);
    expect(stored?.status).toBe("draft");
    expect(stored?.filePath).toBeNull();
  });

  it("creates a new project from extracted document data", async () => {
    const { getProjectById } = await import("@/server/db");
    const { createProjectFromExtraction } = await import("@/server/repository");

    const project = createProjectFromExtraction({
      extraction: {
        code: "",
        title: "Rapid Shelter Recovery",
        concept: "Emergency shelter recovery support for cyclone-affected households.",
        sector: "Shelter",
        manager: "Asha Fielding",
        funder: "ECHO",
        countries: ["Madagascar"],
        durationMonths: 9,
        startDate: "2026-09-01",
        endDate: "",
        budget: 780000,
        beneficiaries: "12,000 households",
        objective: "Restore safe shelter conditions for affected households.",
        components: ["Shelter kit distribution", "Technical support"],
        deliverables: ["Monthly Situation Reports"],
        risks: [],
        sourceSummary: "Extracted from proposal upload.",
        evidenceNotes: ["Proposal cover page"],
        missingFields: ["Detailed budget"],
      },
      files: [
        {
          id: "doc-new-project",
          name: "rapid-shelter-proposal.pdf",
          mimeType: "application/pdf",
          filePath: "storage/uploads/test/rapid-shelter-proposal.pdf",
        },
      ],
    });

    expect(project?.id).toBe("rapid-shelter-recovery");
    expect(project?.code).toBe("ADPC-P021");
    expect(project?.reportingSchedule).toHaveLength(3);
    expect(project?.templates.some((template) => template.id === "tpl-echo-interim")).toBe(true);
    expect(getProjectById("rapid-shelter-recovery")?.documents[0].status).toBe("extracted");
  });

  it("allocates a suffix when an extracted project code already exists", async () => {
    const { getProjectById } = await import("@/server/db");
    const { createProjectFromExtraction } = await import("@/server/repository");

    const project = createProjectFromExtraction({
      extraction: {
        code: "ADPC-P014",
        title: "Dignity Through Cash",
        concept: "Duplicate intake used to test repeated project creation from source documents.",
        sector: "Cash Assistance",
        manager: "Unassigned",
        funder: "FCDO",
        countries: ["Somalia"],
        durationMonths: 12,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        budget: 4200000,
        beneficiaries: "42,376 individuals reached cumulatively",
        objective: "Deliver multipurpose cash assistance to crisis-affected households.",
        components: ["Cash transfer cycles", "Market monitoring"],
        deliverables: ["Quarterly Progress Reports"],
        risks: [],
        sourceSummary: "Extracted from duplicate Dignity upload.",
        evidenceNotes: ["Dignity profile"],
        missingFields: [],
      },
      files: [
        {
          id: "doc-duplicate-dignity",
          name: "dignity-project-profile.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          filePath: "storage/uploads/test/dignity-project-profile.docx",
        },
      ],
    });

    expect(project?.id).toBe("dignity-through-cash-2");
    expect(project?.code).toBe("ADPC-P014-2");
    expect(getProjectById("dignity-through-cash-2")?.code).toBe("ADPC-P014-2");
  });

  it("links project-scoped embedded templates to matching schedule items", async () => {
    const { getProjectById } = await import("@/server/db");
    const { createReportingTemplate, linkProjectSchedulesToTemplate } = await import("@/server/repository");

    const template = {
      id: "tpl-bpp-embedded-progress",
      projectId: "dignity-through-cash",
      name: "BMGF Investment Document Progress Narrative",
      funder: "FCDO",
      cadence: "Progress",
      reportType: "Progress Narrative",
      requiredSections: ["Investment Details", "Progress Against Outcomes", "Financial Update"],
      metadataFields: ["Investment ID", "Reporting Period"],
      sourceDocument: "Investment Document_INV-060215_Progress_Report_2024_BMGF.docx",
      filePath: "storage/uploads/test/bmgf-investment-document.docx",
      uploadedAt: "2026-06-12T00:00:00.000Z",
      isDefault: false,
    };

    createReportingTemplate(template);
    linkProjectSchedulesToTemplate("dignity-through-cash", template);

    const project = getProjectById("dignity-through-cash");
    expect(project?.templates.some((item) => item.id === template.id && item.projectId === "dignity-through-cash")).toBe(true);
    expect(project?.reportingSchedule.some((item) => item.templateId === template.id)).toBe(true);
  });

  it("replaces unstarted generic schedule rows with explicit document deadlines", async () => {
    const { getProjectById } = await import("@/server/db");
    const { replaceUnstartedProjectSchedule } = await import("@/server/repository");

    const count = replaceUnstartedProjectSchedule("dignity-through-cash", {
      items: [
        {
          reportType: "Progress Reporting Period 1",
          dueDate: "2024-08-31",
          reportingPeriodStart: "2023-08-01",
          reportingPeriodEnd: "2024-07-31",
          templateName: "BMGF Progress Narrative",
          sourceDocument: "Investment Document_INV-060215_Progress_Report_2024_BMGF.docx",
          evidence: "Progress Report Due Date is listed as 31 August 2024.",
        },
      ],
    });

    const project = getProjectById("dignity-through-cash");
    expect(count).toBe(1);
    expect(project?.reportingSchedule).toHaveLength(1);
    expect(project?.reportingSchedule[0]).toMatchObject({
      reportType: "Progress Reporting Period 1",
      dueDate: "2024-08-31",
    });
  });
});
