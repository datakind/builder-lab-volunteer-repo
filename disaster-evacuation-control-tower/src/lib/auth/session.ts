import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export const sessionCookieName = "frct_user_id";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(sessionCookieName)?.value;

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      status: "active"
    },
    include: {
      memberships: {
        where: { status: "active" },
        include: { organization: true }
      },
      roleAssignments: {
        where: { status: "active" },
        include: { organization: true, area: true }
      }
    }
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearSessionUser() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}
