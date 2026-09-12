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

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    return body.message || body.error || JSON.stringify(body);
  } catch {
    return `Failed to process document (status ${response.status}).`;
  }
}

// Workflow C (POST /review) is not wired up yet — see 00_PART2_CHECKLIST.md.
export async function getDocuments() {
  if (!API_BASE_URL || !API_KEY) {
    console.warn(
      "VITE_API_BASE_URL / VITE_API_KEY not set — falling back to mock documents. Copy .env.example to .env to use the real API.",
    );
    return getMockDocuments();
  }

  const response = await fetch(`${API_BASE_URL}/yamit-documents`, {
    headers: { "x-api-key": API_KEY },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized — check VITE_API_KEY in .env.");
    }
    throw new Error(`Failed to load documents (status ${response.status}).`);
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

  const response = await fetch(`${API_BASE_URL}/yamit-process-document`, {
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
    if (response.status === 401) {
      throw new Error("Unauthorized — check VITE_API_KEY in .env.");
    }
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}
