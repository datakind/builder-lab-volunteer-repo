"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, Download, RefreshCw, Save } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { GeneratedReport, Project, ReportingTemplate } from "@/lib/types";

export function ReportPreviewClient({
  report,
  project,
  template,
}: {
  report: GeneratedReport;
  project: Project;
  template: ReportingTemplate;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [userPrompt, setUserPrompt] = useState("");

  async function regenerate() {
    setBusy("regenerate");
    setNotice("");
    const response = await fetch(`/api/generated-reports/${report.id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt }),
    });
    const payload = await response.json();
    setBusy("");
    if (!response.ok) {
      setNotice(payload.message || "Regeneration failed.");
      return;
    }
    router.refresh();
  }

  async function save() {
    setBusy("save");
    setNotice("");
    const response = await fetch(`/api/generated-reports/${report.id}/save`, { method: "POST" });
    const payload = await response.json();
    setBusy("");
    if (!response.ok) {
      setNotice(payload.message || "Save failed.");
      return;
    }
    setNotice("Report saved and linked to the reporting schedule.");
    router.refresh();
  }

  return (
    <main className="app-shell report-shell">
      <Link href={`/projects/${project.id}`} className="back-link">
        <ArrowLeft size={16} />
        {project.code}
      </Link>
      <section className="detail-hero">
        <div>
          <p className="eyebrow">{report.status}</p>
          <h1>{report.title}</h1>
          <p>
            {template.name} | Generated {formatDate(report.generatedAt.slice(0, 10))}
          </p>
        </div>
        <div className="report-actions">
          {report.status === "saved" && report.fileName ? (
            <a className="primary-button" href={`/api/files/${report.id}/download`}>
              <Download size={16} />
              Download
            </a>
          ) : (
            <button className="primary-button" type="button" onClick={save} disabled={busy === "save"}>
              <Save size={16} />
              {busy === "save" ? "Saving" : "Save"}
            </button>
          )}
          <button className="secondary-button" type="button" onClick={regenerate} disabled={busy === "regenerate"}>
            <RefreshCw size={16} />
            {busy === "regenerate" ? "Regenerating" : "Regenerate"}
          </button>
        </div>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}

      <section className="report-layout">
        <aside className="panel report-sidebar">
          <h2>Evidence summary</h2>
          <p>{report.evidenceSummary}</p>
          <h2>Missing flags</h2>
          <div className="tag-list vertical">
            {report.missingFields.length ? report.missingFields.map((field) => <span key={field}>{field}</span>) : <span>None recorded</span>}
          </div>
          <label className="prompt-box">
            Regeneration prompt
            <textarea
              value={userPrompt}
              onChange={(event) => setUserPrompt(event.target.value)}
              rows={8}
              placeholder="Add instructions for the next draft, for example: focus on reporting period 1, keep BMGF wording, or tighten the financial variance explanation."
            />
          </label>
          <button className="secondary-button full-width" type="button" onClick={regenerate} disabled={busy === "regenerate"}>
            <RefreshCw size={16} />
            {busy === "regenerate" ? "Regenerating" : "Regenerate with prompt"}
          </button>
          <details>
            <summary>Generation instructions used</summary>
            <pre>{report.prompt}</pre>
          </details>
        </aside>
        <section className={`report-document-page ${templateTone(template)}`}>
          <header className="report-page-header">
            <p>{template.funder}</p>
            <h2>{report.title}</h2>
            <span>{template.name}</span>
          </header>
          <div className="report-meta-grid">
            <Meta label="Project" value={`${project.code} - ${project.title}`} />
            <Meta label="Country" value={project.countries.join(", ")} />
            <Meta label="Sector" value={project.sector} />
            <Meta label="Reporting due" value={formatDate(project.reportingSchedule.find((item) => item.id === report.scheduleId)?.dueDate || report.generatedAt.slice(0, 10))} />
            <Meta label="Budget" value={`${project.currency} ${project.budget.toLocaleString()}`} />
            <Meta label="Template source" value={template.sourceDocument} />
          </div>
          {report.missingFields.length ? (
            <div className="attention-summary">
              <AlertTriangle size={18} />
              <div>
                <strong>Requires human update before submission</strong>
                <p>{report.missingFields.join("; ")}</p>
              </div>
            </div>
          ) : null}
          {report.sections.map((section) => (
            <article key={section.heading} className={section.missingEvidence ? "section-missing" : ""}>
              <h2>{section.heading}</h2>
              {section.missingEvidence ? (
                <div className="inline-flag">
                  <AlertTriangle size={16} />
                  Requires human update
                </div>
              ) : null}
              <p className="report-body">{section.body}</p>
              <div className="evidence-line">
                <strong>Evidence</strong>
                <span>{section.evidence.length ? section.evidence.join("; ") : "No source evidence attached."}</span>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function templateTone(template: ReportingTemplate) {
  const text = `${template.name} ${template.funder} ${template.sourceDocument}`.toLowerCase();
  if (text.includes("bmgf") || text.includes("gates")) return "template-bmgf";
  if (text.includes("fcdo")) return "template-fcdo";
  if (text.includes("echo")) return "template-echo";
  return "template-standard";
}
