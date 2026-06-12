import { uid, nowIso } from "@/lib/format";
import type { ReportingTemplate } from "@/lib/types";
import { extractEmbeddedReportingTemplate } from "./ai";
import { createReportingTemplate, linkProjectSchedulesToTemplate } from "./repository";

export async function detectAndStoreEmbeddedTemplate(input: {
  projectId: string;
  defaultFunder: string;
  absolutePath: string;
  storedPath: string;
  mimeType: string;
  fileName: string;
}) {
  try {
    const extracted = await extractEmbeddedReportingTemplate({
      filePath: input.absolutePath,
      mimeType: input.mimeType,
      fileName: input.fileName,
      defaultFunder: input.defaultFunder,
    });

    if (!extracted.hasTemplate || !extracted.requiredSections.length) {
      return { template: null, error: "" };
    }

    const template: ReportingTemplate = {
      id: uid("tpl"),
      projectId: input.projectId,
      name: extracted.name || `${input.defaultFunder} embedded reporting template`,
      funder: extracted.funder || input.defaultFunder,
      cadence: extracted.cadence || "Progress",
      reportType: extracted.reportType || "Progress Report",
      requiredSections: extracted.requiredSections,
      metadataFields: extracted.metadataFields,
      sourceDocument: input.fileName,
      filePath: input.storedPath,
      uploadedAt: nowIso(),
      isDefault: false,
    };

    createReportingTemplate(template);
    linkProjectSchedulesToTemplate(input.projectId, template);
    return { template, error: "" };
  } catch (error) {
    return {
      template: null,
      error: error instanceof Error ? error.message : "Embedded template detection failed.",
    };
  }
}
