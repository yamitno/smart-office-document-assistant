# CONTRACT — API Contract between React App and n8n

This document defines the HTTP "contract" (interface) between the frontend and the three n8n workflows. All endpoints require the header:

```
x-api-key: <secret value, stored in .env, never committed to git>
```

If the header is missing or wrong, n8n returns `401 Unauthorized`.

> Field names below are taken directly from the real Google Sheet ("Document Processing Log") columns, since Workflow B has no renaming step — the Google Sheets node's output keys are exactly the sheet's column headers, including spaces.

---

## 1. Workflow B — List Documents

- **Method / Path:** `GET /documents`
- **Production URL:** `https://alexkuznetsov.app.n8n.cloud/webhook/yamit-documents`
- **Request body:** none
- **Success response:** `200 OK`, JSON array, one object per document row, e.g.:

```json
[
  {
    "Received At": "2026-08-05T20:34:09.000Z",
    "File Name": "01_invoice_042.pdf",
    "File Link": "https://drive.google.com/...",
    "Document Type": "invoice",
    "Sender / Company": "Nordic Office Supplies",
    "Summary": "This invoice from Nordic Office Supplies...",
    "Requested Action": "Payment is due",
    "Deadline": "August 6, 2026",
    "Urgency": "High",
    "Department": "Finance",
    "Status": "Processed",
    "output": "",
    "Document ID": "",
    "Reviewed By": "",
    "Review Note": ""
  }
]
```

- **Error response:** `401` if API key missing/wrong; `500` if Google Sheets read fails.

- **Note for the React side:** because the field names contain spaces (`"File Name"`, not `fileName`), the frontend must access them with bracket notation, e.g. `doc["File Name"]`, not `doc.File Name`. Consider mapping these to clean camelCase names in one place (e.g. `src/api/client.js`) right after fetching, so the rest of the React components can use nice names like `doc.fileName` — this keeps the "ugly" sheet-column names isolated to a single mapping function.

---

## 2. Workflow A — Process Document

- **Method / Path:** `POST /process-document`
- **Production URL:** `https://alexkuznetsov.app.n8n.cloud/webhook/yamit-process-document` ✅ *(confirmed active — tested Sep 12)*
- **Request body:** JSON (NOT multipart/form-data) with exactly 3 fields, confirmed by testing the live webhook:

