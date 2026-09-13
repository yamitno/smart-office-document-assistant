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
- [x] Loading and error states consistent across all three screens (see F7 in README.md)
- [x] Remove leftover scaffold assets no longer used — confirmed `src/` and `public/` are already clean, no `hero.png` / `react.svg` / `vite.svg` present
- [ ] Update each Webhook node's CORS "Allowed Origins" to the deployed URL — **N/A unless the app is actually deployed/hosted**; still `http://localhost:5173` for local dev/demo
- [x] Re-check the build against SPEC.md's non-goals — confirmed: the React app never calls Sheets/Drive/AI/Calendar directly (the new calendar-reminder feature runs entirely inside n8n's Workflow A), and there is still no login system, only the `x-api-key` header
- [x] Write the reflection write-up (`Reflection.md`)

## Milestone 6 — Calendar reminder feature (added Sep 13)
- [x] Workflow A creates a real Google Calendar event when a document has a real deadline AND High/Medium urgency
- [x] `Calendar Reminder` (Yes/No) and `Calendar Event Link` written to the sheet and returned by Workflow B
- [x] Dashboard + Document detail show the new field (see `labels.js`, `Dashboard.jsx`, `DocumentDetail.jsx`)
- [x] Three real n8n bugs found and fixed (wrong If-node wiring, missing `{{ }}` expression wrapper, Sheets node silently in Fixed mode) — documented in `CONTRACT.md` section 2.1
- [x] Verified end-to-end with two real webhook calls (High-urgency+deadline → real event created; Low-urgency/no-deadline → no event)
- [x] `CONTRACT.md` / `README.md` updated
- [x] **`workflows/workflow-a-process-document.json` re-exported (Sep 13)** — fresh export taken after the calendar-reminder feature and all three bug fixes, committed in `0e43b43`.
- [x] Dashboard column width fixed (`Dashboard.css`, `App.css`) so the new "נקבעה תזכורת ביומן" column isn't cut off

## Milestone 7 — Required Tests (section 11 of the assignment) — evidence

All ten required tests have been run against the real webhooks/app. Evidence pointers below (sheet = "Document Processing Log"; screenshots/videos are in the Drive folder "SMART DOCUMENT ASSISTANT -WEB").

- [x] **Happy path — invoice due tomorrow:** High-urgency + real deadline rows (e.g. `exec-71395`, `urgent_final...`) — urgent Gmail sent, badge shows High, real Calendar event created (`Calendar Reminder = Yes`).
- [x] **Normal document — internal report:** Medium/Low rows (e.g. `test_03_report.docx`, `medium_large_test_document`) — false branch of the IF node responded correctly, no timeout.
- [x] **Missing information — complaint with no deadline:** multiple sheet rows show the literal text `Not found` in the Deadline column (e.g. row 27, `test_01_invoice`) rather than an empty cell or an invented date.
- [x] **Unsupported file — .png/.xlsx/.zip:** rejected client-side before any request reaches n8n (see F7 Finding 1 in `CONTRACT.md` §2, and video "5. העלאת קובץ לא נתמך כמו תמונה").
- [x] **Large document:** `medium_large_test_document.pdf` (~4.3MB) accepted; `large_test_document.pdf` (~11.3MB) rejected client-side with no network request (video "4. העלאת קובץ בינוני גדול והעלאת קובץ גדול מידי"; `VITE_MAX_FILE_MB` check, `PROMPTS.md` #9).
- [x] **Double submission:** recorded in video "2. לחיצה כפולה על שליחה" — pressing Send twice quickly produces exactly one sheet row (Send button disabled during the request, per F2).
- [x] **n8n unavailable:** app shows a readable "can't reach the server" message with the workflow deactivated/unreachable (video "3. בדיקה לא זמין"; `fetchWithTimeout` in `client.js`, F7 Finding 2).
- [x] **Wrong secret:** confirmed real webhook returns `403` (not `401`) on a bad `x-api-key`; app shows a configuration-problem message (`CONTRACT.md` intro note + `client.js` 403 check).
- [x] **Review action:** marking a document reviewed updates `Status` / `Reviewed By` / `Review Note` in the sheet, dashboard reflects it after refresh (screenshots `04_detail_view.png`, `06_updated_spreadsheet.png`).
- [x] **Both entry points:** verified Sep 13 — see `CONTRACT.md` §4 for full evidence (`07_both_entry_points_test.txt`, sheet row 37, screenshot `2026-09-13 144815`).

**Minimum success criteria (§11.1):** 5+ documents required — the sheet has 20+ rows carrying an app-assigned `exec-...` id (Workflow A), well past the minimum, alongside Part-1-only rows (no `exec-...` id) proving the Drive trigger is still live.
