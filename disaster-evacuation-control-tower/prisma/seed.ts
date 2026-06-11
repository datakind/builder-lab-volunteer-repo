import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ids = {
  governmentOrg: "org-government-command",
  localAdminOrg: "org-local-admin-tha-lat",
  volunteerOrg: "org-volunteer-boat-unit",
  shelterOrg: "org-shelter-operator",
  province: "area-ubon-ratchathani",
  district: "area-warin-chamrap",
  tambon: "area-tha-lat",
  otherTambon: "area-kham-nam-saep",
  village: "area-ban-tha-lat",
  incident: "incident-ubon-flood-2026",
  commandUser: "user-government-command",
  dispatcherUser: "user-local-dispatcher",
  verifierUser: "user-local-verifier",
  callCenterUser: "user-call-center",
  helperUser: "user-helper-driver",
  shelterUser: "user-shelter-manager",
  base: "oploc-tha-lat-base",
  refuel: "oploc-tha-lat-refuel",
  vehicle: "vehicle-boat-01",
  helperTeam: "helper-team-01",
  shelter: "shelter-tha-lat-school"
};

async function main() {
  await prisma.organization.upsert({
    where: { id: ids.governmentOrg },
    update: {},
    create: {
      id: ids.governmentOrg,
      name: "Provincial Flood Command",
      type: "government_agency"
    }
  });

  await prisma.organization.upsert({
    where: { id: ids.localAdminOrg },
    update: {},
    create: {
      id: ids.localAdminOrg,
      name: "Tha Lat Local Administration",
      type: "local_admin"
    }
  });

  await prisma.organization.upsert({
    where: { id: ids.volunteerOrg },
    update: {},
    create: {
      id: ids.volunteerOrg,
      name: "Volunteer Boat Unit 1",
      type: "volunteer_group"
    }
  });

  await prisma.organization.upsert({
    where: { id: ids.shelterOrg },
    update: {},
    create: {
      id: ids.shelterOrg,
      name: "Community Shelter Operator",
      type: "shelter_operator"
    }
  });

  await prisma.area.upsert({
    where: { id: ids.province },
    update: {},
    create: {
      id: ids.province,
      name: "Ubon Ratchathani",
      type: "province",
      centroidLatitude: 15.2448,
      centroidLongitude: 104.8473
    }
  });

  await prisma.area.upsert({
    where: { id: ids.district },
    update: {},
    create: {
      id: ids.district,
      name: "Warin Chamrap",
      type: "district",
      parentId: ids.province,
      centroidLatitude: 15.1932,
      centroidLongitude: 104.8627
    }
  });

  await prisma.area.upsert({
    where: { id: ids.tambon },
    update: {},
    create: {
      id: ids.tambon,
      name: "Tha Lat",
      type: "tambon",
      parentId: ids.district,
      centroidLatitude: 15.1802,
      centroidLongitude: 104.8784
    }
  });

  await prisma.area.upsert({
    where: { id: ids.otherTambon },
    update: {},
    create: {
      id: ids.otherTambon,
      name: "Kham Nam Saep",
      type: "tambon",
      parentId: ids.district,
      centroidLatitude: 15.2037,
      centroidLongitude: 104.8416
    }
  });

  await prisma.area.upsert({
    where: { id: ids.village },
    update: {},
    create: {
      id: ids.village,
      name: "Ban Tha Lat",
      type: "village",
      parentId: ids.tambon,
      centroidLatitude: 15.1792,
      centroidLongitude: 104.8812
    }
  });

  await prisma.incident.upsert({
    where: { id: ids.incident },
    update: {},
    create: {
      id: ids.incident,
      areaId: ids.province,
      type: "flood",
      status: "active",
      severity: 3,
      startedAt: new Date("2026-06-12T00:00:00.000Z")
    }
  });

  const users = [
    [ids.commandUser, "Government Command", "command@example.test", "+66000000001"],
    [ids.dispatcherUser, "Tha Lat Dispatcher", "dispatcher@example.test", "+66000000002"],
    [ids.verifierUser, "Tha Lat Verifier", "verifier@example.test", "+66000000003"],
    [ids.callCenterUser, "Call Center Operator", "callcenter@example.test", "+66000000004"],
    [ids.helperUser, "Boat Driver One", "helper@example.test", "+66000000005"],
    [ids.shelterUser, "Shelter Manager", "shelter@example.test", "+66000000006"]
  ] as const;

  for (const [id, name, email, phone] of users) {
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, name, email, phone }
    });
  }

  const memberships = [
    [ids.commandUser, ids.governmentOrg],
    [ids.dispatcherUser, ids.localAdminOrg],
    [ids.verifierUser, ids.localAdminOrg],
    [ids.callCenterUser, ids.governmentOrg],
    [ids.helperUser, ids.volunteerOrg],
    [ids.shelterUser, ids.shelterOrg]
  ] as const;

  for (const [userId, organizationId] of memberships) {
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      update: {},
      create: { userId, organizationId }
    });
  }

  const roleAssignments = [
    ["role-command-global", ids.commandUser, ids.governmentOrg, "government_command", "global", null, true],
    ["role-dispatcher-tha-lat", ids.dispatcherUser, ids.localAdminOrg, "dispatcher", "tambon", ids.tambon, false],
    ["role-verifier-tha-lat", ids.verifierUser, ids.localAdminOrg, "verifier", "tambon", ids.tambon, false],
    ["role-call-center-province", ids.callCenterUser, ids.governmentOrg, "call_center", "province", ids.province, false],
    ["role-helper-tha-lat", ids.helperUser, ids.volunteerOrg, "helper_driver", "tambon", ids.tambon, false],
    ["role-shelter-tha-lat", ids.shelterUser, ids.shelterOrg, "shelter_manager", "tambon", ids.tambon, false]
  ] as const;

  for (const [id, userId, organizationId, role, scopeType, areaId, canCrossArea] of roleAssignments) {
    await prisma.roleAssignment.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId,
        organizationId,
        role,
        scopeType,
        areaId,
        canCrossArea
      }
    });
  }

  await prisma.operationalLocation.upsert({
    where: { id: ids.base },
    update: {},
    create: {
      id: ids.base,
      incidentId: ids.incident,
      organizationId: ids.volunteerOrg,
      areaId: ids.tambon,
      type: "base",
      name: "Tha Lat Boat Base",
      latitude: 15.181,
      longitude: 104.879,
      status: "open",
      notes: "Primary staging base for volunteer boats."
    }
  });

  await prisma.operationalLocation.upsert({
    where: { id: ids.refuel },
    update: {},
    create: {
      id: ids.refuel,
      incidentId: ids.incident,
      organizationId: ids.localAdminOrg,
      areaId: ids.tambon,
      type: "refuel_point",
      name: "Tha Lat Refuel Point",
      latitude: 15.183,
      longitude: 104.876,
      status: "open"
    }
  });

  await prisma.vehicle.upsert({
    where: { id: ids.vehicle },
    update: {},
    create: {
      id: ids.vehicle,
      organizationId: ids.volunteerOrg,
      areaId: ids.tambon,
      homeBaseLocationId: ids.base,
      name: "Boat 01",
      registrationCode: "BOAT-01",
      maxPeople: 6,
      maxWeight: 650,
      canCarryNonWalkingPerson: true,
      canCarryStretcher: false,
      canCarrySupplies: true,
      fuelCapacity: 45,
      currentFuel: 36,
      estimatedFuelConsumptionRate: 0.35,
      emergencyReserveFuel: 8,
      fuelLastVerifiedAt: new Date("2026-06-12T01:00:00.000Z")
    }
  });

  await prisma.helperTeam.upsert({
    where: { id: ids.helperTeam },
    update: {},
    create: {
      id: ids.helperTeam,
      organizationId: ids.volunteerOrg,
      assignedVehicleId: ids.vehicle,
      name: "Boat Team 01",
      phone: "+66000000007",
      members: [{ name: "Boat Driver One", role: "driver" }],
      skills: ["boat_operation", "first_aid"]
    }
  });

  await prisma.shelter.upsert({
    where: { id: ids.shelter },
    update: {},
    create: {
      id: ids.shelter,
      organizationId: ids.shelterOrg,
      areaId: ids.tambon,
      name: "Tha Lat School Shelter",
      latitude: 15.185,
      longitude: 104.882,
      baselineCapacity: 120,
      baselineAccessibility: "Ground-floor classrooms available"
    }
  });

  await prisma.shelterOperationalStatus.upsert({
    where: { incidentId_shelterId: { incidentId: ids.incident, shelterId: ids.shelter } },
    update: {},
    create: {
      incidentId: ids.incident,
      shelterId: ids.shelter,
      status: "open",
      currentOccupancy: 20,
      maxUsableCapacity: 100,
      accessibility: "Wheelchair-accessible entrance",
      medicalSupport: true,
      foodStatus: "adequate",
      waterStatus: "adequate",
      lastUpdatedAt: new Date("2026-06-12T01:15:00.000Z")
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
