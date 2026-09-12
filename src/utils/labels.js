// Hebrew display labels for the English enum values coming from the sheet
// (see CONTRACT.md). Display only — never mutate the underlying data with
// these, and never send Hebrew values back to the API.

export const URGENCY_LABELS = {
  High: 'גבוה',
  Medium: 'בינוני',
  Low: 'נמוך',
  'Not found': 'לא נמצא',
}

export const STATUS_LABELS = {
  Processed: 'טופל',
  'Needs Review': 'ממתין לבדיקה',
}

export const DOCUMENT_TYPE_LABELS = {
  invoice: 'חשבונית',
  quote: 'הצעת מחיר',
  complaint: 'תלונה',
  report: 'דוח',
  request: 'בקשה',
}

export const DEPARTMENT_LABELS = {
  Finance: 'כספים',
  Sales: 'מכירות',
  Support: 'תמיכה',
  General: 'כללי',
  Procurement: 'רכש',
}

function translate(map, value) {
  if (!value) return value
  return map[value] || value
}

export const translateUrgency = (value) => translate(URGENCY_LABELS, value)
export const translateStatus = (value) => translate(STATUS_LABELS, value)
export const translateDocumentType = (value) => translate(DOCUMENT_TYPE_LABELS, value)
export const translateDepartment = (value) => translate(DEPARTMENT_LABELS, value)
