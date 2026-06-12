import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import OpenAI from "openai";
import {
  embeddedTemplateExtractionJsonSchema,
  EmbeddedTemplateExtractionSchema,
  generatedReportJsonSchema,
  GeneratedReportSchema,
  newProjectExtractionJsonSchema,
  NewProjectExtractionSchema,
  projectExtractionJsonSchema,
  ProjectExtractionSchema,
  ReportingTemplateExtractionSchema,
  reportingScheduleExtractionJsonSchema,
  ReportingScheduleExtractionSchema,
  templateExtractionJsonSchema,
} from "@/lib/schemas";
import { normalizeGeneratedSections } from "@/lib/reporting";
import type { Project, ProjectDocument, ReportingTemplate, ReportingScheduleItem } from "@/lib/types";
import { absoluteFromStoredPath } from "./storage";

const aiDisabledCode = "AI_DISABLED";
const execFileAsync = promisify(execFile);

export class AiDisabledError extends Error {
  code = aiDisabledCode;

  constructor() {
    super("OPENAI_API_KEY is not configured. Add it to .env.local to enable document extraction and report generation.");
  }
}

export function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function client() {
  if (!process.env.OPENAI_API_KEY) throw new AiDisabledError();
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
}

function model() {
  return process.env.OPENAI_MODEL || "gpt-5.5";
}

function logAiStep(step: string, files: string[], startedAt?: number) {
  const elapsed = startedAt ? ` in ${Math.round((Date.now() - startedAt) / 1000)}s` : "";
  console.info(`[AI] ${step}${elapsed}: ${files.join(", ") || "no files"}`);
}

async function inputFile(filePath: string, mimeType: string, name: string) {
  const buffer = await readFile(filePath);
  return {
    type: "input_file",
    filename: name,
    file_data: `data:${mimeType || "application/octet-stream"};base64,${buffer.toString("base64")}`,
  };
}

async function inputDocument(filePath: string, mimeType: string, name: string) {
  const text = await extractDocumentText(filePath, mimeType, name);
  if (text) {
    console.info(`[AI] using local text extraction for ${name}: ${Math.round(text.length / 1000)}k chars`);
    return {
      type: "input_text",
      text: [
        `Uploaded document text: ${name}`,
        "The following text was extracted locally from the uploaded Word document to reduce upload latency. Use it as the authoritative content of that document.",
        "",
        text,
      ].join("\n"),
    };
  }

  return inputFile(filePath, mimeType, name);
}

async function extractDocumentText(filePath: string, mimeType: string, name: string) {
  if (!isWordDocument(mimeType, name)) return "";

  try {
    const { stdout: listing } = await execFileAsync("unzip", ["-Z1", filePath], { maxBuffer: 4 * 1024 * 1024 });
    const entries = listing
      .split(/\r?\n/)
      .filter((entry) => /^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/.test(entry));
    if (!entries.length) return "";

    const { stdout } = await execFileAsync("unzip", ["-p", filePath, ...entries], { maxBuffer: 64 * 1024 * 1024 });
    const text = normalizeDocxXml(stdout);
    if (text.length < 300) return "";

    return truncateDocumentText(text);
  } catch (error) {
    console.warn(`[AI] local DOCX text extraction failed for ${name}; falling back to file input`, error);
    return "";
  }
}

function isWordDocument(mimeType: string, name: string) {
  const lowerName = name.toLowerCase();
  return mimeType.includes("wordprocessingml") || mimeType.includes("msword") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc");
}

function normalizeDocxXml(xml: string) {
  return decodeXmlEntities(
    xml
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function decodeXmlEntities(text: string) {
  return text.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (entity, value: string) => {
    if (value === "amp") return "&";
    if (value === "lt") return "<";
    if (value === "gt") return ">";
    if (value === "quot") return '"';
    if (value === "apos") return "'";

    const codePoint = value.startsWith("#x") ? Number.parseInt(value.slice(2), 16) : Number.parseInt(value.slice(1), 10);
    return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
  });
}

function truncateDocumentText(text: string) {
  const limit = Number(process.env.OPENAI_EXTRACTED_TEXT_CHARS) || 160_000;
  if (text.length <= limit) return text;

  const firstChunkLength = Math.round(limit * 0.7);
  const lastChunkLength = limit - firstChunkLength;
  return [
    text.slice(0, firstChunkLength),
    "",
    "[...middle of long document omitted for faster processing...]",
    "",
    text.slice(text.length - lastChunkLength),
  ].join("\n");
}

export async function extractProjectDocument(input: {
  project: Project;
  filePath: string;
  mimeType: string;
  fileName: string;
}) {
  const openai = client();
  const startedAt = Date.now();
  logAiStep("project document extraction started", [input.fileName]);
  const response = await openai.responses.create({
    model: model(),
    instructions:
      "Extract humanitarian project management facts. Preserve donor terminology. Do not invent missing values; put unknowns in missingFields.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Existing project: ${input.project.code} ${input.project.title}. Funder: ${input.project.funder}. Sector: ${input.project.sector}. Extract updates from the uploaded document.`,
          },
          await inputDocument(input.filePath, input.mimeType, input.fileName),
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "project_document_extraction",
        strict: true,
        schema: projectExtractionJsonSchema,
      },
    },
  } as never);
  logAiStep("project document extraction finished", [input.fileName], startedAt);

  return ProjectExtractionSchema.parse(JSON.parse(response.output_text));
}

