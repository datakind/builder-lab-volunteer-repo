import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getDownloadableFile } from "@/server/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const file = getDownloadableFile(id);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const body = await readFile(file.path);
  return new Response(body, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
    },
  });
}
