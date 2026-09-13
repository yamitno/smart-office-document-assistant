# CONTRACT — API Contract between React App and n8n

This document defines the HTTP "contract" (interface) between the frontend and the three n8n workflows. All endpoints require the header:

```
x-api-key: <secret value, stored in .env, never committed to git>
```

If the header is missing or wrong, n8n's Header Auth returns **`403 Forbidden`** with the plain-text body `Authorization data is wrong!` — confirmed by testing the real webhook Sep 12 (not `401`, as earlier drafts of this doc assumed; n8n's built-in Header Auth credential always responds with 403, not 401).

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
    "Review Note": "",
    "Calendar Reminder": "Yes",
    "Calendar Event Link": "https://www.google.com/calendar/event?eid=..."
  }
]
```

- **Error response:** `403` if API key missing/wrong (see note above); `500` if Google Sheets read fails.

- **Note for the React side:** because the field names contain spaces (`"File Name"`, not `fileName`), the frontend must access them with bracket notation, e.g. `doc["File Name"]`, not `doc.File Name`. Consider mapping these to clean camelCase names in one place (e.g. `src/api/client.js`) right after fetching, so the rest of the React components can use nice names like `doc.fileName` — this keeps the "ugly" sheet-column names isolated to a single mapping function.

---

## 2. Workflow A — Process Document

- **Method / Path:** `POST /process-document`
- **Production URL:** `https://alexkuznetsov.app.n8n.cloud/webhook/yamit-process-document` ✅ *(confirmed active — tested Sep 12)*
- **Request body:** JSON (NOT multipart/form-data) with exactly 3 fields, confirmed by testing the live webhook:

```json
{ "file_base64": "<base64-encoded file content>", "file_name": "invoice.txt", "mime_type": "text/plain" }
```

  `mime_type` determines routing inside the workflow: `application/pdf` → PDF extraction branch, `text/plain` → plain text branch, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`) → Word extraction branch, anything else (images/scans included — `.png`, `.jpg`, `.gif`, `.tiff`, etc. are deliberately **not** supported) → "unsupported format" branch, which merges into the same AI-extraction step and returns a `200 OK` with empty/"Not found" fields rather than a real error (see Finding 1 in the F7 work) — the frontend guards against this client-side by only ever sending PDF, DOCX, or plain text. `file_name` and `mime_type` are both required (the workflow's "Convert Base64 to File" node and its file-type Switch both read them) — don't omit them even though they weren't in the original plan.
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
  "Calendar Reminder": "No",
  "Calendar Event Link": "",
  "Review Note": ""
}
```

- **Error response:** `400` if no file sent; `403` if API key missing/wrong (see note above); `500` if AI/Sheets step fails.
- **Important:** both branches of the "Is it urgent?" IF node in this workflow must lead to a `Respond to Webhook` node, otherwise one branch will time out with no response (see assignment pitfalls).

### 2.1 Calendar reminder feature (added Sep 13)

