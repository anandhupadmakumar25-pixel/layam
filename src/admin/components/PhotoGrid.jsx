import { formatBytes } from './PhotoUploader.jsx'
import './PhotoGrid.css'

export function formatUploadDate(isoString) {
  if (!isoString) return '—'
  try {
    const dt = new Date(isoString)
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

function PhotoGrid({
  photos,
  loading,
  onSelectPhoto,
  onDeletePhoto,
  page,
  totalPages,
  onPageChange,
}) {
  if (loading) {
    return (
      <div className="photo-grid-empty">
        <p>Loading event photographs from archive...</p>
      </div>
    )
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="photo-grid-empty">
        <h3>No Photographs in This Event Archive</h3>
        <p>
          Use the upload suite above to ingest JPG, PNG, or WebP photographs into this event’s
          gallery.
        </p>
      </div>
    )
  }

  return (
    <div className="photo-grid-section">
      <div className="photo-grid">
        {photos.map((photo) => (
          <article key={photo.id} className="photo-grid-card">
            <div
              className="photo-grid-card__media"
              onClick={() => onSelectPhoto && onSelectPhoto(photo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectPhoto && onSelectPhoto(photo)
                }
              }}
            >
              <img
                src={photo.thumbnail_url || photo.image_url}
                alt={photo.original_filename}
                loading="lazy"
              />
              <span className="photo-grid-card__zoom">Inspect</span>
            </div>

            <div className="photo-grid-card__body">
              <strong className="photo-grid-card__filename" title={photo.original_filename}>
                {photo.original_filename}
              </strong>
              <div className="photo-grid-card__specs">
                <span>
                  {photo.image_width} &times; {photo.image_height} px
                </span>
                <span>&bull;</span>
                <span>{formatBytes(photo.file_size)}</span>
              </div>
              <time className="photo-grid-card__date">
                {formatUploadDate(photo.uploaded_at)}
              </time>

              <div className="photo-grid-card__actions">
                <button
                  type="button"
                  className="admin-action-btn"
                  onClick={() => onSelectPhoto && onSelectPhoto(photo)}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="admin-action-btn admin-action-btn--danger"
                  onClick={() => onDeletePhoto && onDeletePhoto(photo)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="photo-grid-pagination">
          <button
            type="button"
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            &larr; Previous
          </button>
          <span className="photo-grid-pagination__info">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  )
}

export default PhotoGrid

