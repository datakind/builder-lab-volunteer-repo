import Database from "better-sqlite3";
import { dashboardMetrics, scheduleStatus } from "@/lib/reporting";
import { seedProjects, seedScheduleForProject, seedTemplates } from "@/lib/seed-data";
import type {
  AuditEvent,
  DashboardModel,
  GeneratedReport,
  GeneratedReportSection,
  Project,
  ProjectDocument,
  ReportingScheduleItem,
  ReportingTemplate,
} from "@/lib/types";
import { databasePath, ensureStorage } from "./storage";

type DbProjectRow = {
  id: string;
  code: string;
  title: string;
  concept: string;
  sector: string;
  manager: string;
  funder: string;
  status: Project["status"];
  countries_json: string;
  country_details_json: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  budget: number;
  currency: Project["currency"];
  beneficiaries: string;
  objective: string;
  components_json: string;
  deliverables_json: string;
  risks_json: string;
  budget_split_json: string;
  source_document: string;
  source_summary: string;
  vector_store_id: string | null;
  updated_at: string;
};

type DbDocumentRow = {
  id: string;
  project_id: string;
  type: string;
  name: string;
  mime_type: string;
  file_path: string;
  uploaded_at: string;
  status: ProjectDocument["status"];
  summary: string;
  extracted_json: string;
  source_scope: ProjectDocument["sourceScope"];
};

type DbTemplateRow = {
  id: string;
  project_id: string | null;
  name: string;
  funder: string;
  cadence: string;
  report_type: string;
  required_sections_json: string;
  metadata_fields_json: string;
  source_document: string;
  file_path: string | null;
  uploaded_at: string;
  is_default: 0 | 1;
};

type DbScheduleRow = {
  id: string;
  project_id: string;
  report_type: string;
  due_date: string;
  status: ReportingScheduleItem["status"];
  template_id: string;
  generated_report_id: string | null;
  submitted_at: string | null;
};

type DbReportRow = {
  id: string;
  schedule_id: string;
  project_id: string;
  template_id: string;
  title: string;
  prompt: string;
  evidence_summary: string;
  sections_json: string;
  missing_fields_json: string;
  status: GeneratedReport["status"];
  generated_at: string;
  saved_at: string | null;
  file_path: string | null;
  file_name: string | null;
};

type DbAuditRow = {
  id: string;
  project_id: string;
  action: string;
  detail: string;
  created_at: string;
};

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;
  ensureStorage();
  db = new Database(databasePath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seed(db);
  return db;
}

