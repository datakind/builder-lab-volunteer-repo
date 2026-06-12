# Codex Handoff Notes

Use this file to orient future coding agents and maintainers quickly.

## Project Goal

Humanitarian Projects Manager is a Next.js TypeScript app for managing humanitarian project portfolios, uploaded evidence documents, donor reporting schedules, funder templates, AI-assisted extraction, and donor report drafts.

## Important Local Paths

- App root: `humanitarian-projects-manager`
- Runtime data: `storage/`
- Demo recording pack: `../demo-recording-pack`
- Main dashboard: `src/components/DashboardClient.tsx`
- Project detail UI: `src/components/ProjectDetailClient.tsx`
- Report preview UI: `src/components/ReportPreviewClient.tsx`
- AI calls and prompts: `src/server/ai.ts`
- SQLite schema and loaders: `src/server/db.ts`
- Write/update operations: `src/server/repository.ts`
- Seed portfolio/templates: `src/lib/seed-data.ts`
- Shared types: `src/lib/types.ts`
- Structured output schemas: `src/lib/schemas.ts`

## Commands

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

With `nvm`:

```bash
source ~/.nvm/nvm.sh
```

## Environment

Use `.env` in the app root. Add the OpenAI API key to `OPENAI_API_KEY` there. Other expected values:

```env
OPENAI_MODEL=gpt-5.4-mini
OPENAI_EXTRACTED_TEXT_CHARS=160000
DATABASE_URL=file:./storage/humanitarian-projects.db
MAX_UPLOAD_MB=25
```

Do not print API keys in logs or responses.

## Data Safety

- Do not delete or overwrite `storage/` unless the user explicitly asks for a reset.
- `storage/` contains uploaded documents, generated reports, and the SQLite database.
- The worktree may include user-created documents outside the app folder. Do not move or remove them without explicit instruction.

## App Behavior to Preserve

- No AI mocking when `OPENAI_API_KEY` is missing. AI routes should return disabled responses.
- Generated reports must include every required template section.
- Missing or uncertain evidence must be flagged in the report, not invented.
- Project document uploads should update project info and reporting schedules when AI is enabled.
- Funder templates should be visible to all projects with that funder.
- Project-scoped embedded templates should link to matching schedule items.
- New project code duplicates should receive a suffix instead of failing uniqueness.

## Current API Routes

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/documents`
- `POST /api/projects/:id/reporting-schedule/refresh`
- `POST /api/templates`
- `POST /api/reporting-schedule/:id/generate`
- `POST /api/generated-reports/:id/regenerate`
- `POST /api/generated-reports/:id/save`
- `GET /api/files/:id/download`

## AI Implementation Notes

- Uses OpenAI Responses API via the `openai` Node SDK.
- Structured outputs are defined in `src/lib/schemas.ts`.
- `.docx` files are locally text-extracted in `src/server/ai.ts` before model calls when possible.
- PDFs are still sent as file inputs.
- Report generation prompt lives in `reportPrompt()` in `src/server/ai.ts`.
- Strict evidence discipline is important: do not loosen the prompt to allow assumptions.

## Testing Expectations

Run these after code changes:

```bash
npm run lint
npm run typecheck
npm run test
```

Run E2E after frontend workflow changes:

```bash
npm run test:e2e
```

## Framework Warning

This repo uses Next.js 16. The existing `AGENTS.md` warning is intentional: consult local Next docs under `node_modules/next/dist/docs/` before changing framework-sensitive APIs.

## High-Risk Areas

- File upload and download routes.
- AI prompt/schema changes.
- SQLite schema changes without migration/backfill.
- Report save/download behavior.
- Deleting projects or resetting storage.
- Adding production deployment without authentication.

## Recommended Next Owner Tasks

1. Add authentication and role-based access.
2. Move long AI calls to a background job queue.
3. Add production storage and database strategy.
4. Add upload security scanning and retention policy.
5. Add template versioning and human approval workflow.
