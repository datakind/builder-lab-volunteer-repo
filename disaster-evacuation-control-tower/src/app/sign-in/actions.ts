"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { setSessionUser, clearSessionUser } from "@/lib/auth/session";

export async function signInAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findFirst({
    where: { id: userId, status: "active" }
  });

  if (!user) {
    redirect("/sign-in?error=unknown-user");
  }

  await setSessionUser(user.id);
  redirect("/dashboard");
}

export async function signOutAction() {
  await clearSessionUser();
  redirect("/sign-in");
}
