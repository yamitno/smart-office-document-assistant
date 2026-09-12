# Smart Office Document Assistant — Part 2: Application Layer

A small React web app that sits in front of an existing n8n automation (Part 1) and turns it into something an office worker can actually use: upload a document, watch it get processed, read the extracted fields, search/filter past documents, and mark one as reviewed — all without ever opening n8n.

**The app never re-implements any business logic.** It does not call an AI model, does not write to Google Sheets, does not send email, and does not decide what "urgent" means. All of that stays exactly where it was in Part 1, inside n8n. The app only collects input, calls n8n's webhooks, and displays whatever n8n returns.

## Architecture

```
┌─────────────┐        HTTPS + x-api-key         ┌───────────────────────────┐
│   Browser    │ ───────────────────────────────▶ │   n8n (3 webhooks)         │
│ React + Vite │ ◀─────────────────────────────── │  A: POST /process-document │
└─────────────┘        JSON (see CONTRACT.md)      │  B: GET  /documents        │
                                                    │  C: POST /review           │
                                                    └─────────────┬─────────────┘
                                                                  │
                                        AI model, Google Sheets, Gmail, Google Drive
                                     (credentials live only inside n8n, never in the
                                              browser or in this repo)
```

- **Workflow A** — `POST /process-document`. Receives a file as base64, extracts its text (PDF / DOCX / TXT), runs it through the AI information extractor from Part 1, uploads the original file to Google Drive, appends a row to the shared "Document Processing Log" Google Sheet, sends a Gmail notification (urgent vs. normal branch), and responds with the extracted fields as JSON.
- **Workflow B** — `GET /documents`. Reads the same Google Sheet and returns all rows as JSON. This is the *only* data source for the dashboard — the app keeps no database of its own.
- **Workflow C** — `POST /review`. Finds the row whose `document_id` matches the request and writes `status`, `Reviewed By`, and `Review Note` back into the sheet.
- **Part 1's original Google Drive trigger keeps running unchanged**, in parallel with the new webhook entry point — a document dropped into the Drive folder and a document uploaded through the app both end up as rows in the same sheet, visible in the same dashboard.

## Features

| # | Feature | Screen |
|---|---|---|
| F1 | Upload screen — drag & drop, file-type and file-size validation before sending | Upload |
| F2 | Processing state — button locked, no double submissions | Upload |
| F3 | Result view — all 7 extracted fields + file link + colored urgency badge | Upload |
| F4 | Dashboard — every processed document, newest first | Dashboard |
| F5 | Search & filters — free text + urgency/type/department/status | Dashboard |
| F6 | Document detail + human review ("Mark as reviewed" with a note) | Document detail |
| F7 | Readable error states for every failure mode (see table below) | all screens |
| F8 | All configuration (URLs, secret, size limit) comes from `.env`, never hardcoded | — |

### Supported file types

`application/pdf`, `text/plain`, and `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`).

Anything else — including images and scanned documents — is rejected in the browser, before any request reaches n8n.

### Error handling

| `error_code` | When it happens | What the app shows |
|---|---|---|
| `UNSUPPORTED_FILE_TYPE` | MIME type isn't PDF, DOCX, or TXT | Inline message on the upload screen; nothing is sent |
| (client-side) | File is larger than `VITE_MAX_FILE_MB` | Inline message on the upload screen; nothing is sent |
| `EMPTY_DOCUMENT` | Text extraction found nothing (e.g. a scanned image) | Explains there's no readable text, suggests another file |
| `EXTRACTION_FAILED` | The AI step failed or returned unusable output | "Try again" button; the file stays in the form |
| `UNAUTHORIZED` | Missing or wrong shared secret | A configuration-problem message (not something the end user can fix) |
| (network/n8n down) | The workflow is deactivated or unreachable | A readable "can't reach the server" message; the app stays usable |

## Setup

```bash
git clone <this-repo-url>
cd smart-office-document-assistant
cp .env.example .env       # then fill in the real values below
npm install
npm run dev
```

### `.env` variables

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | Base n8n webhook URL, e.g. `https://<your-n8n-host>/webhook` |
| `VITE_API_KEY` | The shared secret sent as the `x-api-key` header on every request |
| `VITE_MAX_FILE_MB` | Largest file the upload screen will accept (default `10`) |

## Known limitations

- **The browser calls n8n directly.** Per the assignment's accepted (if lower-scoring) option, there is no small backend server in front of n8n — the shared secret and the webhook URL are visible to anyone who opens the browser's dev tools. This is only acceptable for a classroom demo with a low-value secret; a production version should put a small server (Express/FastAPI) between the browser and n8n so the secret never leaves that server.
- **The app has no database of its own.** The Google Sheet behind Workflow B is the single source of truth for the dashboard. If the sheet is unreachable, the dashboard is empty (not broken — just empty).
- **Node duplication across the three workflows.** Shared processing steps (file extraction, the Google Sheets append, etc.) are duplicated across Workflow A and the original Part 1 flow rather than factored into a sub-workflow. See `Reflection.md` for the maintenance-cost trade-off.

## Single run command

```bash
npm run dev
```

That's it — no build step, no database migration, no seed script.
