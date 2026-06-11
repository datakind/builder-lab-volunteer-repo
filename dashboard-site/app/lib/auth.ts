import { env } from "cloudflare:workers";
import type { SessionUser } from "./types";

function getEnv(name: string) {
  return ((env as unknown as Record<string, string | undefined>)[name] ?? "").trim();
}

function decodeFullName(request: Request) {
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  return encoded && encoding === "percent-encoded-utf-8" ? decodeURIComponent(encoded) : null;
}

function adminEmails() {
  return getEnv("ADMIN_EMAILS")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function getSession(request: Request): Promise<SessionUser | null> {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return null;

  return {
    username: decodeFullName(request) ?? email,
    role: adminEmails().includes(email) ? "admin" : "viewer",
  };
}

export async function requireSession(request: Request, role?: "admin") {
  const user = await getSession(request);
  if (!user) {
    return { user: null, response: Response.json({ error: "Workspace login required" }, { status: 401 }) };
  }

  if (role === "admin" && user.role !== "admin") {
    return { user: null, response: Response.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { user, response: null };
}
