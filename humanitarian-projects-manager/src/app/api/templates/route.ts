import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { uid, nowIso, slugify } from "@/lib/format";
import type { ReportingTemplate } from "@/lib/types";
import { aiDisabledPayload, extractReportingTemplate, hasOpenAiKey, isAiDisabled } from "@/server/ai";
import { createReportingTemplate } from "@/server/repository";
import { relativeStoragePath, uploadRoot } from "@/server/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const sectionsText = String(form.get("sections") || "");
  const funder = String(form.get("funder") || "All funders");
  const name = String(form.get("name") || "Uploaded Reporting Template");
  const cadence = String(form.get("cadence") || "Ad hoc");
  const reportType = String(form.get("reportType") || "Donor Report");
  let filePath: string | null = null;
  let fileName = name;
  let mimeType = "application/octet-stream";

  if (file instanceof File && file.size > 0) {
    fileName = file.name;
    mimeType = file.type || mimeType;
    const templateRoot = path.join(uploadRoot, "templates");
    await mkdir(templateRoot, { recursive: true });
    const absolutePath = path.join(templateRoot, `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}${path.extname(file.name) || ""}`);
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
    filePath = relativeStoragePath(absolutePath);
  }

  if (!sectionsText.trim() && filePath && !hasOpenAiKey()) {
    return NextResponse.json(aiDisabledPayload(), { status: 409 });
  }

  try {
    const extracted =
      filePath && hasOpenAiKey()
        ? await extractReportingTemplate({
            filePath,
            mimeType,
            fileName,
            defaultFunder: funder,
          })
        : {
            name,
            funder,
            cadence,
            reportType,
            requiredSections: sectionsText
              .split(/\r?\n|,/)
              .map((section) => section.trim())
              .filter(Boolean),
            metadataFields: [],
          };

    if (!extracted.requiredSections.length) {
      return NextResponse.json({ error: "Template requires at least one section" }, { status: 400 });
    }

    const template: ReportingTemplate = {
      id: uid("tpl"),
      projectId: null,
      name: extracted.name,
      funder: extracted.funder,
      cadence: extracted.cadence,
      reportType: extracted.reportType,
      requiredSections: extracted.requiredSections,
      metadataFields: extracted.metadataFields,
      sourceDocument: fileName,
      filePath,
      uploadedAt: nowIso(),
      isDefault: false,
    };

    createReportingTemplate(template);
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(isAiDisabled(error) ? aiDisabledPayload() : { error: "TEMPLATE_UPLOAD_FAILED", message: "Template upload failed." }, { status: isAiDisabled(error) ? 409 : 500 });
  }
}
