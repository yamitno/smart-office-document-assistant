import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments.js'
import { reviewDocument } from '../api/client.js'
import {
  translateUrgency,
  translateStatus,
  translateDocumentType,
  translateDepartment,
} from '../utils/labels.js'
import './DocumentDetail.css'

const FIELDS = [
  ['File Name', 'שם קובץ', null],
  ['Document Type', 'סוג מסמך', translateDocumentType],
  ['Sender / Company', 'שולח / חברה', null],
  ['Received At', 'התקבל בתאריך', null],
  ['Deadline', 'מועד אחרון', null],
  ['Urgency', 'דחיפות', translateUrgency],
  ['Department', 'מחלקה', translateDepartment],
  ['Status', 'סטטוס', translateStatus],
  ['Requested Action', 'פעולה נדרשת', null],
  ['Summary', 'תקציר', null],
  ['Reviewed By', 'נבדק על ידי', null],
  ['Review Note', 'הערת ביקורת', null],
]

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { documents, loading, error, refresh } = useDocuments()
  const doc = documents.find((d) => d.row_number === Number(id))

  const [reviewedBy, setReviewedBy] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState(null)

  async function handleMarkReviewed() {
    if (!reviewedBy.trim()) return
    setIsSubmittingReview(true)
    setReviewError(null)
    try {
      await reviewDocument(doc.row_number, reviewedBy.trim(), reviewNote.trim())
      refresh()
    } catch (err) {
      setReviewError(err.message || 'אירעה שגיאה בסימון המסמך כנבדק.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="detail-page">
        <p>טוען...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="detail-page">
        <p className="error-banner">{error}</p>
        <Link to="/">חזרה ללוח הבקרה</Link>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="detail-page">
        <p>המסמך לא נמצא.</p>
        <Link to="/">חזרה ללוח הבקרה</Link>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <button className="back-link" onClick={() => navigate('/')}>
        ← חזרה ללוח הבקרה
      </button>

      <h1>{doc['File Name']}</h1>

      {doc['File Link'] && (
        <a
          className="file-link"
          href={doc['File Link']}
          target="_blank"
          rel="noreferrer"
        >
          פתיחת הקובץ המקורי
        </a>
      )}

      <dl className="detail-fields">
        {FIELDS.map(([key, label, translate]) => (
          <div className="detail-row" key={key}>
            <dt>{label}</dt>
            <dd>{(translate ? translate(doc[key]) : doc[key]) || '—'}</dd>
          </div>
        ))}
      </dl>

      {doc['Reviewed By'] ? (
        <div className="review-done">
          <p>נבדק על ידי: {doc['Reviewed By']}</p>
          {doc['Review Note'] && <p>הערה: {doc['Review Note']}</p>}
        </div>
      ) : (
        <div className="review-action">
          {reviewError && <p className="error-banner">{reviewError}</p>}
          <input
            type="text"
            className="review-input"
            placeholder="נבדק על ידי"
            value={reviewedBy}
            onChange={(e) => setReviewedBy(e.target.value)}
          />
          <textarea
            className="review-input review-note"
            placeholder="הערת ביקורת (אופציונלי)"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
          <button
            className="review-button"
            onClick={handleMarkReviewed}
            disabled={!reviewedBy.trim() || isSubmittingReview}
          >
            {isSubmittingReview ? 'שולח...' : 'סמן כנבדק'}
          </button>
        </div>
      )}
    </div>
  )
}
