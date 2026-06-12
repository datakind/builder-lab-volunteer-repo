# Enterprise Readiness Roadmap

This app is currently a polished local prototype. The following work is recommended before using it with real organizational data or deploying it for multiple users.

## 1. Security and Access Control

Highest priority.

- Add authentication through an enterprise identity provider.
- Add role-based authorization, for example admin, portfolio manager, project officer, reviewer, and read-only viewer.
- Add organization or workspace boundaries.
- Protect all API routes server-side, not only through UI hiding.
- Add secure session handling and CSRF protections where applicable.
- Add least-privilege access checks for every project, document, template, report, and download.

## 2. Data Protection

- Encrypt data at rest through managed database and object storage settings.
- Store uploaded documents in managed object storage such as S3, Azure Blob, or GCS.
- Add signed download URLs or authenticated streaming downloads.
- Add antivirus and malware scanning for uploads.
- Add file type validation and size limits in route handlers.
- Add PII/sensitive-data classification and optional redaction.
- Add retention policies and deletion workflows.
- Add backup and restore procedures.

## 3. Production Data Layer

- Replace local SQLite with Postgres for multi-user deployment.
- Add a migration framework.
- Add indexes for project filters, funder, sector, country, status, due dates, and report state.
- Add transaction-safe background job tables.
- Add seed/demo data separation from production data.
- Add database backup monitoring.

## 4. AI Operations

- Move extraction and generation into background jobs.
- Add progress states, queue retries, timeout policies, and retry buttons.
- Store model, prompt version, input documents, output schema version, and generation metadata.
- Add cost and latency monitoring.
- Add configurable model selection by task, for example faster model for extraction and stronger model for final report drafting.
- Add safety controls for sensitive documents.
- Add human review gates before report submission.

## 5. Audit and Compliance

- Expand audit events to include actor, IP/session, before/after changes, and affected resource IDs.
- Track document downloads.
- Track report generation, regeneration, save, export, and submission actions.
- Add immutable audit log storage for compliance-sensitive deployments.
- Add admin export for audit review.

## 6. Reporting Workflow

- Add report approval states, for example draft, in review, approved, submitted, returned, archived.
- Add comments and reviewer assignment.
- Add deadline reminders and escalation.
- Add template versioning so older reports preserve the template used at generation time.
- Add funder-specific validation checks before saving or submitting.
- Add PDF export and branded donor report styling.

## 7. Integrations

- Import project documents from Google Drive, SharePoint, Box, or S3.
- Export generated reports to document management systems.
- Sync project metadata with existing grants/project systems.
- Add email or Slack/Teams notifications for deadlines.
- Add dashboard exports to CSV/XLSX/PDF.

## 8. Deployment and Reliability

- Add CI/CD with lint, typecheck, tests, build, and security scan.
- Add production, staging, and development environments.
- Add health checks.
- Add structured logging and error tracking.
- Add metrics for latency, queue depth, AI errors, upload failures, and report generation success.
- Add rate limits for upload and AI routes.
- Add disaster recovery runbook.

## Suggested Phasing

**Phase 1: Secure Pilot**

- Authentication
- Role-based authorization
- Managed Postgres
- Managed object storage
- Background job queue
- Basic audit logs
- Deployment pipeline

**Phase 2: Operational Hardening**

- Reviewer workflow
- Template versioning
- Notifications
- Better error/retry UX
- Monitoring and cost dashboards
- Backup/restore testing

**Phase 3: Enterprise Scale**

- Multi-organization tenancy
- Advanced compliance and retention
- DMS integrations
- SSO/SCIM
- Advanced analytics and portfolio exports
- Formal security review

## Production Go/No-Go Checklist

Do not go live with real sensitive documents unless:

- Users must sign in.
- Authorization is enforced on every API route.
- Uploaded files are stored in managed private storage.
- Secrets are configured through the hosting provider.
- Backups are tested.
- Logs do not expose API keys or sensitive document content.
- AI output is clearly labeled as draft and requires human review.
- There is an owner for incident response and support.
