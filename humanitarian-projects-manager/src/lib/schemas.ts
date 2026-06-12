import { z } from "zod";

export const ProjectExtractionSchema = z.object({
  summary: z.string(),
  title: z.string().optional(),
  sector: z.string().optional(),
  funder: z.string().optional(),
  countries: z.array(z.string()).optional(),
  budget: z.number().optional(),
  beneficiaries: z.string().optional(),
  objective: z.string().optional(),
  components: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
  risks: z
    .array(
      z.object({
        label: z.string(),
        rating: z.enum(["Low", "Medium", "High"]),
        mitigation: z.string(),
      }),
    )
    .optional(),
  evidenceNotes: z.array(z.string()).default([]),
  missingFields: z.array(z.string()).default([]),
});

export type ProjectExtraction = z.infer<typeof ProjectExtractionSchema>;

export const NewProjectExtractionSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1),
  concept: z.string(),
  sector: z.string(),
  manager: z.string().optional(),
  funder: z.string(),
  countries: z.array(z.string()).min(1),
  durationMonths: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  beneficiaries: z.string(),
  objective: z.string(),
  components: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
  risks: z
    .array(
      z.object({
        label: z.string(),
        rating: z.enum(["Low", "Medium", "High"]),
        mitigation: z.string(),
      }),
    )
    .default([]),
  sourceSummary: z.string(),
  evidenceNotes: z.array(z.string()).default([]),
  missingFields: z.array(z.string()).default([]),
});

export type NewProjectExtraction = z.infer<typeof NewProjectExtractionSchema>;

export const ReportingTemplateExtractionSchema = z.object({
  name: z.string(),
  funder: z.string(),
  cadence: z.string(),
  reportType: z.string(),
  requiredSections: z.array(z.string()).min(1),
  metadataFields: z.array(z.string()).default([]),
  strictnessNotes: z.array(z.string()).default([]),
});

export type ReportingTemplateExtraction = z.infer<typeof ReportingTemplateExtractionSchema>;

export const EmbeddedTemplateExtractionSchema = z.object({
  hasTemplate: z.boolean(),
  name: z.string(),
  funder: z.string(),
  cadence: z.string(),
  reportType: z.string(),
  requiredSections: z.array(z.string()).default([]),
  metadataFields: z.array(z.string()).default([]),
  strictnessNotes: z.array(z.string()).default([]),
});

export type EmbeddedTemplateExtraction = z.infer<typeof EmbeddedTemplateExtractionSchema>;

export const ReportingScheduleExtractionSchema = z.object({
  items: z
    .array(
      z.object({
        reportType: z.string(),
        dueDate: z.string(),
        reportingPeriodStart: z.string(),
        reportingPeriodEnd: z.string(),
        templateName: z.string(),
        sourceDocument: z.string(),
        evidence: z.string(),
      }),
    )
    .default([]),
});

export type ReportingScheduleExtraction = z.infer<typeof ReportingScheduleExtractionSchema>;

export const GeneratedReportSchema = z.object({
  title: z.string(),
  evidenceSummary: z.string(),
  missingFields: z.array(z.string()).default([]),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
      evidence: z.array(z.string()).default([]),
      missingEvidence: z.boolean().default(false),
    }),
  ),
});

export type GeneratedReportExtraction = z.infer<typeof GeneratedReportSchema>;

export const projectExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "evidenceNotes", "missingFields"],
  properties: {
    summary: { type: "string" },
    title: { type: "string" },
    sector: { type: "string" },
    funder: { type: "string" },
    countries: { type: "array", items: { type: "string" } },
    budget: { type: "number" },
    beneficiaries: { type: "string" },
    objective: { type: "string" },
    components: { type: "array", items: { type: "string" } },
    deliverables: { type: "array", items: { type: "string" } },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "rating", "mitigation"],
        properties: {
          label: { type: "string" },
          rating: { type: "string", enum: ["Low", "Medium", "High"] },
          mitigation: { type: "string" },
        },
      },
    },
    evidenceNotes: { type: "array", items: { type: "string" } },
    missingFields: { type: "array", items: { type: "string" } },
  },
} as const;

export const newProjectExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "code",
    "title",
    "concept",
    "sector",
    "manager",
    "funder",
    "countries",
    "durationMonths",
    "startDate",
    "endDate",
    "budget",
    "beneficiaries",
    "objective",
    "components",
    "deliverables",
    "risks",
    "sourceSummary",
    "evidenceNotes",
    "missingFields",
  ],
  properties: {
    code: { type: "string" },
    title: { type: "string" },
    concept: { type: "string" },
    sector: { type: "string" },
    manager: { type: "string" },
    funder: { type: "string" },
    countries: { type: "array", items: { type: "string" } },
    durationMonths: { type: "number" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    budget: { type: "number" },
    beneficiaries: { type: "string" },
    objective: { type: "string" },
    components: { type: "array", items: { type: "string" } },
    deliverables: { type: "array", items: { type: "string" } },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "rating", "mitigation"],
        properties: {
          label: { type: "string" },
          rating: { type: "string", enum: ["Low", "Medium", "High"] },
          mitigation: { type: "string" },
        },
      },
    },
    sourceSummary: { type: "string" },
    evidenceNotes: { type: "array", items: { type: "string" } },
    missingFields: { type: "array", items: { type: "string" } },
  },
} as const;

export const templateExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "funder", "cadence", "reportType", "requiredSections", "metadataFields", "strictnessNotes"],
  properties: {
    name: { type: "string" },
    funder: { type: "string" },
    cadence: { type: "string" },
    reportType: { type: "string" },
    requiredSections: { type: "array", items: { type: "string" } },
    metadataFields: { type: "array", items: { type: "string" } },
    strictnessNotes: { type: "array", items: { type: "string" } },
  },
} as const;

export const embeddedTemplateExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hasTemplate", "name", "funder", "cadence", "reportType", "requiredSections", "metadataFields", "strictnessNotes"],
  properties: {
    hasTemplate: { type: "boolean" },
    name: { type: "string" },
    funder: { type: "string" },
    cadence: { type: "string" },
    reportType: { type: "string" },
    requiredSections: { type: "array", items: { type: "string" } },
    metadataFields: { type: "array", items: { type: "string" } },
    strictnessNotes: { type: "array", items: { type: "string" } },
  },
} as const;

export const reportingScheduleExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["reportType", "dueDate", "reportingPeriodStart", "reportingPeriodEnd", "templateName", "sourceDocument", "evidence"],
        properties: {
          reportType: { type: "string" },
          dueDate: { type: "string" },
          reportingPeriodStart: { type: "string" },
          reportingPeriodEnd: { type: "string" },
          templateName: { type: "string" },
          sourceDocument: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
  },
} as const;

export const generatedReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "evidenceSummary", "missingFields", "sections"],
  properties: {
    title: { type: "string" },
    evidenceSummary: { type: "string" },
    missingFields: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "body", "evidence", "missingEvidence"],
        properties: {
          heading: { type: "string" },
          body: { type: "string" },
          evidence: { type: "array", items: { type: "string" } },
          missingEvidence: { type: "boolean" },
        },
      },
    },
  },
} as const;
