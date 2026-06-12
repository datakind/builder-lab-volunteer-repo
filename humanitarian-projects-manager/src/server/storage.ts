import { mkdirSync } from "node:fs";
import path from "node:path";

export const storageRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
export const uploadRoot = path.join(storageRoot, "uploads");
export const generatedRoot = path.join(storageRoot, "generated");
export const tmpRoot = path.join(storageRoot, "tmp");

export function ensureStorage() {
  mkdirSync(uploadRoot, { recursive: true });
  mkdirSync(generatedRoot, { recursive: true });
  mkdirSync(tmpRoot, { recursive: true });
}

export function databasePath() {
  const configured = process.env.DATABASE_URL;
  if (!configured) return path.join(storageRoot, "humanitarian-projects.db");
  if (configured.startsWith("file:")) return configured.slice("file:".length);
  return configured;
}

export function relativeStoragePath(filePath: string) {
  return path.relative(/* turbopackIgnore: true */ process.cwd(), filePath);
}

export function absoluteFromStoredPath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);
}
