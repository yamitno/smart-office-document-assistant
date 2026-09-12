# Reflection — Smart Office Document Assistant, Part 2

**What the application adds that n8n alone could not provide.**

n8n's editor is a developer tool: seeing what happened to a document meant opening the execution log, the Google Sheet, or waiting for an email. The application gives a non-technical office worker a front door — drag in a file, watch a real "processing…" state, read the seven extracted business fields the moment they're ready, and search across everything that's ever been processed, regardless of whether it arrived through the app or through the original Google Drive folder. None of that required touching the underlying logic; it only required exposing what n8n already knew through three small HTTP endpoints.

**What still requires a human.**

Deciding whether "urgent" was assigned correctly, whether a summary is actually accurate, and whether a document has genuinely been dealt with are all judgment calls the AI extraction can approximate but not own. The "Mark as reviewed" action exists specifically because the log needs a human signature before anyone downstream trusts that a document was handled — the app surfaces that decision point, but the decision itself stays human.

**What would break first at a thousand documents a day.**

The Google Sheet. It is a fine source of truth for a demo or a small office, but a single spreadsheet has no indexing, no concurrent-write guarantees, and a hard row limit — `GET /documents` would get slower with every row, and two review actions landing at the same moment could clobber each other. The AI extraction step would be the second bottleneck: at that volume, a 20-60 second per-document processing time means a real queue is needed, not a synchronous webhook response.

**Maintenance cost of duplicating the n8n workflow nodes.**

Rather than factoring the shared processing steps (file extraction, the AI information extractor, the Google Sheets append, the urgency-based Gmail branch) into one sub-workflow called from both the original Drive trigger and the new `/process-document` webhook, this project kept them duplicated across the two flows — the pragmatic choice for a two-week, 1-2 person project, but a real cost: any future change to the extraction prompt, the field list, or the notification logic has to be made twice and can silently drift out of sync between the two entry points. In a longer-lived version of this project, that duplication is the first thing that should be refactored into a shared sub-workflow, even though it adds one more moving piece to reason about.

**One thing to build differently next time.**

Add a tiny backend server (a few lines of Express or FastAPI) between the browser and n8n from the very start, instead of having the browser call n8n's webhook directly. It would have removed the CORS configuration entirely, kept the shared secret out of the browser's network tab, and made switching to a real authentication scheme later a non-event instead of a rewrite.
