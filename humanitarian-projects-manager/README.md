# Humanitarian Projects Manager

A TypeScript fullstack prototype for humanitarian project portfolio management, document intake, donor reporting schedules, funder templates, and AI-assisted donor report drafting.

The app is designed as a local/demo-ready system for teams that manage humanitarian projects across funders, sectors, countries, evidence documents, reporting deadlines, and donor-specific templates.

## What It Does

- Shows a portfolio dashboard with KPIs, budget charts, status distribution, geographic coverage, project cards, and filters.
- Creates a new project from uploaded proposal, agreement, report, or donor package documents.
- Stores project documents locally and lets users download them again.
- Extracts project updates, embedded reporting templates, and explicit reporting schedules from uploaded documents when an OpenAI API key is configured.
- Lets funder templates inherit across every project for that funder.
- Generates donor report drafts from project evidence and required template sections.
- Keeps every required report section and flags missing evidence with `[REQUIRES HUMAN UPDATE]` instead of inventing unsupported content.
- Saves generated reports as downloadable `.docx` files.

## Tech Stack

- Next.js 16, React 19, TypeScript
- SQLite through `better-sqlite3`
- Local filesystem storage under `storage/`
- OpenAI Responses API through the `openai` Node SDK
- `docx` for saved report downloads
- Vitest and Playwright

## Quick Start

```bash
npm install
cp .env.example .env
```

Edit `.env`, add your OpenAI API key to `OPENAI_API_KEY`, and keep the remaining local defaults:

```env
OPENAI_MODEL=gpt-5.4-mini
OPENAI_EXTRACTED_TEXT_CHARS=160000
DATABASE_URL=file:./storage/humanitarian-projects.db
MAX_UPLOAD_MB=25
```

Run locally:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

If you use `nvm`:

```bash
source ~/.nvm/nvm.sh
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Scripts

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run start
```

## Local Data

The app writes local runtime data to `storage/`, which is ignored by git:

- `storage/humanitarian-projects.db`: SQLite database
- `storage/uploads/`: uploaded project and template documents
- `storage/generated/`: saved generated `.docx` reports
- `storage/tmp/`: temporary files

Back up `storage/` if you want to preserve demo data or real uploaded documents.

## Demo Materials

A recording pack with small, fast Word files lives outside this app folder:

```text
../demo-recording-pack
```

Start with:

- [Demo video guide](docs/DEMO_VIDEO_GUIDE.md)
- `../demo-recording-pack/README_DEMO_FLOW.md`

## Documentation

- [AI Builder Lab Project Documentation](docs/AI_BUILDER_LAB_PROJECT_DOCUMENTATION.md)
- [Installation and Operations Guide](docs/INSTALLATION_AND_OPERATIONS.md)
- [Demo Video Guide](docs/DEMO_VIDEO_GUIDE.md)
- [Codex Handoff Notes](docs/CODEX_HANDOFF.md)
- [Enterprise Readiness Roadmap](docs/ENTERPRISE_READINESS_ROADMAP.md)

## Current Prototype Scope

This is a single-user local demo. It does not yet include authentication, authorization, cloud object storage, production database migrations, encrypted document storage, audit-grade access logs, tenant isolation, or deployment automation.

See the [Enterprise Readiness Roadmap](docs/ENTERPRISE_READINESS_ROADMAP.md) for the recommended path from prototype to production.
