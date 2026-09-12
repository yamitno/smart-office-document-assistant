import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { processDocument } from '../api/client.js'
import UrgencyBadge from './UrgencyBadge.jsx'
import { translateDocumentType, translateDepartment } from '../utils/labels.js'
import './Upload.css'

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function isAcceptedFile(file) {
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return true
  // Some browsers/OS report .docx as application/octet-stream (or blank) —
  // fall back to the extension for that one case.
  return file.name.toLowerCase().endsWith('.docx')
}

const MAX_FILE_MB = Number(import.meta.env.VITE_MAX_FILE_MB) || 10
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

export default function Upload() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  function handleFiles(fileList) {
    if (fileList && fileList.length > 0) {
      const selected = fileList[0]
      if (!isAcceptedFile(selected)) {
        setFile(null)
        setResult(null)
        setError('סוג הקובץ אינו נתמך. ניתן להעלות קובצי PDF, Word (.docx) או טקסט (.txt) בלבד.')
        return
      }
      if (selected.size > MAX_FILE_BYTES) {
        setFile(null)
        setResult(null)
        setError(`הקובץ גדול מדי. הגודל המקסימלי המותר הוא ${MAX_FILE_MB}MB.`)
        return
      }
      setFile(selected)
      setResult(null)
      setError(null)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  async function handleSend() {
    if (!file) return
    setIsUploading(true)
    setError(null)
    setResult(null)
    try {
      const doc = await processDocument(file)
      setResult(doc)
    } catch (err) {
      setError(err.message || 'אירעה שגיאה בעיבוד המסמך.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="upload-page">
      <h1>העלאת מסמך</h1>

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <p className="file-name">{file.name}</p>
        ) : (
          <>
            <p>גררו קובץ לכאן, או לחצו לבחירה</p>
            <p className="drop-hint">PDF, Word (.docx), TXT</p>
          </>
        )}
      </div>

      <button className="send-button" onClick={handleSend} disabled={!file || isUploading}>
        שליחה
      </button>

      {isUploading && (
        <p className="placeholder-note">
          מעבד את המסמך... (זה יכול לקחת עד 15 שניות)
        </p>
      )}

      {error && <p className="error-banner">{error}</p>}

      {result && (
        <div className="result-card">
          <h2>המסמך עובד בהצלחה</h2>
          <div className="result-row">
            <span className="result-label">סוג מסמך</span>
            <span>{translateDocumentType(result.fields?.document_type)}</span>
          </div>
          <div className="result-row">
            <span className="result-label">שולח / חברה</span>
            <span>{result.fields?.sender_or_company}</span>
          </div>
          <div className="result-row">
            <span className="result-label">תקציר</span>
            <span>{result.fields?.summary}</span>
          </div>
          <div className="result-row">
            <span className="result-label">דחיפות</span>
            <UrgencyBadge value={result.fields?.urgency} />
          </div>
          <div className="result-row">
            <span className="result-label">מועד אחרון</span>
            <span>{result.fields?.deadline}</span>
          </div>
          <div className="result-row">
            <span className="result-label">מחלקה</span>
            <span>{translateDepartment(result.fields?.department)}</span>
          </div>
          {result.file_link && (
            <a
              className="file-link"
              href={result.file_link}
              target="_blank"
              rel="noreferrer"
            >
              פתיחת הקובץ ב-Google Drive
            </a>
          )}
          <Link className="back-to-dashboard" to="/">
            חזרה ללוח הבקרה
          </Link>
        </div>
      )}
    </div>
  )
}