When a processed document has **both** a real deadline (`Deadline` is not `"Not found"`) **and** `Urgency` is `High` or `Medium`, Workflow A now creates a real Google Calendar event (1-hour block starting at the processing time, on the primary calendar) as a reminder to act on the document, in addition to the existing Gmail notification. Two new fields are written to every row (both existing and new documents get them via Workflow B's passthrough):

- **`Calendar Reminder`** — `"Yes"` if an event was created, `"No"` otherwise.
- **`Calendar Event Link`** — the real `htmlLink` of the created Google Calendar event (a clickable URL), or an empty string when no event was created.

Routing: an `If` node checks `Deadline != "Not found" AND (Urgency == "High" OR Urgency == "Medium")`. The **true** branch creates the calendar event (Google Calendar node, "Create" operation) and then sets `Calendar Reminder = "Yes"` / `Calendar Event Link = {{ $json.htmlLink }}` on an `Edit Fields` node before the Google Sheets append. The **false** branch skips straight to a second `Edit Fields1` node that sets `Calendar Reminder = "No"` / `Calendar Event Link = ""` (Fixed values) with "Include Other Input Fields" = All, so the rest of the row's fields pass through unchanged. Both branches converge into the same "Google Sheets - Append Row" node.

- **Bugs found + fixed during implementation (Sep 13):**
  1. **If node true/false outputs wired backwards** — the true branch was connected to the "no calendar" path and vice versa. Diagnosed via the If node's own Execution output panel (separate True Branch / False Branch tabs), which is more reliable than tracing overlapping connection lines on the canvas. Fixed by deleting and redrawing both connections.
  2. **Missing `{{ }}` expression wrapper** — every field in the "Edit Fields" node (Document ID, Received At, ... including the new Calendar Event Link) was typed as a bare expression like `$('Set - Build Fields & Response').item.json['Document ID']`, **without** the surrounding `{{ }}`. n8n only evaluates JavaScript inside `{{ }}` — a bare expression in an Expression-mode field is stored/returned as a literal string. Confirmed by the field's "Result" preview echoing the raw text back instead of evaluating. Fixed by re-entering every field with the `{{ ... }}` wrapper (n8n auto-closes the trailing `}}` when you type the opening `{{`, so typing the extra closing brace yourself doubles it — worth knowing if this happens again).
  3. **Google Sheets node's two new columns silently in Fixed mode** — `Calendar Reminder` and `Calendar Event Link` on the "Google Sheets - Append Row" node *displayed* `{{ $json["Calendar Reminder"] }}` and looked identical to the working expression fields, but were actually still in **Fixed** mode (no small `fx` icon to the left of the field, unlike the genuinely-expression fields next to them), so the literal text `{{ $json["Calendar Reminder"] }}` was written into the sheet instead of the evaluated value. Fixed by explicitly clicking the field's "Fixed" tab and then "Expression" tab to force the mode switch (the `fx` icon appearing confirms it stuck), rather than just clicking into the field (which shows the Fixed/Expression toggle regardless of which mode is actually active).
  - **Lesson:** when an n8n text field shows `{{ }}` syntax, that alone does not prove it will be evaluated — always check for the small `fx` icon (or the "Result" preview under a focused field) before trusting the display.
  - Verified end-to-end (Sep 13) with two real webhook calls: a High-urgency document with a real deadline produced a real Google Calendar event and `Calendar Reminder = "Yes"` with a working event link in the sheet; a Low-urgency document with no deadline produced `Calendar Reminder = "No"` and an empty link, with no calendar event created.

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

- **Error response:** `404` with `{ "status": "error", "error_code": "NOT_FOUND", "message": "No document_id in request body" }` if `document_id` is missing; `403` if API key missing/wrong (see note above).

---

## 4. Shared conventions

- Dates in the sheet appear either as ISO timestamps (`Received At`) or as free text (`Deadline`, e.g. "August 6, 2026") — the frontend should treat `Deadline` as display text, not parse it as a strict date, unless the workflow is changed to standardize it.
- All responses are JSON, `Content-Type: application/json`.
- `Status` values seen so far: `Processed`, `Needs Review` — the dashboard's status filter/badges should be based on these exact strings.
- `Urgency` values seen so far: `High`, `Medium`, `Low`, `Not found`.
- `Calendar Reminder` values: `Yes`, `No` (see section 2.1). `Calendar Event Link` is either a real Google Calendar URL or an empty string — the frontend should only render it as a link when non-empty.
- CORS: each Webhook node's "Allowed Origins" is set to `http://localhost:5173` (the Vite dev server) during development; must be updated to the deployed URL before final submission if the app is hosted anywhere.

- ℹ️ **This sheet is also written to by the original Part 1 workflow — by design, per the assignment.** There is an older workflow, "Smart Office Document Assistant" (built in Part 1, **Published/Active**, and it must stay that way): it's triggered by a **Google Drive Trigger polling every minute** for new files created in a specific Drive folder, runs its own PDF/text extraction → AI extraction, and **appends a new row to this exact same "Document Processing Log" spreadsheet** (confirmed by checking its Google Sheets node — same spreadsheet ID), then sends its own urgency-based Gmail alert and moves the file in Drive. This is **not** a leftover to clean up or disable — the master assignment doc explicitly requires it: "The Google Drive trigger from Part 1 must keep working" (section 4), one of the graded Required Tests (section 11) is "Both entry points — a file dropped into the Drive folder (Part 1) and a file sent from the application both appear in the same dashboard," and the Final Submission Checklist (section 16) and Minimum Success Criteria both explicitly require the Part 1 Drive trigger to still be running at submission time. Workflow A does not replace this workflow — it is a **second, parallel entry point** into the same pipeline/sheet, built for on-demand use from the app, while the Drive-folder path keeps working for anyone who prefers to just drop a file in Drive. The assignment's suggested (optional) clean architecture is to factor the shared processing steps into one sub-workflow called by both entry points via "Execute Sub-workflow" — we instead duplicated the logic into a separate workflow (Workflow A), which the assignment explicitly says is "acceptable, but students must then explain the maintenance cost in their reflection" — the trade-off is written up in `Reflection.md` (paragraph 4, "Maintenance cost of duplicating the n8n workflow nodes").

  **✅ "Both entry points" test — verified (Sep 13).** A file (`07_both_entry_points_test.txt`) was dropped directly into the Part 1 Drive folder ("Incoming Documents"), was picked up by the Part 1 Drive-trigger workflow (not Workflow A), processed, and moved to "Processed Documents" — it appears as row 37 in this exact "Document Processing Log" sheet (sender "Noa Peretz", IT Support request), with no `document_id`/exec-id in column M, which is the expected fingerprint of the Part 1 path (Workflow A always writes an `exec-...` id there). On refreshing the app's Dashboard, this row is visible alongside documents submitted through the app (which do carry an `exec-...` id in the same column) — confirming both entry points write to, and are both readable from, the same sheet/dashboard. Evidence: the processed file in Google Drive's "Processed Documents" folder, sheet row 37, and screenshot `צילום מסך 2026-09-13 144815.png`.