export function resetDbForTests() {
  db?.close();
  db = null;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      concept TEXT NOT NULL,
      sector TEXT NOT NULL,
      manager TEXT NOT NULL,
      funder TEXT NOT NULL,
      status TEXT NOT NULL,
      countries_json TEXT NOT NULL,
      country_details_json TEXT NOT NULL,
      duration_months INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      budget INTEGER NOT NULL,
      currency TEXT NOT NULL,
      beneficiaries TEXT NOT NULL,
      objective TEXT NOT NULL,
      components_json TEXT NOT NULL,
      deliverables_json TEXT NOT NULL,
      risks_json TEXT NOT NULL,
      budget_split_json TEXT NOT NULL,
      source_document TEXT NOT NULL,
      source_summary TEXT NOT NULL,
      vector_store_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      extracted_json TEXT NOT NULL,
      source_scope TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reporting_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      funder TEXT NOT NULL,
      cadence TEXT NOT NULL,
      report_type TEXT NOT NULL,
      required_sections_json TEXT NOT NULL,
      metadata_fields_json TEXT NOT NULL,
      source_document TEXT NOT NULL,
      file_path TEXT,
      uploaded_at TEXT NOT NULL,
      is_default INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reporting_schedule (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL,
      template_id TEXT NOT NULL REFERENCES reporting_templates(id),
      generated_report_id TEXT,
      submitted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS generated_reports (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL REFERENCES reporting_schedule(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      template_id TEXT NOT NULL REFERENCES reporting_templates(id),
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      evidence_summary TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      missing_fields_json TEXT NOT NULL,
      status TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      saved_at TEXT,
      file_path TEXT,
      file_name TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  ensureColumn(database, "reporting_templates", "project_id", "TEXT REFERENCES projects(id) ON DELETE CASCADE");
}

function ensureColumn(database: Database.Database, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function seed(database: Database.Database) {
  const projectCount = database.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number };
  if (projectCount.count > 0) return;

  const insertProject = database.prepare(`
    INSERT INTO projects (
      id, code, title, concept, sector, manager, funder, status, countries_json, country_details_json,
      duration_months, start_date, end_date, budget, currency, beneficiaries, objective,
      components_json, deliverables_json, risks_json, budget_split_json, source_document, source_summary,
      vector_store_id, updated_at
    ) VALUES (
      @id, @code, @title, @concept, @sector, @manager, @funder, @status, @countries_json, @country_details_json,
      @duration_months, @start_date, @end_date, @budget, @currency, @beneficiaries, @objective,
      @components_json, @deliverables_json, @risks_json, @budget_split_json, @source_document, @source_summary,
      @vector_store_id, @updated_at
    )
  `);

  const insertTemplate = database.prepare(`
    INSERT INTO reporting_templates (
      id, project_id, name, funder, cadence, report_type, required_sections_json, metadata_fields_json, source_document,
      file_path, uploaded_at, is_default
    ) VALUES (
      @id, @project_id, @name, @funder, @cadence, @report_type, @required_sections_json, @metadata_fields_json, @source_document,
      @file_path, @uploaded_at, @is_default
    )
  `);

  const insertSchedule = database.prepare(`
    INSERT INTO reporting_schedule (
      id, project_id, report_type, due_date, status, template_id, generated_report_id, submitted_at
    ) VALUES (
      @id, @project_id, @report_type, @due_date, @status, @template_id, NULL, NULL
    )
  `);

  const insertDocument = database.prepare(`
    INSERT INTO project_documents (
      id, project_id, type, name, mime_type, file_path, uploaded_at, status, summary, extracted_json, source_scope
    ) VALUES (
      @id, @project_id, @type, @name, @mime_type, @file_path, @uploaded_at, @status, @summary, @extracted_json, @source_scope
    )
  `);

  const insertAudit = database.prepare(`
    INSERT INTO audit_events (id, project_id, action, detail, created_at)
    VALUES (@id, @project_id, @action, @detail, @created_at)
  `);

  const transaction = database.transaction(() => {
    for (const template of seedTemplates) {
      insertTemplate.run({
        id: template.id,
        project_id: template.projectId ?? null,
        name: template.name,
        funder: template.funder,
        cadence: template.cadence,
        report_type: template.reportType,
        required_sections_json: JSON.stringify(template.requiredSections),
        metadata_fields_json: JSON.stringify(template.metadataFields),
        source_document: template.sourceDocument,
        file_path: template.filePath,
        uploaded_at: template.uploadedAt,
        is_default: template.isDefault ? 1 : 0,
      });
    }

    for (const project of seedProjects) {
      insertProject.run({
        id: project.id,
        code: project.code,
        title: project.title,
        concept: project.concept,
        sector: project.sector,
        manager: project.manager,
        funder: project.funder,
        status: project.status,
        countries_json: JSON.stringify(project.countries),
        country_details_json: JSON.stringify(project.countryDetails),
        duration_months: project.durationMonths,
        start_date: project.startDate,
        end_date: project.endDate,
        budget: project.budget,
        currency: project.currency,
        beneficiaries: project.beneficiaries,
        objective: project.objective,
        components_json: JSON.stringify(project.components),
        deliverables_json: JSON.stringify(project.deliverables),
        risks_json: JSON.stringify(project.risks),
        budget_split_json: JSON.stringify(project.budgetSplit),
        source_document: project.sourceDocument,
        source_summary: project.sourceSummary,
        vector_store_id: null,
        updated_at: new Date().toISOString(),
      });

      insertDocument.run({
        id: `${project.id}-seed-source`,
        project_id: project.id,
        type: "Seed proposal source",
        name: project.sourceDocument,
        mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        file_path: "",
        uploaded_at: "2026-06-11T00:00:00.000Z",
        status: "extracted",
        summary: project.sourceSummary,
        extracted_json: JSON.stringify({ seededFrom: project.sourceDocument }),
        source_scope: "project",
      });

      for (const schedule of seedScheduleForProject(project.id, project.endDate)) {
        insertSchedule.run({
          id: schedule.id,
          project_id: schedule.projectId,
          report_type: schedule.reportType,
          due_date: schedule.dueDate,
          status: scheduleStatus(schedule.dueDate, false),
          template_id: schedule.templateId,
        });
      }

      insertAudit.run({
        id: `${project.id}-seed-audit`,
        project_id: project.id,
        action: "Seeded project",
        detail: `Created from ${project.sourceDocument}`,
        created_at: "2026-06-11T00:00:00.000Z",
      });
    }
  });

  transaction();
}

export function json<T>(value: string): T {
  return JSON.parse(value) as T;
}

export function mapTemplate(row: DbTemplateRow): ReportingTemplate {
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    name: row.name,
    funder: row.funder,
    cadence: row.cadence,
    reportType: row.report_type,
    requiredSections: json<string[]>(row.required_sections_json),
    metadataFields: json<string[]>(row.metadata_fields_json),
    sourceDocument: row.source_document,
    filePath: row.file_path,
    uploadedAt: row.uploaded_at,
    isDefault: Boolean(row.is_default),
  };
}

export function mapDocument(row: DbDocumentRow): ProjectDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type,
    name: row.name,
    mimeType: row.mime_type,
    filePath: row.file_path,
    uploadedAt: row.uploaded_at,
    status: row.status,
    summary: row.summary,
    extractedJson: json<Record<string, unknown>>(row.extracted_json),
    sourceScope: row.source_scope,
  };
}

