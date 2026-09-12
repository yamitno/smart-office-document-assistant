import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getDocuments } from '../api/client.js'
import './DocumentDetail.css'

const FIELDS = [
  ['File Name', 'שם קובץ'],
  ['Document Type', 'סוג מסמך'],
  ['Sender / Company', 'שולח / חברה'],
  ['Received At', 'התקבל בתאריך'],
  ['Deadline', 'מועד אחרון'],
  ['Urgency', 'דחיפות'],
  ['Department', 'מחלקה'],
  ['Status', 'סטטוס'],
  ['Requested Action', 'פעולה נדרשת'],
  ['Summary', 'תקציר'],
  ['Reviewed By', 'נבדק על ידי'],
  ['Review Note', 'הערת ביקורת'],
]

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const documents = useMemo(() => getDocuments(), [])
  const doc = documents[Number(id)]

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
        {FIELDS.map(([key, label]) => (
          <div className="detail-row" key={key}>
            <dt>{label}</dt>
            <dd>{doc[key] || '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="review-action">
        <button className="review-button" disabled title="Will connect to Workflow C later.">
          סמן כנבדק
        </button>
      </div>
    </div>
  )
}
