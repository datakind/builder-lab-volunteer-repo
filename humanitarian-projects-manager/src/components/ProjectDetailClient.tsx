"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarClock, Download, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Project } from "@/lib/types";

type Tab = "overview" | "documents" | "reporting" | "history";

export function ProjectDetailClient({ project }: { project: Project }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const totalSpent = useMemo(() => Math.round(project.budget * 0.28), [project.budget]);

  async function uploadDocument(formData: FormData) {
    setBusy("upload");
    setNotice("");
    const response = await fetch(`/api/projects/${project.id}/documents`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    setBusy("");
    setNotice(payload.message || "Document uploaded.");
    router.refresh();
  }

  async function uploadTemplate(formData: FormData) {
    setBusy("template");
    setNotice("");
    const response = await fetch("/api/templates", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    setBusy("");
    setNotice(payload.message || (response.ok ? "Template added." : "Template upload failed."));
    router.refresh();
  }

  async function generateReport(scheduleId: string) {
    setBusy(scheduleId);
    setNotice("");
    const response = await fetch(`/api/reporting-schedule/${scheduleId}/generate`, { method: "POST" });
    const payload = await response.json();
    setBusy("");
    if (!response.ok) {
      setNotice(payload.message || "Report generation failed.");
      return;
    }
    router.push(`/reports/${payload.report.id}`);
  }

  async function refreshReportingSchedule() {
    setBusy("schedule-refresh");
    setNotice("");
    const response = await fetch(`/api/projects/${project.id}/reporting-schedule/refresh`, { method: "POST" });
    const payload = await response.json();
    setBusy("");

    if (!response.ok) {
      setNotice(payload.message || "Reporting schedule refresh failed.");
      return;
    }

    setNotice(payload.message || "Reporting schedule refreshed.");
    router.refresh();
  }

  async function deleteCurrentProject() {
    const confirmed = window.confirm(`Delete ${project.code} - ${project.title}? This removes the project, documents, schedule, and generated reports from this local app.`);
    if (!confirmed) return;

    setBusy("delete");
    setNotice("");
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    const payload = await response.json();
    setBusy("");

    if (!response.ok) {
      setNotice(payload.message || "Project deletion failed.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="app-shell detail-shell">
      <Link href="/" className="back-link">
        <ArrowLeft size={16} />
        Portfolio
      </Link>
      <section className="detail-hero">
        <div>
          <p className="eyebrow">{project.code}</p>
          <h1>{project.title}</h1>
          <p>{project.concept}</p>
        </div>
        <div className="detail-side">
          <div className="detail-budget">
            <span>{formatCurrency(project.budget)}</span>
            <small>{project.funder}</small>
          </div>
          <button className="danger-button" type="button" onClick={deleteCurrentProject} disabled={busy === "delete"}>
            <Trash2 size={16} />
            {busy === "delete" ? "Deleting" : "Delete project"}
          </button>
        </div>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}

      <nav className="tabs" aria-label="Project detail sections">
        {(["overview", "documents", "reporting", "history"] as const).map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="detail-grid">
          <div className="panel wide-panel">
            <h2>Project overview</h2>
            <div className="fact-grid">
              <Fact label="Sector" value={project.sector} />
              <Fact label="Manager" value={project.manager} />
              <Fact label="Location" value={project.countries.join(", ")} />
              <Fact label="Period" value={`${formatDate(project.startDate)} - ${formatDate(project.endDate)}`} />
              <Fact label="Beneficiaries" value={project.beneficiaries} />
              <Fact label="Objective" value={project.objective} />
            </div>
          </div>
          <div className="panel">
            <h2>Budget burn</h2>
            <div className="donut" style={{ "--value": `${(totalSpent / project.budget) * 100}%` } as React.CSSProperties}>
              <span>{Math.round((totalSpent / project.budget) * 100)}%</span>
            </div>
            <p className="muted">{formatCurrency(totalSpent)} tracked in current evidence package</p>
          </div>
          <div className="panel wide-panel">
            <h2>Components</h2>
            <div className="tag-list">
              {project.components.map((component) => (
                <span key={component}>{component}</span>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>Risk register</h2>
            <div className="risk-list">
              {project.risks.map((risk) => (
                <div key={risk.label} className={`risk-item risk-${risk.rating.toLowerCase()}`}>
                  <strong>{risk.label}</strong>
                  <span>{risk.rating}</span>
                  <p>{risk.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="panel wide-panel">
            <h2>Budget split</h2>
            <div className="split-grid">
              {project.budgetSplit.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{formatCurrency(item.amount)}</strong>
                  <div className="mini-track">
                    <div style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section className="detail-grid">
          <div className="panel wide-panel">
            <h2>Documents</h2>
            <DocumentUploadForm onSubmit={uploadDocument} busy={busy === "upload"} />
            <div className="document-list">
              {project.documents.map((document) => (
                <div key={document.id} className="document-row">
                  <FileText size={18} />
                  <div>
                    <strong>{document.name}</strong>
                    <span>{document.type} | {document.status.replace("_", " ")}</span>
                    <p>{document.summary}</p>
                  </div>
                  {document.filePath ? (
                    <a href={`/api/files/${document.id}/download`} className="icon-button" aria-label={`Download ${document.name}`}>
                      <Download size={16} />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>Funder templates</h2>
            <TemplateUploadForm projectFunder={project.funder} onSubmit={uploadTemplate} busy={busy === "template"} />
            <div className="template-list">
              {project.templates.map((template) => (
                <div key={template.id}>
                  <strong>{template.name}</strong>
                  <span>{template.projectId ? "Project template" : "Funder template"} | {template.funder} | {template.cadence}</span>
                  <small>{template.requiredSections.length} required sections</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "reporting" ? (
        <section className="panel wide-panel">
          <div className="panel-title with-action">
            <h2>Reporting schedule</h2>
            <button className="secondary-button" type="button" onClick={refreshReportingSchedule} disabled={busy === "schedule-refresh"}>
              <RefreshCw size={16} />
              {busy === "schedule-refresh" ? "Refreshing" : "Refresh from docs"}
            </button>
          </div>
          <div className="schedule-list">
            {project.reportingSchedule.map((item) => (
              <div key={item.id} className="schedule-row">
                <CalendarClock size={18} />
                <div>
                  <strong>{item.reportType}</strong>
                  <span>Due {formatDate(item.dueDate)} | {item.status.replace("_", " ")}</span>
                  <small>{item.template?.name}</small>
                </div>
                {item.generatedReport?.status === "saved" ? (
                  <a className="primary-button" href={`/api/files/${item.generatedReport.id}/download`}>
                    <Download size={16} />
                    Download
                  </a>
                ) : item.generatedReport ? (
                  <Link className="secondary-button" href={`/reports/${item.generatedReport.id}`}>
                    Review draft
                  </Link>
                ) : (
                  <button className="primary-button" type="button" onClick={() => generateReport(item.id)} disabled={busy === item.id}>
                    <RefreshCw size={16} />
                    {busy === item.id ? "Generating" : "Generate"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="panel wide-panel">
          <h2>Source history</h2>
          <div className="timeline">
            {project.auditEvents.map((event) => (
              <div key={event.id}>
                <span>{formatDate(event.createdAt.slice(0, 10))}</span>
                <strong>{event.action}</strong>
                <p>{event.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DocumentUploadForm({ onSubmit, busy }: { onSubmit: (formData: FormData) => void; busy: boolean }) {
  return (
    <form
      className="upload-form"
      action={(formData) => {
        onSubmit(formData);
      }}
    >
      <select name="type" defaultValue="Project evidence">
        <option>Project evidence</option>
        <option>Proposal / embedded template</option>
        <option>Progress report</option>
        <option>Monitoring summary</option>
        <option>Financial tracker</option>
      </select>
      <input name="file" type="file" required />
      <button type="submit" className="primary-button" disabled={busy}>
        <Upload size={16} />
        {busy ? "Uploading" : "Upload"}
      </button>
    </form>
  );
}

function TemplateUploadForm({
  projectFunder,
  onSubmit,
  busy,
}: {
  projectFunder: string;
  onSubmit: (formData: FormData) => void;
  busy: boolean;
}) {
  return (
    <form
      className="template-form"
      action={(formData) => {
        onSubmit(formData);
      }}
    >
      <input name="name" defaultValue={`${projectFunder} reporting template`} />
      <input name="funder" defaultValue={projectFunder} />
      <input name="cadence" defaultValue="Quarterly" />
      <input name="reportType" defaultValue="Quarterly Donor Progress Report" />
      <textarea name="sections" placeholder="Required sections, one per line" rows={5} />
      <input name="file" type="file" />
      <button type="submit" className="secondary-button" disabled={busy}>
        <Upload size={16} />
        {busy ? "Saving" : "Add template"}
      </button>
      <p className="inline-note">
        <AlertTriangle size={14} />
        File-only template extraction needs an API key.
      </p>
    </form>
  );
}
