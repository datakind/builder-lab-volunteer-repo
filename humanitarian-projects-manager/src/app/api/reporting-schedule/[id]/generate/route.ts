import { NextResponse } from "next/server";
import { uid } from "@/lib/format";
import { aiDisabledPayload, generateReportDraftWithOpenAI, hasOpenAiKey, isAiDisabled } from "@/server/ai";
import { createGeneratedReportDraft, loadReportGenerationContext } from "@/server/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const reportContext = loadReportGenerationContext(id);
  if (!reportContext) return NextResponse.json({ error: "Reporting schedule item not found" }, { status: 404 });
  if (!hasOpenAiKey()) return NextResponse.json(aiDisabledPayload(), { status: 409 });
  const userPrompt = await readUserPrompt(request);

  try {
    const generated = await generateReportDraftWithOpenAI({
      project: reportContext.project,
      schedule: {
        id: reportContext.schedule.id,
        reportType: reportContext.schedule.report_type,
        dueDate: reportContext.schedule.due_date,
      },
      template: reportContext.template,
      documents: reportContext.project.documents,
      userPrompt,
    });
    const report = createGeneratedReportDraft({
      id: uid("report"),
      scheduleId: reportContext.schedule.id,
      projectId: reportContext.project.id,
      templateId: reportContext.template.id,
      ...generated,
    });
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(isAiDisabled(error) ? aiDisabledPayload() : { error: "REPORT_GENERATION_FAILED", message: "Report generation failed." }, { status: isAiDisabled(error) ? 409 : 500 });
  }
}

async function readUserPrompt(request: Request) {
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const payload = (await request.json()) as { prompt?: string };
      return typeof payload.prompt === "string" ? payload.prompt : "";
    }
    const form = await request.formData();
    return String(form.get("prompt") || "");
  } catch {
    return "";
  }
}
