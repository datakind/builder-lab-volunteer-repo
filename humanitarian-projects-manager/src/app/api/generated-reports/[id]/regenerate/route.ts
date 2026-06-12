import { NextResponse } from "next/server";
import { aiDisabledPayload, generateReportDraftWithOpenAI, hasOpenAiKey, isAiDisabled } from "@/server/ai";
import { getGeneratedReportById } from "@/server/db";
import { loadReportGenerationContext, replaceGeneratedReportDraft } from "@/server/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = getGeneratedReportById(id);
  if (!existing) return NextResponse.json({ error: "Generated report not found" }, { status: 404 });
  if (!hasOpenAiKey()) return NextResponse.json(aiDisabledPayload(), { status: 409 });
  const userPrompt = await readUserPrompt(request);

  const reportContext = loadReportGenerationContext(existing.scheduleId);
  if (!reportContext) return NextResponse.json({ error: "Reporting schedule item not found" }, { status: 404 });

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
    const report = replaceGeneratedReportDraft(id, generated);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(isAiDisabled(error) ? aiDisabledPayload() : { error: "REPORT_REGENERATION_FAILED", message: "Report regeneration failed." }, { status: isAiDisabled(error) ? 409 : 500 });
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
