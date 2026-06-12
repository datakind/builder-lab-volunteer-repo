<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Humanitarian Projects Manager Notes

This is a local/demo-first TypeScript fullstack app for humanitarian project portfolio management, document uploads, AI extraction, funder templates, reporting schedules, and donor report generation.

Read these first when taking over the project:

- `README.md`
- `docs/CODEX_HANDOFF.md`
- `docs/INSTALLATION_AND_OPERATIONS.md`
- `docs/AI_BUILDER_LAB_PROJECT_DOCUMENTATION.md`
- `docs/ENTERPRISE_READINESS_ROADMAP.md`

Important implementation files:

- Dashboard UI: `src/components/DashboardClient.tsx`
- Project detail UI: `src/components/ProjectDetailClient.tsx`
- Report preview UI: `src/components/ReportPreviewClient.tsx`
- AI calls and prompts: `src/server/ai.ts`
- SQLite schema/loaders: `src/server/db.ts`
- Repository writes: `src/server/repository.ts`
- Shared schemas: `src/lib/schemas.ts`
- Seed data/templates: `src/lib/seed-data.ts`

Operational guardrails:

- Do not delete or reset `storage/` unless the user explicitly asks. It contains uploaded documents, generated reports, and the SQLite database.
- Do not print `OPENAI_API_KEY` or other secrets.
- Preserve the strict report behavior: every required template section must be present, and unsupported values must be flagged with `[REQUIRES HUMAN UPDATE]` rather than invented.
- Run `npm run lint`, `npm run typecheck`, and `npm run test` after code changes.
