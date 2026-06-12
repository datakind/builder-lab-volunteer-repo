import { NextResponse } from "next/server";
import { getProjectById } from "@/server/db";
import { detectAndApplyReportingSchedule } from "@/server/schedule-detection";
import { absoluteFromStoredPath } from "@/server/storage";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = getProjectById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const scheduleUpdate = await detectAndApplyReportingSchedule({
    projectId: project.id,
    files: project.documents
      .filter((document) => document.filePath)
      .map((document) => ({
        name: document.name,
        mimeType: document.mimeType,
        absolutePath: absoluteFromStoredPath(document.filePath),
      })),
  });

  return NextResponse.json({
    scheduleUpdate,
    project: getProjectById(project.id),
    message: scheduleUpdate.updatedCount
      ? `Reporting schedule updated with ${scheduleUpdate.updatedCount} item(s).`
      : "No explicit reporting deadlines were found in project documents.",
  });
}
