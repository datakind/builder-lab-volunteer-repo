import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { datasets } from "@/db/schema";
import seedData from "@/app/data/seed-data.json";
import type { DataResponse, DisasterDataset, DatasetMetadata } from "./types";
import { withDerivedAnnualCompare } from "./metrics";

export function seedResponse(): DataResponse {
  const dataset = withDerivedAnnualCompare(seedData as DisasterDataset);
  return {
    dataset,
    metadata: {
      id: null,
      label: "Seed dataset",
      sourceFile: dataset.source_file,
      originalFilename: dataset.source_file,
      uploadedBy: "system",
      createdAt: null,
      isSeed: true,
    },
  };
}

function toResponse(row: typeof datasets.$inferSelect): DataResponse {
  const dataset = withDerivedAnnualCompare(JSON.parse(row.dataJson) as DisasterDataset);
  return {
    dataset,
    metadata: {
      id: row.id,
      label: row.label,
      sourceFile: row.sourceFile,
      originalFilename: row.originalFilename,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
      isSeed: false,
    },
  };
}

export async function getCurrentDataset(): Promise<DataResponse> {
  try {
    const db = getDb();
    const [current] = await db
      .select()
      .from(datasets)
      .where(eq(datasets.isCurrent, true))
      .orderBy(desc(datasets.createdAt), desc(datasets.id))
      .limit(1);

    return current ? toResponse(current) : seedResponse();
  } catch {
    return seedResponse();
  }
}

export async function saveCurrentDataset(input: {
  dataset: DisasterDataset;
  label: string;
  originalFilename: string;
  uploadedBy: string;
  r2Key: string | null;
}) {
  const db = getDb();
  await db.update(datasets).set({ isCurrent: false }).where(eq(datasets.isCurrent, true));
  const normalized = withDerivedAnnualCompare(input.dataset);
  const [row] = await db
    .insert(datasets)
    .values({
      label: input.label,
      sourceFile: normalized.source_file,
      originalFilename: input.originalFilename,
      uploadedBy: input.uploadedBy,
      r2Key: input.r2Key,
      dataJson: JSON.stringify(normalized),
      isCurrent: true,
    })
    .returning();

  return toResponse(row);
}

export function datasetMetadataFromUpload(filename: string): DatasetMetadata {
  return {
    id: null,
    label: filename.replace(/\.[^.]+$/, ""),
    sourceFile: filename,
    originalFilename: filename,
    uploadedBy: "pending",
    createdAt: null,
    isSeed: false,
  };
}
