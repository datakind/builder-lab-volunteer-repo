# CODEX 2026 DEMO PROTOTYPE

This is a hackathon/demo prototype for the Disaster Evacuation Control Tower concept, titled CODEX 2026 DEMO PROTOTYPE.

The broader concept is disaster management and evacuation coordination. The current MVP uses Hat Yai flood rescue as the first concrete scenario.

It is not production-ready. It uses plain HTML, CSS, and JavaScript only, with mock data stored in the browser page. There is no database, no real authentication, no live GPS, no SMS provider, and no backend API.

## How To Open

Open this file directly in a browser:

`demo/flood-rescue-control-tower.html`

No install step is required.

## What The Demo Shows

- Disaster evacuation command dashboard with area filtering and operational metrics.
- Hat Yai-focused animated operation map with moving boat icons, case density dots, and a planned pickup route.
- 100 realistic mock flood rescue cases across Khlong Hae, Kho Hong, and Khuan Lang as the MVP scenario.
- Help request intake with deterministic priority scoring.
- Verification queue for unverified requests and public updates.
- Boat, driver, route, and safety tracking.
- Manual dispatch planner with eligibility reasons.
- Mission lifecycle status updates.
- Privacy-safe public tracking by tracking code.
- Public emergency updates that appear as unreviewed request events.
- Audit/event timeline for major operational actions.

## Real Backend Features Needed Later

- Real authentication and area-scoped RBAC.
- PostgreSQL/PostGIS database with migrations.
- API routes for requests, verification, dispatch, missions, fleet updates, shelters, communication logs, and audit logs.
- Transaction-safe mission creation to prevent double assignment.
- Durable audit logs and sensitive-data access controls.
- Real SMS/call-center integration.
- GPS/mobile PWA location updates.
- Conservative routing and dispatch calculations with real routing data.
- Production monitoring, backups, rate limiting, and security review.
