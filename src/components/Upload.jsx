import { useRef, useState } from 'react'
import './Upload.css'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [sent, setSent] = useState(false)
  const inputRef = useRef(null)

  function handleFiles(fileList) {
    if (fileList && fileList.length > 0) {
      setFile(fileList[0])
      setSent(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleSend() {
    setSent(true)
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
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <p className="file-name">{file.name}</p>
        ) : (
          <>
            <p>גררו קובץ לכאן, או לחצו לבחירה</p>
            <p className="drop-hint">PDF, DOCX, XLSX...</p>
          </>
        )}
      </div>

      <button className="send-button" onClick={handleSend} disabled={!file}>
        שליחה
      </button>

      {sent && (
        <p className="placeholder-note">
          Upload will connect to Workflow A in a later milestone.
        </p>
      )}
    </div>
  )
}
