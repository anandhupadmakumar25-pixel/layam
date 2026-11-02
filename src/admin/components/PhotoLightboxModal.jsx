import { useEffect, useState } from 'react'
import { formatBytes } from './PhotoUploader.jsx'
import { formatUploadDate } from './PhotoGrid.jsx'
import { fetchPhotoSignedUrl } from '../../services/api.js'
import './PhotoLightboxModal.css'

function PhotoLightboxModal({ photo, onClose, onDelete }) {
  const [resolvedUrl, setResolvedUrl] = useState(photo?.image_url || photo?.thumbnail_url || '')
  const [loadError, setLoadError] = useState('')
  const [refreshingUrl, setRefreshingUrl] = useState(false)

  useEffect(() => {
    setResolvedUrl(photo?.image_url || photo?.thumbnail_url || '')
    setLoadError('')
  }, [photo])

  if (!photo) return null

  const handleRenewSignedUrl = async () => {
    if (refreshingUrl) return
    setRefreshingUrl(true)
    setLoadError('')
    try {
      const data = await fetchPhotoSignedUrl(photo.id, 'original')
      if (data?.signed_url) {
        setResolvedUrl(data.signed_url)
      }
    } catch (err) {
      setLoadError(
        err.message || 'Unable to generate a fresh signed URL from the storage backend.'
      )
    } finally {
      setRefreshingUrl(false)
    }
  }

  return (
    <div
      className="photo-lightbox-modal"
      role="dialog"
      aria-modal="true"
      aria-label={photo.original_filename}
    >
      <div className="photo-lightbox-modal__backdrop" onClick={onClose} />
      <div className="photo-lightbox-modal__dialog">
        <div className="photo-lightbox-modal__header">
          <div>
            <span className="photo-lightbox-modal__eyebrow">
              {photo.event_name || `Event #${photo.event}`} &bull; Private Signed Master Frame
            </span>
            <h3 className="photo-lightbox-modal__title">{photo.original_filename}</h3>
          </div>
          <button
            type="button"
            className="photo-lightbox-modal__close"
            onClick={onClose}
            aria-label="Close photograph preview"
          >
            &times;
          </button>
        </div>

        <div className="photo-lightbox-modal__stage">
          {loadError ? (
            <div style={{ color: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem' }}>{loadError}</p>
              <button
                type="button"
                className="btn btn-gold"
                onClick={handleRenewSignedUrl}
                disabled={refreshingUrl}
              >
                {refreshingUrl ? 'Renewing Signed URL...' : 'Renew Private Signed URL'}
              </button>
            </div>
          ) : (
            <img
              src={resolvedUrl}
              alt={photo.original_filename}
              onError={() =>
                setLoadError('The short-lived signed URL for this photograph has expired.')
              }
            />
          )}
        </div>

        <div className="photo-lightbox-modal__footer">
          <div className="photo-lightbox-modal__meta">
            <span>
              <strong>Dimensions:</strong> {photo.image_width} &times; {photo.image_height} px
            </span>
            <span>
              <strong>File Size:</strong> {formatBytes(photo.file_size)}
            </span>
            <span>
              <strong>Uploaded:</strong> {formatUploadDate(photo.uploaded_at)}
            </span>
          </div>

          <div className="photo-lightbox-modal__actions">
            <button
              type="button"
              className="admin-action-btn"
              onClick={handleRenewSignedUrl}
              disabled={refreshingUrl}
            >
              {refreshingUrl ? 'Renewing...' : 'Renew Signed Link'}
            </button>
            {onDelete && (
              <button
                type="button"
                className="admin-action-btn admin-action-btn--danger"
                onClick={() => onDelete(photo)}
              >
                Delete Photograph
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotoLightboxModal
