import { useEffect, useState } from 'react'
import {
  downloadAllGuestMatchedPhotosZip,
  downloadGuestMatchedPhoto,
} from '../services/api.js'
import './GuestMatchingResults.css'

function GuestMatchingResults({
  qrToken = '',
  eventInfo,
  matchData,
  loading = false,
  error = '',
  onRetakeSelfie,
  onRefreshPreviews,
  onSessionExpired,
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [downloadingPhotoIds, setDownloadingPhotoIds] = useState({})
  const [zipDownloading, setZipDownloading] = useState(false)
  const [downloadFeedback, setDownloadFeedback] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const photos = matchData?.results || []
  const matchedCount = matchData?.matched_count ?? photos.length

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPhoto(null)
      }
    }
    if (selectedPhoto) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedPhoto])

  const handleSessionOrDownloadError = (err, defaultMessage) => {
    const code = err?.payload?.code || ''
    if (
      (code === 'session_expired' ||
        code === 'session_revoked' ||
        code === 'invalid_session' ||
        code === 'session_required') &&
      typeof onSessionExpired === 'function'
    ) {
      onSessionExpired(err.message)
      return
    }
    setDownloadError(err?.message || defaultMessage)
  }

  const handleDownloadSinglePhoto = async (photo, e) => {
    if (e) {
      e.stopPropagation()
    }
    if (!qrToken || !photo?.photo_id) return
    const pid = photo.photo_id
    if (downloadingPhotoIds[pid]) return

    setDownloadingPhotoIds((prev) => ({ ...prev, [pid]: true }))
    setDownloadError('')
    setDownloadFeedback('')

    try {
      const fallbackName = `event-portrait-${photo.display_index || pid}.jpg`
      const result = await downloadGuestMatchedPhoto(qrToken, pid, fallbackName)
      setDownloadFeedback(
        `Downloaded original photograph (${result.filename || photo.display_label}).`
      )
    } catch (err) {
      handleSessionOrDownloadError(
        err,
        'Unable to download this photograph right now. Please try again.'
      )
    } finally {
      setDownloadingPhotoIds((prev) => {
        const next = { ...prev }
        delete next[pid]
        return next
      })
    }
  }

  const handleDownloadAllZip = async () => {
    if (!qrToken || zipDownloading || photos.length === 0) return

    setZipDownloading(true)
    setDownloadError('')
    setDownloadFeedback('')

    try {
      const slug =
        (eventInfo?.name || 'event')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'event'
      const result = await downloadAllGuestMatchedPhotosZip(qrToken, slug)
      const countText =
        result.includedCount > 0 ? result.includedCount : photos.length
      setDownloadFeedback(
        `Your ZIP archive (${result.filename}) with ${countText} original photograph${
          countText === 1 ? '' : 's'
        } has started downloading.`
      )
    } catch (err) {
      handleSessionOrDownloadError(
        err,
        'Unable to prepare the ZIP archive right now. You may still download photographs individually.'
      )
    } finally {
      setZipDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="guest-results fade-up" aria-busy="true">
        <div className="guest-results__header">
          <span className="section-eyebrow">Searching Private Event Archive</span>
          <h2 className="guest-results__title">Finding Your Photographs...</h2>
          <p className="guest-results__subtitle">
            Comparing your reference selfie against indexed portraits from{' '}
            <strong>{eventInfo?.name}</strong>.
          </p>
        </div>

        <div className="guest-results__grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="guest-results__skeleton-card">
              <div className="guest-results__skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="guest-results guest-results--state fade-up" role="alert">
        <span className="section-eyebrow" style={{ color: '#b91c1c' }}>
          Matching Issue
        </span>
        <h2 className="guest-results__title">Unable to Complete Photo Search</h2>
        <p className="guest-results__subtitle">{error}</p>
        <div className="guest-results__actions">
          <button type="button" className="btn btn-primary" onClick={onRetakeSelfie}>
            Retake Selfie &amp; Try Again
          </button>
          {onRefreshPreviews && (
            <button type="button" className="btn btn-outline" onClick={onRefreshPreviews}>
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  if (matchedCount === 0 || photos.length === 0) {
    return (
      <div className="guest-results guest-results--state fade-up">
        <span className="section-eyebrow">Step 3 of 3 &bull; Search Complete</span>
        <h2 className="guest-results__title">No Matching Photographs Found</h2>
        <p className="guest-results__subtitle">
          {matchData?.message ||
            "We couldn't find matching photographs. You can try another clear selfie with your face looking directly at the camera."}
        </p>

        <div className="guest-results__notice-box">
          <strong>Helpful Tips for Retaking Your Selfie:</strong>
          <ul>
            <li>Face a natural light source so your facial features are evenly lit.</li>
            <li>Look straight toward the camera lens without tilting your head sharply.</li>
            <li>Ensure only your face is visible in the frame.</li>
          </ul>
        </div>

        <div className="guest-results__actions">
          <button type="button" className="btn btn-primary" onClick={onRetakeSelfie}>
            Retake Selfie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="guest-results fade-up">
      <div className="guest-results__header">
        <span className="section-eyebrow">
          {eventInfo?.category || 'Private Studio Collection'} &bull; {eventInfo?.name}
        </span>
        <h2 className="guest-results__title">
          {matchedCount} Matching Photograph{matchedCount === 1 ? '' : 's'} Found
        </h2>
        <p className="guest-results__subtitle">
          Select any portrait below to preview or download the full-resolution original. Your
          reference selfie and temporary biometric template have been discarded.
        </p>
      </div>

      {/* Download Progress / Feedback / Error Alerts */}
      {zipDownloading && (
        <div className="guest-results__download-banner guest-results__download-banner--progress" role="status">
          <span className="guest-results__spinner" aria-hidden="true" />
          <div>
            <strong>Preparing ZIP Archive ({photos.length} Photographs)...</strong>
            <p>
              Packaging your full-resolution original event photographs. Your download will start
              automatically in a moment.
            </p>
          </div>
        </div>
      )}

      {downloadFeedback && !zipDownloading && (
        <div className="guest-results__download-banner guest-results__download-banner--success" role="status">
          <span>{downloadFeedback}</span>
          <button
            type="button"
            className="guest-results__banner-dismiss"
            onClick={() => setDownloadFeedback('')}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {downloadError && (
        <div className="guest-results__download-banner guest-results__download-banner--error" role="alert">
          <span>{downloadError}</span>
          <button
            type="button"
            className="guest-results__banner-dismiss"
            onClick={() => setDownloadError('')}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      <div className="guest-results__toolbar">
        <span className="guest-results__count-pill">
          Showing {photos.length} matched portrait{photos.length === 1 ? '' : 's'}
        </span>

        <div className="guest-results__toolbar-actions">
          {qrToken && (
            <button
              type="button"
              className="btn btn-primary guest-results__small-btn guest-results__zip-btn"
              onClick={handleDownloadAllZip}
              disabled={zipDownloading || photos.length === 0}
            >
              {zipDownloading
                ? 'Preparing ZIP...'
                : `Download All Photos (${photos.length})`}
            </button>
          )}
          {onRefreshPreviews && (
            <button
              type="button"
              className="btn btn-outline guest-results__small-btn"
              onClick={onRefreshPreviews}
              disabled={zipDownloading}
            >
              Refresh Previews
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline guest-results__small-btn"
            onClick={onRetakeSelfie}
            disabled={zipDownloading}
          >
            Retake Selfie
          </button>
        </div>
      </div>

      <div className="guest-results__grid">
        {photos.map((photo) => {
          const isPhotoDownloading = Boolean(downloadingPhotoIds[photo.photo_id])
          return (
            <article
              key={photo.photo_id}
              className="guest-results__card"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="guest-results__thumb-wrap">
                <img
                  src={photo.preview_url}
                  alt={photo.display_label || 'Matched event photograph'}
                  loading="lazy"
                  className="guest-results__thumb"
                />
              </div>
              <div className="guest-results__card-meta">
                <div className="guest-results__card-info">
                  <strong>{photo.display_label}</strong>
                  <span>Tap to Preview</span>
                </div>
                {qrToken && (
                  <button
                    type="button"
                    className="guest-results__card-download-btn"
                    onClick={(e) => handleDownloadSinglePhoto(photo, e)}
                    disabled={isPhotoDownloading}
                    aria-label={`Download ${photo.display_label}`}
                  >
                    {isPhotoDownloading ? 'Downloading...' : 'Download'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {matchData?.accuracy_notice && (
        <p className="guest-results__accuracy-disclaimer">{matchData.accuracy_notice}</p>
      )}

      {/* Lightbox Preview Modal with Full-Resolution Original Download Action */}
      {selectedPhoto && (
        <div
          className="guest-results-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={selectedPhoto.display_label}
        >
          <div
            className="guest-results-lightbox__backdrop"
            onClick={() => setSelectedPhoto(null)}
          />
          <div className="guest-results-lightbox__dialog fade-up">
            <div className="guest-results-lightbox__top">
              <div>
                <span className="section-eyebrow">{eventInfo?.name}</span>
                <h3>{selectedPhoto.display_label}</h3>
              </div>
              <button
                type="button"
                className="guest-results-lightbox__close"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Close preview"
              >
                &times;
              </button>
            </div>

            <div className="guest-results-lightbox__stage">
              <img
                src={selectedPhoto.preview_url}
                alt={selectedPhoto.display_label}
                className="guest-results-lightbox__img"
              />
            </div>

            <div className="guest-results-lightbox__footer">
              <span>
                Original Dimensions: {selectedPhoto.image_width} &times;{' '}
                {selectedPhoto.image_height} px
              </span>
              <div className="guest-results-lightbox__actions">
                {qrToken && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => handleDownloadSinglePhoto(selectedPhoto, e)}
                    disabled={Boolean(downloadingPhotoIds[selectedPhoto.photo_id])}
                  >
                    {downloadingPhotoIds[selectedPhoto.photo_id]
                      ? 'Downloading Original...'
                      : 'Download Original Photo'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSelectedPhoto(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GuestMatchingResults
