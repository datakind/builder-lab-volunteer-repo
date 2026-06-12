import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { uid, nowIso, slugify } from "@/lib/format";
import { aiDisabledPayload, extractProjectDocument, hasOpenAiKey, isAiDisabled } from "@/server/ai";
import { getProjectById } from "@/server/db";
import { applyProjectExtraction, createProjectDocument, updateProjectDocumentExtraction } from "@/server/repository";
import { detectAndApplyReportingSchedule } from "@/server/schedule-detection";
import { relativeStoragePath, uploadRoot } from "@/server/storage";
import { detectAndStoreEmbeddedTemplate } from "@/server/template-detection";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = getProjectById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  const documentType = String(form.get("type") || "Project document");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload requires a file field" }, { status: 400 });
  }

  const documentId = uid("doc");
  const safeName = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}${path.extname(file.name) || ""}`;
  const projectUploadRoot = path.join(uploadRoot, project.id);
  await mkdir(projectUploadRoot, { recursive: true });
  const absolutePath = path.join(projectUploadRoot, safeName);
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
  const storedPath = relativeStoragePath(absolutePath);
  const mimeType = file.type || "application/octet-stream";
  console.info(`[document] uploaded ${file.name} to project ${project.id} as ${documentType}`);

  createProjectDocument({
    id: documentId,
    projectId: project.id,
    type: documentType,
    name: file.name,
    mimeType,
    filePath: storedPath,
    uploadedAt: nowIso(),
    status: hasOpenAiKey() ? "extracting" : "ai_blocked",
    summary: hasOpenAiKey()
      ? "Document stored. AI extraction is in progress."
      : "Document stored. AI extraction is blocked until OPENAI_API_KEY is configured.",
    sourceScope: "project",
  });

  if (!hasOpenAiKey()) {
    return NextResponse.json({ documentId, ...aiDisabledPayload() }, { status: 202 });
  }

  try {
    console.info(`[document] extracting project update from ${file.name}`);
    const extraction = await extractProjectDocument({
      project,
      filePath: absolutePath,
      mimeType,
      fileName: file.name,
    });
    updateProjectDocumentExtraction(documentId, "extracted", extraction.summary, extraction);
    applyProjectExtraction(project.id, extraction);
    const shouldCheckTemplate = isEmbeddedTemplateCandidate(file.name, mimeType, documentType);
    const templateDetection = shouldCheckTemplate
      ? await detectAndStoreEmbeddedTemplate({
          projectId: project.id,
          defaultFunder: extraction.funder || project.funder,
          absolutePath,
          storedPath,
          mimeType,
          fileName: file.name,
        })
      : { template: null };
    if (!shouldCheckTemplate) console.info(`[document] skipped embedded template detection for ${file.name}`);
    const scheduleUpdate = await detectAndApplyReportingSchedule({
      projectId: project.id,
      files: [{ name: file.name, mimeType, absolutePath }],
    });
    return NextResponse.json({
      documentId,
      extraction,
      template: templateDetection.template,
      scheduleUpdate,
      message: templateDetection.template
        ? `Document uploaded, project updated, and an embedded reporting template was linked.${scheduleUpdate.updatedCount ? ` Reporting schedule updated with ${scheduleUpdate.updatedCount} item(s).` : ""}`
        : `Document uploaded and project updated.${scheduleUpdate.updatedCount ? ` Reporting schedule updated with ${scheduleUpdate.updatedCount} item(s).` : ""}`,
      project: getProjectById(project.id),
    });
  } catch (error) {
    console.error(`[document] extraction failed for ${file.name}`, error);
    updateProjectDocumentExtraction(documentId, isAiDisabled(error) ? "ai_blocked" : "failed", error instanceof Error ? error.message : "Extraction failed", {});
    const status = isAiDisabled(error) ? 409 : 500;
    return NextResponse.json(isAiDisabled(error) ? aiDisabledPayload() : { error: "EXTRACTION_FAILED", message: "AI extraction failed." }, { status });
  }
}

function isEmbeddedTemplateCandidate(fileName: string, mimeType: string, documentType: string) {
  const text = `${fileName} ${mimeType} ${documentType}`.toLowerCase();
  return /template|reporting|proposal|grant|agreement|investment|logframe|embedded/.test(text);
}
