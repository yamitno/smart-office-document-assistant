import { translateUrgency } from '../utils/labels.js'

const URGENCY_CLASS = {
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
}

export default function UrgencyBadge({ value }) {
  const className = URGENCY_CLASS[value] || 'badge-neutral'
  return <span className={`badge ${className}`}>{translateUrgency(value) || 'לא ידוע'}</span>
}
