import { getMockDocuments } from "./mock.js";

// See CONTRACT.md — base URL + per-workflow slug, e.g.
// https://alexkuznetsov.app.n8n.cloud/webhook/yamit-documents
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readErrorMessage(response, context) {
  try {
    const body = await response.json();
    return body.message || body.error || JSON.stringify(body);
  } catch {
    return `לא ניתן היה ${context} (קוד שגיאה ${response.status}).`;
  }
}

async function fetchWithTimeout(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("הבקשה ארכה זמן רב מדי. ודאי שהשרת (n8n) פעיל ונסי שוב.");
    }
    throw new Error("לא ניתן להתחבר לשרת. בדקי את החיבור לאינטרנט, ודאי שה-n8n פעיל, ונסי שוב.");
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getDocuments() {
  if (!API_BASE_URL || !API_KEY) {
    console.warn(
      "VITE_API_BASE_URL / VITE_API_KEY not set — falling back to mock documents. Copy .env.example to .env to use the real API.",
    );
    return getMockDocuments();
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/yamit-documents`, {
    headers: { "x-api-key": API_KEY },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Unauthorized — check VITE_API_KEY in .env.");
    }
    throw new Error(await readErrorMessage(response, "לטעון את המסמכים"));
  }

  return response.json();
}

// Sends the file to Workflow A for AI extraction (see CONTRACT.md section 2).
// The webhook expects raw JSON — not multipart/form-data — with the file
// content base64-encoded.
export async function processDocument(file) {
  if (!API_BASE_URL || !API_KEY) {
    throw new Error(
      "VITE_API_BASE_URL / VITE_API_KEY not set — copy .env.example to .env and fill in real values to upload documents.",
    );
  }

  const file_base64 = await fileToBase64(file);

  const response = await fetchWithTimeout(`${API_BASE_URL}/yamit-process-document`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_base64,
      file_name: file.name,
      mime_type: file.type,
    }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Unauthorized — check VITE_API_KEY in .env.");
    }
    throw new Error(await readErrorMessage(response, "לעבד את המסמך"));
  }

  return response.json();
}

// Marks a document reviewed via Workflow C (see CONTRACT.md section 3).
// rowNumber is the sheet's row_number, not the (mostly empty) "Document ID"
// column — Workflow B returns row_number on every document.
export async function reviewDocument(rowNumber, reviewedBy, reviewNote) {
  if (!API_BASE_URL || !API_KEY) {
    throw new Error(
      "VITE_API_BASE_URL / VITE_API_KEY not set — copy .env.example to .env and fill in real values to review documents.",
    );
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/yamit-review`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_id: rowNumber,
      "Reviewed By": reviewedBy,
      "Review Note": reviewNote,
    }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Unauthorized — check VITE_API_KEY in .env.");
    }
    throw new Error(await readErrorMessage(response, "לסמן את המסמך כנבדק"));
  }

  return response.json();
}