export async function extractNewProjectFromDocuments(input: {
  files: Array<{ filePath: string; mimeType: string; fileName: string }>;
  hints: {
    title?: string;
    funder?: string;
    sector?: string;
    country?: string;
    manager?: string;
  };
}) {
  const openai = client();
  const startedAt = Date.now();
  logAiStep("new project extraction started", input.files.map((file) => file.fileName));
  const hints = Object.entries(input.hints)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const response = await openai.responses.create({
    model: model(),
    instructions:
      "Extract a new humanitarian project record from uploaded documents. Use the user's hints only as hints. Preserve donor language. Do not invent facts; use empty strings, zero, empty arrays, and missingFields when evidence is absent.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Create a new project entity from these documents.\n\nHints:\n${hints || "No hints provided."}`,
          },
          ...(await Promise.all(input.files.map((file) => inputDocument(file.filePath, file.mimeType, file.fileName)))),
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "new_project_extraction",
        strict: true,
        schema: newProjectExtractionJsonSchema,
      },
    },
  } as never);
  logAiStep("new project extraction finished", input.files.map((file) => file.fileName), startedAt);

  return NewProjectExtractionSchema.parse(JSON.parse(response.output_text));
}

export async function extractReportingTemplate(input: {
  filePath: string;
  mimeType: string;
  fileName: string;
  defaultFunder: string;
}) {
  const openai = client();
  const startedAt = Date.now();
  logAiStep("reporting template extraction started", [input.fileName]);
  const response = await openai.responses.create({
    model: model(),
    instructions:
      "Extract the donor report template as a strict required-section schema. Every section heading in the source template must be preserved.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Extract reporting template fields. If the funder is not clear, use ${input.defaultFunder}.`,
          },
          await inputDocument(input.filePath, input.mimeType, input.fileName),
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "reporting_template_extraction",
        strict: true,
        schema: templateExtractionJsonSchema,
      },
    },
  } as never);
  logAiStep("reporting template extraction finished", [input.fileName], startedAt);

  return ReportingTemplateExtractionSchema.parse(JSON.parse(response.output_text));
}

export async function extractEmbeddedReportingTemplate(input: {
  filePath: string;
  mimeType: string;
  fileName: string;
  defaultFunder: string;
}) {
  const openai = client();
  const startedAt = Date.now();
  logAiStep("embedded template detection started", [input.fileName]);
  const response = await openai.responses.create({
    model: model(),
    instructions:
      "Determine whether this project document contains a donor reporting template or reporting form. Only set hasTemplate true when the document includes explicit report questions, form sections, reporting-period sections, or required headings to complete. Preserve exact donor section names and order. Do not create a template from ordinary narrative evidence.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Inspect this uploaded project document for an embedded reporting template. If the funder is not clear, use ${input.defaultFunder}. If there is no embedded template, set hasTemplate false and return empty arrays.`,
          },
          await inputDocument(input.filePath, input.mimeType, input.fileName),
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "embedded_reporting_template_detection",
        strict: true,
        schema: embeddedTemplateExtractionJsonSchema,
      },
    },
  } as never);
  logAiStep("embedded template detection finished", [input.fileName], startedAt);

  return EmbeddedTemplateExtractionSchema.parse(JSON.parse(response.output_text));
}

export async function extractReportingScheduleFromDocuments(input: {
  project: Project;
  files: Array<{ filePath: string; mimeType: string; fileName: string }>;
  templates: ReportingTemplate[];
}) {
  const openai = client();
  const startedAt = Date.now();
  logAiStep("reporting schedule extraction started", input.files.map((file) => file.fileName));
  const response = await openai.responses.create({
    model: model(),
    instructions:
      "Extract explicit donor reporting schedule items from project documents. Use only due dates, reporting periods, report numbers, or submission dates stated in the files. Normalize dates to YYYY-MM-DD. Do not calculate recurring schedules, infer missing dates, or copy generic template instructions as deadlines.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Project: ${input.project.code} - ${input.project.title}`,
              `Funder: ${input.project.funder}`,
              `Project period: ${input.project.startDate} to ${input.project.endDate}`,
              `Known templates: ${input.templates.map((template) => `${template.name} (${template.reportType}, ${template.cadence})`).join("; ") || "None"}`,
              "",
              "Return only explicit reporting schedule items. If a document says a progress report is due on a date, include it. If a date is not explicit, set dueDate to an empty string so the app can ignore it.",
            ].join("\n"),
          },
          ...(await Promise.all(input.files.map((file) => inputDocument(file.filePath, file.mimeType, file.fileName)))),
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "reporting_schedule_extraction",
        strict: true,
        schema: reportingScheduleExtractionJsonSchema,
      },
    },
  } as never);
  logAiStep("reporting schedule extraction finished", input.files.map((file) => file.fileName), startedAt);

  return ReportingScheduleExtractionSchema.parse(JSON.parse(response.output_text));
}

export async function generateReportDraftWithOpenAI(input: {
  project: Project;
  schedule: Pick<ReportingScheduleItem, "id" | "reportType" | "dueDate">;
  template: ReportingTemplate;
  documents: ProjectDocument[];
  userPrompt?: string;
}) {
  const openai = client();
  const sourceDocuments = input.documents.filter((document) => document.filePath);
  const fileContent = [];
  const startedAt = Date.now();
  logAiStep("report generation started", sourceDocuments.slice(0, 8).map((document) => document.name));

  for (const document of sourceDocuments.slice(0, 8)) {
    fileContent.push(await inputDocument(absoluteFromStoredPath(document.filePath), document.mimeType, document.name));
  }

  const summaries = input.documents
    .map((document) => `- ${document.name} (${document.type}, ${document.status}): ${document.summary}`)
    .join("\n");

  const prompt = reportPrompt(input.project, input.schedule, input.template, summaries, input.userPrompt);
  const response = await openai.responses.create({
    model: model(),
    instructions:
      "Generate a donor report draft with strict evidence discipline. Include every required template section exactly once. Use only facts directly supported by uploaded files or extraction summaries. Do not infer, judge, soften, or invent missing facts. If evidence is absent, inconsistent, or uncertain, write a short REQUIRES HUMAN UPDATE flag inside that section.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: prompt,
          },
          ...fileContent,
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "generated_humanitarian_report",
        strict: true,
        schema: generatedReportJsonSchema,
      },
    },
  } as never);
  logAiStep("report generation finished", sourceDocuments.slice(0, 8).map((document) => document.name), startedAt);

  const parsed = GeneratedReportSchema.parse(JSON.parse(response.output_text));
  const sections = normalizeGeneratedSections(input.template.requiredSections, parsed.sections);
  const missingFields = [...new Set([...parsed.missingFields, ...sections.filter((section) => section.missingEvidence).map((section) => section.heading)])];

  return {
    title: parsed.title,
    evidenceSummary: parsed.evidenceSummary,
    missingFields,
    sections,
    prompt,
  };
}

export function reportPrompt(
  project: Project,
  schedule: Pick<ReportingScheduleItem, "id" | "reportType" | "dueDate">,
  template: ReportingTemplate,
  documentSummaries: string,
  userPrompt = "",
) {
  return [
    `Project: ${project.code} - ${project.title}`,
    `Funder: ${project.funder}`,
    `Sector: ${project.sector}`,
    `Countries: ${project.countries.join(", ")}`,
    `Budget: ${project.currency} ${project.budget}`,
    `Report type: ${schedule.reportType}`,
    `Due date: ${schedule.dueDate}`,
    `Template: ${template.name}`,
    `Template source: ${template.sourceDocument}`,
    `Required sections, in order: ${template.requiredSections.join(" | ")}`,
    `Metadata fields: ${template.metadataFields.join(" | ")}`,
    "",
    "User regeneration instructions:",
    userPrompt.trim() || "No additional user instructions.",
    "",
    "Project documents and extraction summaries:",
    documentSummaries || "No uploaded documents beyond seed metadata.",
    "",
    "Rules:",
    "1. Follow the template strictly and preserve all required section headings.",
    "2. Fill a section only with facts supported by the provided files or extraction summaries.",
    "3. If a required value, table cell, date, budget, indicator, result, or explanation is not directly supported, write: [REQUIRES HUMAN UPDATE] followed by the specific missing evidence.",
    "4. Do not provide your own judgment, assumptions, optimism, causal explanations, or recommendations unless the evidence states them.",
    "5. Do not hide uncertainty. Keep the section present and mark missingEvidence true.",
    "6. Cite source document names in each section's evidence array.",
  ].join("\n");
}

export function aiDisabledPayload() {
  return {
    error: aiDisabledCode,
    message: "AI is disabled because OPENAI_API_KEY is not configured. Add it to .env.local and restart the dev server.",
  };
}

export function isAiDisabled(error: unknown) {
  return error instanceof AiDisabledError || (error instanceof Error && error.message.includes("OPENAI_API_KEY"));
}
