import { prisma } from "@/lib/db/prisma";
import { signInAction } from "./actions";

export default async function SignInPage() {
  const users = await prisma.user.findMany({
    where: { status: "active" },
    include: {
      roleAssignments: {
        include: { area: true, organization: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Flood Rescue Control Tower</p>
        <h1>Choose a Phase 1 seed user</h1>
        <form action={signInAction} className="stack">
          <label htmlFor="userId">User</label>
          <select id="userId" name="userId" required>
            {users.map((user) => {
              const role = user.roleAssignments[0];
              const scope = role?.scopeType === "global" ? "global" : role?.area?.name;
              return (
                <option key={user.id} value={user.id}>
                  {user.name} - {role?.role ?? "no role"} - {scope ?? "unscoped"}
                </option>
              );
            })}
          </select>
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
