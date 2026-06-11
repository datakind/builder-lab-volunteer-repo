import "server-only";

import { prisma } from "@/lib/db/prisma";
import { buildAreaIndex, getDescendantAreaIds } from "@/lib/auth/rbac";

type ScopedUser = Awaited<ReturnType<typeof import("@/lib/auth/session").getCurrentUser>>;

export async function getVisibleAreaIdsForUser(user: NonNullable<ScopedUser>) {
  const areas = await prisma.area.findMany({
    select: { id: true, parentId: true, name: true, type: true }
  });
  const areaIndex = buildAreaIndex(areas);

  if (user.roleAssignments.some((assignment) => assignment.scopeType === "global")) {
    return areas.map((area) => area.id);
  }

  const visibleAreaIds = new Set<string>();

  for (const assignment of user.roleAssignments) {
    if (!assignment.areaId) {
      continue;
    }

    visibleAreaIds.add(assignment.areaId);
    for (const descendantId of getDescendantAreaIds(assignment.areaId, areaIndex)) {
      visibleAreaIds.add(descendantId);
    }
  }

  return [...visibleAreaIds];
}

export async function getScopedAreasForUser(user: NonNullable<ScopedUser>) {
  const visibleAreaIds = await getVisibleAreaIdsForUser(user);

  return prisma.area.findMany({
    where: { id: { in: visibleAreaIds } },
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
}
