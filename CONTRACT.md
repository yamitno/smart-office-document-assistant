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
- **Production URL:** `https://alexkuznetsov.app.n8n.cloud/webhook/yamit-process-document` *(to be confirmed once imported)*
- **Request body:** the uploaded file (multipart/form-data, field name `file`) — or base64, depending on how the Webhook node is configured
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
- **Production URL:** `https://alexkuznetsov.app.n8n.cloud/webhook/yamit-review` *(to be confirmed once imported)*
- **Request body:**

```json
{ "Document ID": "<id of the row to update>", "Reviewed By": "yamit", "Review Note": "Looks good, approved." }
```

- **Success response:** `200 OK`:

```json
{ "Document ID": "<id>", "Status": "Processed", "Reviewed By": "yamit" }
```

- **Error response:** `404` if the row/id is not found; `401` if API key missing/wrong.

- **Note:** the sheet currently has a `Document ID` column that appears empty in existing rows. Before building Workflow C, confirm how a row will actually be identified/matched (by row number, by `File Name`, or by populating `Document ID` going forward) — this affects what the request body above must contain.

---

## 4. Shared conventions

- Dates in the sheet appear either as ISO timestamps (`Received At`) or as free text (`Deadline`, e.g. "August 6, 2026") — the frontend should treat `Deadline` as display text, not parse it as a strict date, unless the workflow is changed to standardize it.
- All responses are JSON, `Content-Type: application/json`.
- `Status` values seen so far: `Processed`, `Needs Review` — the dashboard's status filter/badges should be based on these exact strings.
- `Urgency` values seen so far: `High`, `Medium`, `Low`, `Not found`.
- CORS: each Webhook node's "Allowed Origins" is set to `http://localhost:5173` (the Vite dev server) during development; must be updated to the deployed URL before final submission if the app is hosted anywhere.
