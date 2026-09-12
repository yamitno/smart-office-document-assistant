# 00_PART2_CHECKLIST — Milestones (Part 2: Application Layer)

Tracks progress against SPEC.md and CONTRACT.md. Check items off as they land.

## Milestone 0 — Project setup
- [x] Scaffold React + Vite (plain JavaScript template)
- [x] Install dependencies (`react-router-dom`)
- [x] `.env.example` with `VITE_API_BASE_URL`, `VITE_API_KEY`
- [x] RTL layout (`dir="rtl"`, `lang="he"`) + Hebrew-friendly font (Rubik)

## Milestone 1 — Mock-data UI (current stage)
- [x] `src/api/mock.js` — `getMockDocuments()` matching CONTRACT.md's Workflow B shape exactly
- [x] `src/api/client.js` — `getDocuments()` (currently just returns the mock)
- [x] Dashboard screen — table, search by file name, status filter, urgency/status badges
- [x] Upload screen — drop zone / file picker, placeholder message (no real call yet)
- [x] DocumentDetail screen — all fields shown, "Mark as Reviewed" disabled with tooltip
- [x] Hebrew display labels (`src/utils/labels.js`) for Urgency / Status / Document Type / Department
- [x] Design pass — blue accent (#2563eb), light blue background

## Milestone 2 — Workflow B (`GET /documents`)
- [x] Confirm the Workflow B webhook is live and returns the documented shape
- [x] Update `client.js`: `getDocuments()` → real `fetch(`${VITE_API_BASE_URL}/yamit-documents`)` with the `x-api-key` header
- [x] Handle `401` / `500` gracefully (a clear message on screen, not a raw JSON dump)
- [x] Add the "Refresh" button on the Dashboard (SPEC 2.1) to re-call `GET /documents`
- [x] Verify CORS allows `http://localhost:5173` during dev
- [x] Keep `mock.js` in place as a fallback / for offline dev (auto-fallback when `.env` is missing)

## Milestone 3 — Workflow A (`POST /process-document`)
- [x] Confirm the production URL and request shape (JSON + base64, not multipart — see CONTRACT.md, confirmed Sep 12)
- [x] `client.js`: add `processDocument(file)` → `POST` JSON `{ file_base64, file_name, mime_type }` with `x-api-key`
- [x] `Upload.jsx`: wire the "שליחה" button to `processDocument`, add a loading state while n8n processes
- [x] Show the extraction result (document type, sender, summary, urgency badge, deadline, department) on success
- [x] Show a clear error message on failure (`401` / other) instead of a raw JSON dump
- [x] Link back to the Dashboard after a successful upload

## Milestone 4 — Workflow C (`POST /review`)
- [x] Confirm the production URL and row identification — `document_id` is actually the sheet's `row_number`, not the (mostly empty) `Document ID` column (see CONTRACT.md, confirmed Sep 12)
- [x] `client.js`: add `reviewDocument(rowNumber, reviewedBy, reviewNote)` → `POST /yamit-review`
- [x] `DocumentDetail.jsx`: enable the "Mark as Reviewed" form (reviewedBy + optional note), wire it up; also fixed Dashboard/DocumentDetail to route/look up by `row_number` instead of array index (index broke under an active search/filter)
- [x] Update the Dashboard/detail status in place on success via `refresh()` (no full page reload — SPEC 2.3) — verified live against the real API (row 3 moved from "ממתין לבדיקה" to "טופל" without a reload)
- [x] Handle `401`; readable error message on any other failure via the shared `error-banner` style

## Milestone 5 — Polish & submission
- [ ] Loading and error states consistent across all three screens
- [ ] Remove leftover scaffold assets no longer used (`hero.png`, `react.svg`, `vite.svg`)
- [ ] Update each Webhook node's CORS "Allowed Origins" to the deployed URL if the app is hosted
- [ ] Re-check the build against SPEC.md's non-goals (no auth system, no direct Sheets/Drive/AI calls)
- [ ] Write the reflection write-up
