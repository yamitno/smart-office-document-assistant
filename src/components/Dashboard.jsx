import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments.js'
import {
  translateUrgency,
  translateStatus,
  translateDocumentType,
  translateDepartment,
} from '../utils/labels.js'
import './Dashboard.css'

const URGENCY_CLASS = {
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
}

function UrgencyBadge({ value }) {
  const className = URGENCY_CLASS[value] || 'badge-neutral'
  return <span className={`badge ${className}`}>{translateUrgency(value) || 'לא ידוע'}</span>
}

function StatusBadge({ value }) {
  const isProcessed = value === 'Processed'
  return (
    <span className={`badge ${isProcessed ? 'badge-processed' : 'badge-review'}`}>
      {translateStatus(value)}
    </span>
  )
}

export default function Dashboard() {
  const { documents, loading, error, refresh } = useDocuments()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const navigate = useNavigate()

  const statuses = useMemo(
    () => Array.from(new Set(documents.map((doc) => doc['Status']))),
    [documents],
  )

  const filtered = documents.filter((doc) => {
    const matchesSearch = doc['File Name']
      ?.toLowerCase()
      .includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || doc['Status'] === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>לוח בקרה - מסמכים</h1>
        <button className="refresh-button" onClick={refresh} disabled={loading}>
          {loading ? 'טוען...' : 'רענון'}
        </button>
      </div>

      <div className="dashboard-controls">
        <input
          type="text"
          className="search-input"
          placeholder="חיפוש לפי שם קובץ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">כל הסטטוסים</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {translateStatus(status)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <div className="table-wrapper">
        <table className="doc-table">
          <thead>
            <tr>
              <th>שם קובץ</th>
              <th>סוג מסמך</th>
              <th>דחיפות</th>
              <th>סטטוס</th>
              <th>מחלקה</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc, index) => (
              <tr
                key={index}
                className="doc-row"
                onClick={() => navigate(`/document/${index}`)}
              >
                <td>{doc['File Name']}</td>
                <td>{translateDocumentType(doc['Document Type'])}</td>
                <td>
                  <UrgencyBadge value={doc['Urgency']} />
                </td>
                <td>
                  <StatusBadge value={doc['Status']} />
                </td>
                <td>{translateDepartment(doc['Department'])}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">
                  לא נמצאו מסמכים תואמים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
