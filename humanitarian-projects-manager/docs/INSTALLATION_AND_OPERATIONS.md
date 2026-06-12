# Installation and Operations Guide

## Prerequisites

- Node.js 20 or newer.
- npm.
- An OpenAI API key for document extraction and report generation.
- A machine with persistent disk if you want to keep uploaded documents and generated reports.

Optional but useful:

- `nvm` for Node version management.
- Playwright browser binaries for E2E tests.

## Environment Variables

Create `.env` in the app root:

```bash
cp .env.example .env
```

Add your OpenAI API key to `OPENAI_API_KEY` in `.env`, then keep these recommended local defaults:

```env
OPENAI_MODEL=gpt-5.4-mini
OPENAI_EXTRACTED_TEXT_CHARS=160000
DATABASE_URL=file:./storage/humanitarian-projects.db
MAX_UPLOAD_MB=25
```

Variable notes:

- `OPENAI_API_KEY`: required for AI extraction, template detection, schedule extraction, and report generation.
- `OPENAI_MODEL`: model used by all AI flows. `gpt-5.4-mini` is a good speed/quality default for demos.
- `OPENAI_EXTRACTED_TEXT_CHARS`: maximum extracted Word text sent to the model for large `.docx` files.
- `DATABASE_URL`: SQLite file location. The `file:` prefix is supported.
- `MAX_UPLOAD_MB`: intended upload size limit. Some routes may still need explicit enforcement before production.

Restart the app after editing `.env`.

## Install

```bash
cd /path/to/humanitarian-projects-manager
npm install
```

If you use `nvm`:

```bash
source ~/.nvm/nvm.sh
npm install
```

## Run Locally

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

If port `3000` is busy:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Stop the old process if appropriate, then restart the app.

## Build and Start

```bash
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

For a server deployment, run the app behind HTTPS with a reverse proxy or managed hosting platform.

## Testing

```bash
npm run lint
npm run typecheck
npm run test
```

E2E test:

```bash
npm run test:e2e
```

The Playwright config starts the dev server on `127.0.0.1:3000` and reuses an existing server when available.

## Storage and Backups

Runtime data is stored under `storage/`:

```text
storage/humanitarian-projects.db
storage/uploads/
storage/generated/
storage/tmp/
```

For demo preservation, back up the full `storage/` directory. The database alone is not enough because document rows point to files in `storage/uploads/` and generated report rows point to files in `storage/generated/`.

## Reset Local Demo Data

Only do this if you intentionally want to erase local data:

```bash
mv storage storage.backup.$(date +%Y%m%d-%H%M%S)
mkdir -p storage
npm run dev -- --hostname 127.0.0.1 --port 3000
```

On first database creation, the app seeds the default portfolio projects and templates.

## AI Workflow Notes

New project upload:

1. Stores uploaded files in `storage/uploads/`.
2. Sends selected files to OpenAI for structured project extraction.
3. Creates the project in SQLite.
4. Detects embedded templates from proposal/reporting documents.
5. Extracts explicit reporting schedule deadlines.

Project document upload:

1. Stores the uploaded document.
2. Extracts project updates when AI is enabled.
3. Detects embedded reporting templates when relevant.
4. Refreshes reporting schedule items from explicit deadlines in the document.

Report generation:

1. Loads the selected schedule item, project, template, and project documents.
2. Sends the evidence package and template requirements to OpenAI.
3. Normalizes the report so every required section exists.
4. Flags missing or uncertain evidence with `[REQUIRES HUMAN UPDATE]`.
5. Saves the draft in SQLite.
6. On user save, writes a `.docx` file to `storage/generated/`.

## Troubleshooting

**AI features say disabled:**  
Confirm `.env` has `OPENAI_API_KEY`, then restart the server.

**Large Word upload is slow:**  
The app extracts `.docx` text locally before calling OpenAI. In the terminal, look for a line like:

```text
[AI] using local text extraction for file.docx: 160k chars
```

**OpenAI returns a server error after a long wait:**  
Retry with a smaller file or upload documents one by one. For demo recordings, use the small Word files in `../demo-recording-pack`.

**Port already in use:**  
Find the process with `lsof -nP -iTCP:3000 -sTCP:LISTEN`.

**E2E tests fail because the server cannot start:**  
Check whether another server is already bound to port `3000`, or run the app manually first.

## Production Deployment Checklist

Before hosting real data:

- Use HTTPS.
- Configure secrets through the hosting provider, not committed files.
- Use persistent storage for uploaded/generated files.
- Add authentication and authorization.
- Add backup/restore procedures.
- Add monitoring and error tracking.
- Add upload scanning and document sensitivity controls.
- Replace local SQLite/filesystem storage if multi-user or cloud scale is required.
