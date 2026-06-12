import { NextResponse } from "next/server";
import { getGeneratedReportById, getProjectById } from "@/server/db";
import { writeGeneratedReportDocx } from "@/server/docx";
import { markGeneratedReportSaved } from "@/server/repository";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const report = getGeneratedReportById(id);
  if (!report) return NextResponse.json({ error: "Generated report not found" }, { status: 404 });
  const project = getProjectById(report.projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const file = await writeGeneratedReportDocx(report, project);
  const saved = markGeneratedReportSaved(report.id, file.filePath, file.fileName);
  return NextResponse.json({ report: saved });
}
