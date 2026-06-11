import { getSession } from "@/app/lib/auth";

export async function GET(request: Request) {
  const user = await getSession(request);
  return Response.json({ user });
}
