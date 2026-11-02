import { useEffect, useRef, useState } from 'react'
import { uploadEventPhotos } from '../../services/api.js'
import './PhotoUploader.css'

const MAX_MB = 15

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function PhotoUploader({ eventId, eventName, onUploadComplete }) {
  const fileInputRef = useRef(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadReport, setUploadReport] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      selectedItems.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [selectedItems])

  const appendFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return
    setUploadReport(null)
    setErrorMessage('')

    const incoming = Array.from(fileList).map((file) => {
      const isImageType =
        file.type.startsWith('image/') ||
        /\.(jpe?g|png|webp)$/i.test(file.name || '')
      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: isImageType ? URL.createObjectURL(file) : null,
      }
    })

    setSelectedItems((prev) => [...prev, ...incoming])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveItem = (id) => {
    setSelectedItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const handleClearAll = () => {
    selectedItems.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
    setSelectedItems([])
    setUploadReport(null)
    setErrorMessage('')
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploading) {
      setDragActive(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (uploading) return
    if (e.dataTransfer?.files?.length) {
      appendFiles(e.dataTransfer.files)
    }
  }

  const handleUpload = async () => {
    if (!eventId || selectedItems.length === 0 || uploading) return
    setUploading(true)
    setProgress(5)
    setErrorMessage('')
    setUploadReport(null)

    try {
      const files = selectedItems.map((item) => item.file)
      const result = await uploadEventPhotos(eventId, files, (pct) => {
        setProgress(pct)
      })

      setUploadReport({
        uploadedCount: result.uploaded_count || 0,
        failedCount: result.failed_count || 0,
        failed: result.failed || [],
      })

      // Clear successfully uploaded items
      selectedItems.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
      setSelectedItems([])

      if (typeof onUploadComplete === 'function') {
        onUploadComplete(result)
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload photographs.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="photo-uploader">
      <div className="photo-uploader__head">
        <div>
          <span className="photo-uploader__eyebrow">Batch Ingestion Engine</span>
          <h3>Upload Photographs to {eventName || 'Selected Event'}</h3>
        </div>
        <span className="photo-uploader__spec">
          Supported: JPG, JPEG, PNG, WebP &bull; Max {MAX_MB} MB / frame
        </span>
      </div>

      {/* Drag and Drop Area */}
      <div
        className={`photo-uploader__dropzone ${dragActive ? 'is-dragover' : ''} ${
          uploading ? 'is-disabled' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="photo-uploader__input"
          onChange={(e) => appendFiles(e.target.files)}
          disabled={uploading || !eventId}
        />

        <div className="photo-uploader__prompt">
          <div className="photo-uploader__icon" aria-hidden="true">
            &#8682;
          </div>
          <p className="photo-uploader__title">
            Drag &amp; drop high-resolution photographs here
          </p>
          <p className="photo-uploader__sub">
            Originals are archived intact while lightweight gallery thumbnails are generated
            automatically.
          </p>
          <button
            type="button"
            className="btn btn-outline photo-uploader__browse-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !eventId}
          >
            Browse Photograph Files
          </button>
        </div>
      </div>

      {/* Selected File Previews Before Upload */}
      {selectedItems.length > 0 && (
        <div className="photo-uploader__staging">
          <div className="photo-uploader__staging-bar">
            <span>
              <strong>{selectedItems.length}</strong> photograph
              {selectedItems.length === 1 ? '' : 's'} staged for upload
            </span>
            <div className="photo-uploader__staging-actions">
              <button
                type="button"
                className="photo-uploader__clear-btn"
                onClick={handleClearAll}
                disabled={uploading}
              >
                Clear Selection
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading
                  ? `Uploading (${progress}%)...`
                  : `Upload ${selectedItems.length} Photograph${
                      selectedItems.length === 1 ? '' : 's'
                    }`}
              </button>
            </div>
          </div>

          {uploading && (
            <div className="photo-uploader__progress-wrap" role="progressbar" aria-valuenow={progress}>
              <div className="photo-uploader__progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="photo-uploader__preview-grid">
            {selectedItems.map((item) => (
              <div key={item.id} className="photo-uploader__preview-item">
                <div className="photo-uploader__preview-thumb">
                  {item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.file.name} />
                  ) : (
                    <span className="photo-uploader__no-preview">FILE</span>
                  )}
                  <button
                    type="button"
                    className="photo-uploader__remove-btn"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={uploading}
                    aria-label={`Remove ${item.file.name}`}
                  >
                    &times;
                  </button>
                </div>
                <div className="photo-uploader__preview-meta">
                  <strong title={item.file.name}>{item.file.name}</strong>
                  <span>{formatBytes(item.file.size)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Results Report */}
      {errorMessage && (
        <div className="photo-uploader__alert photo-uploader__alert--error" role="alert">
          {errorMessage}
        </div>
      )}

      {uploadReport && (
        <div
          className={`photo-uploader__report ${
            uploadReport.failedCount > 0 ? 'has-failures' : 'is-success'
          }`}
          role="status"
        >
          <div className="photo-uploader__report-summary">
            <span>
              Uploaded: <strong>{uploadReport.uploadedCount}</strong> succeeded
            </span>
            <span>&bull;</span>
            <span>
              Failed: <strong>{uploadReport.failedCount}</strong> rejected
            </span>
            {uploadReport.uploadedCount > 0 && (
              <>
                <span>&bull;</span>
                <span style={{ color: 'var(--gold-light, #d4af37)', fontWeight: 500 }}>
                  ⚡ AI face indexing running automatically in background
                </span>
              </>
            )}
          </div>

          {uploadReport.failed.length > 0 && (
            <ul className="photo-uploader__failed-list">
              {uploadReport.failed.map((f, idx) => (
                <li key={`${f.filename}-${idx}`}>
                  <strong>{f.filename}:</strong> {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default PhotoUploader