```json
{ "file_base64": "<base64-encoded file content>", "file_name": "invoice.txt", "mime_type": "text/plain" }
```

  `mime_type` determines routing inside the workflow: `application/pdf` → PDF extraction branch, `text/plain` → plain text branch, anything else → "unsupported format" branch. `file_name` and `mime_type` are both required (the workflow's "Convert Base64 to File" node and its file-type Switch both read them) — don't omit them even though they weren't in the original plan.
- **Workflow bugs found + fixed (Sep 12) — Workflow A now confirmed fully working end-to-end:**
  1. The Webhook node nests the incoming JSON body under a `body` key (n8n's default behavior — the item looks like `{ headers, params, query, body }`), but the "Convert Base64 to File" node was reading fields from the top level (`$json.file_base64` instead of `$json.body.file_base64`). Fixed by pointing that node's 3 fields at `$json.body.*`.
  2. After "Convert Base64 to File" runs, `$json` becomes **empty** — the node moves everything into a binary property (named `data`) and does not preserve the other JSON fields. So the "Route by File Type" Switch node (which runs right after) can't read `$json.body.mime_type` either — it has to read the file's own binary metadata instead: **`{{ $binary.data.mimeType }}`**. Fixed both routing rules (PDF / text) to use that.
  3. The OpenAI credential ("OpenAI account 22") had an invalid API key — worked around by switching the AI model node to **Ollama** instead.
  - After all 3 fixes, a real text file was sent end-to-end and correctly produced: AI-extracted fields (document type, sender, summary, requested action, deadline, urgency, department), a Google Drive upload, a Sheets row, and an urgency-based Gmail notification. Confirmed working Sep 12.
- **Lesson for Workflow C / any future node:** anything reading the raw webhook request body needs `$json.body.*`; anything reading the uploaded file's type/name after it's been converted to binary needs `$binary.data.mimeType` / `$binary.data.fileName`, not `$json`.
- **Success response:** `200 OK`, JSON object describing the newly processed document, same shape as one item above (a new row):

```json
{
  "Received At": "2026-08-13T10:00:00.000Z",
  "File Name": "new_upload.pdf",
  "File Link": "https://drive.google.com/...",
  "Document Type": "contract",
  "Sender / Company": "Some Vendor",
  "Summary": "...",
  "Requested Action": "...",
  "Deadline": "...",
  "Urgency": "Medium",
  "Department": "General",
  "Status": "Needs Review",
  "output": "",
  "Document ID": "",
  "Reviewed By": "",
  "Review Note": ""
}
```

- **Error response:** `400` if no file sent; `401` if API key missing/wrong; `500` if AI/Sheets step fails.
- **Important:** both branches of the "Is it urgent?" IF node in this workflow must lead to a `Respond to Webhook` node, otherwise one branch will time out with no response (see assignment pitfalls).

---

## 3. Workflow C — Mark Reviewed

- **Method / Path:** `POST /review`
- **Production URL:** `https://alexkuznetsov.app.n8n.cloud/webhook/yamit-review` ✅ *(confirmed fully working end-to-end — tested Sep 12)*
- **Request body:**

```json
{ "document_id": 23, "Reviewed By": "yamit", "Review Note": "Looks good, approved." }
```

  ⚠️ **`document_id` is the row's `row_number`** (a number), returned by Workflow B (`GET /documents`) as the `row_number` field on every document — NOT the sheet's `Document ID` column. n8n's Google Sheets node adds `row_number` automatically to every row it reads, so it's always present and always unique, unlike `Document ID` which is empty on most existing rows. The frontend must read `row_number` from the document object it already has (from the dashboard/detail view) and send it back as `document_id` when marking reviewed.

- **Workflow bugs found + fixed (Sep 12), same pattern as Workflow A:**
  1. Body-nesting: the IF node ("Has document_id") and the Google Sheets "Update Row" node were reading `$json.document_id` / `$json.reviewed_by` / `$json.review_note` — all missing the `body.` prefix required for webhook data. Fixed to `$json.body.document_id`, `$json.body['Reviewed By']`, `$json.body['Review Note']`.
  2. The Google Sheets "Update Row" node's matching column was set to `Document ID` (empty on almost all rows) — switched to `row_number`, which is always present.
  3. The IF node's "is not empty" condition was strict-typed as text; since `document_id` arrives as a JSON number, this threw a type error (`'23' is a number but expected a string`) once a real value was sent (it only "worked" before because the tested case was a genuinely missing field, which happens to look the same for both a real bug and a real 404). Fixed by enabling "Convert types when needed" on the IF node.
  - After all 3 fixes, tested via a real fetch: marking row 23 as reviewed set `Reviewed By` / `Review Note` correctly in the sheet, and the missing-`document_id` case still correctly returns 404.
  - **Side effect to know about:** the Update Row node also writes `document_id`'s value into the sheet's `Document ID` column (since that field was already mapped there before the fix). This means marking a document reviewed will overwrite any existing `Document ID` value (e.g. an `exec-...` id from Workflow A) with the plain row number. Harmless functionally since matching no longer depends on that column, but worth knowing if `Document ID` is used for anything else later.

- **Success response:** `200 OK`:

```json
{ "status": "updated", "document_id": 23 }
```

  (Note: this differs from the shape originally sketched in this doc — the real Respond-to-Webhook node returns this simpler object, not `{"Document ID", "Status", "Reviewed By"}`. Documented here to match reality.)

- **Error response:** `404` with `{ "status": "error", "error_code": "NOT_FOUND", "message": "No document_id in request body" }` if `document_id` is missing; `401` if API key missing/wrong.

---

## 4. Shared conventions

- Dates in the sheet appear either as ISO timestamps (`Received At`) or as free text (`Deadline`, e.g. "August 6, 2026") — the frontend should treat `Deadline` as display text, not parse it as a strict date, unless the workflow is changed to standardize it.
- All responses are JSON, `Content-Type: application/json`.
- `Status` values seen so far: `Processed`, `Needs Review` — the dashboard's status filter/badges should be based on these exact strings.
- `Urgency` values seen so far: `High`, `Medium`, `Low`, `Not found`.
- CORS: each Webhook node's "Allowed Origins" is set to `http://localhost:5173` (the Vite dev server) during development; must be updated to the deployed URL before final submission if the app is hosted anywhere.