export function mapReport(row: DbReportRow): GeneratedReport {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    projectId: row.project_id,
    templateId: row.template_id,
    title: row.title,
    prompt: row.prompt,
    evidenceSummary: row.evidence_summary,
    sections: json<GeneratedReportSection[]>(row.sections_json),
    missingFields: json<string[]>(row.missing_fields_json),
    status: row.status,
    generatedAt: row.generated_at,
    savedAt: row.saved_at,
    filePath: row.file_path,
    fileName: row.file_name,
  };
}

function mapAudit(row: DbAuditRow): AuditEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    action: row.action,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

function mapProject(
  row: DbProjectRow,
  related: {
    documents: ProjectDocument[];
    reportingSchedule: ReportingScheduleItem[];
    templates: ReportingTemplate[];
    auditEvents: AuditEvent[];
  },
): Project {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    concept: row.concept,
    sector: row.sector,
    manager: row.manager,
    funder: row.funder,
    status: row.status,
    countries: json<string[]>(row.countries_json),
    countryDetails: json<Project["countryDetails"]>(row.country_details_json),
    durationMonths: row.duration_months,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: row.budget,
    currency: row.currency,
    beneficiaries: row.beneficiaries,
    objective: row.objective,
    components: json<string[]>(row.components_json),
    deliverables: json<string[]>(row.deliverables_json),
    risks: json<Project["risks"]>(row.risks_json),
    budgetSplit: json<Project["budgetSplit"]>(row.budget_split_json),
    sourceDocument: row.source_document,
    sourceSummary: row.source_summary,
    vectorStoreId: row.vector_store_id,
    updatedAt: row.updated_at,
    documents: related.documents,
    reportingSchedule: related.reportingSchedule,
    templates: related.templates,
    auditEvents: related.auditEvents,
  };
}

export function getTemplates(database = getDb()) {
  return database
    .prepare("SELECT * FROM reporting_templates ORDER BY funder, name")
    .all()
    .map((row) => mapTemplate(row as DbTemplateRow));
}

export function getProjectById(projectId: string, database = getDb()): Project | null {
  const row = database.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as DbProjectRow | undefined;
  if (!row) return null;

  const documents = database
    .prepare("SELECT * FROM project_documents WHERE project_id = ? ORDER BY uploaded_at DESC")
    .all(projectId)
    .map((item) => mapDocument(item as DbDocumentRow));
  const templates = getTemplates(database).filter(
    (template) => template.projectId === row.id || template.funder === row.funder || template.funder === "All funders",
  );
  const reports = database
    .prepare("SELECT * FROM generated_reports WHERE project_id = ?")
    .all(projectId)
    .map((item) => mapReport(item as DbReportRow));
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const templatesById = new Map(templates.map((template) => [template.id, template]));
  const reportingSchedule = database
    .prepare("SELECT * FROM reporting_schedule WHERE project_id = ? ORDER BY due_date ASC")
    .all(projectId)
    .map((item) => {
      const schedule = item as DbScheduleRow;
      const generatedReport = schedule.generated_report_id ? reportsById.get(schedule.generated_report_id) ?? null : null;
      return {
        id: schedule.id,
        projectId: schedule.project_id,
        reportType: schedule.report_type,
        dueDate: schedule.due_date,
        status: scheduleStatus(schedule.due_date, generatedReport?.status === "saved", schedule.submitted_at),
        templateId: schedule.template_id,
        generatedReportId: schedule.generated_report_id,
        submittedAt: schedule.submitted_at,
        template: templatesById.get(schedule.template_id),
        generatedReport,
      } satisfies ReportingScheduleItem;
    });
  const auditEvents = database
    .prepare("SELECT * FROM audit_events WHERE project_id = ? ORDER BY created_at DESC LIMIT 20")
    .all(projectId)
    .map((item) => mapAudit(item as DbAuditRow));

  return mapProject(row, { documents, reportingSchedule, templates, auditEvents });
}

export function getProjects(database = getDb()) {
  const rows = database.prepare("SELECT * FROM projects ORDER BY code").all() as DbProjectRow[];
  return rows.map((row) => getProjectById(row.id, database)).filter((project): project is Project => Boolean(project));
}

export function getDashboardModel(database = getDb()): DashboardModel {
  const projects = getProjects(database);
  return {
    projects,
    templates: getTemplates(database),
    metrics: dashboardMetrics(projects),
  };
}

export function getScheduleById(scheduleId: string, database = getDb()) {
  const row = database.prepare("SELECT * FROM reporting_schedule WHERE id = ?").get(scheduleId) as DbScheduleRow | undefined;
  if (!row) return null;
  return row;
}

export function getTemplateById(templateId: string, database = getDb()) {
  const row = database.prepare("SELECT * FROM reporting_templates WHERE id = ?").get(templateId) as DbTemplateRow | undefined;
  return row ? mapTemplate(row) : null;
}

export function getGeneratedReportById(reportId: string, database = getDb()) {
  const row = database.prepare("SELECT * FROM generated_reports WHERE id = ?").get(reportId) as DbReportRow | undefined;
  return row ? mapReport(row) : null;
}
