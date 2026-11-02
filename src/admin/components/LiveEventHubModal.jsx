import { useState, useEffect, useCallback } from 'react'
import PhotoUploader from './PhotoUploader.jsx'
import { downloadEventQrFile, fetchEventQr } from '../../services/api.js'
import './LiveEventHubModal.css'

function LiveEventHubModal({ event, onClose, onEventUpdated }) {
  const [qrData, setQrData] = useState(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState(null) // 'png' | 'pdf'
  const [copiedLink, setCopiedLink] = useState(false)
  const [actionNotice, setActionNotice] = useState('')

  const loadQr = useCallback(async () => {
    if (!event?.id) return
    setLoadingQr(true)
    try {
      const data = await fetchEventQr(event.id)
      setQrData(data)
    } catch (err) {
      // Fallback to event attributes
      console.warn('Could not load specific QR record:', err)
    } finally {
      setLoadingQr(false)
    }
  }, [event?.id])

  useEffect(() => {
    loadQr()
  }, [loadQr])

  if (!event) return null

  const guestUrl =
    qrData?.guest_url ||
    event.guest_url ||
    `${window.location.origin}/guest/${qrData?.token || event.qr_token || ''}`

  const qrImageUrl =
    qrData?.qr_image_url ||
    event.qr_image_url ||
    `/api/events/${event.id}/qr/download/?file_format=PNG`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 3000)
    } catch {
      setActionNotice('Please manually copy: ' + guestUrl)
    }
  }

  const handleDownload = async (format) => {
    setDownloadingFormat(format)
    try {
      await downloadEventQrFile(event.id, format, event.slug || 'event')
    } catch (err) {
      alert(err.message || 'Failed to download QR placard.')
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleUploadDone = (report) => {
    if (typeof onEventUpdated === 'function') {
      onEventUpdated(report?.event_photo_count)
    }
    setActionNotice(
      `⚡ ${report.uploaded_count} photos added to archive. AI Face Recognition is running automatically!`
    )
    setTimeout(() => setActionNotice(''), 6000)
  }

  return (
    <div className="live-hub-modal" role="dialog" aria-modal="true" aria-labelledby="live-hub-title">
      <div className="live-hub-modal__backdrop" onClick={onClose} />
      <div className="live-hub-modal__dialog fade-up">
        {/* Modal Header */}
        <div className="live-hub-modal__header">
          <div>
            <span className="live-hub-modal__eyebrow">
              <span className="live-hub-modal__badge-pulse" />
              Live Event Station &bull; One-Click Automation
            </span>
            <h2 id="live-hub-title" className="live-hub-modal__title">
              {event.name}
            </h2>
            <div className="live-hub-modal__meta">
              <span>📅 {event.event_date}</span>
              <span>📍 {event.location}</span>
              <span>🏷️ {event.category || 'Weddings'}</span>
              <span>📸 {event.photo_count ?? 0} frames cataloged</span>
            </div>
          </div>
          <button
            type="button"
            className="live-hub-modal__close"
            onClick={onClose}
            aria-label="Close Live Station"
          >
            &times;
          </button>
        </div>

        {/* Automation Highlight Banner */}
        <div className="live-hub-modal__automation-alert">
          <div>
            <strong>⚡ Live Event Automation Active:</strong> QR passes are generated, printable placards are ready, and newly uploaded photos index faces in the background automatically.
          </div>
          {actionNotice && <span style={{ color: '#4ade80', fontWeight: 600 }}>{actionNotice}</span>}
        </div>

        {/* Split Grid */}
        <div className="live-hub-modal__grid">
          {/* Left Column: QR Pass & Placard */}
          <div className="live-hub-qr-card">
            <div className="live-hub-qr-card__head">
              <h4>Guest Entry Pass</h4>
              <p>Place on tables, displays, or entrance placards</p>
            </div>

            <div className="live-hub-qr-card__preview">
              {loadingQr ? (
                <div style={{ color: '#666', fontSize: '0.85rem' }}>Loading QR placard...</div>
              ) : (
                <img
                  src={qrImageUrl}
                  alt={`QR Placard for ${event.name}`}
                  onError={(e) => {
                    // Fallback to dynamic placard endpoint if image file url isn't direct
                    e.target.src = `/api/events/${event.id}/qr/download/?file_format=PNG`
                  }}
                />
              )}
            </div>

            <div className="live-hub-qr-card__url-box">
              <span className="live-hub-qr-card__url-text" title={guestUrl}>
                {guestUrl}
              </span>
              <button
                type="button"
                className="live-hub-qr-card__copy-btn"
                onClick={handleCopy}
              >
                {copiedLink ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <div className="live-hub-qr-card__actions">
              <button
                type="button"
                className="live-hub-qr-card__btn live-hub-qr-card__btn--gold"
                disabled={Boolean(downloadingFormat)}
                onClick={() => handleDownload('png')}
              >
                {downloadingFormat === 'png' ? 'Preparing Placard...' : '📥 Download Placard (PNG)'}
              </button>

              <button
                type="button"
                className="live-hub-qr-card__btn live-hub-qr-card__btn--outline"
                disabled={Boolean(downloadingFormat)}
                onClick={() => handleDownload('pdf')}
              >
                {downloadingFormat === 'pdf' ? 'Preparing PDF...' : '📄 Printable Placard (PDF)'}
              </button>

              <a
                href={guestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="live-hub-qr-card__btn live-hub-qr-card__btn--outline"
              >
                🌐 Test Guest Portal &rarr;
              </a>
            </div>
          </div>

          {/* Right Column: Live Photo Dropzone & Automatic Indexer */}
          <div className="live-hub-upload-panel">
            <div className="live-hub-upload-panel__head">
              <h4>
                <span>Camera Photo Dropzone</span>
              </h4>
              <span className="live-hub-upload-panel__ai-tag">
                ⚡ Auto-Indexing Faces
              </span>
            </div>

            <PhotoUploader
              eventId={event.id}
              eventName={event.name}
              onUploadComplete={handleUploadDone}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveEventHubModal
