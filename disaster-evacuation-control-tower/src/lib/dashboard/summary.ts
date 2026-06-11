import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getVisibleAreaIdsForUser } from "@/lib/auth/scoped-queries";

type DashboardUser = NonNullable<Awaited<ReturnType<typeof import("@/lib/auth/session").getCurrentUser>>>;

function groupCounts<T extends { status: string; _count: { _all: number } }>(rows: T[]) {
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
}

export async function getDashboardSummary(user: DashboardUser) {
  const visibleAreaIds = await getVisibleAreaIdsForUser(user);
  const activeIncident = await prisma.incident.findFirst({
    where: {
      status: "active",
      areaId: { in: visibleAreaIds }
    },
    include: { area: true },
    orderBy: { startedAt: "desc" }
  });

  const [requestStatusRows, vehicleStatusRows, activeMissions, shelterStatuses, safetyAlerts, operationalLocations] =
    await Promise.all([
      prisma.helpRequest.groupBy({
        by: ["status"],
        where: {
          areaId: { in: visibleAreaIds },
          ...(activeIncident ? { incidentId: activeIncident.id } : {})
        },
        _count: { _all: true }
      }),
      prisma.vehicle.groupBy({
        by: ["status"],
        where: { areaId: { in: visibleAreaIds } },
        _count: { _all: true }
      }),
      prisma.mission.count({
        where: {
          status: { in: ["assigned", "accepted", "on_way", "arrived_pickup", "transporting"] },
          incidentId: activeIncident?.id
        }
      }),
      prisma.shelterOperationalStatus.findMany({
        where: {
          incidentId: activeIncident?.id,
          shelter: { areaId: { in: visibleAreaIds } }
        },
        include: { shelter: true }
      }),
      prisma.helperSafetyCheck.count({
        where: {
          incidentId: activeIncident?.id,
          status: { in: ["danger", "sos"] }
        }
      }),
      prisma.operationalLocation.count({
        where: {
          incidentId: activeIncident?.id,
          areaId: { in: visibleAreaIds },
          status: { in: ["open", "limited"] }
        }
      })
    ]);

  const shelterCapacity = shelterStatuses.reduce(
    (summary, row) => {
      summary.currentOccupancy += row.currentOccupancy;
      summary.maxUsableCapacity += row.maxUsableCapacity;
      if (row.status === "full" || row.status === "closed") {
        summary.constrainedShelters += 1;
      }
      return summary;
    },
    { currentOccupancy: 0, maxUsableCapacity: 0, constrainedShelters: 0 }
  );

  return {
    activeIncident,
    visibleAreaCount: visibleAreaIds.length,
    requestCounts: groupCounts(requestStatusRows),
    vehicleCounts: groupCounts(vehicleStatusRows),
    activeMissions,
    shelterCapacity,
    safetyAlerts,
    operationalLocations
  };
}
