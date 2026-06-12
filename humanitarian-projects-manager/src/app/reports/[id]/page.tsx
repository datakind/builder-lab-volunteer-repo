import { notFound } from "next/navigation";
import { ReportPreviewClient } from "@/components/ReportPreviewClient";
import { getGeneratedReportById, getProjectById, getTemplateById } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getGeneratedReportById(id);
  if (!report) notFound();
  const project = getProjectById(report.projectId);
  const template = getTemplateById(report.templateId);
  if (!project || !template) notFound();
  return <ReportPreviewClient report={report} project={project} template={template} />;
}
