import { existsSync } from "node:fs";
import {
  NewProjectExtractionSchema,
  ProjectExtractionSchema,
  type NewProjectExtraction,
  type ProjectExtraction,
  type ReportingScheduleExtraction,
} from "@/lib/schemas";
import type { GeneratedReport, GeneratedReportSection, ProjectDocument, ReportingTemplate } from "@/lib/types";
import { nowIso, uid } from "@/lib/format";
import { getDb, getGeneratedReportById, getProjectById, getScheduleById, getTemplateById } from "./db";
import { absoluteFromStoredPath } from "./storage";

export function addAuditEvent(projectId: string, action: string, detail: string) {
  getDb()
    .prepare("INSERT INTO audit_events (id, project_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(uid("audit"), projectId, action, detail, nowIso());
}

export function createProjectDocument(input: Omit<ProjectDocument, "extractedJson"> & { extractedJson?: Record<string, unknown> }) {
  getDb()
    .prepare(
      `INSERT INTO project_documents (
        id, project_id, type, name, mime_type, file_path, uploaded_at, status, summary, extracted_json, source_scope
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.projectId,
      input.type,
      input.name,
      input.mimeType,
      input.filePath,
      input.uploadedAt,
      input.status,
      input.summary,
      JSON.stringify(input.extractedJson ?? {}),
      input.sourceScope,
    );

  addAuditEvent(input.projectId, "Document uploaded", `${input.name} stored as ${input.status}`);
}

export function updateProjectDocumentExtraction(documentId: string, status: ProjectDocument["status"], summary: string, extracted: Record<string, unknown>) {
  getDb()
    .prepare("UPDATE project_documents SET status = ?, summary = ?, extracted_json = ? WHERE id = ?")
    .run(status, summary, JSON.stringify(extracted), documentId);
}

export function applyProjectExtraction(projectId: string, extraction: ProjectExtraction) {
  const parsed = ProjectExtractionSchema.parse(extraction);
  const project = getProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const next = {
    title: parsed.title || project.title,
    sector: parsed.sector || project.sector,
    funder: parsed.funder || project.funder,
    countries: parsed.countries?.length ? parsed.countries : project.countries,
    beneficiaries: parsed.beneficiaries || project.beneficiaries,
    objective: parsed.objective || project.objective,
    components: parsed.components?.length ? parsed.components : project.components,
    deliverables: parsed.deliverables?.length ? parsed.deliverables : project.deliverables,
    risks: parsed.risks?.length ? parsed.risks : project.risks,
    budget: parsed.budget || project.budget,
  };

  getDb()
    .prepare(
      `UPDATE projects SET
        title = ?, sector = ?, funder = ?, countries_json = ?, beneficiaries = ?, objective = ?,
        components_json = ?, deliverables_json = ?, risks_json = ?, budget = ?, updated_at = ?
      WHERE id = ?`,
    )
    .run(
      next.title,
      next.sector,
      next.funder,
      JSON.stringify(next.countries),
      next.beneficiaries,
      next.objective,
      JSON.stringify(next.components),
      JSON.stringify(next.deliverables),
      JSON.stringify(next.risks),
      next.budget,
      nowIso(),
      projectId,
    );

  addAuditEvent(projectId, "AI extraction applied", parsed.summary);
}

export function createReportingTemplate(input: ReportingTemplate) {
  getDb()
    .prepare(
      `INSERT INTO reporting_templates (
        id, project_id, name, funder, cadence, report_type, required_sections_json, metadata_fields_json,
        source_document, file_path, uploaded_at, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.projectId,
      input.name,
      input.funder,
      input.cadence,
      input.reportType,
      JSON.stringify(input.requiredSections),
      JSON.stringify(input.metadataFields),
      input.sourceDocument,
      input.filePath,
      input.uploadedAt,
      input.isDefault ? 1 : 0,
    );
}

export function linkProjectSchedulesToTemplate(projectId: string, template: ReportingTemplate) {
  const db = getDb();
  const schedules = db
    .prepare("SELECT id, report_type FROM reporting_schedule WHERE project_id = ?")
    .all(projectId) as Array<{ id: string; report_type: string }>;
  const update = db.prepare("UPDATE reporting_schedule SET template_id = ? WHERE id = ?");

  for (const schedule of schedules) {
    if (templateScheduleScore(template, schedule.report_type) > 0) {
      update.run(template.id, schedule.id);
    }
  }

  addAuditEvent(projectId, "Reporting template linked", `${template.name} linked to matching reporting schedule items.`);
}

export function replaceUnstartedProjectSchedule(projectId: string, extraction: ReportingScheduleExtraction) {
  const project = getProjectById(projectId);
  if (!project) return 0;

  const items = extraction.items
    .map((item) => ({
      ...item,
      dueDate: validDate(item.dueDate),
      reportType: item.reportType.trim() || item.templateName.trim() || "Donor Report",
    }))
    .filter((item) => item.dueDate && item.reportType);

  if (!items.length) return 0;

  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO reporting_schedule (
      id, project_id, report_type, due_date, status, template_id, generated_report_id, submitted_at
    ) VALUES (?, ?, ?, ?, 'upcoming', ?, NULL, NULL)`,
  );

  let insertedCount = 0;
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM reporting_schedule WHERE project_id = ? AND generated_report_id IS NULL AND submitted_at IS NULL").run(projectId);

    const seen = new Set<string>();
    items.forEach((item) => {
      const key = `${item.reportType.toLowerCase()}|${item.dueDate}`;
      if (seen.has(key)) return;
      seen.add(key);
      insert.run(
        uid("schedule"),
        projectId,
        item.reportType,
        item.dueDate,
        bestTemplateIdForSchedule(project.templates, item.reportType),
      );
      insertedCount += 1;
    });
  });
  tx();

  addAuditEvent(
    projectId,
    "Reporting schedule updated",
    `Updated from uploaded documents: ${items.map((item) => `${item.reportType} due ${item.dueDate}`).join("; ")}`,
  );

  return insertedCount;
}

export function deleteProject(projectId: string) {
  const db = getDb();
  const project = getProjectById(projectId);
  if (!project) return false;

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM generated_reports WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM reporting_schedule WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM project_documents WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM audit_events WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM reporting_templates WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  });
  tx();

  return true;
}

export function createProjectFromExtraction(input: {
  extraction: NewProjectExtraction;
  files: Array<{ id: string; name: string; mimeType: string; filePath: string }>;
}) {
  const extraction = NewProjectExtractionSchema.parse(input.extraction);
  const db = getDb();
  const id = uniqueProjectId(extraction.title);
  const code = uniqueProjectCode((extraction.code ?? "").trim() || nextProjectCode());
  const startDate = validDate(extraction.startDate) || new Date().toISOString().slice(0, 10);
  const durationMonths = extraction.durationMonths && extraction.durationMonths > 0 ? Math.round(extraction.durationMonths) : 12;
  const endDate = validDate(extraction.endDate) || addMonths(startDate, durationMonths);
  const budget = extraction.budget && extraction.budget > 0 ? Math.round(extraction.budget) : 0;
  const countries = extraction.countries.filter(Boolean).length ? extraction.countries.filter(Boolean) : ["Unspecified"];
  const now = nowIso();
  const templateIds = scheduleTemplatesForFunder(extraction.funder);

  const project = {
    id,
    code,
    title: extraction.title,
    concept: extraction.concept || `${extraction.title} was created from uploaded project documents.`,
    sector: extraction.sector || "Unspecified",
    manager: extraction.manager || "Unassigned",
    funder: extraction.funder || "Unspecified",
    status: "concept",
    countries,
    countryDetails: countries.map(countryDetail),
    durationMonths,
    startDate,
    endDate,
    budget,
    currency: "USD",
    beneficiaries: extraction.beneficiaries || "Not extracted",
    objective: extraction.objective || "Not extracted",
    components: extraction.components.length ? extraction.components : ["Review uploaded proposal documents"],
    deliverables: extraction.deliverables.length ? extraction.deliverables : ["Reporting schedule to be confirmed"],
    risks: extraction.risks.length
      ? extraction.risks
      : [
          {
            label: "Incomplete source evidence",
            rating: "Medium",
            mitigation: "Review uploaded documents and complete missing project fields.",
          },
        ],
    budgetSplit: defaultBudgetSplit(budget),
    sourceDocument: input.files.map((file) => file.name).join("; "),
    sourceSummary: extraction.sourceSummary || "Created from uploaded project documents.",
    vectorStoreId: null,
    updatedAt: now,
  };

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO projects (
        id, code, title, concept, sector, manager, funder, status, countries_json, country_details_json,
        duration_months, start_date, end_date, budget, currency, beneficiaries, objective,
        components_json, deliverables_json, risks_json, budget_split_json, source_document, source_summary,
        vector_store_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      project.id,
      project.code,
      project.title,
      project.concept,
      project.sector,
      project.manager,
      project.funder,
      project.status,
      JSON.stringify(project.countries),
      JSON.stringify(project.countryDetails),
      project.durationMonths,
      project.startDate,
      project.endDate,
      project.budget,
      project.currency,
      project.beneficiaries,
      project.objective,
      JSON.stringify(project.components),
      JSON.stringify(project.deliverables),
      JSON.stringify(project.risks),
      JSON.stringify(project.budgetSplit),
      project.sourceDocument,
      project.sourceSummary,
      project.vectorStoreId,
      project.updatedAt,
    );

    const insertDoc = db.prepare(
      `INSERT INTO project_documents (
        id, project_id, type, name, mime_type, file_path, uploaded_at, status, summary, extracted_json, source_scope
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'extracted', ?, ?, 'project')`,
    );
    for (const file of input.files) {
      insertDoc.run(
        file.id,
        project.id,
        "New project intake document",
        file.name,
        file.mimeType,
        file.filePath,
        now,
        extraction.sourceSummary,
        JSON.stringify({ evidenceNotes: extraction.evidenceNotes, missingFields: extraction.missingFields }),
      );
    }

    const insertSchedule = db.prepare(
      `INSERT INTO reporting_schedule (
        id, project_id, report_type, due_date, status, template_id, generated_report_id, submitted_at
      ) VALUES (?, ?, ?, ?, 'upcoming', ?, NULL, NULL)`,
    );
    insertSchedule.run(`${project.id}-monthly-1`, project.id, "Monthly Situation Report", addDays(project.startDate, 45), templateIds.monthly);
    insertSchedule.run(`${project.id}-quarterly-1`, project.id, "Quarterly Donor Progress Report", addDays(project.startDate, 90), templateIds.quarterly);
    insertSchedule.run(`${project.id}-closeout-1`, project.id, "Final Project Closeout Report", project.endDate, "tpl-final-closeout");

    db.prepare("INSERT INTO audit_events (id, project_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?)").run(
      uid("audit"),
      project.id,
      "New project created",
      `Created from ${input.files.length} uploaded document(s).`,
      now,
    );
  });
  tx();

  return getProjectById(project.id);
}

export function createGeneratedReportDraft(input: {
  id: string;
  scheduleId: string;
  projectId: string;
  templateId: string;
  title: string;
  prompt: string;
  evidenceSummary: string;
  sections: GeneratedReportSection[];
  missingFields: string[];
}) {
  const now = nowIso();
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO generated_reports (
        id, schedule_id, project_id, template_id, title, prompt, evidence_summary, sections_json,
        missing_fields_json, status, generated_at, saved_at, file_path, file_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NULL, NULL, NULL)`,
    ).run(
      input.id,
      input.scheduleId,
      input.projectId,
      input.templateId,
      input.title,
      input.prompt,
      input.evidenceSummary,
      JSON.stringify(input.sections),
      JSON.stringify(input.missingFields),
      now,
    );
    db.prepare("UPDATE reporting_schedule SET generated_report_id = ?, status = 'generated' WHERE id = ?").run(input.id, input.scheduleId);
    addAuditEvent(input.projectId, "Report draft generated", input.title);
  });
  tx();
  return getGeneratedReportById(input.id);
}

