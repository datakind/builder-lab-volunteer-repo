export type AreaNode = {
  id: string;
  parentId: string | null;
};

export type AreaIndex<TArea extends AreaNode = AreaNode> = {
  byId: Map<string, TArea>;
  childrenByParent: Map<string | null, TArea[]>;
};

export type ScopedAssignment = {
  role: string;
  scopeType: string;
  areaId: string | null;
  status?: string | null;
  canCrossArea?: boolean | null;
};

export const commandRoles = new Set(["government_command"]);

export function buildAreaIndex<TArea extends AreaNode>(areas: TArea[]): AreaIndex<TArea> {
  const byId = new Map<string, TArea>();
  const childrenByParent = new Map<string | null, TArea[]>();

  for (const area of areas) {
    byId.set(area.id, area);
    const key = area.parentId ?? null;
    const children = childrenByParent.get(key) ?? [];
    children.push(area);
    childrenByParent.set(key, children);
  }

  return { byId, childrenByParent };
}

export function getDescendantAreaIds(areaId: string, areaIndex: AreaIndex): Set<string> {
  const descendants = new Set<string>();
  const stack = [...(areaIndex.childrenByParent.get(areaId) ?? [])];

  while (stack.length > 0) {
    const area = stack.pop();
    if (!area || descendants.has(area.id)) {
      continue;
    }

    descendants.add(area.id);
    stack.push(...(areaIndex.childrenByParent.get(area.id) ?? []));
  }

  return descendants;
}

export function isAreaInAssignmentScope(
  targetAreaId: string,
  assignment: ScopedAssignment,
  areaIndex: AreaIndex
): boolean {
  if (assignment.status && assignment.status !== "active") {
    return false;
  }

  if (assignment.scopeType === "global") {
    return true;
  }

  if (!assignment.areaId) {
    return false;
  }

  if (assignment.areaId === targetAreaId) {
    return true;
  }

  return getDescendantAreaIds(assignment.areaId, areaIndex).has(targetAreaId);
}

export function canAccessArea(
  assignments: ScopedAssignment[],
  targetAreaId: string,
  areas: AreaNode[],
  allowedRoles: string[] = []
): boolean {
  const allowedRoleSet = new Set(allowedRoles);
  const areaIndex = buildAreaIndex(areas);

  return assignments.some((assignment) => {
    const roleAllowed = allowedRoleSet.size === 0 || allowedRoleSet.has(assignment.role);
    return roleAllowed && isAreaInAssignmentScope(targetAreaId, assignment, areaIndex);
  });
}

export function canCrossArea(assignment: ScopedAssignment): boolean {
  return commandRoles.has(assignment.role) && assignment.canCrossArea === true;
}

export function assertCrossAreaAllowed(
  assignments: ScopedAssignment[],
  reason: string | null | undefined
): { ok: true } | { ok: false; message: string } {
  const allowed = assignments.some(canCrossArea);

  if (!allowed) {
    return { ok: false, message: "Cross-area action requires an authorized command role." };
  }

  if (!reason || reason.trim().length < 5) {
    return { ok: false, message: "Cross-area action requires a clear reason." };
  }

  return { ok: true };
}
