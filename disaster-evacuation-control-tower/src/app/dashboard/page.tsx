import { requireCurrentUser } from "@/lib/auth/session";
import { getScopedAreasForUser } from "@/lib/auth/scoped-queries";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { signOutAction } from "@/app/sign-in/actions";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [areas, summary] = await Promise.all([getScopedAreasForUser(user), getDashboardSummary(user)]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 1 Command Shell</p>
          <h1>Flood Rescue Control Tower</h1>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="secondary-button">
            Sign out
          </button>
        </form>
      </header>

      <section className="operator-strip">
        <div>
          <span className="label">Signed in</span>
          <strong>{user.name}</strong>
        </div>
        <div>
          <span className="label">Organizations</span>
          <strong>{user.memberships.map((membership) => membership.organization.name).join(", ")}</strong>
        </div>
        <div>
          <span className="label">Visible areas</span>
          <strong>{summary.visibleAreaCount}</strong>
        </div>
      </section>

      <section className="grid">
        <article className="panel span-2">
          <h2>Active Incident</h2>
          {summary.activeIncident ? (
            <dl className="details-grid">
              <div>
                <dt>Type</dt>
                <dd>{summary.activeIncident.type}</dd>
              </div>
              <div>
                <dt>Area</dt>
                <dd>{summary.activeIncident.area.name}</dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd>{summary.activeIncident.severity}</dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>
                  {new Intl.DateTimeFormat("en-TH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Bangkok"
                  }).format(summary.activeIncident.startedAt)}
                </dd>
              </div>
            </dl>
          ) : (
            <p>No active incident is visible for this user.</p>
          )}
        </article>

        <article className="panel">
          <h2>Requests</h2>
          <Metric label="New" value={summary.requestCounts.new ?? 0} />
          <Metric label="Needs verification" value={summary.requestCounts.needs_verification ?? 0} />
          <Metric label="Assigned" value={summary.requestCounts.assigned ?? 0} />
        </article>

        <article className="panel">
          <h2>Fleet</h2>
          <Metric label="Available" value={summary.vehicleCounts.available ?? 0} />
          <Metric label="Assigned" value={summary.vehicleCounts.assigned ?? 0} />
          <Metric label="Needs check" value={summary.vehicleCounts.needs_check ?? 0} />
        </article>

        <article className="panel">
          <h2>Missions</h2>
          <Metric label="Active" value={summary.activeMissions} />
          <Metric label="SOS / danger" value={summary.safetyAlerts} />
        </article>

        <article className="panel">
          <h2>Shelters</h2>
          <Metric label="Occupancy" value={summary.shelterCapacity.currentOccupancy} />
          <Metric label="Usable capacity" value={summary.shelterCapacity.maxUsableCapacity} />
          <Metric label="Full / closed" value={summary.shelterCapacity.constrainedShelters} />
        </article>

        <article className="panel">
          <h2>Operations</h2>
          <Metric label="Open/limited bases and refuel points" value={summary.operationalLocations} />
        </article>

        <article className="panel span-2">
          <h2>Scoped Areas</h2>
          <div className="area-list">
            {areas.map((area) => (
              <span key={area.id}>
                {area.name} <small>{area.type}</small>
              </span>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
