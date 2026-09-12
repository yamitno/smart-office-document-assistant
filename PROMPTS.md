# PROMPTS.md

Prompts that mattered during the build of Part 2, with what came back and what had to be corrected. Entries are in the order they happened. Earlier milestones (M0–M4: scaffolding with a mock API, Workflow B connection, initial upload flow) predate this log — see the note at the bottom for how to fill those in from the Claude Code chat history.

---

## 1. Fix the result-field mapping bug in Upload.jsx (M5)

**Prompt (paraphrased from the session where this was found):**
> The result card on the Upload screen isn't showing the extracted fields correctly — some fields that Workflow A returns aren't rendering, or are mapped to the wrong keys. Compare the real webhook response shape against what Upload.jsx reads and fix the mismatch.

**What came back:** Claude Code corrected the field-key mismatches in `Upload.jsx`'s result card so it reads from the correct nested `fields.*` path returned by Workflow A, matching CONTRACT.md.

**What had to be corrected:** Verified directly against the real webhook response (not just the mock) before accepting the fix, since the mock and the real shape had drifted slightly.

---

## 2. Build "Mark as Reviewed" (M6 / F6)

**Prompt (sent in English, full text preserved from this session):**
> Build F6 (Mark as Reviewed) end-to-end: in `DocumentDetail.jsx`, when a document has no `Reviewed By` yet, show an input for the reviewer's name, an optional note textarea, and a "Mark as reviewed" button that calls `reviewDocument(rowNumber, reviewedBy, reviewNote)` from `src/api/client.js` (add this function if it doesn't exist — it should POST to the review endpoint per CONTRACT.md section 3, using the document's `row_number` as `document_id`, not the sheet's mostly-empty `Document ID` column). On success, refresh the document list so the new `Reviewed By` / `Review Note` show immediately. If a document already has `Reviewed By` set, show that info instead of the form. Also fix a routing bug: `Dashboard.jsx` currently builds links and looks up documents by array *index*, which breaks when the list is filtered — switch both the link (`/document/${doc.row_number}`) and the lookup (`documents.find(d => d.row_number === Number(id))`) to use the stable `row_number` field instead. Test with Playwright against the real dev server, not just a code review.

**What came back:** Fully correct implementation on the first pass — `reviewDocument` added to `client.js`, the review form and "already reviewed" state built correctly in `DocumentDetail.jsx`, matching CSS added, and the `row_number`-based routing fix applied to `Dashboard.jsx`. Verified independently by reading the actual files (not just trusting the chat summary) — no corrections were needed.

**What had to be corrected:** Nothing in the code. On the n8n side, testing this feature against the real webhook surfaced three real bugs in Workflow C (body-nesting on the IF and Update Row nodes, wrong matching column, and an IF-node strict-type error) — all fixed in n8n, documented in CONTRACT.md, not in the application code.

---

## 3. Close out F7 — error and empty states

**Prompt (sent in English, full text preserved from this session):**
> Close out F7 (all error cases shown as a readable message: 405/500, timeout, n8n down, unsupported file). I tested the real webhooks directly and found two real gaps — fix both, plus verify what already works.
>
> Finding 1: sending an unsupported file type (e.g. .zip, .docx) to Workflow A doesn't actually return an error — it silently returns a 200 with every field as "Not found", because n8n's "unsupported format" branch merges into the same AI-extraction path as PDF/text. Fix: add a client-side guard in `Upload.jsx` that only accepts `application/pdf` and `text/plain`, rejecting anything else immediately with a Hebrew message and never calling the API.
>
> Finding 2: `client.js` has no fetch timeout and no handling for the fetch call itself throwing (network down, DNS failure). Fix: add a shared `fetchWithTimeout` helper (AbortController, 20s default) used by all three API functions, translating a timeout or a failed fetch into a friendly Hebrew message instead of a raw browser error.
>
> [Full technical spec of both fixes, plus a required Playwright test plan against the real dev server, including temporarily pointing `VITE_API_BASE_URL` at an unreachable host and confirming the friendly message appears.]

**What came back:** Both fixes implemented correctly — `Upload.jsx` now validates file type before ever calling the API (checked and updated the drop-zone hint text too), and `client.js` got the `fetchWithTimeout` helper plus a generalized, context-aware `readErrorMessage`. Verified directly in the files.

