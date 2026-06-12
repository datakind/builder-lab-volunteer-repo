import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { uid, slugify } from "@/lib/format";
import { aiDisabledPayload, extractNewProjectFromDocuments, hasOpenAiKey, isAiDisabled } from "@/server/ai";
import { getDashboardModel, getProjectById } from "@/server/db";
import { createProjectFromExtraction } from "@/server/repository";
import { detectAndApplyReportingSchedule } from "@/server/schedule-detection";
import { relativeStoragePath, uploadRoot } from "@/server/storage";
import { detectAndStoreEmbeddedTemplate } from "@/server/template-detection";

export const dynamic = "force-dynamic";

type SavedIntakeFile = {
  id: string;
  name: string;
  mimeType: string;
  filePath: string;
  absolutePath: string;
};

export async function GET() {
  return NextResponse.json(getDashboardModel());
}

export async function POST(request: Request) {
  const form = await request.formData();
  const files = form.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  console.info(`[intake] new project upload received: ${files.map((file) => `${file.name} (${Math.round(file.size / 1024)} KB)`).join(", ")}`);

  if (!files.length) {
    return NextResponse.json({ error: "At least one project document is required." }, { status: 400 });
  }

  if (!hasOpenAiKey()) {
    return NextResponse.json(aiDisabledPayload(), { status: 409 });
  }

  const intakeId = uid("intake");
  const intakeRoot = path.join(uploadRoot, intakeId);
  await mkdir(intakeRoot, { recursive: true });

  const savedFiles: SavedIntakeFile[] = [];
  for (const file of files) {
    const fileId = uid("doc");
    const safeName = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}-${fileId}${path.extname(file.name) || ""}`;
    const absolutePath = path.join(intakeRoot, safeName);
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
    savedFiles.push({
      id: fileId,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      filePath: relativeStoragePath(absolutePath),
      absolutePath,
    });
  }
  console.info(`[intake] saved ${savedFiles.length} file(s) to ${intakeRoot}`);

  try {
    const extractionFiles = selectProjectExtractionFiles(savedFiles);
    console.info(`[intake] project extraction will use: ${extractionFiles.map((file) => file.name).join(", ")}`);
    const extraction = await extractNewProjectFromDocuments({
      files: extractionFiles.map((file) => ({
        filePath: file.absolutePath,
        mimeType: file.mimeType,
        fileName: file.name,
      })),
      hints: {
        title: String(form.get("titleHint") || ""),
        funder: String(form.get("funderHint") || ""),
        sector: String(form.get("sectorHint") || ""),
        country: String(form.get("countryHint") || ""),
        manager: String(form.get("managerHint") || ""),
      },
    });
    const project = createProjectFromExtraction({
      extraction,
      files: savedFiles.map((file) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        filePath: file.filePath,
      })),
    });
    console.info(`[intake] project created: ${project?.id || "unknown"}`);
    const templates = [];
    if (project) {
      for (const file of savedFiles.filter(isEmbeddedTemplateCandidate)) {
        console.info(`[intake] checking embedded reporting template in ${file.name}`);
        const detection = await detectAndStoreEmbeddedTemplate({
          projectId: project.id,
          defaultFunder: extraction.funder || project.funder,
          absolutePath: file.absolutePath,
          storedPath: file.filePath,
          mimeType: file.mimeType,
          fileName: file.name,
        });
        if (detection.template) templates.push(detection.template);
      }
    }
    const scheduleUpdate = project ? await detectAndApplyReportingSchedule({ projectId: project.id, files: savedFiles }) : { updatedCount: 0 };
    if (scheduleUpdate.updatedCount) console.info(`[intake] reporting schedule updated with ${scheduleUpdate.updatedCount} explicit item(s)`);
    console.info(`[intake] embedded templates linked: ${templates.length}`);
    return NextResponse.json({ project: project ? getProjectById(project.id) : null, extraction, templates, scheduleUpdate }, { status: 201 });
  } catch (error) {
    console.error("[intake] project intake failed", error);
    return NextResponse.json(
      isAiDisabled(error)
        ? aiDisabledPayload()
        : {
            error: "PROJECT_INTAKE_FAILED",
            message: error instanceof Error ? error.message : "New project extraction failed.",
          },
      { status: isAiDisabled(error) ? 409 : 500 },
    );
  }
}

function selectProjectExtractionFiles(files: SavedIntakeFile[]) {
  const wordFiles = files.filter(isWordFile);
  if (wordFiles.length) return wordFiles.slice(0, 3);
  return files.slice(0, 4);
}

function isWordFile(file: SavedIntakeFile) {
  const name = file.name.toLowerCase();
  return (
    file.mimeType.includes("wordprocessingml") ||
    file.mimeType.includes("msword") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  );
}

function isEmbeddedTemplateCandidate(file: SavedIntakeFile) {
  const name = file.name.toLowerCase();
  if (isWordFile(file)) return true;
  return /template|reporting|proposal|grant|agreement|investment|logframe/.test(name);
}