export function replaceGeneratedReportDraft(reportId: string, input: Pick<GeneratedReport, "title" | "prompt" | "evidenceSummary" | "sections" | "missingFields">) {
  getDb()
    .prepare(
      `UPDATE generated_reports SET
        title = ?, prompt = ?, evidence_summary = ?, sections_json = ?, missing_fields_json = ?,
        status = 'draft', generated_at = ?, saved_at = NULL, file_path = NULL, file_name = NULL
      WHERE id = ?`,
    )
    .run(
      input.title,
      input.prompt,
      input.evidenceSummary,
      JSON.stringify(input.sections),
      JSON.stringify(input.missingFields),
      nowIso(),
      reportId,
    );
  const report = getGeneratedReportById(reportId);
  if (report) addAuditEvent(report.projectId, "Report draft regenerated", report.title);
  return report;
}

export function markGeneratedReportSaved(reportId: string, filePath: string, fileName: string) {
  const report = getGeneratedReportById(reportId);
  if (!report) return null;

  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("UPDATE generated_reports SET status = 'saved', saved_at = ?, file_path = ?, file_name = ? WHERE id = ?").run(
      nowIso(),
      filePath,
      fileName,
      reportId,
    );
    db.prepare("UPDATE reporting_schedule SET status = 'generated', generated_report_id = ? WHERE id = ?").run(reportId, report.scheduleId);
    addAuditEvent(report.projectId, "Report saved", fileName);
  });
  tx();

  return getGeneratedReportById(reportId);
}