**What had to be corrected:** Nothing — verified clean on inspection of the actual code (not just the chat summary), matching the spec exactly.

---

## 4. Follow-up: fix the 401 vs 403 auth-error mismatch

**Prompt (sent in English, full text preserved from this session):**
> Small follow-up to F7. You flagged (correctly) that the real webhook returns 403, not 401, on a bad API key — CONTRACT.md previously said 401, which was wrong; I've now corrected CONTRACT.md to document 403 (confirmed by testing the real webhook directly).
>
> Fix `src/api/client.js` to match reality: in all three functions (`getDocuments`, `processDocument`, `reviewDocument`), change the auth-error check from `response.status === 401` to `response.status === 403`. Leave everything else unchanged.
>
> Also, while you're in there: `getDocuments`'s non-auth error path currently throws an English message instead of routing through `readErrorMessage` like the other two functions do — fix that for consistency, so a real 500 also shows a Hebrew message.

**What came back:** All three functions corrected to check `403`, and `getDocuments`'s error path routed through `readErrorMessage(response, "לטעון את המסמכים")`. Verified directly in the file.

**What had to be corrected:** Nothing — this fix was itself a correction of a bug that surfaced from testing the real webhook directly (Claude Code's own Playwright test against the real dev server caught that the app's 401-check never actually fires against this n8n instance, since n8n's Header Auth returns 403).

---

## 5. Add an arrival-date column to the dashboard

**Prompt (sent in English, full text preserved from this session):**
> Add an arrival-date column to the dashboard table. `Received At` is already returned by Workflow B on every document (it's already shown on the detail page), it's just missing from the Dashboard table itself.
>
> In `src/components/Dashboard.jsx`: add a new `<th>` "התקבל בתאריך" to the table header, and a matching `<td>` that displays `doc['Received At']` formatted as a readable date/time (not the raw ISO string) via a small `formatDate()` helper, falling back to "—" for missing/unparseable values. Keep the existing sort/filter logic untouched — this is display-only.

**What came back:** Correct on the first pass — new column added between "שם קובץ" and "סוג מסמך", with a `formatDate()` helper that safely falls back to "—". Verified directly in the file.

**What had to be corrected:** Nothing.

---

## 6. Initial scaffolding — 3 components with mock data (M2)

**Prompt (copied from the Claude Code session history, via screenshot):**
> Build 3 basic React components using mock data from src/api/client.js, with a modern design, blue (#2563eb or similar) as the primary accent color, and full RTL support.

**What came back:** Claude Code scaffolded the initial component set (dashboard-style list, detail view, upload form) wired to a mock data layer instead of the real webhooks, with global RTL styling and the blue accent color applied throughout. Committed as `d7d8849`.

**What had to be corrected:** Not at the time — this prompt predates the review process used later in the build. The routing in the resulting `Dashboard.jsx` used array *index* instead of a stable id, a bug that only surfaced once real, filterable data was connected in M6 and was fixed then (see prompt #2 above, the `row_number`-based routing fix).

---

## 7. Design pass + Hebrew localization (M3)

**Prompt (copied from the Claude Code session history, via screenshot):**
> Two design updates: 1. Add a subtle light blue background... 2. Add a small translation mapping (src/utils/labels.js)...
>
> [full mapping of the sheet's English field values — status, document type, department, etc. — to their Hebrew display labels]

**What came back:** Claude Code added the light-blue background styling and created `src/utils/labels.js` with `translateStatus` / `translateDocumentType` / `translateDepartment` helper functions, then wired them into the relevant components so the UI shows Hebrew labels for values that arrive from the sheet in English.

**What had to be corrected:** Two follow-up notes were given after reviewing the first pass: the background color came out too pale/washed out and needed to be more visible, and a few fields were still showing raw English values because they hadn't been routed through the new translation helpers yet. Both were fixed in the same session, committed as `acbcd1c`.

---

## 8. Create `.env.example` (M1)

**Prompt (copied from the Claude Code session history, via screenshot):**
> [Prompt asking Claude Code to create a `.env.example` file documenting the required environment variables — `VITE_API_BASE_URL` and `VITE_API_KEY` — so the real `.env` with secrets never needs to be committed.]

**What came back:** `.env.example` created with both variables listed (placeholder values, not real secrets), matching what `src/api/client.js` actually reads via `import.meta.env`. Committed as `704f074`.

**What had to be corrected:** Nothing.
