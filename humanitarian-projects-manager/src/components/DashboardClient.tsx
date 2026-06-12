"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CalendarClock, Filter, Globe2, Landmark, Plus, Search, Upload, X } from "lucide-react";
import { formatCompact, formatCurrency } from "@/lib/format";
import { filterProjects } from "@/lib/reporting";
import type { DashboardFilters, DashboardModel, Project, ProjectStatus, ScheduleStatus } from "@/lib/types";

const initialFilters: DashboardFilters = {
  query: "",
  status: "all",
  funder: "all",
  sector: "all",
  country: "all",
  reportStatus: "all",
  budgetRange: "all",
};

const statusLabels: Record<ProjectStatus, string> = {
  concept: "Concept",
  pipeline: "Pipeline",
  inception: "Inception",
  implementation: "Implementation",
  closing: "Closing",
};

const reportLabels: Record<ScheduleStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due soon",
  overdue: "Overdue",
  generated: "Generated",
  submitted: "Submitted",
};

export function DashboardClient({ model }: { model: DashboardModel }) {
  const router = useRouter();
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [showNewProject, setShowNewProject] = useState(false);
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const visibleProjects = useMemo(() => filterProjects(model.projects, filters), [model.projects, filters]);
  const sectors = unique(model.projects.map((project) => project.sector));
  const funders = unique(model.projects.map((project) => project.funder));
  const countries = unique(model.projects.flatMap((project) => project.countries));
  const sectorBudget = groupBudget(visibleProjects, "sector");
  const funderBudget = groupBudget(visibleProjects, "funder");
  const statusCounts = countBy(visibleProjects, (project) => statusLabels[project.status]);
  const maxSectorBudget = Math.max(...sectorBudget.map((item) => item.value), 1);
  const maxFunderBudget = Math.max(...funderBudget.map((item) => item.value), 1);

  useEffect(() => {
    if (!creating || !startedAt) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [creating, startedAt]);

  async function createProject(formData: FormData) {
    setCreating(true);
    setStartedAt(Date.now());
    setElapsedSeconds(0);
    setNotice("");
    const response = await fetch("/api/projects", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    setCreating(false);
    setStartedAt(null);

    if (!response.ok) {
      setNotice(payload.message || "Project intake failed.");
      return;
    }

    router.push(`/projects/${payload.project.id}`);
  }

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div>
          <p className="eyebrow">Humanitarian portfolio command center</p>
          <h1>Projects, evidence, reporting, and donor-ready drafts</h1>
        </div>
        <div className="hero-side">
          <div className="hero-stat">
            <span>{model.metrics.projectCount}</span>
            <small>active project files</small>
          </div>
          <button className="hero-action" type="button" onClick={() => setShowNewProject(true)}>
            <Plus size={18} />
            New project
          </button>
        </div>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}

      {showNewProject ? (
        <section className="new-project-panel">
          <div className="panel-title">
            <Upload size={18} />
            <h2>Create project from documents</h2>
            <button type="button" className="icon-button" onClick={() => setShowNewProject(false)} aria-label="Close new project panel">
              <X size={18} />
            </button>
          </div>
          <p>
            Upload a proposal, donor agreement, concept note, or report package. The backend extracts the project entity,
            saves the documents, creates the schedule, and refreshes the dashboard.
          </p>
          <form
            className="new-project-form"
            action={(formData) => {
              createProject(formData);
            }}
          >
            <label>
              Documents
              <input name="files" type="file" multiple required />
            </label>
            <label>
              Title hint
              <input name="titleHint" placeholder="Optional project title if known" />
            </label>
            <label>
              Funder hint
              <input name="funderHint" placeholder="ECHO, FCDO, UNICEF..." />
            </label>
            <label>
              Sector hint
              <input name="sectorHint" placeholder="WASH, Cash Assistance, Health..." />
            </label>
            <label>
              Country hint
              <input name="countryHint" placeholder="Somalia, Mozambique..." />
            </label>
            <label>
              Manager hint
              <input name="managerHint" placeholder="Optional project manager" />
            </label>
            <button className="primary-button" type="submit" disabled={creating}>
              <Upload size={16} />
              {creating ? "Extracting" : "Upload and create"}
            </button>
          </form>
          {creating ? (
            <p className="inline-note">
              <AlertTriangle size={14} />
              Extracting for {elapsedSeconds}s. Some documents can take a while to analyze; if it feels stuck, refresh and try uploading documents one by one, then add the rest as project evidence.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="metric-grid" aria-label="Portfolio metrics">
        <Metric icon={<Landmark />} label="Portfolio budget" value={formatCurrency(model.metrics.totalBudget)} />
        <Metric icon={<Globe2 />} label="Countries" value={String(model.metrics.countriesCount)} />
        <Metric icon={<CalendarClock />} label="Due soon" value={String(model.metrics.upcomingReports)} />
        <Metric icon={<AlertTriangle />} label="Overdue" value={String(model.metrics.overdueReports)} tone="risk" />
      </section>

      <section className="filters-band">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Search projects"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Search project, funder, sector, country"
          />
        </div>
        <Select label="Status" value={filters.status} onChange={(status) => setFilters({ ...filters, status: status as DashboardFilters["status"] })}>
          <option value="all">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select label="Funder" value={filters.funder} onChange={(funder) => setFilters({ ...filters, funder })}>
          <option value="all">All funders</option>
          {funders.map((funder) => (
            <option key={funder} value={funder}>
              {funder}
            </option>
          ))}
        </Select>
        <Select label="Sector" value={filters.sector} onChange={(sector) => setFilters({ ...filters, sector })}>
          <option value="all">All sectors</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </Select>
        <Select label="Country" value={filters.country} onChange={(country) => setFilters({ ...filters, country })}>
          <option value="all">All countries</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </Select>
        <Select label="Reports" value={filters.reportStatus} onChange={(reportStatus) => setFilters({ ...filters, reportStatus: reportStatus as DashboardFilters["reportStatus"] })}>
          <option value="all">All report states</option>
          {Object.entries(reportLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select label="Budget" value={filters.budgetRange} onChange={(budgetRange) => setFilters({ ...filters, budgetRange: budgetRange as DashboardFilters["budgetRange"] })}>
          <option value="all">All budgets</option>
          <option value="under-2m">Under $2M</option>
          <option value="2m-5m">$2M-$5M</option>
          <option value="over-5m">Over $5M</option>
        </Select>
        <button className="icon-button" type="button" onClick={() => setFilters(initialFilters)} aria-label="Reset filters">
          <Filter size={18} />
        </button>
      </section>

      <section className="analytics-grid">
        <div className="panel">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h2>Budget by sector</h2>
          </div>
          <div className="bar-stack">
            {sectorBudget.map((item) => (
              <BarRow key={item.label} label={item.label} value={item.value} max={maxSectorBudget} />
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">
            <Landmark size={18} />
            <h2>Funding by donor</h2>
          </div>
          <div className="bar-stack">
            {funderBudget.map((item) => (
              <BarRow key={item.label} label={item.label} value={item.value} max={maxFunderBudget} />
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">
            <CalendarClock size={18} />
            <h2>Status mix</h2>
          </div>
          <div className="status-dots">
            {statusCounts.map((item) => (
              <div key={item.label} className="status-dot-row">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="panel map-panel">
          <div className="panel-title">
            <Globe2 size={18} />
            <h2>Geographic coverage</h2>
          </div>
          <div className="map-canvas">
            {visibleProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="map-pin"
                style={pinStyle(project)}
                title={`${project.code} ${project.title}`}
              >
                <span>{project.code.replace("ADPC-", "")}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="project-list">
        <div className="section-heading">
          <h2>Projects</h2>
          <span>{visibleProjects.length} shown</span>
        </div>
        <div className="project-grid">
          {visibleProjects.map((project) => (
            <Link href={`/projects/${project.id}`} key={project.id} className="project-card">
              <div className="card-topline">
                <span>{project.code}</span>
                <span className={`status-pill status-${project.status}`}>{statusLabels[project.status]}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.concept}</p>
              <div className="card-facts">
                <span>{project.funder}</span>
                <span>{project.sector}</span>
                <span>{formatCurrency(project.budget)}</span>
              </div>
              <div className="deadline-strip">
                {project.reportingSchedule.slice(0, 3).map((report) => (
                  <span key={report.id} className={`report-chip report-${report.status}`}>
                    {report.reportType.replace(" Report", "")}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "risk" }) {
  return (
    <div className={`metric-card ${tone === "risk" ? "metric-risk" : ""}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <strong>{formatCompact(value)}</strong>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.max(6, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function groupBudget(projects: Project[], key: "sector" | "funder") {
  const grouped = new Map<string, number>();
  for (const project of projects) {
    const label = key === "sector" ? project.sector : project.funder;
    grouped.set(label, (grouped.get(label) ?? 0) + project.budget);
  }
  return [...grouped.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
}

function countBy(projects: Project[], labeler: (project: Project) => string) {
  const grouped = new Map<string, number>();
  for (const project of projects) grouped.set(labeler(project), (grouped.get(labeler(project)) ?? 0) + 1);
  return [...grouped.entries()].map(([label, value]) => ({ label, value }));
}

function pinStyle(project: Project) {
  const detail = project.countryDetails[0];
  const x = ((detail.lng + 180) / 360) * 100;
  const y = ((90 - detail.lat) / 180) * 100;
  return {
    left: `${Math.min(92, Math.max(6, x))}%`,
    top: `${Math.min(86, Math.max(12, y))}%`,
  };
}
