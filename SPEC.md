# SPEC — Smart Office Document Assistant (Part 2: Application Layer)

## 1. Overview

This web application is a dashboard that lets an office user view, upload, and review documents that are processed automatically by an n8n automation (Part 1). The React app does not process documents itself — it only calls the n8n workflows (exposed as HTTP APIs) and displays the results.

## 2. Screens

### 2.1 Documents Dashboard (home screen)
- Shows a table/list of all processed documents (from Workflow B: `GET /documents`).
- Each row shows: file name, category/type, urgency level, status (e.g. reviewed / pending), date processed.
- Includes a search box (filter by file name) and a filter by urgency/status.
- Each row is clickable and links to a detail view (or expands inline) showing the full extracted summary.
- A "Refresh" button re-calls `GET /documents` to pull the latest data.

### 2.2 Upload Screen
- A file upload form (drag-and-drop or file picker).
- On submit, calls Workflow A (`POST /process-document`) with the file.
- Shows a loading state while n8n processes the document (AI extraction + urgency classification).
- On success, shows the result (extracted summary, urgency) and a link back to the dashboard.
- On failure, shows a clear error message (not a raw JSON dump).

### 2.3 Review Screen / Action
- From the dashboard, a document marked "pending review" has a "Mark as Reviewed" button.
- Clicking it calls Workflow C (`POST /review`) with the document's ID.
- On success, the dashboard row updates its status to "Reviewed" without a full page reload.

## 3. User Flow (happy path)

1. User opens the Dashboard — sees list of existing documents (Workflow B).
2. User uploads a new file via the Upload screen (Workflow A) — sees extraction result.
3. User returns to Dashboard — new document appears in the list.
4. User reviews a pending document and marks it reviewed (Workflow C) — status updates.

## 4. Non-goals (out of scope for Part 2)
- The React app does not talk to Google Drive, Google Sheets, or the AI model directly — all of that stays inside the n8n workflows from Part 1.
- No user authentication/login system — the app is protected only at the API level via the `x-api-key` header (see CONTRACT.md).

## 5. Tech stack
- React + Vite (frontend)
- Plain `fetch` (or a small wrapper) to call the n8n webhook endpoints
- A mock API layer (`src/api/mock.js`) used during early development, swapped for the real API (`src/api/client.js`) once each endpoint is confirmed working (see CONTRACT.md and 00_PART2_CHECKLIST.md milestones).
