import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments.js'
import UrgencyBadge from './UrgencyBadge.jsx'
import {
  translateStatus,
  translateDocumentType,
  translateDepartment,
  translateCalendarReminder,
} from '../utils/labels.js'
import './Dashboard.css'

const URGENCY_RANK = { High: 3, Medium: 2, Low: 1 }

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ value }) {
  const isProcessed = value === 'Processed'
  return (
    <span className={`badge ${isProcessed ? 'badge-processed' : 'badge-review'}`}>
      {translateStatus(value)}
    </span>
  )
}

function CalendarReminderBadge({ value }) {
  const isYes = value === 'Yes'
  return (
    <span className={`badge ${isYes ? 'badge-processed' : 'badge-review'}`}>
      {translateCalendarReminder(value) || 'לא'}
    </span>
  )
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }) {
  const isActive = sortColumn === column
  return (
    <th className="sortable-th" onClick={() => onSort(column)}>
      {label}
      {isActive && (
        <span className="sort-arrow">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
      )}
    </th>
  )
}

export default function Dashboard() {
  const { documents, loading, error, refresh } = useDocuments()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
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

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered
    const dir = sortDirection === 'asc' ? 1 : -1

    const labelOf = {
      'File Name': (doc) => doc['File Name'] || '',
      'Document Type': (doc) => translateDocumentType(doc['Document Type']) || 'לא ידוע',
      Status: (doc) => translateStatus(doc['Status']) || '',
      Department: (doc) => translateDepartment(doc['Department']) || '',
      'Calendar Reminder': (doc) => translateCalendarReminder(doc['Calendar Reminder']) || 'לא',
    }

    return [...filtered].sort((a, b) => {
      if (sortColumn === 'Received At') {
        const da = new Date(a['Received At'])
        const db = new Date(b['Received At'])
        const va = Number.isNaN(da.getTime()) ? null : da.getTime()
        const vb = Number.isNaN(db.getTime()) ? null : db.getTime()
        if (va === null && vb === null) return 0
        if (va === null) return 1
        if (vb === null) return -1
        return (va - vb) * dir
      }

      if (sortColumn === 'Urgency') {
        const ra = URGENCY_RANK[a['Urgency']] || 0
        const rb = URGENCY_RANK[b['Urgency']] || 0
        return (ra - rb) * dir
      }

      const getLabel = labelOf[sortColumn]
      return getLabel(a).localeCompare(getLabel(b), 'he') * dir
    })
  }, [filtered, sortColumn, sortDirection])

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

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
              <SortableHeader label="שם קובץ" column="File Name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="התקבל בתאריך" column="Received At" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="סוג מסמך" column="Document Type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="דחיפות" column="Urgency" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="סטטוס" column="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="מחלקה" column="Department" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="נקבעה תזכורת ביומן" column="Calendar Reminder" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((doc) => (
              <tr
                key={doc.row_number}
                className="doc-row"
                onClick={() => navigate(`/document/${doc.row_number}`)}
              >
                <td>{doc['File Name']}</td>
                <td>{formatDate(doc['Received At'])}</td>
                <td>{translateDocumentType(doc['Document Type']) || 'לא ידוע'}</td>
                <td>
                  <UrgencyBadge value={doc['Urgency']} />
                </td>
                <td>
                  <StatusBadge value={doc['Status']} />
                </td>
                <td>{translateDepartment(doc['Department'])}</td>
                <td>
                  <CalendarReminderBadge value={doc['Calendar Reminder']} />
                </td>
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-row">
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
