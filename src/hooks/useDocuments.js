import { useCallback, useEffect, useState } from 'react'
import { getDocuments } from '../api/client.js'

export function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    getDocuments()
      .then((docs) => setDocuments(docs))
      .catch((err) => setError(err.message || 'שגיאה בטעינת המסמכים.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { documents, loading, error, refresh }
}
