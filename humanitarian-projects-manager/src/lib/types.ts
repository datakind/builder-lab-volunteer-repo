export type ProjectStatus = "concept" | "pipeline" | "inception" | "implementation" | "closing";

export type DocumentStatus = "stored" | "ai_blocked" | "extracting" | "extracted" | "needs_review" | "failed";

export type ScheduleStatus = "upcoming" | "due_soon" | "overdue" | "generated" | "submitted";

export type GeneratedReportStatus = "draft" | "saved" | "failed";

export type Currency = "USD";

export interface CountryDetail {
  name: string;
  lat: number;
  lng: number;
  region: string;
}

export interface ProjectRisk {
  label: string;
  rating: "Low" | "Medium" | "High";
  mitigation: string;
}

export interface BudgetSplit {
  label: string;
  amount: number;
  percentage: number;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  type: string;
  name: string;
  mimeType: string;
  filePath: string;
  uploadedAt: string;
  status: DocumentStatus;
  summary: string;
  extractedJson: Record<string, unknown>;
  sourceScope: "project" | "funder_template";
}

export interface ReportingTemplate {
  id: string;
  projectId: string | null;
  name: string;
  funder: string;
  cadence: string;
  reportType: string;
  requiredSections: string[];
  metadataFields: string[];
  sourceDocument: string;
  filePath: string | null;
  uploadedAt: string;
  isDefault: boolean;
}

export interface ReportingScheduleItem {
  id: string;
  projectId: string;
  reportType: string;
  dueDate: string;
  status: ScheduleStatus;
  templateId: string;
  generatedReportId: string | null;
  submittedAt: string | null;
  template?: ReportingTemplate;
  generatedReport?: GeneratedReport | null;
}

export interface GeneratedReportSection {
  heading: string;
  body: string;
  evidence: string[];
  missingEvidence: boolean;
}

export interface GeneratedReport {
  id: string;
  scheduleId: string;
  projectId: string;
  templateId: string;
  title: string;
  prompt: string;
  evidenceSummary: string;
  sections: GeneratedReportSection[];
  missingFields: string[];
  status: GeneratedReportStatus;
  generatedAt: string;
  savedAt: string | null;
  filePath: string | null;
  fileName: string | null;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface Project {
  id: string;
  code: string;
  title: string;
  concept: string;
  sector: string;
  manager: string;
  funder: string;
  status: ProjectStatus;
  countries: string[];
  countryDetails: CountryDetail[];
  durationMonths: number;
  startDate: string;
  endDate: string;
  budget: number;
  currency: Currency;
  beneficiaries: string;
  objective: string;
  components: string[];
  deliverables: string[];
  risks: ProjectRisk[];
  budgetSplit: BudgetSplit[];
  sourceDocument: string;
  sourceSummary: string;
  vectorStoreId: string | null;
  updatedAt: string;
  documents: ProjectDocument[];
  reportingSchedule: ReportingScheduleItem[];
  templates: ReportingTemplate[];
  auditEvents: AuditEvent[];
}

export interface DashboardFilters {
  query: string;
  status: "all" | ProjectStatus;
  funder: string;
  sector: string;
  country: string;
  reportStatus: "all" | ScheduleStatus;
  budgetRange: "all" | "under-2m" | "2m-5m" | "over-5m";
}

export interface DashboardMetrics {
  projectCount: number;
  totalBudget: number;
  countriesCount: number;
  upcomingReports: number;
  overdueReports: number;
  averageBudget: number;
}

export interface DashboardModel {
  projects: Project[];
  templates: ReportingTemplate[];
  metrics: DashboardMetrics;
}
