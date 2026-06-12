import path from "node:path";
import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getProjectById } from "@/server/db";
import { deleteProject } from "@/server/repository";
import { absoluteFromStoredPath, generatedRoot, uploadRoot } from "@/server/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = getProjectById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = getProjectById(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const storedFiles = [
    ...project.documents.map((document) => document.filePath).filter(Boolean),
    ...project.reportingSchedule
      .map((item) => item.generatedReport?.filePath)
      .filter((filePath): filePath is string => Boolean(filePath)),
  ];
  const deleted = deleteProject(id);
  if (!deleted) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await Promise.all([
    ...storedFiles.map((filePath) => rm(absoluteFromStoredPath(filePath), { force: true })),
    rm(path.join(uploadRoot, id), { recursive: true, force: true }),
    rm(path.join(generatedRoot, id), { recursive: true, force: true }),
  ]);

  return NextResponse.json({ ok: true });
}