export function getDownloadableFile(fileId: string) {
  const document = getDb()
    .prepare("SELECT id, name, mime_type, file_path FROM project_documents WHERE id = ? AND file_path != ''")
    .get(fileId) as { id: string; name: string; mime_type: string; file_path: string } | undefined;

  if (document) {
    const absolutePath = absoluteFromStoredPath(document.file_path);
    if (existsSync(absolutePath)) {
      return {
        path: absolutePath,
        fileName: document.name,
        mimeType: document.mime_type || "application/octet-stream",
      };
    }
  }

  const report = getGeneratedReportById(fileId);
  if (report?.filePath && report.fileName) {
    const absolutePath = absoluteFromStoredPath(report.filePath);
    if (existsSync(absolutePath)) {
      return {
        path: absolutePath,
        fileName: report.fileName,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
  }

  return null;
}

export function loadReportGenerationContext(scheduleId: string) {
  const schedule = getScheduleById(scheduleId);
  if (!schedule) return null;
  const project = getProjectById(schedule.project_id);
  const template = getTemplateById(schedule.template_id);
  if (!project || !template) return null;
  return { schedule, project, template };
}

function uniqueProjectId(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "new-project";
  const db = getDb();
  let candidate = base;
  let index = 2;
  while (db.prepare("SELECT 1 FROM projects WHERE id = ?").get(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function nextProjectCode() {
  const rows = getDb().prepare("SELECT code FROM projects WHERE code LIKE 'ADPC-P%'").all() as Array<{ code: string }>;
  const max = rows.reduce((value, row) => {
    const match = row.code.match(/ADPC-P(\d+)/);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 20);
  return `ADPC-P${String(max + 1).padStart(3, "0")}`;
}

function uniqueProjectCode(code: string) {
  const db = getDb();
  let candidate = code || nextProjectCode();
  let index = 2;
  while (db.prepare("SELECT 1 FROM projects WHERE code = ?").get(candidate)) {
    candidate = `${code}-${index}`;
    index += 1;
  }
  return candidate;
}

function validDate(value?: string) {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function scheduleTemplatesForFunder(funder: string) {
  const normalized = funder.toLowerCase();
  if (normalized.includes("fcdo")) return { monthly: "tpl-monthly-sitrep", quarterly: "tpl-fcdo-cash" };
  if (normalized.includes("echo")) return { monthly: "tpl-monthly-sitrep", quarterly: "tpl-echo-interim" };
  if (normalized.includes("unicef")) return { monthly: "tpl-monthly-sitrep", quarterly: "tpl-unicef-quarterly" };
  return { monthly: "tpl-monthly-sitrep", quarterly: "tpl-quarterly-progress" };
}

function templateScheduleScore(template: ReportingTemplate, reportType: string) {
  const cadence = template.cadence.toLowerCase();
  const templateReport = template.reportType.toLowerCase();
  const scheduleReport = reportType.toLowerCase();
  let score = 0;

  if (templateReport && scheduleReport === templateReport) score += 10;
  if (templateReport && scheduleReport.includes(templateReport)) score += 8;
  if (templateReport && templateReport.includes(scheduleReport)) score += 8;
  if (cadence.includes("monthly") && scheduleReport.includes("monthly")) score += 5;
  if (cadence.includes("quarter") && (scheduleReport.includes("quarter") || scheduleReport.includes("progress"))) score += 5;
  if (cadence.includes("progress") && scheduleReport.includes("progress")) score += 5;
  if (cadence.includes("final") && scheduleReport.includes("final")) score += 5;
  if (templateReport.includes("progress") && scheduleReport.includes("progress")) score += 4;
  if (templateReport.includes("final") && scheduleReport.includes("final")) score += 4;
  if (templateReport.includes("narrative") && scheduleReport.includes("progress")) score += 3;

  return score;
}

function bestTemplateIdForSchedule(templates: ReportingTemplate[], reportType: string) {
  const sorted = [...templates].sort((a, b) => templateScheduleScore(b, reportType) - templateScheduleScore(a, reportType));
  return sorted[0]?.id || "tpl-quarterly-progress";
}

function countryDetail(name: string) {
  const known: Record<string, { lat: number; lng: number; region: string }> = {
    Somalia: { lat: 5.1521, lng: 46.1996, region: "Extracted project geography" },
    "Northern Mozambique": { lat: -12.3335, lng: 39.3206, region: "Extracted project geography" },
    Mozambique: { lat: -18.6657, lng: 35.5296, region: "Extracted project geography" },
    Bangladesh: { lat: 23.685, lng: 90.3563, region: "Extracted project geography" },
    Nepal: { lat: 28.3949, lng: 84.124, region: "Extracted project geography" },
    Ethiopia: { lat: 9.145, lng: 40.4897, region: "Extracted project geography" },
    Uganda: { lat: 1.3733, lng: 32.2903, region: "Extracted project geography" },
    Syria: { lat: 34.8021, lng: 38.9968, region: "Extracted project geography" },
    Madagascar: { lat: -18.7669, lng: 46.8691, region: "Extracted project geography" },
    DRC: { lat: -2.8799, lng: 23.656, region: "Extracted project geography" },
    "South Sudan": { lat: 6.877, lng: 31.307, region: "Extracted project geography" },
  };
  const knownDetail = known[name] ?? { lat: 0, lng: 0, region: "Needs geocoding review" };
  return { name, ...knownDetail };
}

function defaultBudgetSplit(total: number) {
  return [
    { label: "Personnel", percentage: 30, amount: Math.round(total * 0.3) },
    { label: "Program costs", percentage: 50, amount: Math.round(total * 0.5) },
    { label: "Operations", percentage: 10, amount: Math.round(total * 0.1) },
    { label: "M&E", percentage: 5, amount: Math.round(total * 0.05) },
    { label: "Indirect", percentage: 5, amount: Math.round(total * 0.05) },
  ];
}
