import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCrossAreaAllowed,
  buildAreaIndex,
  canAccessArea,
  getDescendantAreaIds,
  isAreaInAssignmentScope,
  type ScopedAssignment
} from "../src/lib/auth/rbac.ts";

const areas = [
  { id: "province-1", parentId: null, type: "province", name: "Province" },
  { id: "district-1", parentId: "province-1", type: "district", name: "District" },
  { id: "tambon-1", parentId: "district-1", type: "tambon", name: "Tambon One" },
  { id: "village-1", parentId: "tambon-1", type: "village", name: "Village One" },
  { id: "tambon-2", parentId: "district-1", type: "tambon", name: "Tambon Two" }
];

const commandAssignment: ScopedAssignment = {
  role: "government_command",
  scopeType: "global",
  areaId: null,
  status: "active",
  canCrossArea: true
};

const dispatcherAssignment: ScopedAssignment = {
  role: "dispatcher",
  scopeType: "tambon",
  areaId: "tambon-1",
  status: "active",
  canCrossArea: false
};

const verifierAssignment: ScopedAssignment = {
  role: "verifier",
  scopeType: "tambon",
  areaId: "tambon-1",
  status: "active",
  canCrossArea: false
};

const helperAssignment: ScopedAssignment = {
  role: "helper_driver",
  scopeType: "tambon",
  areaId: "tambon-1",
  status: "active",
  canCrossArea: false
};

const shelterManagerAssignment: ScopedAssignment = {
  role: "shelter_manager",
  scopeType: "tambon",
  areaId: "tambon-1",
  status: "active",
  canCrossArea: false
};

test("area descendants include every lower area", () => {
  const index = buildAreaIndex(areas);

  assert.deepEqual([...getDescendantAreaIds("district-1", index)].sort(), [
    "tambon-1",
    "tambon-2",
    "village-1"
  ]);
});

test("tambon-scoped dispatcher can access their tambon and village", () => {
  const index = buildAreaIndex(areas);

  assert.equal(isAreaInAssignmentScope("tambon-1", dispatcherAssignment, index), true);
  assert.equal(isAreaInAssignmentScope("village-1", dispatcherAssignment, index), true);
});

test("global government command can access all scoped areas", () => {
  assert.equal(canAccessArea([commandAssignment], "province-1", areas, ["government_command"]), true);
  assert.equal(canAccessArea([commandAssignment], "tambon-1", areas, ["government_command"]), true);
  assert.equal(canAccessArea([commandAssignment], "tambon-2", areas, ["government_command"]), true);
});

test("local dispatcher cannot access another tambon", () => {
  const allowed = canAccessArea([dispatcherAssignment], "tambon-2", areas, ["dispatcher"]);

  assert.equal(allowed, false);
});

test("verifier cannot verify outside scope", () => {
  const ownScope = canAccessArea([verifierAssignment], "village-1", areas, ["verifier"]);
  const outsideScope = canAccessArea([verifierAssignment], "tambon-2", areas, ["verifier"]);

  assert.equal(ownScope, true);
  assert.equal(outsideScope, false);
});

test("helper cannot access command-only data", () => {
  const allowed = canAccessArea([helperAssignment], "tambon-1", areas, ["government_command"]);

  assert.equal(allowed, false);
});

test("shelter manager only accesses assigned shelter area", () => {
  const assignedArea = canAccessArea([shelterManagerAssignment], "village-1", areas, ["shelter_manager"]);
  const siblingArea = canAccessArea([shelterManagerAssignment], "tambon-2", areas, ["shelter_manager"]);

  assert.equal(assignedArea, true);
  assert.equal(siblingArea, false);
});

test("cross-area action requires authorized command role and reason", () => {
  const dispatcherResult = assertCrossAreaAllowed([dispatcherAssignment], "supporting overflow dispatch");

  assert.equal(dispatcherResult.ok, false);

  const commandMissingReason = assertCrossAreaAllowed([commandAssignment], "");

  assert.equal(commandMissingReason.ok, false);

  const commandResult = assertCrossAreaAllowed([commandAssignment], "supporting overflow dispatch");

  assert.equal(commandResult.ok, true);
});
