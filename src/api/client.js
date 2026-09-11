import { getMockDocuments } from "./mock.js";

// TODO: swap this for a real fetch to Workflow B (GET /documents) once
// Workflow A/C are ready — see 00_PART2_CHECKLIST.md.
export function getDocuments() {
  return getMockDocuments();
}
