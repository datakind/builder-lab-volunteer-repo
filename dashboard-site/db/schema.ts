import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const datasets = sqliteTable("datasets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  sourceFile: text("source_file").notNull(),
  originalFilename: text("original_filename").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  r2Key: text("r2_key"),
  dataJson: text("data_json").notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
