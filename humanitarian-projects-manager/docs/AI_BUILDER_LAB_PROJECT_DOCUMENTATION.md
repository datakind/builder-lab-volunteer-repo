# AI Builder Lab Project Documentation

## Project Information

**Organization Partner and key point of contact name and email:**  
TBD by project owner.

**Builder(s) names and email:**  
TBD by Builder Lab team.

**Project Name:**  
Humanitarian Projects Manager

## Problem Context

**Problem Statement:**  
Humanitarian project teams manage proposals, donor agreements, progress reports, templates, financial trackers, schedules, and evidence across many funders and project folders. Key project information is often buried in Word/PDF documents, while reporting schedules and donor templates are tracked manually. This creates a workflow gap between project evidence, portfolio oversight, and donor-ready reporting.

**Why This Problem Matters:**  
Humanitarian practitioners need fast access to reliable project status, reporting deadlines, donor requirements, evidence documents, and funding context. Missed deadlines, incomplete report sections, or unsupported narrative claims can create donor compliance risk and reduce time available for program delivery. A tool that organizes projects and drafts evidence-based reports can reduce administrative burden while improving reporting discipline.

## Solution Access Information

**Demo:**  
Local demo app at `http://127.0.0.1:3000` after setup. Demo file pack: `../demo-recording-pack`.

**GitHub repository:**  
TBD by project owner. Current local app folder: `humanitarian-projects-manager`.

**Site:**  
Not deployed yet. V1 is local only.

**Shared drive:**  
TBD by project owner.

## Solution Context

**Deliverable Summary:**  
The prototype is a Next.js TypeScript fullstack app with a humanitarian portfolio dashboard, project detail pages, document uploads, AI-assisted project extraction, reporting schedule extraction, funder template management, report draft generation, preview/regeneration, and saved `.docx` report downloads. It uses SQLite and local filesystem storage for a self-contained demo.

**Pain Points Addressed:**

- Project information spread across donor documents, proposals, reports, and templates.
- Manual effort to identify reporting deadlines from project documents.
- Inconsistent donor report templates and section coverage.
- Risk of AI-generated reports inventing missing information.
- Difficulty showing portfolio-wide budget, sector, country, and reporting status in one place.
- Lack of a clean workflow from evidence upload to donor-ready draft.

**Potential Value Created:**  
The app centralizes project evidence and turns uploaded documents into structured portfolio data. It helps users quickly see projects, deadlines, budgets, countries, risks, evidence history, and donor templates. The report generator preserves every required template section and flags missing evidence, which supports safer practitioner review. The demo pack shows a realistic flow where a new ECHO project is created from a proposal, evidence documents update the project, an explicit schedule is extracted, and a donor report draft is generated from the accumulated evidence.

## Solution Description

**How a Practitioner Would Use This Solution:**

1. Open the dashboard to review portfolio KPIs, budget distribution, status, country coverage, deadlines, and project list.
2. Use filters to find projects by funder, sector, country, status, budget range, or reporting state.
3. Open a project detail page to review overview fields, risk register, budget split, documents, templates, reporting schedule, and history.
4. Upload proposal or donor agreement documents to create a new project.
5. Upload progress reports, financial trackers, field updates, monitoring summaries, and donor templates to existing projects.
6. Let the AI extraction update project fields and reporting schedules when an OpenAI API key is configured.
7. Generate a report draft from a schedule item.
8. Review the document-style report preview, inspect missing-evidence flags, add regeneration instructions, regenerate if needed, then save the report.
9. Download saved report `.docx` files and uploaded source documents.

**Key Assumptions:**

- V1 is a single-user local demo.
- Users have permission to upload and process the documents they provide.
- Users configure their own OpenAI API key.
- AI output is draft support only and requires human review before donor submission.
- SQLite and local filesystem storage are acceptable for demo and local testing.
- Seed projects and demo documents are illustrative and not a production portfolio.

**Data/AI Requirements:**

- Required environment variable: `OPENAI_API_KEY`.
- Recommended model for speed-sensitive demo use: `gpt-5.4-mini`.
- Project intake works best with proposal, donor agreement, investment document, concept note, or structured report documents.
- For large `.docx` files, the backend locally extracts Word text before sending it to the model for faster and more reliable processing.
- Uploaded PDF files are sent as file inputs to the OpenAI API.
- Critical project fields include project code, title, funder, sector, country, dates, budget, beneficiaries, objective, components, risks, deliverables, reporting schedule, and template sections.
- AI must not invent missing values. Missing or uncertain report evidence is flagged as `[REQUIRES HUMAN UPDATE]`.

**Known Limitations:**

- No authentication or authorization.
- No role-based access control.
- No organization or multi-tenant model.
- No cloud file storage.
- No production database engine or managed migrations.
- No background job queue for long-running AI extraction.
- No antivirus or malware scanning on uploads.
- No PII redaction, sensitivity labels, or document access policy.
- PDF processing can still be slower than small Word/text-based documents.
- Generated reports are drafts and require human review.
- Current geocoding is seed/helper based, not a live geocoding service.
- Current report output is `.docx`; no native PDF export.

**Setup, Maintenance, and Operational Notes:**

- Install dependencies with `npm install`.
- Copy `.env.example` to `.env` and add `OPENAI_API_KEY`.
- Run locally with `npm run dev -- --hostname 127.0.0.1 --port 3000`.
- Local app data is stored in `storage/`.
- Back up `storage/` to preserve uploads, generated reports, and the SQLite database.
- Restart the dev server after changing environment variables.
- Run `npm run lint`, `npm run typecheck`, and `npm run test` before handoff.

**Test Set and Pass/Fail Checklist:**

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run test`: pass.
- `npm run test:e2e`: dashboard opens, filtering works, project detail opens, reporting tab is visible.
- Manual dashboard check: KPIs, charts, map, filters, and project cards render.
- Manual project check: overview, documents, templates, reporting schedule, and history render.
- Manual upload check: new project can be created from demo proposal document when `OPENAI_API_KEY` is set.
- Manual report check: generated report preview includes every template section and missing-evidence flags.
- Manual save/download check: saved report appears as a download link in the reporting schedule.

**Open Issues:**

- Need production authentication and authorization.
- Need background job handling for long AI tasks.
- Need cloud storage and database migration plan.
- Need document security, PII handling, and retention policy.
- Need stronger error messages and retry UX for OpenAI server errors.
- Need admin controls for templates, project deletion, and data reset.
- Need production deployment target and CI/CD.

## Next-Step Recommendation

**Highest Priority Next Step, Why, and Estimated Effort:**  
Add authentication, role-based access control, and organization-aware data ownership. This is the most important production step because the app handles sensitive project documents and generated donor reports. Estimated effort: 3-7 engineering days for a first secure single-organization version, longer for multi-tenant enterprise requirements.

**Additional Future Opportunities:**

- Add background AI jobs with progress states and retries.
- Move from SQLite/filesystem to Postgres plus object storage.
- Add vector search or document retrieval over project evidence.
- Add human review workflow, approvals, and submitted report status.
- Add template versioning and funder-specific validation rules.
- Add data import/export for existing project trackers.
- Add cloud deployment automation and monitoring.
- Add organization branding and donor-ready report styling options.

**Additional Notes:**  
This prototype is strongest as a demo of the end-to-end workflow: dashboard oversight, document upload, project extraction, schedule extraction, evidence management, template-aware report generation, human-update flags, and saved downloads.
