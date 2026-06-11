import { env } from "cloudflare:workers";
import { requireSession } from "@/app/lib/auth";
import { saveCurrentDataset } from "@/app/lib/data-store";
import { parseDashboardWorkbook } from "@/app/lib/xlsx";

function safeName(name: string) {
  return name.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "upload.xlsx";
}

export async function POST(request: Request) {
  const { user, response } = await requireSession(request, "admin");
  if (response) {
    return response;
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Please upload an Excel .xlsx file." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return Response.json({ error: "Only .xlsx uploads are supported." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const dataset = parseDashboardWorkbook(bytes, file.name);
    const r2Key = `uploads/${Date.now()}-${safeName(file.name)}`;
    const bucket = (env as unknown as { UPLOADS?: R2Bucket }).UPLOADS;

    if (bucket) {
      await bucket.put(r2Key, bytes, {
        httpMetadata: {
          contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }

    const saved = await saveCurrentDataset({
      dataset,
      label: form.get("label")?.toString().trim() || file.name.replace(/\.[^.]+$/, ""),
      originalFilename: file.name,
      uploadedBy: user.username,
      r2Key: bucket ? r2Key : null,
    });

    return Response.json(saved, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
